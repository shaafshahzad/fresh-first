import assert from "node:assert/strict";
import test from "node:test";

async function render(pathname = "/") {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}-${pathname}`);
  const { default: worker } = await import(workerUrl.href);

  return worker.fetch(
    new Request(`http://localhost${pathname}`, {
      headers: { accept: "text/html" },
    }),
    {
      ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) },
    },
    { waitUntil() {}, passThroughOnException() {} },
  );
}

test("renders the Fresh First management experience", async () => {
  const response = await render("/");
  assert.equal(response.status, 200);
  const html = await response.text();
  assert.match(html, /Fresh First/);
  assert.match(html, /What should you use next/);
  assert.match(html, /Add something to the fridge/);
  assert.doesNotMatch(html, /codex-preview|SkeletonPreview|Create Next App/);
});

test("renders the dedicated fridge display", async () => {
  const response = await render("/display");
  assert.equal(response.status, 200);
  const html = await response.text();
  assert.match(html, /Use these next/);
  assert.match(html, /Manage list/);
});
