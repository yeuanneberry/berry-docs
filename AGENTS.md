# Berry documentation reader

This repository owns the standalone reader. Read README.md, NOTICE.md and
docs/READER-MAINTENANCE.md before editing. Portfolio presentation belongs to
berry-website; canonical guides/configuration belong to berry-desktop.

- Keep Astro + React static output, all six generated chapters and stable
  `/docs/` and `/docs/[id]/` routes. `/` is the docs index. Do not add portfolio
  data/routes, ASCII artwork or sibling build/runtime imports.
- Never hand-edit generated chapters. Refresh only from the reviewed allowlist
  and committed desktop revision using scripts/sync-reader.py.
- Keep the `Berry docs` brand with page-specific titles/descriptions and social
  cards. The root alias canonicals to `/docs/` and stays outside the sitemap.
  External links open new tabs with noopener/noreferrer
  and accessible hints; local routes stay in place. WEBSITE_URL configures the
  independent website origin. Indexing requires an explicit non-loopback value.
- Use pinned pnpm dependencies and lockfile. Dev/preview use strict port 4322;
  browser tests use 4332 and local Wrangler 4333. Retain local shared config.
- Preserve default noindex and disabled analytics. Build settings do not prove
  deployment. Read docs/LAUNCH.md before CSP/Cloudflare changes. Keep exact early
  script and narrow syntax-style hashes; never allow unsafe-inline.
- First-party statistics use strict page/event/target allowlists and independent
  daily/monthly aggregate counters only. Never retain raw events, URLs, identifiers,
  IPs/hashes or joint visitor dimensions. Preserve DNT/GPC, per-origin opt-out and
  fail-closed storage handling. Read docs/ANALYTICS.md before changing collection.
  Admin is owner-only; no public statistics feed. Server secrets never enter builds.
- Preserve native heading links, URL history and focus. Mobile navigation uses
  native dialog and an early vanilla controller independent of optional animation
  downloads. Preserve no-JavaScript navigation, shared Lucide icons, visible
  focus, readable contrast, 44px controls and reduced motion.
- Keep credentials, live configuration, operational receipts, account setup,
  deployment actions and remote administration outside the reader.
- Use one writer per checkout. Prefer apply_patch. Shell commands must be one
  reliable physical line; complex logic belongs in a complete repository-owned
  script, validated and invoked explicitly. No shell heredoc file authoring.
- Validate with pnpm peers check and pnpm check. Inspect production screenshots
  at desktop/phone sizes after visual changes. Preserve approved artwork notices.
- No deployment, DNS/domain change, sign-in, remote mutation, commits, global
  changes or model experiments are authorized by the extraction task.
