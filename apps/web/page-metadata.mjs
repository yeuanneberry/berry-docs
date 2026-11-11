import { createHash } from "node:crypto";
import manifest from "../../docs/reader-sources.json" with { type: "json" };

// Metadata is included in each version. Bump after template, artwork or font changes.
const visualVersion = "berry-docs-og-v2";

const chapterCount = manifest.chapters.length;
export const documentationDescription = `${chapterCount} reviewed Berry guides for Linux application presets, customization, safe updates and recovery.`;
// Reader presentation belongs here; canonical chapter headings stay in the source guides.
const chapterTitles = {
  overview: "Berry Linux presets: overview",
  start: "Set up your first application preset",
  customize: "Customize your Linux configuration",
  "apply-recover": "Apply and recover application presets",
  update: "Update your configuration safely",
  reference: "Configuration files and troubleshooting",
};
const definitions = [
  { id: "docs-index", path: "/docs/", heading: "Linux presets, setup and recovery", title: "Linux presets, setup and recovery | Berry docs", description: documentationDescription, label: `The field manual / ${String(chapterCount).padStart(2, "0")} chapters` },
  { id: "privacy", path: "/privacy/", heading: "Privacy", title: "Privacy | Berry docs", description: "How Berry docs handles aggregate site statistics, privacy preferences and hosting request information.", label: "Your privacy" },
  ...manifest.chapters.map(chapter => {
    const heading = chapterTitles[chapter.id];
    if (!heading) throw new Error(`Missing reader metadata title: ${chapter.id}`);
    return { id: `chapter-${chapter.id}`, path: `/docs/${chapter.id}/`, heading, title: `${heading} | Berry docs`, description: chapter.description, label: `Chapter ${String(chapter.order).padStart(2, "0")} / ${chapter.group}` };
  }),
  { id: "page-not-found", path: "/404.html", heading: "Page not found", title: "Page not found | Berry docs", description: `This Berry documentation address could not be found. Browse the ${chapterCount}-chapter manual to continue reading.`, label: "Return to the manual" },
];

export const pages = Object.fromEntries(definitions.map(page => {
  const version = createHash("sha256").update(visualVersion).update(JSON.stringify(page)).digest("hex").slice(0, 16);
  return [page.id, { ...page, image: `/og/${page.id}-${version}.png`, imageAlt: `${page.heading} — Berry docs. ${page.description}` }];
}));

export function metadataFor(id) {
  const page = pages[id];
  if (!page) throw new Error(`Unknown documentation page metadata: ${id}`);
  return page;
}
