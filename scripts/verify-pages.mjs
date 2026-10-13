import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

{
  const bundle = await readFile("dist/_worker.js/index.js", "utf8");
  if (/^import\s+.*from\s*["'](?:node:|react|hono)/m.test(bundle)) {
    throw new Error("Pages bundle contains an unresolved server dependency");
  }
  const { default: worker } = await import(pathToFileURL(resolve("dist/_worker.js/index.js")).href);
  const context = { waitUntil() {}, passThroughOnException() {} };
  const response = await worker.fetch(
    new Request("https://codesboxs-site.pages.dev/"),
    { ASSETS: { fetch: async () => new Response("asset") } },
    context,
  );
  const html = await response.text();
  if (response.status !== 200 || !html.includes('id="site-data"')) {
    throw new Error("Pages homepage does not render");
  }
  console.log("Pages bundle exists; homepage returns HTTP 200 with hydration data.");
}