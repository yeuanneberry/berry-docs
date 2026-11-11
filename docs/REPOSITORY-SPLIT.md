# Documentation extraction

Current publication: the owner authorized the dedicated public
`yeuanneberry/berry-docs` repository on 11 November 2026. Its origin is now
`https://github.com/yeuanneberry/berry-docs.git`; the independent portfolio is
`yeuanneberry/berry-website`. Retained history and asset notices were reviewed
before publication. The following extraction checkpoints remain historical;
publishing source does not deploy either site or activate statistics.

On 2026-11-11 this independent local repository was cloned from clean historical
combined `yeuanneberry.moe` source at
`d49e048dd003a4fce5591faab6237d1270b3f760`. Git history was retained without
squashing/rewriting. No new commit was made by extraction. The clone's origin was
removed to avoid confusing it with the combined repository. No remote repository,
deployment, domain or DNS state changed.

berry-docs owns static Astro + React documentation presentation, six generated
chapters, reader maintenance, static hosting configuration and reader checks.
berry-website owns the independent portfolio, project case studies, public-code
collection and About/ASCII presentation. berry-desktop remains canonical for
guides/configuration; its tools and content were not moved or modified.

The chapter allowlist, Markdown projections and reader lock are preserved exactly.
`reader-sources.json` and `reader-lock.json` record upstream revision, paths and
source/projection hashes. No content-authoring fork was created. Ordinary builds
use checked-in projections and local config, requiring no siblings. An explicit
sync/source comparison alone reads desktop Git.

The root package/Wrangler identity is berry-docs. Strict dev/preview port is 4322,
browser checks 4332 and Wrangler 4333. Home is the chapter index; `/docs/` and
`/docs/[id]/` stay stable. Portfolio routes/data/previews/ASCII derivatives are
absent from the current tree; approved profile/favicon artwork/notices remain.

WEBSITE_URL controls safe external crosslinks, defaulting to website port 4321.
Indexable builds require explicit non-loopback crosslinks. Noindex, disabled
analytics, CSP hashes, font delivery and native reader behavior are preserved.
Build/browser/security/local hosting checks are docs-only and use no live beacon.

Validation completed on 2026-11-11 using Node 26.13.0, pnpm 12.11.2,
Python 3.14.9 and pinned Playwright Chromium:

- `pnpm install --frozen-lockfile` passed; lockfile unchanged and supply-chain
  policies passed. `pnpm peers check` reported no peer dependency issues.
- `python3 -B scripts/sync-reader.py --check --berry-desktop ../berry-desktop`
  passed exact pinned-source comparison and local integrity for all six chapters.
  Generated chapters, allowlist and lock remain byte-identical to extraction HEAD.
- Final `pnpm check` passed: Astro check had zero diagnostics; the static build
  emitted 10 pages; all four local/preview/production/analytics metadata fixtures
  and crosslink-origin rejection cases passed; Chromium passed 50 tests with two
  intentional desktop skips for phone-only controls; local Wrangler routing,
  headers and stubbed hostname-gated analytics passed without live beacons.
- Production desktop/phone home and active-section reader screenshots were
  inspected. Chapter cards, reading columns, contents, controls and footer fit
  their tested sizes. Keyboard, no-JavaScript, focus, reduced-motion and overflow
  checks passed. Local resource budgets passed; no real visitor metrics exist.
- `git diff --check` passed and no Git remote is configured. No source commit,
  upstream source, tools repository, remote or deployment was changed.

Astro retains its generic Shiki/CSP build warning; the existing four exact
syntax-style hashes remain narrowly allowed and browser security checks verify
computed syntax colors with no CSP errors. Local proof does not certify deployed
edge behavior or future production origins.

After handback, the coordinator verified real cross-app links with both preview
servers running on 4321/4322. At 1440×900 and 375×812, Chromium opened docs from
the website, found all six chapters, opened the overview, and followed the Website
link back to the portfolio. Titles and origins were correct with no browser
errors. Desktop/phone reader screenshots were also reviewed by the coordinator.
Both preview servers were stopped after verification.

## Authorized privacy, metadata and statistics follow-up

The owner subsequently approved local implementation of page-specific metadata,
social cards, privacy controls and a first-party aggregate collector. This phase
preserves all uncommitted extraction work and the historical HEAD; it does not
create a deployment, account, remote database or source commit.

Each index/privacy/chapter/404 page has an explicit title, description and social
card. Root remains usable but canonicals to `/docs/` and is excluded from the
sitemap. Factual WebSite structured data is emitted only with a configured origin
and an exact CSP hash. Nine 1200x630 cards are generated locally from reviewed
metadata and approved artwork/font, using metadata/template-versioned paths.
Template/font/artwork changes must bump that version.

The first-party collector/dashboard/schema are copied into this repository with
a docs-only page/target allowlist and separate local D1/rate-limit bindings.
No sibling dependency was introduced. Cloudflare Web Analytics code/settings are
retired. Collection stays disabled by default at build and runtime. `web-vitals`
6.2.3 is the only new direct dependency; its Apache 2.0 license and updated pinned
lockfile are retained. Guides, allowlist and source lock remain unchanged.
See ANALYTICS.md for payload, retention and launch requirements.

Follow-up validation completed on 2026-11-11:

- Frozen install and `pnpm peers check` passed with the pinned dependency update.
  Exact upstream comparison again passed all six source chapters; generated
  Markdown, allowlist and reader lock remain byte-identical to extraction HEAD.
- Final `pnpm check` passed: ten backend tests against in-memory SQLite, zero
  Astro diagnostics, ten static pages, all four metadata/configuration fixtures
  and Chromium 54 passed with two intentional desktop skips (17.5 seconds).
- Fixtures verify each exact title/description, unique versioned 1200x630 PNG,
  meaningful OG/Twitter alt text, root canonical/sitemap deduplication, factual
  configured-origin WebSite JSON-LD and its precise CSP hash. Unsafe origins,
  invalid enablement and retired third-party analytics switches are rejected.
- Actual local Wrangler/D1 proof passed same-origin collection, strict payload
  validation, owner authentication, aggregate persistence, scheduled retention,
  disabled-preview silence, DNT/GPC, storage failure, saved opt-out/re-enable,
  click deduplication, sampled Web Vital ratings and the responsive dashboard.
  The Web Vitals check simulates backgrounding after real paints/interactions
  to flush actual measured ratings without an intercepted navigation teardown.
- Docs-only clock checks independently verify 30 visible seconds and 50% article
  depth, excluding hidden time and emitting once per load. A trusted source-link
  click stores only desktop-source. No live event or remote database is used.
- Desktop/phone Privacy and dashboard screenshots, plus index/long-title social
  cards, were inspected. No overflow, browser exceptions or CSP errors occurred.
  The final shared dashboard wording update passed targeted backend/local proof
  again. `git diff --check` passed.
  Owner-dashboard checks also cover the monthly range, an empty response and a
  failed request hiding stale measurements.

The prior generic Shiki warning remains covered by exact style hashes. Actual
production host/log/backup policy, credentials, remote database provisioning,
deployment, domains and enabled live collection remain outside this local proof.
