# Berry docs

A standalone Astro + React static reader for six Berry configuration chapters.
Both `/` and `/docs/` show the chapter index; `/docs/[id]/` links remain stable.
Static reading needs no React islands, account, database or visitor-side source
requests. The optional statistics collector uses its own aggregate database.

Use Node >=22.23.4 and pinned pnpm 12.11.2:

```sh
pnpm install --frozen-lockfile
pnpm dev
```

Dev/preview use http://127.0.0.1:4322 with strict ports. `pnpm build` writes
`apps/web/dist`. The independent website defaults to port 4321 and crosslinks
use `WEBSITE_URL`. Normal builds require no sibling checkout; the reusable
config package remains local. See [site settings](docs/SITE-BUILDS.md).

```sh
pnpm peers check
pnpm check
```

Checks cover chapter integrity, types, static builds, metadata, safe origins,
asset budgets, desktop/phone Chromium interactions, CSP and local Cloudflare
headers/routing. Browser preview uses port 4332 and Wrangler uses 4333. Install
matching Chromium with `pnpm exec playwright install chromium` if needed.
Ignored `test-results` contains screenshots, traces and performance observations.

Native heading links, no-JavaScript reading, keyboard disclosures and mobile
dialog navigation are preserved. A vanilla script highlights the section being
read without changing history or focus. External links open new tabs with
accessible hints; local routes stay in the same tab. Motion enhances the early
native menu controller and honors reduced motion. Lucide icons, local JetBrains
Mono and the Berry palette are retained.

The six generated chapters come from committed guides owned by `berry-desktop`.
Author changes upstream and follow [reader maintenance](docs/READER-MAINTENANCE.md);
never edit generated chapters. The source-publication flag suppresses links to
an unpublished candidate. No private machine/AI sources are imported. Desktop
is needed only for an explicit comparison/refresh, never for ordinary builds.

Indexing and first-party statistics remain disabled by default. A same-origin
collector and owner-only aggregate dashboard are prepared locally; see
[analytics operations](docs/ANALYTICS.md). No raw events or visitor identifiers
are stored. Privacy preferences and browser signals block collection.
Builds generate page-specific social artwork and favicons locally. Titles and
descriptions follow each page; the home alias canonicals to `/docs/`.
Original code uses [MIT](LICENSE); read [notices](NOTICE.md)
before reusing assets. [Extraction provenance](docs/REPOSITORY-SPLIT.md) records
the retained history and ownership boundary. Public source lives at
[yeuanneberry/berry-docs](https://github.com/yeuanneberry/berry-docs).
Source publication does not deploy the reader or enable analytics;
[launch preparation](docs/LAUNCH.md) describes local proofs and live launch checks.

Direct dependencies and the lockfile are pinned. Preserve React integration
7.0.0 / Vite React plugin 6.1.1 / oxc-transform-react 0.145.0 peer compatibility.
Wrangler is development-only; pinned esbuild/workerd installers are approved
package builds. Review release-age exceptions in `pnpm-workspace.yaml` on upgrade.
