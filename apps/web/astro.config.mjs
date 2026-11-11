// @ts-check
import react from "@astrojs/react";
import { defineConfig } from "astro/config";
import { satteri } from "@astrojs/markdown-satteri";
import externalLinks from "./external-links.mjs";
import sitemap from "@astrojs/sitemap";
import { site } from "./site.config.mjs";
import { csp } from "./security.mjs";

// https://astro.build/config
export default defineConfig({
  site: site.url,
  integrations: [react(), ...(site.indexable ? [sitemap({ filter: page => new URL(page).pathname !== "/" && !page.endsWith("/404/") && !page.endsWith("/404.html") })] : [])],
  output: "static",
  server: { host: "127.0.0.1", port: 4322 },
  vite: { server: { strictPort: true }, preview: { strictPort: true } },
  security: { csp },
  markdown: { processor: satteri({ hastPlugins: [externalLinks] }) },
});
