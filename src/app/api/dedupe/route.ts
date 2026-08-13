import { NextResponse } from "next/server";
import { adminDb } from "@/lib/adminDb";

export async function POST() {
  try {
    const { intents } = await adminDb.query({ intents: {} });

    const seenPostIds = new Set<string>();
    const seenTextHashes = new Set<string>();
    const duplicateIdsToDelete: string[] = [];

    for (const item of intents) {
      const postId = item.externalPostId;
      const textHash = (item.originalText || "").trim().toLowerCase();

      if (
        (postId && seenPostIds.has(postId)) ||
        (textHash && seenTextHashes.has(textHash))
      ) {
        duplicateIdsToDelete.push(item.id);
      } else {
        if (postId) seenPostIds.add(postId);
        if (textHash) seenTextHashes.add(textHash);
      }
    }

    if (duplicateIdsToDelete.length > 0) {
      const txs = duplicateIdsToDelete.map((intentId) =>
        adminDb.tx.intents[intentId].delete()
      );
      await adminDb.transact(txs);
    }

    return NextResponse.json({
      success: true,
      removedDuplicatesCount: duplicateIdsToDelete.length,
      remainingIntentsCount: intents.length - duplicateIdsToDelete.length,
    });
  } catch (error: any) {
    console.error("Dedupe error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
