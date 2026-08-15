import { NextResponse } from "next/server";
import { adminDb } from "@/lib/adminDb";
import { scanSource } from "@/lib/scannerEngine";

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const { sourceId, forceAll } = body;

    const { sources } = await adminDb.query({ sources: {} });

    if (sourceId) {
      const result = await scanSource(sourceId);
      return NextResponse.json({ success: true, results: [result] });
    }

    const now = Date.now();
    const sourcesToScan = forceAll
      ? sources.filter((s) => s.platform !== "whatsapp")
      : sources.filter(
          (s) =>
            s.status === "active" &&
            s.platform !== "whatsapp" &&
            (s.nextScheduledScanAt || 0) > 0 &&
            (s.nextScheduledScanAt || 0) <= now
        );

    const results = [];
    for (const source of sourcesToScan) {
      try {
        const res = await scanSource(source.id);
        results.push(res);
      } catch (err: any) {
        console.error(`Error scanning source ${source.id}:`, err);
        results.push({ sourceId: source.id, error: err.message });
      }
    }

    return NextResponse.json({
      success: true,
      scannedCount: results.length,
      results,
    });
  } catch (error: any) {
    console.error("Scan endpoint error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
