export {};
const key = 'berry.analytics.optout';
const body = document.body;
const page = body.dataset.analyticsPage;
const enabled = body.dataset.analyticsEnabled === 'true';
const origin = body.dataset.analyticsOrigin;
const related = body.dataset.analyticsRelatedOrigin;
const privacySignal = () => navigator.doNotTrack === '1' || (window as Window & { doNotTrack?: string }).doNotTrack === '1' || (navigator as Navigator & { globalPrivacyControl?: boolean }).globalPrivacyControl === true;
function optedOut() {
  try { return localStorage.getItem(key) === 'true'; } catch { return true; }
}
function eligible() {
  return enabled && location.origin === origin && location.protocol === 'https:' && !privacySignal() && !optedOut();
}
function updateControls() {
  const blocked = privacySignal(), out = optedOut();
  for (const control of document.querySelectorAll<HTMLInputElement>('[data-analytics-optout]')) control.checked = out;
  for (const status of document.querySelectorAll<HTMLElement>('[data-analytics-status]')) {
    status.textContent = !enabled ? 'Collection is disabled for this build. Your preference can still be saved.' : blocked ? 'Your browser privacy signal blocks collection.' : out ? 'Analytics is off in this browser for this site.' : 'Limited aggregate analytics is allowed on the configured production address.';
  }
}
for (const control of document.querySelectorAll<HTMLInputElement>('[data-analytics-optout]')) {
  control.addEventListener('change', () => {
    try { if (control.checked) localStorage.setItem(key, 'true'); else localStorage.removeItem(key); }
    catch { control.checked = true; }
    updateControls();
    void start();
  });
}
window.addEventListener('storage', () => { updateControls(); void start(); });
updateControls();
const sent = new Set<string>();
function send(event: string, detail: Record<string, string> = {}, once = event) {
  if (!eligible() || !page || sent.has(once)) return;
  sent.add(once);
  // No cookies, full URL/referrer, IDs, user-agent, timestamps or raw values.
  void fetch('/api/stats', { method: 'POST', credentials: 'omit', referrerPolicy: 'no-referrer',
    headers: { 'content-type': 'application/json' }, body: JSON.stringify({ v: 1, page, event, ...detail }),
    keepalive: true, cache: 'no-store' }).catch(() => {});
}
function referrerCategory() {
  if (!document.referrer) return 'direct-unknown';
  try {
    const referrer = new URL(document.referrer);
    if (referrer.origin === location.origin || referrer.origin === related) return 'internal';
    const matches = (domains: string[]) => domains.some(domain => referrer.hostname === domain || referrer.hostname.endsWith('.' + domain));
    if (matches(['google.com', 'bing.com', 'duckduckgo.com', 'search.yahoo.com', 'brave.com'])) return 'search';
    if (matches(['github.com', 'facebook.com', 'instagram.com', 'linkedin.com', 'reddit.com', 'x.com', 'twitter.com', 't.co', 'youtube.com'])) return 'social';
  } catch { return 'direct-unknown'; }
  return 'other';
}
function browserFamily() {
  const ua = navigator.userAgent;
  if (/Edg\//.test(ua)) return 'edge';
  if (/Firefox\//.test(ua)) return 'firefox';
  if (/Chrome\//.test(ua) || /CriOS\//.test(ua)) return 'chrome';
  if (/Safari\//.test(ua)) return 'safari';
  return 'other';
}
let started = false;
async function start() {
  if (started || document.visibilityState !== 'visible' || !eligible()) return;
  started = true;
  if (page === 'page-not-found') { send('not_found'); return; }
  send('page_view', { referrer: referrerCategory(), device: innerWidth <= 600 ? 'mobile' : innerWidth <= 1024 ? 'tablet' : 'desktop', browser: browserFamily() });
  document.addEventListener('click', event => {
    const anchor = (event.target as Element | null)?.closest<HTMLAnchorElement>('a[data-stats-target]');
    const target = anchor?.dataset.statsTarget;
    if (!event.isTrusted || !target || !/^[a-z][a-z0-9-]{0,63}$/.test(target)) return;
    send(target === 'docs' ? 'docs_open' : 'outbound_click', { target }, 'click:' + target);
  });
  const article = document.querySelector<HTMLElement>('.prose');
  if (article && page?.startsWith('chapter-')) {
    let visibleTime = 0, previous = performance.now();
    const timer = setInterval(() => {
      const now = performance.now();
      if (document.visibilityState === 'visible' && eligible()) visibleTime += Math.min(now - previous, 1000);
      previous = now;
      const rect = article.getBoundingClientRect();
      if (visibleTime >= 30000 && document.visibilityState === 'visible' && innerHeight - rect.top >= rect.height * .5) {
        send('chapter_engaged'); clearInterval(timer);
      }
    }, 500);
    document.addEventListener('visibilitychange', () => { previous = performance.now(); });
    window.addEventListener('pagehide', () => clearInterval(timer), { once: true });
  }
  // Independent sampling on this load only; no identifier or saved sample flag.
  if (Math.random() < .1) {
    try {
      const { onLCP, onINP, onCLS } = await import('web-vitals');
      const report = ({ name, rating }: { name: string; rating: string }) => send('web_vital', { metric: name, rating }, 'vital:' + name);
      onLCP(report); onINP(report); onCLS(report);
    } catch { /* Optional performance measurements must not affect the site. */ }
  }
}
document.addEventListener('visibilitychange', () => { void start(); });
void start();
