import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { readFileSync } from 'node:fs';
import worker, { validateEvent, cutoffs, prune } from './worker.mjs';
import { pageIds, targetIds, chapterIds } from './config.mjs';

const page = pageIds.find(id => id !== 'page-not-found');
const token = 'local-test-only-token-not-a-production-secret-123456789';
const base = 'https://stats.example.test';
function fixture() {
  const sqlite = new DatabaseSync(':memory:');
  sqlite.exec(readFileSync(new URL('./schema.sql', import.meta.url), 'utf8'));
  const db = {
    prepare(sql) {
      return { bind(...args) { return { sql, args }; }, async first() { return sqlite.prepare(sql).get() ?? null; }, async all() { return { results: sqlite.prepare(sql).all() }; } };
    },
    async batch(statements) {
      sqlite.exec('BEGIN');
      try { for (const { sql, args } of statements) sqlite.prepare(sql).run(...args); sqlite.exec('COMMIT'); }
      catch (error) { sqlite.exec('ROLLBACK'); throw error; }
    },
  };
  // D1 bind chains expose all/first as well as executable statements.
  const prepare = db.prepare;
  db.prepare = sql => {
    const result = prepare(sql);
    result.bind = (...args) => ({ sql, args, async all() { return { results: sqlite.prepare(sql).all(...args) }; }, async first() { return sqlite.prepare(sql).get(...args) ?? null; } });
    return result;
  };
  const env = { SITE_URL: base, ANALYTICS_ENABLED: 'true', STATS_OWNER_TOKEN: token, STATS_DB: db,
    RATE_LIMITER: { async limit() { return { success: true }; } }, ADMIN_LIMITER: { async limit() { return { success: true }; } },
    ASSETS: { async fetch() { return new Response('static site'); } } };
  return { env, sqlite, db, count: () => sqlite.prepare('SELECT COALESCE(SUM(count),0) AS n FROM counters').get().n };
}
const event = () => ({ v: 1, page, event: 'page_view', referrer: 'direct-unknown', device: 'desktop', browser: 'firefox' });
function post(data = event(), extraHeaders = {}, url = base + '/api/stats') {
  return new Request(url, { method: 'POST', headers: { 'content-type': 'application/json', origin: base, 'sec-fetch-site': 'same-origin', ...extraHeaders }, body: typeof data === 'string' ? data : JSON.stringify(data) });
}
const authorization = 'Basic ' + btoa('owner:' + token);

