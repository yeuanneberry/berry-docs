#!/usr/bin/env node
import { fileURLToPath } from "node:url";
import { mkdir, rm } from "node:fs/promises";
import sharp from "sharp";
import { pages } from "../apps/web/page-metadata.mjs";

const root = new URL("../", import.meta.url);
const destination = new URL("apps/web/public/og/", root);
await rm(destination, { recursive: true, force: true });
await mkdir(destination, { recursive: true });
const fontfile = fileURLToPath(new URL("apps/web/public/fonts/JetBrainsMono-Regular.ttf", root));
const portrait = await sharp(fileURLToPath(new URL("apps/web/src/assets/profile.png", root))).resize(144, 144).png().toBuffer();
const escape = text => text.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
const textImage = (text, size, width, color) => sharp({ text: {
  text: `<span foreground="${color}">${escape(text)}</span>`,
  font: `JetBrains Mono ${size}`, fontfile, width, rgba: true, spacing: 10,
} }).png().toBuffer();
const frame = Buffer.from('<svg width="1200" height="630"><rect x="32" y="32" width="1136" height="566" fill="none" stroke="#363d3b"/><path d="M88 516H1112" stroke="#8e977b" stroke-width="2"/></svg>');
for (const page of Object.values(pages)) {
  const [brand, label, title, description, path] = await Promise.all([
    textImage("berry docs", 30, 700, "#8e977b"),
    textImage(page.label, 20, 800, "#c3ac77"),
    textImage(page.heading, 46, 820, "#eee8d9"),
    textImage(page.description, 24, 960, "#b4b7aa"),
    textImage(page.path, 20, 980, "#d9d4c5"),
  ]);
  // Keep even the longest chapter heading clear of the description and frame.
  const titleHeight = (await sharp(title).metadata()).height;
  const descriptionHeight = (await sharp(description).metadata()).height;
  if (228 + titleHeight > 350 || 370 + descriptionHeight > 496) {
    throw new Error(`Social card text exceeds its reserved area: ${page.id}`);
  }
  await sharp({ create: { width: 1200, height: 630, channels: 4, background: "#191c1c" } })
    .composite([
      { input: frame }, { input: portrait, left: 968, top: 80 },
      { input: brand, left: 88, top: 85 }, { input: label, left: 88, top: 170 },
      { input: title, left: 88, top: 228 }, { input: description, left: 88, top: 370 },
      { input: path, left: 88, top: 548 },
    ]).png().toFile(fileURLToPath(new URL(`apps/web/public${page.image}`, root)));
}
// Retire the combined site's unversioned card instead of shipping stale previews.
await rm(new URL("apps/web/public/social-card.png", root), { force: true });
console.log(`Generated ${Object.keys(pages).length} page-specific 1200x630 social cards.`);
