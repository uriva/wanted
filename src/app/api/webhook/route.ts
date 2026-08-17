import { NextResponse } from "next/server";
import { adminDb } from "@/lib/adminDb";
import { id } from "@instantdb/admin";
import { analyzePostIntent } from "@/lib/intentClassifier";

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

    if (!text || text.trim().length < 5) {
      return NextResponse.json({ success: false, error: "Text too short or missing" }, { status: 400 });
    }

    const now = Date.now();
    const normalizedText = text.trim().toLowerCase();

    // Check existing intents in InstantDB for strict deduplication
    const { intents, buyers, sources } = await adminDb.query({
      intents: {},
      buyers: {},
      sources: {},
    });

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

    // Run Gemini AI Buyer / Seller Intent Classification
    const analysis = await analyzePostIntent(text);

    if (!analysis.hasIntent) {
      return NextResponse.json({
        success: true,
        matched: false,
        message: "Post processed, but did not match buyer or seller intent criteria.",
        analysis,
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
          totalIntentPosts: 1,
          createdAt: now,
          updatedAt: now,
        })
      );
    }

    // Create Intent entity
    const intentId = id();
    txs.push(
      adminDb.tx.intents[intentId]
        .create({
          externalPostId: id(),
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
        .link({ buyer: buyerId })
    );

    await adminDb.transact(txs);

    return NextResponse.json({
      success: true,
      matched: true,
      intentId,
      buyerId,
      sourceId,
      analysis,
    });
  } catch (error: any) {
    console.error("Webhook processing error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
