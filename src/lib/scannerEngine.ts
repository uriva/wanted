import { id } from "@instantdb/admin";
import { adminDb } from "./adminDb";
import { analyzePostIntent, IntentAnalysisResult } from "./intentClassifier";
import { scheduleNextScanWithUpstash } from "./upstashScheduler";

const SCRAPE_CREATORS_API_KEY = process.env.SCRAPE_CREATORS_API_KEY || "4zCp1kzsF1UobT8aQlzgSCgTPZq2";

export interface NormalizedPost {
  externalPostId: string;
  authorName: string;
  authorExternalId: string;
  authorProfileUrl: string;
  authorAvatarUrl?: string;
  postUrl: string;
  originalText: string;
  publishedAt: number; // ms timestamp
}

export async function fetchPostsFromPlatform(
  platform: string,
  url: string,
  externalId: string
): Promise<NormalizedPost[]> {
  const posts: NormalizedPost[] = [];

  try {
    if (platform === "facebook") {
      const apiUrl = `https://api.scrapecreators.com/v1/facebook/group/posts?url=${encodeURIComponent(url)}`;
      const res = await fetch(apiUrl, {
        headers: { "x-api-key": SCRAPE_CREATORS_API_KEY },
      });
      if (res.ok) {
        const data = await res.json();
        if (data.success && Array.isArray(data.posts)) {
          for (const item of data.posts) {
            const author = item.author || {};
            const pubTime = item.publishTime ? item.publishTime * 1000 : (item.creation_time ? new Date(item.creation_time).getTime() : Date.now());
            posts.push({
              externalPostId: String(item.id || id()),
              authorName: author.name || author.short_name || "Facebook User",
              authorExternalId: String(author.id || author.name || "fb_anon"),
              authorProfileUrl: author.url || (author.id ? `https://www.facebook.com/${author.id}` : (item.url || url)),
              authorAvatarUrl: item.image || undefined,
              postUrl: item.url || item.permalink || url,
              originalText: item.text || "",
              publishedAt: pubTime,
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
            });
          }
        }
      }
    } else if (platform === "twitter") {
      const query = externalId || "hiring developer";
      const apiUrl = `https://api.scrapecreators.com/v1/twitter/search?query=${encodeURIComponent(query)}`;
      const res = await fetch(apiUrl, {
        headers: { "x-api-key": SCRAPE_CREATORS_API_KEY },
      });
      if (res.ok) {
        const data = await res.json();
        const tweets = data.tweets || data.data || [];
        if (Array.isArray(tweets)) {
          for (const item of tweets) {
            const author = item.user || item.author || {};
            posts.push({
              externalPostId: String(item.id || id()),
              authorName: author.name || author.screen_name || "X User",
              authorExternalId: String(author.id_str || author.screen_name || "x_anon"),
              authorProfileUrl: author.screen_name ? `https://x.com/${author.screen_name}` : "https://x.com",
              authorAvatarUrl: author.profile_image_url_https,
              postUrl: item.url || `https://x.com/i/status/${item.id}`,
              originalText: item.full_text || item.text || "",
              publishedAt: item.created_at ? new Date(item.created_at).getTime() : Date.now(),
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

export async function scanSource(sourceId: string) {
  // Query source, buyers, and existing intents from InstantDB for strict deduplication
  const { sources, buyers, intents } = await adminDb.query({
    sources: { $: { where: { id: sourceId } } },
    buyers: {},
    intents: {},
  });

  const source = sources[0];
  if (!source) {
    throw new Error(`Source not found with ID: ${sourceId}`);
  }

  // Create sets of existing post IDs and original text for fast deduplication
  const existingPostIds = new Set(intents.map((i) => i.externalPostId));
  const existingTextHashes = new Set(
    intents.map((i) => (i.originalText || "").trim().toLowerCase())
  );

  const rawPosts = await fetchPostsFromPlatform(source.platform, source.url, source.externalId);
  const now = Date.now();

  let newIntentsFound = 0;
  const txs: any[] = [];

  for (const post of rawPosts) {
    if (!post.originalText || post.originalText.trim().length < 5) continue;

    // Strict Deduplication Check: Skip if externalPostId or identical post text already exists
    const normalizedText = post.originalText.trim().toLowerCase();
    if (existingPostIds.has(post.externalPostId) || existingTextHashes.has(normalizedText)) {
      continue;
    }

    const analysis = await analyzePostIntent(post.originalText);

    if (analysis.hasIntent) {
      // Add to tracked sets to prevent duplicate in same batch
      existingPostIds.add(post.externalPostId);
      existingTextHashes.add(normalizedText);

      // Find or generate buyer
      let buyerId: string;
      const existingBuyer = buyers.find(
        (b) => b.platform === source.platform && b.externalAuthorId === post.authorExternalId
      );

      if (existingBuyer) {
        buyerId = existingBuyer.id;
        txs.push(
          adminDb.tx.buyers[buyerId].update({
            totalIntentPosts: (existingBuyer.totalIntentPosts || 1) + 1,
            updatedAt: now,
          })
        );
      } else {
        buyerId = id();
        txs.push(
          adminDb.tx.buyers[buyerId].create({
            name: post.authorName,
            platform: source.platform,
            externalAuthorId: post.authorExternalId,
            profileUrl: post.authorProfileUrl,
            avatarUrl: post.authorAvatarUrl,
            totalIntentPosts: 1,
            createdAt: now,
            updatedAt: now,
          })
        );
      }

      // Create Intent Entity
      const intentId = id();
      txs.push(
        adminDb.tx.intents[intentId]
          .create({
            externalPostId: post.externalPostId,
            title: analysis.titleEn,
            summary: analysis.summaryEn,
            originalText: post.originalText,
            translatedText: analysis.translatedTextEn,
            platform: source.platform,
            postUrl: post.postUrl,
            intentType: analysis.intentType,
            category: analysis.category,
            budget: analysis.budget,
            urgency: analysis.urgency,
            confidenceScore: analysis.confidenceScore,
            matchedKeywords: JSON.stringify(analysis.matchedKeywords),
            publishedAt: post.publishedAt,
            scrapedAt: now,
            status: "open",
            createdAt: now,
          })
          .link({ source: sourceId })
          .link({ buyer: buyerId })
      );

      newIntentsFound++;
    }
  }

  // Adaptive Interval & Exponential Decay Calculation
  let consecutiveEmptyScrapes = source.consecutiveEmptyScrapes || 0;
  let checkIntervalMinutes = source.checkIntervalMinutes || 30;
  const minInterval = source.minIntervalMinutes || 15;
  const maxInterval = source.maxIntervalMinutes || 1440; // max 24 hours
  const decayMultiplier = source.decayMultiplier || 1.5;

  if (newIntentsFound > 0) {
    // Reset decay if we found matching buyer intents!
    consecutiveEmptyScrapes = 0;
    checkIntervalMinutes = minInterval;
  } else {
    // Apply exponential decay if no new buyer intent posts were found
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
        message: `Scanned ${rawPosts.length} posts, found ${newIntentsFound} new buyer intents. Next scan in ${checkIntervalMinutes} min.`,
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
