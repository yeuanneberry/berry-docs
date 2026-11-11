# Site build settings

The reader builds independently. No domain, DNS record, hosting project or
deployment is created by a build. Local/preview builds remain unindexed.

| Variable | Default | Meaning |
| --- | --- | --- |
| `SITE_URL` | unset | Documentation HTTPS origin without credentials/path/query/fragment |
| `SITE_INDEXABLE` | `false` | Emit indexable metadata and sitemap only when `true` |
| `WEBSITE_URL` | `http://127.0.0.1:4321` | Independent portfolio origin for crosslinks |
| `ANALYTICS_ENABLED` | `false` | Include eligible first-party collection; requires an indexable HTTPS build |

WEBSITE_URL accepts HTTPS origins or HTTP loopback origins (`localhost`,
`127.0.0.1`, `[::1]`) without credentials/path/query/fragment. Indexable builds
require explicit non-loopback WEBSITE_URL and explicit SITE_URL. No production
domain is assumed. For a synthetic source-only production build:

```sh
SITE_URL=https://docs.example.test WEBSITE_URL=https://website.example.test SITE_INDEXABLE=true pnpm build
```

Preview builds may supply final origins with SITE_INDEXABLE=false. Without
SITE_URL, local builds omit canonicals and use localhost social URLs. Settings
are process environment values, not automatic root `.env` imports. Production
metadata stays in its artifact wherever served; previews need an unindexed build.
The 404 stays unindexed and outside the sitemap. Both index routes canonical to
`/docs/`; the `/` alias is excluded from the sitemap. Each real page has its own
title, description and social metadata. Factual WebSite JSON-LD is emitted only
with a configured origin and is permitted by an exact CSP hash.

Dev/preview use strict port 4322, browser checks 4332 and Wrangler 4333. Website
links are ordinary external navigation, never imports or runtime data requests.
Root build/dev generates nine page-specific 1200x630 social PNGs from trusted
reviewed metadata, approved artwork and the local font. Their names include a
metadata/template version; bump `visualVersion` in page-metadata.mjs after
template, font or artwork changes. Generated `public/og` is ignored. Preserve
asset notices. `pnpm check-site-builds` creates local, preview, synthetic
production and analytics fixtures in ignored `.cache/site-builds`. It checks
metadata, canonicals, robots, sitemap, invalid origins and portfolio separation.
Fixtures never deploy. Retired CF_WEB_ANALYTICS settings fail rather than loading
a third-party beacon. See [launch preparation](LAUNCH.md) and
[analytics operations](ANALYTICS.md) for separate build/runtime enablement.
