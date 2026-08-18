import { NextResponse } from "next/server";
import { adminDb } from "@/lib/adminDb";
import { id } from "@instantdb/admin";
import { analyzePostIntent } from "@/lib/intentClassifier";
import { extractSuggestedSourcesFromText } from "@/lib/scannerEngine";
import { extractPhoneInfo } from "@/lib/phoneUtils";
import {
  assignThreadForMessage,
  formatContextTranscript,
  injectGetMessageByWaMsgId,
  injectThreadAssignmentDetector,
  threadAssignmentSystemPrompt,
  toTextSearch,
  type ContextMessageItem,
  type MessageLike,
} from "@uri/chat-threads";

// Exact full-word keywords that identify a relevant WhatsApp tech/business/automation group
const RELEVANT_GROUP_KEYWORDS = [
  "automation", "אוטומציה", "ai", "בינה מלאכותית", "dev", "פיתוח", "software", "תוכנה",
  "tech", "טכנולוגיה", "code", "קודינג", "freelance", "פרילנס", "business", "עסקים",
  "marketing", "שיווק", "hiring", "דרושים", "mcp", "n8n", "make",
  "bot", "בוט", "claude", "קלוד", "openclaw", "vibe coding", "buyers", "wanted",
  "startups", "סטארטאפ"
];

// Groups explicitly excluded from coverage
const EXCLUDED_GROUP_KEYWORDS = [
  "prompt2bot",
];

function isRelevantGroup(chatId: string, groupTitle: string): boolean {
  // Ignore personal 1:1 DMs (ending with @c.us without group title)
  if (chatId.endsWith("@c.us") && !groupTitle) {
    return false;
  }

  if (!groupTitle) return false;

  const lowerTitle = groupTitle.toLowerCase();

  // Check exclusions first
  if (EXCLUDED_GROUP_KEYWORDS.some((kw) => lowerTitle.includes(kw.toLowerCase()))) {
    return false;
  }

  // Check exact word or explicit keyword match
  return RELEVANT_GROUP_KEYWORDS.some((kw) => {
    const regex = new RegExp(`(?:^|\\s|_|-|\\|)${kw.toLowerCase()}(?:$|\\s|_|-|\\|)`, "i");
    return regex.test(lowerTitle) || lowerTitle.includes(kw.toLowerCase());
  });
}

