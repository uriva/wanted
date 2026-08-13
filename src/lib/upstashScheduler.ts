import { Client } from "@upstash/qstash";

const QSTASH_TOKEN = process.env.QSTASH_TOKEN || "eyJVc2VySUQiOiI1ZThkZDg1NC03ODcwLTQ5MDAtYWIzNi1lNjU2ZDQzZTliMTQiLCJQYXNzd29yZCI6Ijk0ZjQ2ZThhZDg5NzQyODA4M2MxYTNlODIxMmU1YWRlIn0=";
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://wanted.uriva.deno.net";

export async function scheduleNextScanWithUpstash(sourceId: string, delayMinutes: number) {
  try {
    const qstash = new Client({ token: QSTASH_TOKEN });
    const targetUrl = `${APP_URL}/api/scan`;

    // QStash supports delay in seconds
    const delaySeconds = Math.max(10, Math.round(delayMinutes * 60));

    const res = await qstash.publishJSON({
      url: targetUrl,
      body: { sourceId },
      delay: delaySeconds,
    });

    const msgId = (res as any).messageId || (Array.isArray(res) ? res[0]?.messageId : "ok");
    console.log(`[Upstash QStash] Scheduled scan for source ${sourceId} in ${delayMinutes}m. ID: ${msgId}`);
    return res;
  } catch (err) {
    console.error(`[Upstash QStash] Error scheduling scan for source ${sourceId}:`, err);
  }
}
