import { id } from "@instantdb/admin";
import { adminDb } from "./adminDb";
import {
  analyzePostIntent,
  analyzeBatchCommentsIntent,
  IntentAnalysisResult,
  PostContext,
} from "./intentClassifier";
import { scheduleNextScanWithUpstash } from "./upstashScheduler";
import { extractPhoneInfo } from "./phoneUtils";

const SCRAPE_CREATORS_API_KEY =
  process.env.SCRAPE_CREATORS_API_KEY || "4zCp1kzsF1UobT8aQlzgSCgTPZq2";

export interface NormalizedComment {
  externalCommentId: string;
  authorName: string;
  authorExternalId: string;
  authorProfileUrl: string;
  authorAvatarUrl?: string;
  commentUrl?: string;
  text: string;
  publishedAt: number;
}

export interface NormalizedPost {
  externalPostId: string;
  authorName: string;
  authorExternalId: string;
  authorProfileUrl: string;
  authorAvatarUrl?: string;
  postUrl: string;
  originalText: string;
  publishedAt: number; // ms timestamp
  comments?: NormalizedComment[];
}

export function extractFacebookAvatarUrl(author: any, authorId?: string): string | undefined {
  if (!author && !authorId) return undefined;

  // 1. Direct high-res profile picture from ScrapeCreators
  const directPic =
    author?.profile_picture ||
    author?.image ||
    author?.profile_picture_depth_0_increased?.uri ||
    author?.profile_picture_depth_0?.uri ||
    author?.profile_picture_depth_1?.uri ||
    author?.avatarUrl ||
    author?.avatar;

  if (directPic && typeof directPic === "string" && directPic.startsWith("http")) {
    return directPic;
  }

  // 2. Numeric User ID fallback (Facebook Graph API 302 redirect)
  const cleanId = String(author?.id || authorId || "").trim();
  if (cleanId && /^\d+$/.test(cleanId) && cleanId.length < 15) {
    return `https://graph.facebook.com/${cleanId}/picture?type=large`;
  }

  // 3. Extract numeric ID from profile URL if present
  if (author?.url && typeof author.url === "string") {
    const match = author.url.match(/(?:profile\.php\?id=|\/profile\/|\/user\/|facebook\.com\/)(\d{5,14})(?:[/?#]|$)/);
    if (match && match[1]) {
      return `https://graph.facebook.com/${match[1]}/picture?type=large`;
    }
  }

  return undefined;
}

function normalizeFacebookAuthorProfileUrl(authorId?: string, rawUrl?: string, fallbackUrl?: string): string {
  if (rawUrl && rawUrl.startsWith("http")) return rawUrl;
  if (authorId && authorId !== "fb_anon") {
    return `https://www.facebook.com/${authorId}`;
  }
  return fallbackUrl || "https://facebook.com";
}

export function decodeFacebookCommentId(idStr?: string): string | null {
  if (!idStr) return null;
  const str = String(idStr);

  if (str.startsWith("Y29tbWVud") || /^[A-Za-z0-9+/=]+$/.test(str)) {
    try {
      const decoded = Buffer.from(str, "base64").toString("utf-8");
      if (decoded.includes("comment:") || decoded.includes("_")) {
        const m = decoded.match(/_(\d+)/) || decoded.match(/comment:(\d+)/);
        if (m) return m[1];
      }
    } catch {}
  }

  const m = str.match(/_(\d+)$/) || str.match(/comment:?\d*_?(\d+)/);
  if (m) return m[1];
  if (/^\d{10,}$/.test(str)) return str;
  return null;
}

export function buildDirectCommentUrl(
  platform: string,
  postUrl: string,
  externalCommentId?: string,
  rawCommentUrl?: string
): string {
  if (
    rawCommentUrl &&
    rawCommentUrl !== postUrl &&
    (rawCommentUrl.includes("comment_id") || rawCommentUrl.includes("/comments/"))
  ) {
    return rawCommentUrl;
  }

  const p = (platform || "").toLowerCase();
  const base = postUrl || rawCommentUrl || "";

  if (p === "facebook" && base) {
    const commentId = decodeFacebookCommentId(externalCommentId);
    if (commentId) {
      try {
        const u = new URL(base);
        u.searchParams.set("comment_id", commentId);
        return u.toString();
      } catch {
        const sep = base.includes("?") ? "&" : "?";
        return `${base}${sep}comment_id=${commentId}`;
      }
    }
  }

  if (p === "reddit" && base) {
    if (externalCommentId) {
      const cleanId = externalCommentId.replace(/^t1_/, "");
      if (cleanId && !base.includes(cleanId)) {
        return base.endsWith("/") ? `${base}${cleanId}/` : `${base}/${cleanId}/`;
      }
    }
  }

  return rawCommentUrl || base;
}

function parseFacebookComments(rawComments: any[], parentPostUrl: string, parentPubTime: number): NormalizedComment[] {
  const comments: NormalizedComment[] = [];
  if (!Array.isArray(rawComments)) return comments;

  for (const c of rawComments) {
    if (!c) continue;
    const author = c.author || {};
    const text = (c.text || c.message || "").trim();
    if (!text || text.length < 3) continue;

    const authorId = String(author.id || author.name || "fb_anon");
    const authorName = author.name || author.short_name || "Facebook User";
    const commentPubTime = c.publishTime
      ? (c.publishTime > 1e11 ? c.publishTime : c.publishTime * 1000)
      : (c.creation_time ? new Date(c.creation_time).getTime() : parentPubTime);

    const profilePicture = extractFacebookAvatarUrl(author, authorId);

    const rawCommentId = String(c.id || id());
    const directCommentUrl = buildDirectCommentUrl(
      "facebook",
      parentPostUrl,
      rawCommentId,
      c.url
    );

    comments.push({
      externalCommentId: rawCommentId,
      authorName,
      authorExternalId: authorId,
      authorProfileUrl: normalizeFacebookAuthorProfileUrl(authorId, author.url, parentPostUrl),
      authorAvatarUrl: profilePicture,
      commentUrl: directCommentUrl,
      text,
      publishedAt: commentPubTime,
    });
  }

  return comments;
}

export interface PostDetailsResult {
  comments: NormalizedComment[];
  authorAvatarUrl?: string;
}

export async function fetchCommentsForPost(
  platform: string,
  postUrl: string,
  postPubTime: number = Date.now()
): Promise<PostDetailsResult> {
  const comments: NormalizedComment[] = [];
  let authorAvatarUrl: string | undefined = undefined;

  try {
    if (platform === "facebook") {
      const apiUrl = `https://api.scrapecreators.com/v1/facebook/post?url=${encodeURIComponent(postUrl)}`;
      const res = await fetch(apiUrl, {
        headers: { "x-api-key": SCRAPE_CREATORS_API_KEY },
      });
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          authorAvatarUrl =
            data.author?.image ||
            data.author?.profile_picture ||
            data.author?.profile_picture_depth_0?.uri ||
            data.author?.profile_picture_url ||
            undefined;

          if (Array.isArray(data.comments)) {
            return {
              comments: parseFacebookComments(data.comments, postUrl, postPubTime),
              authorAvatarUrl,
            };
          }
        }
      }
    } else if (platform === "reddit") {
      const apiUrl = `https://api.scrapecreators.com/v1/reddit/post/comments?url=${encodeURIComponent(postUrl)}`;
      const res = await fetch(apiUrl, {
        headers: { "x-api-key": SCRAPE_CREATORS_API_KEY },
      });
      if (res.ok) {
        const data = await res.json();
        const rawComments = data.comments || [];
        if (Array.isArray(rawComments)) {
          for (const c of rawComments) {
            const body = (c.body || "").trim();
            if (!body || body.length < 3 || body === "[deleted]" || body === "[removed]") continue;
            const author = c.author || "Reddit User";
            const authorName = author.startsWith("u/") ? author : `u/${author}`;
            const pubTime = c.created_utc ? c.created_utc * 1000 : postPubTime;

            comments.push({
              externalCommentId: String(c.id || id()),
              authorName,
              authorExternalId: String(c.author || "reddit_anon"),
              authorProfileUrl: `https://reddit.com/user/${c.author}`,
              commentUrl: c.url || (c.permalink ? `https://reddit.com${c.permalink}` : postUrl),
              text: body,
              publishedAt: pubTime,
            });
          }
        }
      }
    }
  } catch (err) {
    console.error(`Error fetching post details/comments for ${platform} post (${postUrl}):`, err);
  }

  return { comments, authorAvatarUrl };
}

export async function fetchPostsFromPlatform(
  platform: string,
  url: string,
  externalId: string
): Promise<NormalizedPost[]> {
  const posts: NormalizedPost[] = [];

  try {
    if (platform === "facebook") {
      // Check if URL is a single post permalink or a group feed
      const isSinglePostUrl = url.includes("/permalink/") || url.includes("/posts/");

      if (isSinglePostUrl) {
        // Try direct facebook/post endpoint first
        const singlePostApiUrl = `https://api.scrapecreators.com/v1/facebook/post?url=${encodeURIComponent(url)}`;
        const res = await fetch(singlePostApiUrl, {
          headers: { "x-api-key": SCRAPE_CREATORS_API_KEY },
        });

        if (res.ok) {
          const data = await res.json();
          if (data.success && (data.description || data.post_id)) {
            const author = data.author || {};
            const pubTime = data.creation_time
              ? new Date(data.creation_time).getTime()
              : Date.now();
            const authorId = String(author.id || "fb_anon");
            const authorName = author.name || "Facebook User";
            const postUrl = data.url || url;

            const comments = parseFacebookComments(data.comments || [], postUrl, pubTime);

            const authorAvatar =
              extractFacebookAvatarUrl(data.author, authorId) ||
              data.image ||
              undefined;

            posts.push({
              externalPostId: String(data.post_id || id()),
              authorName,
              authorExternalId: authorId,
              authorProfileUrl: normalizeFacebookAuthorProfileUrl(authorId, author.url, postUrl),
              authorAvatarUrl: authorAvatar,
              postUrl,
              originalText: data.description || "",
              publishedAt: pubTime,
              comments,
            });
            return posts;
          }
        }
      }

      // Group posts endpoint (works for group URLs and permalinks)
      const apiUrl = `https://api.scrapecreators.com/v1/facebook/group/posts?url=${encodeURIComponent(url)}`;
      const res = await fetch(apiUrl, {
        headers: { "x-api-key": SCRAPE_CREATORS_API_KEY },
      });
      if (res.ok) {
        const data = await res.json();
        if (data.success && Array.isArray(data.posts)) {
          for (const item of data.posts) {
            const author = item.author || {};
            const pubTime = item.publishTime
              ? item.publishTime * 1000
              : item.creation_time
              ? new Date(item.creation_time).getTime()
              : Date.now();
            const postUrl = item.url || item.permalink || url;
            const authorId = String(author.id || author.name || "fb_anon");
            const authorName = author.name || author.short_name || "Facebook User";

            const rawComments = item.topComments || item.comments || [];
            const comments = parseFacebookComments(rawComments, postUrl, pubTime);
            const authorAvatar = extractFacebookAvatarUrl(author, authorId);

            posts.push({
              externalPostId: String(item.id || id()),
              authorName,
              authorExternalId: authorId,
              authorProfileUrl: normalizeFacebookAuthorProfileUrl(authorId, author.url, postUrl),
              authorAvatarUrl: authorAvatar,
              postUrl,
              originalText: item.text || "",
              publishedAt: pubTime,
              comments,
            });
          }
        }
      }
    } else if (platform === "reddit") {
      const subreddit = externalId || "freelance";
      const apiUrl = `https://api.scrapecreators.com/v1/reddit/subreddit?subreddit=${encodeURIComponent(subreddit)}`;
      const res = await fetch(apiUrl, {
        headers: { "x-api-key": SCRAPE_CREATORS_API_KEY },
      });
      if (res.ok) {
        const data = await res.json();
        const rawPosts = data.posts || data.data || [];
        if (Array.isArray(rawPosts)) {
          for (const item of rawPosts) {
            const pubTime = item.created_utc ? item.created_utc * 1000 : Date.now();
            const authorName = item.author || "Reddit User";
            posts.push({
              externalPostId: String(item.id || id()),
              authorName: authorName.startsWith("u/") ? authorName : `u/${authorName}`,
              authorExternalId: String(item.author || "reddit_anon"),
              authorProfileUrl: `https://reddit.com/user/${item.author}`,
              postUrl: item.url || `https://reddit.com${item.permalink}`,
              originalText: `${item.title || ""}\n\n${item.selftext || ""}`.trim(),
              publishedAt: pubTime,
              comments: [],
            });
          }
        }
      }
    }
  } catch (err) {
    console.error(`Error fetching posts for platform ${platform}:`, err);
  }

  return posts;
}

export function extractSuggestedSourcesFromText(text?: string): {
  platform: string;
  url: string;
  externalId: string;
  name: string;
}[] {
  if (!text) return [];
  const results: { platform: string; url: string; externalId: string; name: string }[] = [];

  // 1. WhatsApp Group Invites
  const waRegex = /(?:https?:\/\/)?(?:chat\.)?whatsapp\.com\/(?:invite\/)?([A-Za-z0-9_\-]{10,})/gi;
  for (const match of text.matchAll(waRegex)) {
    const inviteCode = match[1];
    if (inviteCode) {
      let name = `WhatsApp Group (${inviteCode.substring(0, 8)}...)`;
      const contextMatch = text.match(/(?:קהילת|קבוצת|קבוצה|קהילה|group|community)[:\s"״]*([^"״\n\r:]{3,40})/i);
      if (contextMatch && contextMatch[1] && !contextMatch[1].includes("http")) {
        name = contextMatch[1].trim();
      }
      results.push({
        platform: "whatsapp",
        url: `https://chat.whatsapp.com/${inviteCode}`,
        externalId: inviteCode,
        name,
      });
    }
  }

  // 2. WhatsApp Channels
  const waChanRegex = /(?:https?:\/\/)?(?:www\.)?whatsapp\.com\/channel\/([A-Za-z0-9_\-]{10,})/gi;
  for (const match of text.matchAll(waChanRegex)) {
    const chanId = match[1];
    if (chanId) {
      results.push({
        platform: "whatsapp",
        url: `https://whatsapp.com/channel/${chanId}`,
        externalId: chanId,
        name: `WhatsApp Channel (${chanId.substring(0, 8)}...)`,
      });
    }
  }

  // 3. Facebook Groups
  const fbRegex = /(?:https?:\/\/)?(?:www\.|m\.)?facebook\.com\/groups\/([A-Za-z0-9_.\-]+)/gi;
  for (const match of text.matchAll(fbRegex)) {
    const rawGroupId = match[1];
    if (rawGroupId && !["permalink", "posts", "feed", "user"].includes(rawGroupId.toLowerCase())) {
      const cleanGroupId = rawGroupId.split("/")[0].split("?")[0];
      results.push({
        platform: "facebook",
        url: `https://www.facebook.com/groups/${cleanGroupId}`,
        externalId: cleanGroupId,
        name: `Facebook Group (${cleanGroupId})`,
      });
    }
  }

  return results;
}

