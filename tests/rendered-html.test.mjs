import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import test from "node:test";

async function render() {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);

  return worker.fetch(
    new Request("http://localhost/", {
      headers: { accept: "text/html" },
    }),
    {
      ASSETS: {
        fetch: async () => new Response("Not found", { status: 404 }),
      },
    },
    {
      waitUntil() {},
      passThroughOnException() {},
    },
  );
}

test("server-renders the transliteration workbench", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);

  const html = await response.text();
  assert.match(html, /<title>中古蒙漢音譯器<\/title>/);
  assert.match(html, /中古蒙漢音譯器/);
  assert.match(html, /学术转写/);
  assert.match(html, /英文近似/);
  assert.match(html, /秣驎/);
  assert.match(html, /29<\/span>/);
  assert.doesNotMatch(html, /codex-preview|SkeletonPreview|react-loading-skeleton/);
});

test("ships the complete reference data and removes the starter preview", async () => {
  const [data, previewFiles, packageJson] = await Promise.all([
    readFile(new URL("../app/transliteration-data.ts", import.meta.url), "utf8"),
    readdir(new URL("../app/_sites-preview/", import.meta.url)),
    readFile(new URL("../package.json", import.meta.url), "utf8"),
  ]);

  assert.deepEqual(previewFiles, []);
  const rhymeBlock = data.split("const RAW_RHYME_ROWS")[1].split("export const RHYME_ROWS")[0];
  const specialBlock = data.split("export const SPECIAL_TRANSLATIONS")[1];
  assert.equal((rhymeBlock.match(/{ label: "/g) ?? []).length, 23);
  assert.equal((specialBlock.match(/{ source: "/g) ?? []).length, 29);
  assert.match(data, /ongging čingseng/);
  assert.match(data, /a 列與 qa、xa、γa 有時互相通用/);
  assert.doesNotMatch(packageJson, /react-loading-skeleton/);
});
