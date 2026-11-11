# Reader maintenance

The explicit `reader-sources.json` allowlist selects six canonical Markdown
guides from Berry desktop at a committed revision. Generated files under
`apps/web/src/content/manual` are reader projections, not a second authoring
location. Edit and review the owning guide first, commit it, then update the
manifest's revision and refresh. Review the full diff before changing its date.

Reader search and sharing titles live in `apps/web/page-metadata.mjs`, separately
from the canonical guide headings and descriptions. The index count follows the
source manifest. `ManualLayout.astro` passes only the page identity to the shared
layout so HTML, Open Graph and Twitter use the same metadata. After changing
card layout, artwork or fonts, bump its visual version and inspect the generated
cards at 1200×630 and embed size. `pnpm check-site-builds` checks the root alias,
index and every chapter across the local, preview, production and analytics fixtures.

```sh
python3 -B scripts/sync-reader.py --write --berry-desktop ../berry-desktop
```

The projector reads committed source with Git, normalizes selected chapter links
to local routes and pins outside-library links to their source revision. It makes
no upstream writes or network calls. Use `--prune` only after explicitly reviewing
removed chapters. Private AI and operational sources are outside the allowlist.

```sh
python3 -B scripts/sync-reader.py --check --berry-desktop ../berry-desktop
```

The source comparison checks source/selection/projection hashes and linked Git
objects. `pnpm check-reader` verifies local files against the lock without needing
the source checkout. This catches accidental drift; it does not authenticate a
deliberately rewritten lock or prove that an upstream review happened.

The manifest's `published` flag records source publication; extraction retains
the existing published source selection. A false flag suppresses source links
while retaining revision/path information. Set it true only after verifying
anonymous access to the exact remote commit and linked files, then regenerate.
Documentation deployment must not precede that check.

```sh
python3 -B scripts/sync-reader.py --verify-public
```

This opt-in network check sends no credentials. It compares the pinned public
guide bytes with the recorded source hashes and checks emitted source links.
The regular local check and source projector perform no network reads.

Run `pnpm check` and inspect desktop/phone screenshots after reader changes.
All six static chapter cards, no-JavaScript reading, keyboard focus, active
section highlighting, deep links, article links and overflow are browser-checked.
The contents highlight follows reading in both directions and handles direct
heading links without writing history or taking focus. Reading a guide does
not apply its configuration; installation and live application acceptance remain
with the desktop source's documented procedures.