const geminiThreadDetector = async (userPrompt: string) => {
  try {
    const key = process.env.GEMINI_API_KEY || "";
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.7-flash:generateContent?key=${key}`;
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [
          { role: "user", parts: [{ text: `${threadAssignmentSystemPrompt}\n\n${userPrompt}` }] },
        ],
        generationConfig: { responseMimeType: "application/json" },
      }),
    });
    if (res.ok) {
      const data = await res.json();
      const rawJson = data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (rawJson) {
        const parsed = JSON.parse(rawJson);
        return {
          continuesIndex:
            typeof parsed.continuesIndex === "number" ? parsed.continuesIndex : null,
        };
      }
    }
  } catch (e) {
    console.error("[ThreadAssignment] Gemini error:", e);
  }
  return { continuesIndex: null };
};

const getDbMessageByWaMsgId = async (waMsgId: string): Promise<MessageLike | null> => {
  const { messages } = await adminDb.query({
    messages: {
      $: { where: { waMsgId }, limit: 1 },
    },
  });
  if (!messages || messages.length === 0) return null;
  const m = messages[0];
  return {
    id: m.id,
    chatId: m.chatId,
    authorId: m.authorId,
    authorName: m.authorName,
    text: m.text,
    time: m.time,
    waMsgId: m.waMsgId,
    quotedWaMsgId: m.quotedWaMsgId,
  };
};

export async function POST(req: Request) {
  try {
    const body = await req.json();

    // Support Supergreen payload format as well as generic webhook format
    let platform = body.network || body.platform || "whatsapp";
    let text = body.text || "";
    let authorName = body.author?.username || body.author?.name || body.authorName || "WhatsApp User";
    let authorExternalId = body.author?.id || body.authorExternalId || "supergreen_anon";
    let sourceName = body.chat?.title || body.sourceName || `Supergreen ${platform}`;
    let chatId = body.chat?.id || body.chatId || "supergreen_chat";
    let publishedAt = body.time ? Number(body.time) : Date.now();
    let waMsgId = body.messageId || body.id || body.waMsgId;
    let quotedWaMsgId = body.quotedMsgId || body.quotedMessageId || body.quotedWaMsgId;
    let authorAvatarUrl =
      body.authorAvatarUrl ||
      body.author?.avatar ||
      body.author?.avatarUrl ||
      body.author?.image ||
      body.author?.profile_picture ||
      body.author?.picture;

    // Filter WhatsApp groups: ONLY process messages from relevant tech/business/automation groups!
    if (platform === "whatsapp" && !isRelevantGroup(chatId, sourceName)) {
      console.log(`[Webhook] Ignoring message from off-topic WhatsApp group: "${sourceName}" (${chatId})`);
      return NextResponse.json({
        success: true,
        matched: false,
        ignoredGroup: true,
        message: `Ignored off-topic WhatsApp group: "${sourceName}"`,
      });
    }

    // Construct profile / chat link
    let profileUrl = body.authorProfileUrl || "#";
    if (platform === "facebook" && authorExternalId && /^\d+$/.test(authorExternalId)) {
      profileUrl = `https://www.facebook.com/${authorExternalId}`;
    } else if (platform === "whatsapp" && authorExternalId.includes("@")) {
      const phone = authorExternalId.split("@")[0];
      profileUrl = `https://wa.me/${phone}`;
    }

    let postUrl = body.postUrl || profileUrl;

    if (!text || text.trim().length < 2) {
      return NextResponse.json({ success: false, error: "Text too short or missing" }, { status: 400 });
    }

    const now = Date.now();
    const normalizedText = text.trim().toLowerCase();

    // Check existing intents and sources in InstantDB for strict deduplication
    const { intents, buyers, sources } = await adminDb.query({
      intents: {},
      buyers: {},
      sources: {},
    });

    // Detect and extract any shared WhatsApp group/channel or Facebook group links as suggested sources for review
    const detectedSources = extractSuggestedSourcesFromText(text);
    const existingSourceUrls = new Set(sources.map((s) => s.url?.toLowerCase().replace(/\/$/, "")));
    const existingSourceExternalIds = new Set(sources.map((s) => s.externalId?.toLowerCase()));

    for (const suggested of detectedSources) {
      const cleanUrl = suggested.url.toLowerCase().replace(/\/$/, "");
      const cleanId = suggested.externalId.toLowerCase();
      if (!existingSourceUrls.has(cleanUrl) && !existingSourceExternalIds.has(cleanId)) {
        existingSourceUrls.add(cleanUrl);
        existingSourceExternalIds.add(cleanId);

        const newSuggestedSourceId = id();
        await adminDb.transact([
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
          }),
        ]);
      }
    }

    const isDuplicate = intents.some(
      (i) => (i.originalText || "").trim().toLowerCase() === normalizedText
    );

    if (isDuplicate) {
      return NextResponse.json({
        success: true,
        matched: false,
        duplicate: true,
        message: "Post already processed (duplicate).",
      });
    }

    let threadContextTranscript = "";
    let threadId: string | null = null;

    if (platform === "whatsapp") {
      // 1. Save message entity in InstantDB
      const msgId = id();
      await adminDb.transact([
        adminDb.tx.messages[msgId].create({
          chatId,
          chatName: sourceName,
          authorId: authorExternalId,
          authorName,
          text,
          textSearch: toTextSearch(text),
          time: publishedAt,
          waMsgId,
          quotedWaMsgId,
          avatar: authorAvatarUrl,
          createdAt: now,
        }),
      ]);

      // 2. Query recent messages in chat for context threading
      const { messages: recentDbMessages, threads: existingThreads } = await adminDb.query({
        messages: {
          $: { where: { chatId }, order: { time: "desc" }, limit: 25 },
          thread: {},
        },
        threads: {
          $: { where: { chatId }, order: { lastMessageAt: "desc" }, limit: 25 },
        },
      });

      const sortedRecent = (recentDbMessages || [])
        .filter((m: any) => m.id !== msgId)
        .sort((a: any, b: any) => a.time - b.time);

      const contextItems: ContextMessageItem<MessageLike>[] = sortedRecent.map((m: any) => ({
        msgId: m.id,
        threadId: m.thread?.id || null,
        message: {
          id: m.id,
          chatId: m.chatId,
          authorId: m.authorId,
          authorName: m.authorName,
          text: m.text,
          time: m.time,
          waMsgId: m.waMsgId,
          quotedWaMsgId: m.quotedWaMsgId,
        },
      }));

      // 3. Assign message to thread with @uri/chat-threads
      const newMessageLike: MessageLike = {
        id: msgId,
        chatId,
        authorId: authorExternalId,
        authorName,
        text,
        time: publishedAt,
        waMsgId,
        quotedWaMsgId,
      };

      const assignResult = await injectThreadAssignmentDetector(geminiThreadDetector)(async () => {
        return injectGetMessageByWaMsgId(getDbMessageByWaMsgId)(async () => {
          return assignThreadForMessage(msgId, newMessageLike, contextItems, {
            createThread: async () => {
              const newTid = id();
              await adminDb.transact([
                adminDb.tx.threads[newTid].create({
                  chatId,
                  chatName: sourceName,
                  lastMessageAt: publishedAt,
                  createdAt: publishedAt,
                }),
              ]);
              return newTid;
            },
          });
        })();
      })();

      threadId = assignResult.threadId;

      if (threadId) {
        // Link message to thread and update thread lastMessageAt
        await adminDb.transact([
          adminDb.tx.messages[msgId].link({ thread: threadId }),
          adminDb.tx.threads[threadId].update({ lastMessageAt: publishedAt }),
        ]);

        // Build transcript of the thread so far
        const { threads: threadDetails } = await adminDb.query({
          threads: {
            $: { where: { id: threadId }, limit: 1 },
            messages: { $: { order: { time: "asc" } } },
          },
        });

        const threadMsgs = threadDetails?.[0]?.messages || [];
        if (threadMsgs.length > 1) {
          const priorMsgs = threadMsgs.filter((m: any) => m.id !== msgId);
          threadContextTranscript = formatContextTranscript(priorMsgs);
        }
      }
    }

    // Run Gemini AI Buyer / Seller Intent Classification with conversation thread context
    const analysis = await analyzePostIntent(text, threadContextTranscript);

    if (!analysis.hasIntent) {
      return NextResponse.json({
        success: true,
        matched: false,
        message: "Post processed, but did not match buyer or seller intent criteria.",
        analysis,
        threadId,
      });
    }

    // Find or create source entity
    let sourceId: string;
    let existingSource = sources.find((s) => s.externalId === chatId || s.name === sourceName);

    if (!existingSource) {
      sourceId = id();
      await adminDb.transact([
        adminDb.tx.sources[sourceId].create({
          platform,
          name: sourceName,
          url: postUrl,
          externalId: chatId,
          status: "active",
          checkIntervalMinutes: 60,
          minIntervalMinutes: 15,
          maxIntervalMinutes: 1440,
          decayMultiplier: 1.5,
          consecutiveEmptyScrapes: 0,
          lastScrapedAt: now,
          nextScheduledScanAt: 0,
          totalPostsScanned: 1,
          totalIntentsFound: 1,
          createdAt: now,
        }),
      ]);
    } else {
      sourceId = existingSource.id;
      await adminDb.transact([
        adminDb.tx.sources[sourceId].update({
          lastScrapedAt: now,
          totalPostsScanned: (existingSource.totalPostsScanned || 0) + 1,
          totalIntentsFound: (existingSource.totalIntentsFound || 0) + 1,
        }),
      ]);
    }

    // Extract contact phone info
    const phoneInfo = extractPhoneInfo(text, authorExternalId);
    const contactInfo = phoneInfo?.e164;

    // Find or create buyer entity
    let buyerId: string;
    const existingBuyer = buyers.find((b) => b.externalAuthorId === authorExternalId);

    const txs: any[] = [];
    if (existingBuyer) {
      buyerId = existingBuyer.id;
      const updateData: any = {
        totalIntentPosts: (existingBuyer.totalIntentPosts || 1) + 1,
        updatedAt: now,
      };
      if (contactInfo && (!existingBuyer.contactInfo || existingBuyer.contactInfo.length < 5)) {
        updateData.contactInfo = contactInfo;
      }
      if (authorAvatarUrl && (!existingBuyer.avatarUrl || existingBuyer.avatarUrl.length < 5)) {
        updateData.avatarUrl = authorAvatarUrl;
      }
      if (profileUrl && (!existingBuyer.profileUrl || existingBuyer.profileUrl === "#")) {
        updateData.profileUrl = profileUrl;
      }
      txs.push(adminDb.tx.buyers[buyerId].update(updateData));
    } else {
      buyerId = id();
      txs.push(
        adminDb.tx.buyers[buyerId].create({
          name: authorName,
          platform,
          externalAuthorId: authorExternalId,
          profileUrl,
          avatarUrl: authorAvatarUrl,
          contactInfo,
          totalIntentPosts: 1,
          createdAt: now,
          updatedAt: now,
        })
      );
    }

    // Create Intent entity
    const intentId = id();
    const intentTx = adminDb.tx.intents[intentId]
      .create({
        externalPostId: waMsgId || id(),
        title: analysis.titleEn,
        summary: analysis.summaryEn,
        originalText: text,
        translatedText: analysis.translatedTextEn,
        platform,
        postUrl,
        intentType: analysis.intentType,
        category: analysis.category,
        budget: analysis.budget,
        urgency: analysis.urgency,
        confidenceScore: analysis.confidenceScore,
        matchedKeywords: JSON.stringify(analysis.matchedKeywords),
        publishedAt,
        scrapedAt: now,
        status: "open",
        createdAt: now,
      })
      .link({ source: sourceId })
      .link({ buyer: buyerId });

    if (threadId) {
      intentTx.link({ thread: threadId });
    }

    txs.push(intentTx);

    await adminDb.transact(txs);

    return NextResponse.json({
      success: true,
      matched: true,
      intentId,
      buyerId,
      sourceId,
      threadId,
      analysis,
    });
  } catch (error: any) {
    console.error("Webhook processing error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
