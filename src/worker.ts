import { POST as handleDedupe } from "./app/api/dedupe/route.ts";
import { POST as handleScan } from "./app/api/scan/route.ts";
import { POST as handleWebhook } from "./app/api/webhook/route.ts";

type AssetFetcher = {
  fetch: (req: Request) => Promise<Response>;
};

type WorkerEnv = Record<string, string | AssetFetcher | undefined> & {
  ASSETS?: AssetFetcher;
};

const syncEnv = (env: WorkerEnv) => {
  const g = globalThis as unknown as { process?: { env?: Record<string, string> } };
  g.process ??= { env: {} };
  g.process.env ??= {};
  for (const [k, v] of Object.entries(env)) {
    if (typeof v === "string") {
      g.process.env[k] = v;
    }
  }
};

export const worker = {
  fetch: async (req: Request, env: WorkerEnv) => {
    syncEnv(env);
    const url = new URL(req.url);
    if (req.method === "POST") {
      if (url.pathname === "/api/webhook") return await handleWebhook(req);
      if (url.pathname === "/api/dedupe") return await handleDedupe();
      if (url.pathname === "/api/scan") return await handleScan(req);
    }
    if (env.ASSETS) {
      return await env.ASSETS.fetch(req);
    }
    return new Response("Not Found", { status: 404 });
  },
};

export default worker;
