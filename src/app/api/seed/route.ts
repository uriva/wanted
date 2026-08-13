import { NextResponse } from "next/server";
import { adminDb } from "@/lib/adminDb";
import { id } from "@instantdb/admin";
import { scanSource } from "@/lib/scannerEngine";

export async function POST() {
  try {
    const now = Date.now();

    // Check if sources already exist
    const { sources } = await adminDb.query({ sources: {} });

    let facebookSourceId: string;
    let redditSourceId: string;
    let twitterSourceId: string;
    let whatsappSourceId: string;

    if (sources.length === 0) {
      facebookSourceId = id();
      redditSourceId = id();
      twitterSourceId = id();
      whatsappSourceId = id();

      const txs = [
        adminDb.tx.sources[facebookSourceId].create({
          platform: "facebook",
          name: "אוטומציה - עסקים אוטונומיים",
          url: "https://www.facebook.com/groups/1657329921376731",
          externalId: "1657329921376731",
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
        }),
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
        }),
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
        }),
        adminDb.tx.sources[whatsappSourceId].create({
          platform: "whatsapp",
          name: "WhatsApp: Tech & Automation Leads",
          url: "https://chat.whatsapp.com/sample-group-invite",
          externalId: "wa_group_01",
          status: "active",
          checkIntervalMinutes: 120,
          minIntervalMinutes: 30,
          maxIntervalMinutes: 1440,
          decayMultiplier: 1.5,
          consecutiveEmptyScrapes: 0,
          lastScrapedAt: now,
          nextScheduledScanAt: now + 120 * 60 * 1000,
          totalPostsScanned: 0,
          totalIntentsFound: 0,
          createdAt: now,
        }),
      ];

      await adminDb.transact(txs);
    } else {
      facebookSourceId = sources.find((s) => s.platform === "facebook")?.id || sources[0].id;
    }

    // Trigger immediate scan on Facebook group
    const scanResult = await scanSource(facebookSourceId);

    return NextResponse.json({
      success: true,
      message: "Seeded initial sources and performed scan.",
      scanResult,
    });
  } catch (error: any) {
    console.error("Seed error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
