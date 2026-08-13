import { NextResponse } from "next/server";
import { adminDb } from "@/lib/adminDb";
import { scanSource } from "@/lib/scannerEngine";

export async function GET(req: Request) {
  try {
    const authHeader = req.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET;

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const { sources } = await adminDb.query({ sources: {} });
    const now = Date.now();

    // Find all active sources due for a scan based on adaptive nextScheduledScanAt
    const dueSources = sources.filter(
      (s) => s.status === "active" && (s.nextScheduledScanAt || 0) <= now
    );

    const results = [];
    for (const source of dueSources) {
      try {
        const res = await scanSource(source.id);
        results.push(res);
      } catch (err: any) {
        console.error(`Cron scan error for source ${source.name}:`, err);
        results.push({ sourceId: source.id, name: source.name, error: err.message });
      }
    }

    return NextResponse.json({
      success: true,
      timestamp: now,
      dueSourcesCount: dueSources.length,
      scannedResults: results,
    });
  } catch (error: any) {
    console.error("Cron route error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
