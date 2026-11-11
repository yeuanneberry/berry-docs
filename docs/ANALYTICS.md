# First-party aggregate statistics

The standalone reader owns its collector, schema and private dashboard under
`analytics/`. Source was initially shared with the website during implementation;
there is no runtime/build import from a sibling repository. Docs uses site ID
`berry-docs`, a separate database and its own server-only owner secret. Collection
is off by default. No production database or account has been created.

## Allowed events and fields

POST `/api/stats` accepts a version-1 JSON object of at most 1,024 bytes. It
rejects extra/unknown fields, pages, target labels and enum values. Page IDs are
docs-index (including the `/` alias), privacy, six chapter IDs and page-not-found.
The unknown-route sentinel never includes the requested URL.

| Event | Allowed detail |
| --- | --- |
| `page_view` | Coarse referrer category, viewport class, browser family |
| `outbound_click` | `website` or `desktop-source` target label |
| `chapter_engaged` | Chapter ID only; 30 visible seconds and 50% article depth proxy |
| `web_vital` | LCP/INP/CLS name and good/needs-improvement/poor rating |
| `not_found` | Generic page-not-found only |

Referrer categories are search, social, internal, direct-unknown and other.
Viewport classes are mobile/tablet/desktop; browser families are Chrome, Edge,
Firefox, Safari and other. The client does not transmit full URL/referrer,
query/fragment, raw user-agent, exact Web Vital values, click URL/text or client
timestamp. Web Vitals use an independent 10% per-load random sample; counts are
sampled ratings, not production percentile estimates or a visitor sample.

The server writes independent marginal counters to daily and monthly buckets,
using server UTC dates. It never stores event rows or joins dimensions into a
visitor profile. There are no cookies, IP reads/hashes, fingerprints or visitor/
session IDs in application statistics. Hosting-level processing is separate.

## Privacy and access

The client checks exact configured HTTPS origin, explicit enabled build, DNT,
GPC and local opt-out before every send. Storage errors fail closed. Local storage
contains only `berry.analytics.optout=true` until removed. Preferences are per
origin, with no cross-site synchronization. No JavaScript means no browser sends.

The server separately requires enablement, configured same origin, POST JSON,
same-origin request headers and fixed per-site rate caps. DNT/GPC requests do not
increment counters. These checks reduce mistakes and abuse; they do not prove
that requests are human. Rate caps are approximate provider-local limits and do
not identify unique visitors. Repeat/reload/click counts must not be called people,
unique visitors, sessions, conversion rates or complete traffic.

GET `/admin/stats` and its data/assets require HTTP Basic username `owner` and
server secret `STATS_OWNER_TOKEN` (32–256 characters) on the configured origin.
There is no public aggregate feed. The owner dashboard displays counts, marginal
breakdowns, sample limitations, collection status and retention-maintenance status.
No owner secret belongs in build variables, generated HTML or version control.

`wrangler.jsonc` binds ASSETS and a dedicated `STATS_DB`, routes only the API and
admin paths through the Worker first, and disables collection and observability
by default. The all-zero database ID is an intentional local placeholder.
Rate namespaces 70103/70104 are distinct from the website's local configuration;
verify account-level namespace ownership before any future deployment.

```sh
pnpm check-analytics
pnpm stats:init:local
pnpm preview:cloudflare
```

These commands use the local emulator. The schema initialization command must
retain `--local`; it creates no remote database. With defaults, collection is a
silent no-op and the owner dashboard remains unconfigured. The private owner
token is supplied only through server runtime secrets; local tests use an
explicitly synthetic token. `LOCAL_ANALYTICS_TEST=true` is a test-only loopback
server exception, never a production setting or browser collection bypass.

## Retention and launch requirements

Daily counters retain 90 inclusive UTC days; monthly counters retain 13 inclusive
calendar months. Scheduled pruning deletes expired rows and records its last run.
Verify the daily maintenance schedule and status before enabling production.
Provider backups can outlast active-row deletion by a plan-dependent 7 or 30
days; actual processor, logging, backup retention and region remain unverified
until launch and must be reflected in Privacy before enabling collection.

Use only local synthetic fixtures during development. Remote database creation,
schema application, secret installation, account setup and deployment need their
own authorization. Local proof is not a production acceptance receipt.
