import { NextResponse } from "next/server";
import { adminDb } from "@/lib/adminDb";
import { id } from "@instantdb/admin";
import { scanSource } from "@/lib/scannerEngine";
import { RELEVANT_FB_GROUPS } from "@/lib/relevantGroups";

export async function POST() {
  try {
    const now = Date.now();

    // Query existing sources
    const { sources } = await adminDb.query({ sources: {} });
    const existingExternalIds = new Set(sources.map((s) => s.externalId));

    const txs: any[] = [];
    const newSourceIds: string[] = [];

    // Seed whitelisted Supergreen scrapable FB groups
    for (const group of RELEVANT_FB_GROUPS) {
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
