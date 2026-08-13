import { NextResponse } from "next/server";
import { adminDb } from "@/lib/adminDb";
import { id } from "@instantdb/admin";
import { scanSource } from "@/lib/scannerEngine";

// Verified scrapable groups fetched from Supergreen account
const SUPERGREEN_SCRAPABLE_FB_GROUPS = [
  { externalId: "talkingautomation", name: "מדברים אוטומציה", url: "https://www.facebook.com/groups/talkingautomation" },
  { externalId: "aibusinesstools", name: "AI Agents | N8N | OpenClaw | Automation", url: "https://www.facebook.com/groups/aibusinesstools" },
  { externalId: "cladue", name: "קלוד (Claude) - הקהילה הישראלית 🇮🇱", url: "https://www.facebook.com/groups/cladue" },
  { externalId: "aisrael", name: "AI ISRAEL", url: "https://www.facebook.com/groups/aisrael" },
  { externalId: "1266824747259615", name: "AI Agents Israel", url: "https://www.facebook.com/groups/1266824747259615" },
  { externalId: "vibecodingai", name: "Vibe Coding", url: "https://www.facebook.com/groups/vibecodingai" },
  { externalId: "1684554685829832", name: "Vibe Coding - Israel", url: "https://www.facebook.com/groups/1684554685829832" },
  { externalId: "2753636021674871", name: "Claude Code & OpenClaw & Vibe Coding", url: "https://www.facebook.com/groups/2753636021674871" },
  { externalId: "1427869272255595", name: "Best AI Agents Community", url: "https://www.facebook.com/groups/1427869272255595" },
  { externalId: "aisaas", name: "Artificial Intelligence LLMs", url: "https://www.facebook.com/groups/aisaas" },
  { externalId: "claudeaicommunity", name: "Claude Ai Community", url: "https://www.facebook.com/groups/claudeaicommunity" },
  { externalId: "482067651607538", name: "אופק עסקי | אוטומציה ובינה מלאכותית", url: "https://www.facebook.com/groups/482067651607538" },
  { externalId: "1657329921376731", name: "אוטומציה - עסקים אוטונומיים", url: "https://www.facebook.com/groups/1657329921376731" },
];

export async function POST() {
  try {
    const now = Date.now();

    // Query existing sources
    const { sources } = await adminDb.query({ sources: {} });
    const existingExternalIds = new Set(sources.map((s) => s.externalId));

    const txs: any[] = [];
    const newSourceIds: string[] = [];

    // Add all Supergreen scrapable FB groups if not already present
    for (const group of SUPERGREEN_SCRAPABLE_FB_GROUPS) {
      if (!existingExternalIds.has(group.externalId)) {
        const sourceId = id();
        newSourceIds.push(sourceId);
        txs.push(
          adminDb.tx.sources[sourceId].create({
            platform: "facebook",
            name: group.name,
            url: group.url,
            externalId: group.externalId,
            status: "active",
            checkIntervalMinutes: 15,
            minIntervalMinutes: 15,
            maxIntervalMinutes: 1440,
            decayMultiplier: 1.5,
            consecutiveEmptyScrapes: 0,
            lastScrapedAt: now,
            nextScheduledScanAt: now,
            totalPostsScanned: 0,
            totalIntentsFound: 0,
            createdAt: now,
          })
        );
      }
    }

    // Add Reddit if not present
    if (!existingExternalIds.has("freelance")) {
      const redditSourceId = id();
      newSourceIds.push(redditSourceId);
      txs.push(
        adminDb.tx.sources[redditSourceId].create({
          platform: "reddit",
          name: "r/freelance",
          url: "https://www.reddit.com/r/freelance",
          externalId: "freelance",
          status: "active",
          checkIntervalMinutes: 30,
          minIntervalMinutes: 15,
          maxIntervalMinutes: 1440,
          decayMultiplier: 1.5,
          consecutiveEmptyScrapes: 0,
          lastScrapedAt: now,
          nextScheduledScanAt: now,
          totalPostsScanned: 0,
          totalIntentsFound: 0,
          createdAt: now,
        })
      );
    }

    // Add Twitter if not present
    if (!existingExternalIds.has("hiring developer")) {
      const twitterSourceId = id();
      newSourceIds.push(twitterSourceId);
      txs.push(
        adminDb.tx.sources[twitterSourceId].create({
          platform: "twitter",
          name: "X/Twitter: #Hiring & WTB",
          url: "https://x.com/search?q=hiring%20developer",
          externalId: "hiring developer",
          status: "active",
          checkIntervalMinutes: 60,
          minIntervalMinutes: 15,
          maxIntervalMinutes: 1440,
          decayMultiplier: 1.5,
          consecutiveEmptyScrapes: 0,
          lastScrapedAt: now,
          nextScheduledScanAt: now,
          totalPostsScanned: 0,
          totalIntentsFound: 0,
          createdAt: now,
        })
      );
    }

    if (txs.length > 0) {
      await adminDb.transact(txs);
    }

    // Perform initial scan on all active sources
    const { sources: updatedSources } = await adminDb.query({ sources: {} });
    const scanResults = [];

    for (const source of updatedSources) {
      try {
        const res = await scanSource(source.id);
        scanResults.push(res);
      } catch (err: any) {
        console.error(`Error scanning source ${source.name}:`, err);
        scanResults.push({ sourceId: source.id, name: source.name, error: err.message });
      }
    }

    return NextResponse.json({
      success: true,
      message: `Seeded ${newSourceIds.length} new sources from Supergreen and executed scan across ${updatedSources.length} sources.`,
      sourcesCount: updatedSources.length,
      scanResults,
    });
  } catch (error: any) {
    console.error("Seed error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
