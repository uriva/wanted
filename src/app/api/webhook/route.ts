import { NextResponse } from "next/server";
import { adminDb } from "@/lib/adminDb";
import { id } from "@instantdb/admin";
import { analyzePostForBuyerIntent } from "@/lib/intentClassifier";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      platform = "whatsapp",
      text,
      authorName = "Unknown User",
      authorExternalId = "anon",
      authorProfileUrl = "#",
      postUrl = "#",
      sourceName = "Inbound Webhook",
    } = body;

    if (!text || text.trim().length === 0) {
      return NextResponse.json({ success: false, error: "Text is required" }, { status: 400 });
    }

    const now = Date.now();
    const analysis = await analyzePostForBuyerIntent(text);

    if (!analysis.isBuyerIntent) {
      return NextResponse.json({
        success: true,
        matched: false,
        message: "Post processed, but did not match buyer intent criteria.",
        analysis,
      });
    }

    // Find existing buyer or create
    const { buyers, sources } = await adminDb.query({ buyers: {}, sources: {} });
    let existingSource = sources.find((s) => s.platform === platform);
    let sourceId: string;

    if (!existingSource) {
      sourceId = id();
      await adminDb.transact([
        adminDb.tx.sources[sourceId].create({
          platform,
          name: sourceName,
          url: postUrl,
          externalId: platform,
          status: "active",
          checkIntervalMinutes: 60,
          minIntervalMinutes: 15,
          maxIntervalMinutes: 1440,
          decayMultiplier: 1.5,
          consecutiveEmptyScrapes: 0,
          lastScrapedAt: now,
          nextScheduledScanAt: now + 60 * 60 * 1000,
          totalPostsScanned: 1,
          totalIntentsFound: 1,
          createdAt: now,
        }),
      ]);
    } else {
      sourceId = existingSource.id;
    }

    let buyerId: string;
    const existingBuyer = buyers.find((b) => b.platform === platform && b.externalAuthorId === authorExternalId);

    const txs: any[] = [];
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
          name: authorName,
          platform,
          externalAuthorId: authorExternalId,
          profileUrl: authorProfileUrl,
          totalIntentPosts: 1,
          createdAt: now,
          updatedAt: now,
        })
      );
    }

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
          publishedAt: now,
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
      analysis,
    });
  } catch (error: any) {
    console.error("Webhook processing error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
