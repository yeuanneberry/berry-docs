# Launch preparation

The Astro frontend remains static. A small first-party Worker prepares aggregate
statistics collection and an owner-only dashboard. No hosting account, production
database, deployment, domain purchase or DNS change has been made by this work.
Collection and indexing are disabled by default.

## Local proof

`pnpm check` validates source integrity, backend behavior, types, static pages,
metadata fixtures, desktop/phone browser behavior and local Wrangler routing.
The docs browser preview uses port 4332 and local Wrangler 4333, separate from
the website. Test data, owner credentials and example origins are synthetic.
No visitor analytics or external beacon is sent. Wrangler metrics are disabled.

Astro dev/preview does not apply `_headers`; local Wrangler proof is separate
from deployed edge acceptance. Local persistence is ignored and is never a
production database. See [analytics operations](ANALYTICS.md) for the collector,
privacy contract and maintenance requirements.

## Security policy

Astro emits a hashed CSP. The early native menu controller and configured-origin
WebSite JSON-LD have exact source hashes. No broad inline/eval allowance exists;
HTML event attributes are disabled and connections stay same-origin.

Four exact Shiki style strings remain attribute-only hashes in
`apps/web/security.mjs`. Astro emits its generic Shiki/CSP warning; browser checks
verify exact hashes, computed syntax colors and absence of CSP errors. Review
new theme styles instead of permitting arbitrary inline CSS.

`apps/web/public/_headers` supplies framing, MIME, referrer and feature
restrictions, plus HTTPS HSTS without subdomain/preload enrollment. Hash-named
Astro assets and versioned social cards use immutable caching. Its CSP header
contains only frame-ancestors to preserve Astro's exact script/style hashes.
Worker API/admin responses separately use no-store, noindex and restrictive CSP.

## Later launch

The owner must separately confirm documentation/website origins, deployment
authority, hosting processor, logging and backup retention, data region and cost
limits. Configure a dedicated docs database and a server-only owner secret;
never reuse the website database or expose that secret in frontend settings.
Verify HTTPS, owner authentication, rate caps, cron retention, deployed headers,
routing, social previews and indexing before enabling collection. The Privacy
page must describe the verified host/backup policy at that point.

`ANALYTICS_ENABLED=true` requires an indexable HTTPS build with explicit
crosslinks. The browser sends only on the configured exact HTTPS origin and
respects privacy signals/preferences. Runtime collection also requires explicit
enablement and its own production configuration. Retired CF_WEB_ANALYTICS
switches are rejected; no third-party beacon integration is present.

Local tests prove software behavior with synthetic data. They do not prove live
domain ownership, provider operational policy or production reporting. Preserve
an existing deployment for rollback when one eventually exists.
