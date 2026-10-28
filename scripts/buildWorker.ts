const rootDir = new URL("..", import.meta.url).pathname;
const distDir = `${rootDir}/dist`;
await Deno.mkdir(distDir, { recursive: true });

const apiDir = `${rootDir}/src/app/api`;
const workerFile = `${rootDir}/src/worker.ts`;
const workerDir = `${rootDir}/src/worker`;
const tmpDir = `${rootDir}/.tmp-build`;
await Deno.mkdir(tmpDir, { recursive: true });

await Deno.rename(apiDir, `${tmpDir}/api`);
await Deno.rename(workerFile, `${tmpDir}/worker.ts`);
await Deno.rename(workerDir, `${tmpDir}/worker`);
let nextBuild: Deno.CommandOutput;
try {
  nextBuild = await new Deno.Command("npx", {
    args: ["next", "build"],
    cwd: rootDir,
    stdout: "inherit",
    stderr: "inherit",
  }).output();
} finally {
  await Deno.rename(`${tmpDir}/api`, apiDir);
  await Deno.rename(`${tmpDir}/worker.ts`, workerFile);
  await Deno.rename(`${tmpDir}/worker`, workerDir);
  await Deno.remove(tmpDir, { recursive: true }).catch(() => {});
}
if (!nextBuild.success) {
  Deno.exit(nextBuild.code);
}

const workerOut = `${distDir}/worker.js`;
const bundle = await new Deno.Command("npx", {
  args: [
    "esbuild",
    "src/worker.ts",
    "--bundle",
    "--minify",
    "--platform=browser",
    "--format=esm",
    `--outfile=${workerOut}`,
    "--external:cloudflare:workers",
    "--external:node:*",
    "--alias:next/server=./src/worker/nextServerShim.ts",
    "--alias:@=./src",
  ],
  cwd: rootDir,
  stdout: "inherit",
  stderr: "inherit",
}).output();
if (!bundle.success) {
  Deno.exit(bundle.code);
}

const rawCode = await Deno.readTextFile(workerOut);
const header = `import { env as __cf_env } from "cloudflare:workers";
if (typeof globalThis.process === "undefined") {
  globalThis.process = { env: {} };
}
globalThis.process.env ??= {};
if (__cf_env && typeof __cf_env === "object") {
  for (const [k, v] of Object.entries(__cf_env)) {
    if (typeof v === "string") globalThis.process.env[k] = v;
  }
}
if (typeof globalThis.fetch === "function") {
  globalThis.fetch = globalThis.fetch.bind(globalThis);
}
if (typeof globalThis.clearTimeout === "function") {
  globalThis.clearTimeout = globalThis.clearTimeout.bind(globalThis);
}
if (typeof globalThis.clearInterval === "function") {
  globalThis.clearInterval = globalThis.clearInterval.bind(globalThis);
}
if (typeof globalThis.crypto !== "undefined" && globalThis.crypto.randomUUID) {
  const __orig_randomUUID = globalThis.crypto.randomUUID.bind(globalThis.crypto);
  let __uuid_counter = 0;
  globalThis.crypto.randomUUID = function() {
    try {
      return __orig_randomUUID();
    } catch (_err) {
      __uuid_counter++;
      return "00000000-0000-4000-8000-" + String(__uuid_counter).padStart(12, "0");
    }
  };
}
if (typeof globalThis.crypto !== "undefined" && globalThis.crypto.getRandomValues) {
  const __orig_getRandomValues = globalThis.crypto.getRandomValues.bind(globalThis.crypto);
  let __rv_counter = 1;
  globalThis.crypto.getRandomValues = function(arr) {
    try {
      return __orig_getRandomValues(arr);
    } catch (_err) {
      if (arr && typeof arr.length === "number") {
        for (let i = 0; i < arr.length; i++) {
          __rv_counter = (__rv_counter * 1664525 + 1013904223) >>> 0;
          arr[i] = __rv_counter & 0xff;
        }
      }
      return arr;
    }
  };
}
if (typeof globalThis.setTimeout !== "undefined") {
  const __orig_setTimeout = globalThis.setTimeout.bind(globalThis);
  globalThis.setTimeout = function(fn, ms, ...args) {
    try {
      return __orig_setTimeout(fn, ms, ...args);
    } catch (_err) {
      return 0;
    }
  };
}
if (typeof globalThis.setInterval !== "undefined") {
  const __orig_setInterval = globalThis.setInterval.bind(globalThis);
  globalThis.setInterval = function(fn, ms, ...args) {
    try {
      return __orig_setInterval(fn, ms, ...args);
    } catch (_err) {
      return 0;
    }
  };
}
`;
const patched = header + "\n" +
  rawCode
    .replaceAll(/![a-zA-Z0-9_$]+\.jitless/g, "false")
    .replaceAll("window.fetch", "globalThis.fetch")
    .replaceAll('typeof window<"u"&&!!window', "true");
await Deno.writeTextFile(workerOut, patched);
console.log(`Built ${workerOut} (${Math.round(patched.length / 1024)} KB) and static assets in ./out`);
