# Performance observations

The reader is checked in local Chromium at 1440x900 and 375x812 with cold browser
contexts and unthrottled loopback traffic. These are lab observations, not
production Core Web Vitals or visitor guarantees.

`tests/performance.spec.ts` covers `/`, `/docs/` and `/docs/customize/`, writing
LCP, FCP, CLS and resource sizes to ignored `test-results/.../performance.json`.
Budgets are JavaScript below 25,000 decoded bytes, CSS below 30,000, font below
100,000, CLS at most 0.1 and no off-origin requests. Timing has no fragile local
millisecond threshold. One local WOFF2 is preloaded and used by CSS; original TTF
remains for conversion and social artwork. There are no hydrated React islands.

These resource-budget fixtures use collection-disabled builds. An enabled,
eligible production load independently samples Web Vitals 10% of the time and
loads the local web-vitals module only then. The collector retains rating buckets
for LCP, INP and CLS rather than exact timings or visitor identifiers; sampled
counts do not establish production percentiles. See [analytics](ANALYTICS.md).

Only visible intro animations are awaited; closed native controls can retain
pending transitions. Browser tests also preserve keyboard navigation, heading
links, no-JavaScript reading and reduced motion. Slow-device/network behavior,
INP and real visitor percentiles are outside these checks. No visitor metrics
were collected; live analytics requires separately authorized launch work.
