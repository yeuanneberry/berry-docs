// Explicit build settings. Local and preview builds stay unindexed by default.
const configured = process.env.SITE_URL?.trim();
let url;
if (configured) {
  const parsed = new URL(configured);
  if (parsed.protocol !== "https:" || parsed.username || parsed.password || parsed.pathname !== "/" || parsed.search || parsed.hash) {
    throw new Error("SITE_URL must be an HTTPS origin without credentials, path, query or fragment.");
  }
  url = parsed.origin;
}
const indexing = process.env.SITE_INDEXABLE ?? "false";
if (!["true", "false"].includes(indexing)) throw new Error("SITE_INDEXABLE must be true or false.");
const indexable = indexing === "true";
if (indexable && !url) throw new Error("Indexable builds require SITE_URL.");
export const site = { url, indexable };

// Cross-application links are build-time origins, never runtime dependencies.
const configuredWebsite = process.env.WEBSITE_URL?.trim();
const website = new URL(configuredWebsite || "http://127.0.0.1:4321");
const loopback = website.hostname === "localhost" || website.hostname.endsWith(".localhost") || website.hostname.startsWith("127.") || website.hostname === "[::1]";
if ((website.protocol !== "https:" && !(website.protocol === "http:" && loopback)) || website.username || website.password || website.pathname !== "/" || website.search || website.hash) {
  throw new Error("WEBSITE_URL must be an HTTPS origin or HTTP loopback origin without credentials, path, query or fragment.");
}
if (indexable && (!configuredWebsite || loopback)) throw new Error("Indexable builds require an explicit non-loopback WEBSITE_URL.");
export const websiteURL = website.origin + "/";

if (process.env.CF_WEB_ANALYTICS_ENABLED !== undefined || process.env.CF_WEB_ANALYTICS_TOKEN !== undefined) {
  throw new Error("Cloudflare Web Analytics settings are retired. Use ANALYTICS_ENABLED for first-party statistics.");
}
const analyticsSetting = process.env.ANALYTICS_ENABLED ?? "false";
if (!["true", "false"].includes(analyticsSetting)) throw new Error("ANALYTICS_ENABLED must be true or false.");
export const analyticsEnabled = analyticsSetting === "true";
if (analyticsEnabled && (!indexable || !url)) {
  throw new Error("First-party statistics require an indexable HTTPS SITE_URL.");
}

export const websiteStructuredData = url ? JSON.stringify({
  "@context": "https://schema.org", "@type": "WebSite", "@id": `${url}/#website`,
  url: `${url}/docs/`, name: "Berry docs",
  description: "Six reviewed Berry guides for Linux application presets, customization, safe updates and recovery.",
}) : "";
