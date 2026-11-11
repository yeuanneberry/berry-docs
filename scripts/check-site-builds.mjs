#!/usr/bin/env node
import assert from "node:assert/strict";
import { readFile, access } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";
import { pages } from "../apps/web/page-metadata.mjs";
import manifest from "../docs/reader-sources.json" with { type: "json" };

const root = new URL("../", import.meta.url);
const origin = "https://docs.example.test";
const website = "https://website.example.test";
const settings = { SITE_URL: origin, SITE_INDEXABLE: "true", WEBSITE_URL: website, ANALYTICS_ENABLED: "false" };
const escapeAttribute = value => value.replaceAll("&", "&amp;").replaceAll('"', "&quot;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
assert.equal(pages["docs-index"].label, `The field manual / ${String(manifest.chapters.length).padStart(2, "0")} chapters`);
assert.ok(pages["docs-index"].description.startsWith(`${manifest.chapters.length} reviewed Berry guides`));
for (const chapter of manifest.chapters) assert.equal(pages[`chapter-${chapter.id}`].description, chapter.description);
assert.equal(new Set(Object.values(pages).map(page => page.title)).size, Object.keys(pages).length);
assert.equal(new Set(Object.values(pages).map(page => page.description)).size, Object.keys(pages).length);
function config(overrides) {
  return spawnSync(process.execPath, ["--input-type=module", "--eval", "await import('./apps/web/site.config.mjs')"], {
    cwd: fileURLToPath(root), encoding: "utf8", env: { ...process.env, ...settings, ...overrides },
  });
}
for (const overrides of [
  { SITE_URL: "" }, { SITE_URL: "http://example.test" }, { SITE_URL: `${origin}/nested/` },
  { SITE_URL: "https://user:pass@example.test" }, { SITE_INDEXABLE: "yes" },
  { ANALYTICS_ENABLED: "yes" }, { ANALYTICS_ENABLED: "true", SITE_INDEXABLE: "false" },
  { CF_WEB_ANALYTICS_ENABLED: "false" }, { CF_WEB_ANALYTICS_TOKEN: "0".repeat(32) },
  ...["", "http://127.0.0.1:4321", "https://127.0.0.2", "https://localhost", "https://preview.localhost", "https://[::1]"].map(WEBSITE_URL => ({ WEBSITE_URL })),
  ...["http://example.test", "https://example.test/path", "https://user:pass@example.test", "https://example.test?x=1", "https://example.test#x", "javascript:alert(1)"].map(WEBSITE_URL => ({ WEBSITE_URL, SITE_INDEXABLE: "false" })),
]) assert.notEqual(config(overrides).status, 0, `Invalid build settings must fail: ${JSON.stringify(overrides)}`);
for (const WEBSITE_URL of ["", "http://localhost:4321", "http://preview.localhost:4321", "http://127.0.0.2:4321", "http://[::1]:4321", website]) {
  assert.equal(config({ WEBSITE_URL, SITE_INDEXABLE: "false", SITE_URL: "" }).status, 0);
}

for (const fixture of [
  { name: "local", url: "", indexable: false },
  { name: "preview", url: origin, indexable: false },
  { name: "production", url: origin, indexable: true },
  { name: "analytics", url: origin, indexable: true, analytics: true },
]) {
  const directory = new URL(`.cache/site-builds/${fixture.name}/`, root);
  const build = spawnSync("pnpm", ["--filter", "web", "build", "--outDir", fileURLToPath(directory)], {
    cwd: fileURLToPath(root), encoding: "utf8",
    env: { ...process.env, SITE_URL: fixture.url, WEBSITE_URL: website, SITE_INDEXABLE: String(fixture.indexable), ANALYTICS_ENABLED: String(Boolean(fixture.analytics)) },
  });
  if (build.status !== 0) throw new Error(build.stdout + build.stderr);
  const read = path => readFile(new URL(path, directory), "utf8");
  const home = await read("index.html");
  const missing = await read("404.html");
  const privacy = await read("privacy/index.html");
  assert.ok(privacy.includes(fixture.analytics ? "First-party statistics are enabled" : "First-party statistics are disabled"));
  assert.equal(home.includes('data-analytics-enabled="true"'), Boolean(fixture.analytics));
  assert.ok(!home.includes("cloudflareinsights.com"));
  assert.ok(home.includes(`href="${website}/"`));
  for (const route of ["about", "work", "code"]) await assert.rejects(access(new URL(`${route}/index.html`, directory)));
  assert.match(missing, /name="robots" content="noindex, nofollow"/);
  const imagePaths = new Set();
  for (const { page, output } of [
    ...Object.values(pages).map(page => ({ page, output: page.id === "page-not-found" ? "404.html" : `${page.path.slice(1)}index.html` })),
    { page: pages["docs-index"], output: "index.html" },
  ]) {
    const html = await read(output);
    const context = `${fixture.name}: ${output}`;
    assert.ok(html.includes(`<title>${escapeAttribute(page.title)}</title>`), `${context}: HTML title`);
    for (const [attribute, name, value] of [
      ["name", "description", page.description],
      ["property", "og:title", page.title], ["property", "og:description", page.description],
      ["name", "twitter:title", page.title], ["name", "twitter:description", page.description],
      ["property", "og:image:alt", page.imageAlt], ["name", "twitter:image:alt", page.imageAlt],
      ["property", "og:image", new URL(page.image, fixture.url || "http://localhost:4322").href],
      ["name", "twitter:image", new URL(page.image, fixture.url || "http://localhost:4322").href],
    ]) assert.ok(html.includes(`${attribute}="${name}" content="${escapeAttribute(value)}"`), `${context}: ${name}`);
    assert.match(page.image, /^\/og\/[a-z-]+-[a-f0-9]{16}\.png$/);
    imagePaths.add(page.image);
    const bytes = await readFile(new URL(page.image.slice(1), directory));
    assert.equal(bytes.subarray(0, 8).toString("hex"), "89504e470d0a1a0a");
    assert.deepEqual([bytes.readUInt32BE(16), bytes.readUInt32BE(20)], [1200, 630]);
    if (fixture.url && page.id !== "page-not-found") {
      assert.ok(html.includes(`rel="canonical" href="${origin}${page.path}"`), `${context}: canonical`);
      assert.ok(html.includes(`property="og:url" content="${origin}${page.path}"`), `${context}: OG URL`);
    } else {
      assert.doesNotMatch(html, /rel="canonical"/);
      assert.doesNotMatch(html, /property="og:url"/);
    }
  }
  assert.equal(imagePaths.size, Object.keys(pages).length);
  if (fixture.url) {
    assert.ok(home.includes(`rel="canonical" href="${origin}/docs/"`));
    const json = /<script[^>]*type="application\/ld\+json"[^>]*>(.*?)<\/script>/.exec(home)?.[1];
    assert.ok(json);
    const schema = JSON.parse(json);
    assert.equal(schema["@type"], "WebSite");
    assert.equal(schema.url, `${origin}/docs/`);
    assert.equal(schema.name, "Berry docs");
    assert.ok(!json.includes("SearchAction"));
    const hash = createHash("sha256").update(json).digest("base64");
    assert.ok(home.includes(`sha256-${hash}`), "Structured data is permitted by its exact CSP hash.");
  } else assert.ok(!home.includes('type="application/ld+json"'));
  if (fixture.indexable) {
    assert.match(home, /name="robots" content="index, follow"/);
    assert.ok((await read("robots.txt")).includes(`Sitemap: ${origin}/sitemap-index.xml`));
    const sitemap = await read("sitemap-0.xml");
    assert.ok(sitemap.includes(`${origin}/docs/`));
    assert.ok(sitemap.includes(`${origin}/docs/customize/`));
    assert.ok(!sitemap.includes(`<loc>${origin}/</loc>`), "Alias root must be excluded.");
    assert.doesNotMatch(sitemap, /\/work\/|\/code\/|\/about\/|404|localhost|127\.0\.0\.1/);
  } else {
    assert.match(home, /name="robots" content="noindex, nofollow"/);
    assert.equal(await read("robots.txt"), "User-agent: *\nDisallow: /\n");
    await assert.rejects(access(new URL("sitemap-index.xml", directory)));
  }
  console.log(`PASS ${fixture.name}: page metadata, versioned social cards, structured data, canonical alias, indexing and statistics state`);
}
console.log("PASS standalone routes and safe build settings");