export async function scanSource(sourceId: string) {
  // Query source, buyers, and existing intents from InstantDB for strict deduplication
  const { sources: allSources, buyers, intents } = await adminDb.query({
    sources: {},
    buyers: {},
    intents: {},
  });

  const source = allSources.find((s) => s.id === sourceId);
  if (!source) {
    throw new Error(`Source not found with ID: ${sourceId}`);
  }

  if (source.status === "pending_review" || source.status === "paused") {
    return {
      sourceId,
      skipped: true,
      reason: `Source status is ${source.status}`,
    };
  }

  // Create sets and maps of existing post IDs and original text for fast deduplication
  const existingPostIds = new Set(intents.map((i) => i.externalPostId));
  const existingTextHashes = new Set(
    intents.map((i) => (i.originalText || "").trim().toLowerCase())
  );
  const existingIntentsByPostId = new Map(
    intents.map((i) => [i.externalPostId, i])
  );

  const rawPosts = await fetchPostsFromPlatform(source.platform, source.url, source.externalId);
  const now = Date.now();

  let newIntentsFound = 0;
  const txs: any[] = [];

  // Helper to get or stage a buyer entity
  const stagedBuyers = new Map<string, string>(); // externalAuthorId -> buyerId
  for (const b of buyers) {
    stagedBuyers.set(`${b.platform}:${b.externalAuthorId}`, b.id);
  }

  const existingSourceUrls = new Set(allSources.map((s) => s.url?.toLowerCase().replace(/\/$/, "")));
  const existingSourceExternalIds = new Set(allSources.map((s) => s.externalId?.toLowerCase()));

  const getOrCreateBuyerId = (
    authorName: string,
    authorExternalId: string,
    profileUrl: string,
    avatarUrl?: string,
    contactInfo?: string
  ): string => {
    const key = `${source.platform}:${authorExternalId}`;
    if (stagedBuyers.has(key)) {
      const existingId = stagedBuyers.get(key)!;
      const existingObj = buyers.find((b) => b.id === existingId);
      const updateData: any = {
        totalIntentPosts: (existingObj?.totalIntentPosts || 1) + 1,
        updatedAt: now,
      };

      // Backfill or update avatar if existing buyer lacked an avatar
      if (avatarUrl && (!existingObj?.avatarUrl || existingObj.avatarUrl.length < 5)) {
        updateData.avatarUrl = avatarUrl;
      }
      if (profileUrl && (!existingObj?.profileUrl || existingObj?.profileUrl === "#")) {
        updateData.profileUrl = profileUrl;
      }
      if (contactInfo && (!existingObj?.contactInfo || existingObj.contactInfo.length < 5)) {
        updateData.contactInfo = contactInfo;
      }

      txs.push(adminDb.tx.buyers[existingId].update(updateData));
      return existingId;
    }

    const resolvedAvatar =
      avatarUrl ||
      (source.platform === "facebook"
        ? extractFacebookAvatarUrl(null, authorExternalId)
        : undefined);

    const newBuyerId = id();
    stagedBuyers.set(key, newBuyerId);
    txs.push(
      adminDb.tx.buyers[newBuyerId].create({
        name: authorName,
        platform: source.platform,
        externalAuthorId: authorExternalId,
        profileUrl,
        avatarUrl: resolvedAvatar,
        contactInfo: contactInfo || undefined,
        totalIntentPosts: 1,
        createdAt: now,
        updatedAt: now,
      })
    );
    return newBuyerId;
  };

  for (const post of rawPosts) {
    if (!post.originalText || post.originalText.trim().length < 5) continue;

    // Detect and extract any shared WhatsApp group/channel or Facebook group links as suggested sources for review
    const allTextToScanForLinks = [
      post.originalText,
      ...(post.comments || []).map((c) => c.text),
    ].join(" ");

    const detectedSources = extractSuggestedSourcesFromText(allTextToScanForLinks);
    for (const suggested of detectedSources) {
      const cleanUrl = suggested.url.toLowerCase().replace(/\/$/, "");
      const cleanId = suggested.externalId.toLowerCase();
      if (!existingSourceUrls.has(cleanUrl) && !existingSourceExternalIds.has(cleanId)) {
        existingSourceUrls.add(cleanUrl);
        existingSourceExternalIds.add(cleanId);

        const newSuggestedSourceId = id();
        txs.push(
          adminDb.tx.sources[newSuggestedSourceId].create({
            platform: suggested.platform,
            name: suggested.name,
            url: suggested.url,
            externalId: suggested.externalId,
            status: "pending_review",
            checkIntervalMinutes: 60,
            minIntervalMinutes: 15,
            maxIntervalMinutes: 1440,
            decayMultiplier: 1.5,
            consecutiveEmptyScrapes: 0,
            lastScrapedAt: 0,
            nextScheduledScanAt: 0,
            totalPostsScanned: 0,
            totalIntentsFound: 0,
            createdAt: now,
          })
        );
      }
    }

    const normalizedPostText = post.originalText.trim().toLowerCase();
    const isPostAlreadySaved =
      existingPostIds.has(post.externalPostId) || existingTextHashes.has(normalizedPostText);

    let postIntentType: "buy" | "sell" | "none" = "none";
    let postAnalysis: IntentAnalysisResult | null = null;

    if (isPostAlreadySaved) {
      // Find existing intent to get its intentType for comment context
      const existing =
        existingIntentsByPostId.get(post.externalPostId) ||
        intents.find((i) => (i.originalText || "").trim().toLowerCase() === normalizedPostText);
      if (existing) {
        postIntentType = (existing.intentType as "buy" | "sell") || "buy";
      }
    } else {
      // Classify the new post
      postAnalysis = await analyzePostIntent(post.originalText);
      postIntentType = postAnalysis.intentType;

      if (postAnalysis.hasIntent) {
        let authorAvatarUrl = post.authorAvatarUrl;
        let detailsComments: NormalizedComment[] = post.comments || [];

        // If author avatar or comments are missing (e.g. from Facebook group feed), fetch single post details
        if (source.platform === "facebook" && (!authorAvatarUrl || detailsComments.length === 0)) {
          const details = await fetchCommentsForPost(source.platform, post.postUrl, post.publishedAt);
          if (details.authorAvatarUrl) {
            authorAvatarUrl = details.authorAvatarUrl;
          }
          if (details.comments && details.comments.length > 0) {
            detailsComments = details.comments;
          }
        }

        existingPostIds.add(post.externalPostId);
        existingTextHashes.add(normalizedPostText);

        const extractedPhone = extractPhoneInfo(post.originalText);
        const buyerId = getOrCreateBuyerId(
          post.authorName,
          post.authorExternalId,
          post.authorProfileUrl,
          authorAvatarUrl,
          extractedPhone?.e164
        );

        const intentId = id();
        txs.push(
          adminDb.tx.intents[intentId]
            .create({
              externalPostId: post.externalPostId,
              title: postAnalysis.titleEn,
              summary: postAnalysis.summaryEn,
              originalText: post.originalText,
              translatedText: postAnalysis.translatedTextEn,
              platform: source.platform,
              postUrl: post.postUrl,
              intentType: postAnalysis.intentType,
              category: postAnalysis.category,
              budget: postAnalysis.budget,
              urgency: postAnalysis.urgency,
              confidenceScore: postAnalysis.confidenceScore,
              matchedKeywords: JSON.stringify(postAnalysis.matchedKeywords),
              publishedAt: post.publishedAt,
              scrapedAt: now,
              status: "open",
              createdAt: now,
            })
            .link({ source: sourceId })
            .link({ buyer: buyerId })
        );

        newIntentsFound++;

        if (detailsComments.length > 0) {
          post.comments = detailsComments;
        }
      }
    }

    // SCAN COMMENTS: On posts that matched buy/sell intent, scan the comments to identify service providers / buyers
    if (postIntentType === "buy" || postIntentType === "sell") {
      let comments = post.comments || [];

      // For Facebook & Reddit: fetch full deep comments if missing or if comments lack avatars/rich data
      if (source.platform === "facebook" || source.platform === "reddit" || comments.length === 0) {
        const details = await fetchCommentsForPost(source.platform, post.postUrl, post.publishedAt);
        const deepComments = details.comments || [];
        if (deepComments && deepComments.length > 0) {
          const commentMap = new Map<string, NormalizedComment>();
          for (const c of comments) commentMap.set(c.externalCommentId, c);
          for (const c of deepComments) {
            const existing = commentMap.get(c.externalCommentId);
            if (existing) {
              commentMap.set(c.externalCommentId, {
                ...existing,
                ...c,
                authorAvatarUrl: c.authorAvatarUrl || existing.authorAvatarUrl,
              });
            } else {
              commentMap.set(c.externalCommentId, c);
            }
          }
          comments = Array.from(commentMap.values());
        }
        if (details.authorAvatarUrl) {
          getOrCreateBuyerId(
            post.authorName,
            post.authorExternalId,
            post.authorProfileUrl,
            details.authorAvatarUrl
          );
        }
      }

      // Filter unhandled comments for this post
      const candidateComments = comments.filter((c) => {
        if (!c.text || c.text.trim().length < 3) return false;
        const normalizedCommentText = c.text.trim().toLowerCase();
        if (
          existingPostIds.has(c.externalCommentId) ||
          existingTextHashes.has(normalizedCommentText)
        ) {
          return false;
        }
        return true;
      });

      if (candidateComments.length > 0) {
        const isAuthorComment = (c: NormalizedComment) => {
          if (c.authorExternalId && post.authorExternalId && c.authorExternalId !== "fb_anon") {
            return c.authorExternalId === post.authorExternalId;
          }
          if (c.authorName && post.authorName) {
            return c.authorName.trim().toLowerCase() === post.authorName.trim().toLowerCase();
          }
          return false;
        };

        const postContext: PostContext = {
          text: post.originalText,
          intentType: postIntentType,
          authorName: post.authorName,
          authorExternalId: post.authorExternalId,
        };

        const commentResults = await analyzeBatchCommentsIntent(
          candidateComments.map((c) => ({
            id: c.externalCommentId,
            authorName: c.authorName,
            authorExternalId: c.authorExternalId,
            isPostAuthor: isAuthorComment(c),
            text: c.text,
          })),
          postContext
        );

        for (const comment of candidateComments) {
          const commentAnalysis = commentResults.get(comment.externalCommentId);
          if (commentAnalysis && commentAnalysis.hasIntent) {
            const normCommentText = comment.text.trim().toLowerCase();
            existingPostIds.add(comment.externalCommentId);
            existingTextHashes.add(normCommentText);

            const commentPhone = extractPhoneInfo(comment.text);
            const commentBuyerId = getOrCreateBuyerId(
              comment.authorName,
              comment.authorExternalId,
              comment.authorProfileUrl,
              comment.authorAvatarUrl,
              commentPhone?.e164
            );

            const directCommentUrl =
              comment.commentUrl ||
              buildDirectCommentUrl(
                source.platform,
                post.postUrl,
                comment.externalCommentId
              );

            const commentIntentId = id();
            txs.push(
              adminDb.tx.intents[commentIntentId]
                .create({
                  externalPostId: comment.externalCommentId,
                  title: commentAnalysis.titleEn,
                  summary: commentAnalysis.summaryEn,
                  originalText: comment.text,
                  translatedText: commentAnalysis.translatedTextEn,
                  platform: source.platform,
                  postUrl: directCommentUrl,
                  intentType: commentAnalysis.intentType,
                  category: commentAnalysis.category,
                  budget: commentAnalysis.budget,
                  urgency: commentAnalysis.urgency,
                  confidenceScore: commentAnalysis.confidenceScore,
                  matchedKeywords: JSON.stringify(commentAnalysis.matchedKeywords),
                  publishedAt: comment.publishedAt,
                  scrapedAt: now,
                  status: "open",
                  createdAt: now,
                  isComment: true,
                  commentUrl: directCommentUrl,
                  parentPostText: post.originalText,
                  parentAuthorName: post.authorName,
                  parentPostUrl: post.postUrl,
                })
                .link({ source: sourceId })
                .link({ buyer: commentBuyerId })
            );

            newIntentsFound++;
          }
        }
      }
    }
  }

  // Adaptive Interval & Exponential Decay Calculation
  let consecutiveEmptyScrapes = source.consecutiveEmptyScrapes || 0;
  let checkIntervalMinutes = source.checkIntervalMinutes || 30;
  const minInterval = source.minIntervalMinutes || 15;
  const maxInterval = source.maxIntervalMinutes || 1440; // max 24 hours
  const decayMultiplier = source.decayMultiplier || 1.5;

  if (newIntentsFound > 0) {
    // Reset decay if we found matching buyer or seller intents!
    consecutiveEmptyScrapes = 0;
    checkIntervalMinutes = minInterval;
  } else {
    // Apply exponential decay if no new intents were found
    consecutiveEmptyScrapes += 1;
    checkIntervalMinutes = Math.min(
      maxInterval,
      Math.round(checkIntervalMinutes * decayMultiplier)
    );
  }

  const nextScheduledScanAt = now + checkIntervalMinutes * 60 * 1000;
  const totalPostsScanned = (source.totalPostsScanned || 0) + rawPosts.length;
  const totalIntentsFound = (source.totalIntentsFound || 0) + newIntentsFound;

  // Update Source Stats and Adaptive Schedule
  txs.push(
    adminDb.tx.sources[sourceId].update({
      lastScrapedAt: now,
      checkIntervalMinutes,
      consecutiveEmptyScrapes,
      nextScheduledScanAt,
      totalPostsScanned,
      totalIntentsFound,
      status: "active",
    })
  );

  // Add Scan Log Entry
  const logId = id();
  txs.push(
    adminDb.tx.scan_logs[logId]
      .create({
        platform: source.platform,
        scrapedAt: now,
        postsFetched: rawPosts.length,
        intentsFound: newIntentsFound,
        nextScanInMinutes: checkIntervalMinutes,
        status: "success",
        message: `Scanned ${rawPosts.length} posts, found ${newIntentsFound} new buyer/seller intents. Next scan in ${checkIntervalMinutes} min.`,
      })
      .link({ source: sourceId })
  );

  if (txs.length > 0) {
    await adminDb.transact(txs);
  }

  // Schedule background scan with Upstash QStash
  await scheduleNextScanWithUpstash(sourceId, checkIntervalMinutes);

  return {
    sourceId,
    postsScanned: rawPosts.length,
    intentsFound: newIntentsFound,
    nextScanInMinutes: checkIntervalMinutes,
    nextScheduledScanAt,
  };
}