test('disabled collection never writes, even with a valid event', async () => {
  const f = fixture(); f.env.ANALYTICS_ENABLED = 'false';
  assert.equal((await worker.fetch(post(), f.env)).status, 204); assert.equal(f.count(), 0);
  f.sqlite.close();
});
test('one page event creates daily/monthly total and separate marginal counters only', async () => {
  const f = fixture(); assert.equal((await worker.fetch(post(), f.env)).status, 204);
  assert.equal(f.count(), 8);
  assert.deepEqual(f.sqlite.prepare('SELECT DISTINCT dimension FROM counters ORDER BY dimension').all().map(r => r.dimension), ['browser', 'device', 'referrer', 'total']);
  assert.equal(f.sqlite.prepare("SELECT COUNT(*) AS n FROM sqlite_master WHERE type='table'").get().n, 2);
  const columns = f.sqlite.prepare('PRAGMA table_info(counters)').all().map(r => r.name);
  assert.deepEqual(columns, ['period_kind', 'period', 'page', 'event', 'dimension', 'value', 'count']);
  await worker.fetch(post(), f.env); assert.equal(f.count(), 16); f.sqlite.close();
});
test('invalid extra data, unsafe paths, unknown enums and event combinations are rejected', async () => {
  const f = fixture();
  for (const bad of [[], null, { ...event(), url: '/?email=private@example.test' }, { ...event(), ip: '1.2.3.4' }, { ...event(), referrer: 'https://private.example/' }, { ...event(), browser: 'full user agent' }, { ...event(), page: '/unknown-path' }, { ...event(), device: 'unknown' }, { v: 1, page, event: 'chapter_engaged' }, { v: 1, page, event: 'not_found' }, { v: 1, page, event: 'outbound_click', target: 'private-url' }, { v: 1, page, event: 'web_vital', metric: 'LCP', rating: 123 }]) {
    if (bad?.event === 'chapter_engaged' && chapterIds.includes(page)) continue;
    assert.equal((await worker.fetch(post(bad), f.env)).status, 400, JSON.stringify(bad));
  }
  assert.equal((await worker.fetch(post('x'.repeat(1025)), f.env)).status, 400);
  assert.equal((await worker.fetch(post(event(), { 'content-length': '2000' }), f.env)).status, 400);
  assert.equal(f.count(), 0); f.sqlite.close();
});
test('valid event vocabulary, body bound without content-length, and 404 sentinel', async () => {
  for (const target of targetIds) assert.ok(validateEvent({ v: 1, page, event: target === 'docs' ? 'docs_open' : 'outbound_click', target }));
  for (const chapter of chapterIds) assert.ok(validateEvent({ v: 1, page: chapter, event: 'chapter_engaged' }));
  assert.ok(validateEvent({ v: 1, page: 'page-not-found', event: 'not_found' }));
  for (const metric of ['LCP', 'INP', 'CLS']) assert.ok(validateEvent({ v: 1, page, event: 'web_vital', metric, rating: 'good' }));
  const f = fixture(), bytes = new TextEncoder().encode('x'.repeat(2048));
  const request = new Request(base + '/api/stats', { method: 'POST', duplex: 'half', headers: { 'content-type': 'application/json', origin: base, 'sec-fetch-site': 'same-origin' }, body: new ReadableStream({ start(c) { c.enqueue(bytes); c.close(); } }) });
  assert.equal((await worker.fetch(request, f.env)).status, 400); assert.equal(f.count(), 0); f.sqlite.close();
});
test('origin, method, privacy signals and rate caps gate collection without CORS', async () => {
  const f = fixture();
  for (const h of [{ origin: 'https://other.example' }, { 'sec-fetch-site': 'cross-site' }, { 'sec-fetch-site': '' }]) assert.equal((await worker.fetch(post(event(), h), f.env)).status, 403);
  assert.equal((await worker.fetch(post(event(), {}, base + '/api/stats?private=1'), f.env)).status, 403);
  assert.equal((await worker.fetch(new Request(base + '/api/stats'), f.env)).status, 405);
  assert.equal((await worker.fetch(post(event(), { 'content-type': 'text/plain' }), f.env)).status, 415);
  for (const h of [{ dnt: '1' }, { 'sec-gpc': '1' }]) assert.equal((await worker.fetch(post(event(), h), f.env)).status, 204);
  f.env.RATE_LIMITER.limit = async () => ({ success: false });
  const response = await worker.fetch(post(), f.env); assert.equal(response.status, 429);
  assert.equal(response.headers.get('access-control-allow-origin'), null);
  assert.equal(f.count(), 0); f.sqlite.close();
});
test('enabled collection fails closed with missing dependencies or mismatched host', async () => {
  for (const name of ['STATS_DB', 'RATE_LIMITER', 'STATS_OWNER_TOKEN']) {
    const f = fixture(); delete f.env[name]; assert.equal((await worker.fetch(post(), f.env)).status, 503); assert.equal(f.count(), 0); f.sqlite.close();
  }
  const f = fixture(); f.env.SITE_URL = 'https://other.example'; assert.equal((await worker.fetch(post(), f.env)).status, 503); f.sqlite.close();
});
test('failed monthly insert rolls back every counter in the event', async () => {
  const f = fixture(); f.sqlite.exec("CREATE TRIGGER fail_month BEFORE INSERT ON counters WHEN NEW.period_kind='month' BEGIN SELECT RAISE(ABORT,'synthetic'); END");
  assert.equal((await worker.fetch(post(), f.env)).status, 503); assert.equal(f.count(), 0); f.sqlite.close();
});
test('all admin routes require owner auth, HTTPS and no-store/noindex headers', async () => {
  const f = fixture();
  for (const path of ['/admin/stats', '/admin/stats.js', '/admin/stats.css', '/admin/data', '/admin/unknown']) {
    for (const auth of ['', 'Basic invalid', 'Basic ' + btoa('owner:wrong')]) {
      const response = await worker.fetch(new Request(base + path, { headers: { authorization: auth } }), f.env);
      assert.equal(response.status, 401); assert.equal(response.headers.get('cache-control'), 'no-store');
      assert.equal(response.headers.get('x-robots-tag'), 'noindex, nofollow');
      assert.ok(response.headers.get('content-security-policy').includes("frame-ancestors 'none'"));
    }
  }
  const data = await worker.fetch(new Request(base + '/admin/data?range=28', { headers: { authorization } }), f.env);
  assert.equal(data.status, 200); assert.deepEqual((await data.json()).rows, []);
  assert.equal((await worker.fetch(new Request(base + '/admin/data?range=900', { headers: { authorization } }), f.env)).status, 400);
  assert.equal((await worker.fetch(new Request(base + '/admin/data', { headers: { authorization, 'sec-fetch-site': 'cross-site' } }), f.env)).status, 403);
  f.env.SITE_URL = 'http://stats.example.test'; assert.equal((await worker.fetch(new Request('http://stats.example.test/admin/stats', { headers: { authorization } }), f.env)).status, 503);
  f.sqlite.close();
});
test('retention preserves exactly 90 daily buckets and 13 calendar months', async () => {
  const f = fixture(), now = new Date('2026-11-11T12:00:00Z');
  assert.deepEqual(cutoffs(now), { day: '2026-08-14', month: '2025-11-01', today: '2026-11-11' });
  for (const [kind, date] of [['day', '2026-08-13'], ['day', '2026-08-14'], ['month', '2025-10-01'], ['month', '2025-11-01']]) f.sqlite.prepare('INSERT INTO counters VALUES (?,?,?,?,?,?,?)').run(kind, date, page, 'page_view', 'total', 'all', 1);
  await prune(f.db, now);
  assert.equal(f.count(), 2); assert.equal(f.sqlite.prepare('SELECT last_purged FROM maintenance').get().last_purged, now.toISOString()); f.sqlite.close();
});
test('static site is independent of analytics availability', async () => {
  const f = fixture(); delete f.env.STATS_DB;
  assert.equal(await (await worker.fetch(new Request(base + '/'), f.env)).text(), 'static site'); f.sqlite.close();
});
