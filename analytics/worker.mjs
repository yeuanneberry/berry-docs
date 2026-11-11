import { siteId, pageIds, chapterIds, targetIds } from './config.mjs';
import { dashboardHTML, dashboardJS, dashboardCSS } from './dashboard.mjs';

const pages = new Set(pageIds), chapters = new Set(chapterIds), targets = new Set(targetIds);
const categories = {
  referrer: ['search', 'social', 'internal', 'direct-unknown', 'other'],
  device: ['mobile', 'tablet', 'desktop'],
  browser: ['chrome', 'edge', 'firefox', 'safari', 'other'],
};
const headers = {
  'cache-control': 'no-store', 'x-content-type-options': 'nosniff', 'x-frame-options': 'DENY',
  'x-robots-tag': 'noindex, nofollow', 'referrer-policy': 'no-referrer',
  'content-security-policy': "default-src 'none'; script-src 'self'; style-src 'self'; connect-src 'self'; base-uri 'none'; frame-ancestors 'none'; form-action 'none'",
};
const reply = (body, status = 200, type = 'text/plain; charset=utf-8', extra = {}) =>
  new Response(body, { status, headers: { ...headers, 'content-type': type, ...extra } });
const loopback = host => host === 'localhost' || host.endsWith('.localhost') || host.startsWith('127.') || host === '[::1]';
function configuredOrigin(env, requestURL) {
  try {
    const url = new URL(env.SITE_URL);
    if (url.username || url.password || url.pathname !== '/' || url.search || url.hash) return false;
    if (url.protocol !== 'https:' && !(env.LOCAL_ANALYTICS_TEST === 'true' && loopback(url.hostname))) return false;
    return url.origin === requestURL.origin;
  } catch { return false; }
}
const configuredOwner = env => typeof env.STATS_OWNER_TOKEN === 'string' && env.STATS_OWNER_TOKEN.length >= 32 && env.STATS_OWNER_TOKEN.length <= 256;
export function validateEvent(data) {
  if (!data || typeof data !== 'object' || Array.isArray(data) || data.v !== 1 || !pages.has(data.page)) return null;
  const basic = ['v', 'page', 'event'];
  let keys = basic, rows = [];
  switch (data.event) {
    case 'page_view':
      if (data.page === 'page-not-found') return null;
      keys = [...basic, 'referrer', 'device', 'browser'];
      if (Object.entries(categories).some(([key, values]) => !values.includes(data[key]))) return null;
      rows = [['total', 'all'], ...Object.keys(categories).map(key => [key, data[key]])];
      break;
    case 'outbound_click':
    case 'docs_open':
      keys = [...basic, 'target'];
      if (!targets.has(data.target) || data.page === 'page-not-found' || (data.event === 'docs_open') !== (data.target === 'docs')) return null;
      rows = [['target', data.target]];
      break;
    case 'chapter_engaged':
      if (!chapters.has(data.page)) return null;
      rows = [['total', 'all']];
      break;
    case 'web_vital':
      keys = [...basic, 'metric', 'rating'];
      if (data.page === 'page-not-found' || !['LCP', 'INP', 'CLS'].includes(data.metric) || !['good', 'needs-improvement', 'poor'].includes(data.rating)) return null;
      rows = [[data.metric, data.rating]];
      break;
    case 'not_found':
      if (data.page !== 'page-not-found') return null;
      rows = [['total', 'all']];
      break;
    default: return null;
  }
  if (Object.keys(data).length !== keys.length || Object.keys(data).some(key => !keys.includes(key))) return null;
  return rows.map(([dimension, value]) => ({ page: data.page, event: data.event, dimension, value }));
}
export function cutoffs(now = new Date()) {
  const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const day = new Date(today); day.setUTCDate(day.getUTCDate() - 89);
  const month = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 12, 1));
  return { day: day.toISOString().slice(0, 10), month: month.toISOString().slice(0, 10), today: today.toISOString().slice(0, 10) };
}
export async function prune(db, now = new Date()) {
  const dates = cutoffs(now);
  await db.batch([
    db.prepare("DELETE FROM counters WHERE period_kind = 'day' AND period < ?").bind(dates.day),
    db.prepare("DELETE FROM counters WHERE period_kind = 'month' AND period < ?").bind(dates.month),
    db.prepare('INSERT INTO maintenance (id,last_purged) VALUES (1,?) ON CONFLICT(id) DO UPDATE SET last_purged=excluded.last_purged').bind(now.toISOString()),
  ]);
}
async function readBody(request) {
  if (Number(request.headers.get('content-length')) > 1024) throw new Error('size');
  const reader = request.body?.getReader();
  if (!reader) throw new Error('empty');
  let total = 0; const chunks = [];
  try {
    while (true) {
      const { value, done } = await reader.read(); if (done) break;
      total += value.byteLength;
      if (total > 1024) { await reader.cancel(); throw new Error('size'); }
      chunks.push(value);
    }
  } finally { reader.releaseLock(); }
  const bytes = new Uint8Array(total); let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length; }
  return JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes));
}
async function ownerMatches(request, token) {
  const authorization = request.headers.get('authorization') ?? '';
  if (authorization.length > 1024 || !authorization.startsWith('Basic ')) return false;
  let credentials;
  try { credentials = atob(authorization.slice(6)); } catch { return false; }
  const encoder = new TextEncoder();
  const [a, b] = await Promise.all([credentials, `owner:${token}`].map(text => crypto.subtle.digest('SHA-256', encoder.encode(text))));
  const left = new Uint8Array(a), right = new Uint8Array(b); let difference = 0;
  for (let i = 0; i < left.length; i++) difference |= left[i] ^ right[i];
  return difference === 0;
}
async function admin(request, env, url) {
  if (request.method !== 'GET') return reply('Method not allowed', 405, undefined, { allow: 'GET' });
  if (!configuredOrigin(env, url) || !configuredOwner(env) || !env.STATS_DB || !env.ADMIN_LIMITER) return reply('Statistics are not configured.', 503);
  // Fixed per-site keys avoid reading, hashing or retaining visitor IP addresses.
  if (!(await env.ADMIN_LIMITER.limit({ key: `${siteId}:admin` })).success) return reply('Try again later.', 429);
  if (!await ownerMatches(request, env.STATS_OWNER_TOKEN)) return reply('Owner authentication required.', 401, undefined, { 'www-authenticate': 'Basic realm="Berry private statistics", charset="UTF-8"' });
  if (request.headers.get('sec-fetch-site') === 'cross-site') return reply('Forbidden', 403);
  if (url.pathname === '/admin/stats' || url.pathname === '/admin/stats/') return reply(dashboardHTML(siteId), 200, 'text/html; charset=utf-8');
  if (url.pathname === '/admin/stats.js') return reply(dashboardJS, 200, 'text/javascript; charset=utf-8');
  if (url.pathname === '/admin/stats.css') return reply(dashboardCSS, 200, 'text/css; charset=utf-8');
  if (url.pathname !== '/admin/data') return reply('Not found', 404);
  const range = url.searchParams.get('range') ?? '28';
  if (![...url.searchParams.keys()].every(key => key === 'range') || !['7', '28', '90', '13m'].includes(range)) return reply('Invalid range', 400);
  const dates = cutoffs(), month = range === '13m';
  const start = month ? dates.month : new Date(Date.now() - (Number(range) - 1) * 86400000).toISOString().slice(0, 10);
  const kind = month ? 'month' : 'day';
  const rows = await env.STATS_DB.prepare('SELECT period,page,event,dimension,value,count FROM counters WHERE period_kind=? AND period>=? AND period<=? ORDER BY period,page,event,dimension,value LIMIT 50000').bind(kind, start, dates.today).all();
  const maintenance = await env.STATS_DB.prepare('SELECT last_purged FROM maintenance WHERE id=1').first();
  return reply(JSON.stringify({ site: siteId, range, periodKind: kind, start, end: dates.today, enabled: env.ANALYTICS_ENABLED === 'true', lastPurged: maintenance?.last_purged ?? null, rows: rows.results }), 200, 'application/json');
}
async function collect(request, env, url) {
  if (env.ANALYTICS_ENABLED !== 'true') return reply(null, 204);
  if (!configuredOrigin(env, url) || !configuredOwner(env) || !env.STATS_DB || !env.RATE_LIMITER) return reply('Statistics are not configured.', 503);
  if (request.method !== 'POST') return reply('Method not allowed', 405, undefined, { allow: 'POST' });
  if (url.search || request.headers.get('origin') !== url.origin || request.headers.get('sec-fetch-site') !== 'same-origin') return reply('Forbidden', 403);
  if (request.headers.get('dnt') === '1' || request.headers.get('sec-gpc') === '1') return reply(null, 204);
  if (request.headers.get('content-type')?.split(';')[0].trim() !== 'application/json') return reply('JSON required', 415);
  if (!(await env.RATE_LIMITER.limit({ key: `${siteId}:ingest` })).success) return reply('Try again later.', 429);
  let rows;
  try { rows = validateEvent(await readBody(request)); } catch { return reply('Invalid event', 400); }
  if (!rows) return reply('Invalid event', 400);
  const now = new Date(), day = now.toISOString().slice(0, 10), month = `${day.slice(0, 7)}-01`;
  const sql = 'INSERT INTO counters (period_kind,period,page,event,dimension,value,count) VALUES (?,?,?,?,?,?,1) ON CONFLICT(period_kind,period,page,event,dimension,value) DO UPDATE SET count=count+1';
  // D1 batch executes all upserts transactionally. No request/event row is stored.
  await env.STATS_DB.batch(rows.flatMap(row => [['day', day], ['month', month]].map(([kind, period]) =>
    env.STATS_DB.prepare(sql).bind(kind, period, row.page, row.event, row.dimension, row.value))));
  return reply(null, 204);
}
export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    try {
      if (url.pathname === '/api/stats') return await collect(request, env, url);
      if (url.pathname === '/admin' || url.pathname.startsWith('/admin/')) return await admin(request, env, url);
      return await env.ASSETS.fetch(request);
    } catch { return reply('Service temporarily unavailable.', 503); }
  },
  async scheduled(_controller, env, ctx) {
    if (env.STATS_DB) ctx.waitUntil(prune(env.STATS_DB));
  },
};
