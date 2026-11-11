# Source and asset notices

This source contains the Berry reader extracted from Yeuanne Berry's combined
portfolio. Original implementation/documentation use MIT in LICENSE. Historical
portfolio files remain in Git history; this does not expand any asset grant.
The current tree excludes project previews and ASCII derivatives. See
[extraction provenance](docs/REPOSITORY-SPLIT.md).

## Profile artwork

`apps/web/src/assets/profile.png` was supplied by Yeuanne Berry for the personal
portrait and favicon. SHA-256:
`00496e0f415188fdd24af035ec36670683ccb58ef7aa882b158fb9d98b1e3906`.
Header, social-card and favicon derivatives retain its exclusion from the code
license; it is not offered as a generic reusable brand asset.

## Font and dependencies

JetBrains Mono is Copyright 2020 The JetBrains Mono Project Authors. Local WOFF2
is a conversion of the retained original TTF without subsetting/glyph changes
(woff2 1.0.2). SIL Open Font License 1.1 remains at
`apps/web/public/fonts/OFL.txt`. Regenerate using
`woff2_compress apps/web/public/fonts/JetBrainsMono-Regular.ttf`.
The social card retains artwork and font exclusions.

Lucide and Motion licenses remain in [third-party notices](THIRD_PARTY_NOTICES.md).
Selected static Lucide SVGs and Motion's mini entry enhance native navigation.
Other dependencies retain their licenses. No wallpaper or historical desktop
artwork is included in the current tree.

The optional sampled Web Vitals runtime uses unmodified web-vitals 6.2.3,
Copyright 2020 Google LLC, Apache License 2.0. Its complete license is retained
at `licenses/web-vitals-LICENSE.txt` and referenced in third-party notices.

## Documentation

Canonical source revision, selected files and hashes remain in
`docs/reader-sources.json` and `docs/reader-lock.json`. Follow the owning source's
notices. Selection does not prove installation, upstream publication, operational
acceptance or deployment.
