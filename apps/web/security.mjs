import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { websiteStructuredData } from "./site.config.mjs";

/** @param {string} text @returns {`sha256-${string}`} */
export const cspHash = text => `sha256-${createHash("sha256").update(text, "utf8").digest("base64")}`;
const navigation = readFileSync(new URL("./src/scripts/navigation.js", import.meta.url), "utf8");
// Reviewed Shiki palette emitted by the pinned Markdown processor. Browser checks
// verify exact hashes and colors in highlighted chapters; a new palette needs review.
const highlightedStyles = [
  "background-color:#24292e;color:#e1e4e8; overflow-x: auto;",
  "color:#B392F0", "color:#79B8FF", "color:#9ECBFF",
];

/** @type {NonNullable<import("astro").AstroUserConfig["security"]>["csp"]} */
export const csp = {
  directives: [
    "default-src 'self'", "base-uri 'self'", "object-src 'none'",
    "frame-src 'none'", "form-action 'none'",
    "connect-src 'self'",
  ],
  scriptDirective: {
    resources: [
      { resource: "'self'", kind: "element" }, { resource: "'none'", kind: "attribute" },
    ],
    hashes: [cspHash(navigation), ...(websiteStructuredData ? [cspHash(websiteStructuredData)] : [])].map(hash => ({ hash, kind: "element" })),
  },
  styleDirective: {
    resources: [{ resource: "'self'", kind: "element" }, { resource: "'unsafe-hashes'", kind: "attribute" }],
    hashes: highlightedStyles.map(value => ({ hash: cspHash(value), kind: "attribute" })),
  },
};
