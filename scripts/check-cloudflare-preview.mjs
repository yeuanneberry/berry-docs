#!/usr/bin/env node
import assert from 'node:assert/strict';
import { spawn, spawnSync } from 'node:child_process';
import { setTimeout as delay } from 'node:timers/promises';
import { once } from 'node:events';
import { createServer } from 'node:net';
import { readFile, writeFile, mkdir, mkdtemp, rm } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { chromium } from '@playwright/test';
import { siteId, pageIds, targetIds, chapterIds } from '../analytics/config.mjs';
import { validateEvent } from '../analytics/worker.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const port = siteId === 'berry-docs' ? 4333 : 4343, local = `http://127.0.0.1:${port}`;
const built = await readFile(`${root}/.cache/site-builds/analytics/index.html`, 'utf8');
const production = new URL(built.match(/property="og:url" content="([^"]+)"/)[1]).origin;
const homeId = built.match(/data-analytics-page="([^"]+)"/)[1];
const token = 'local-test-only-not-a-production-secret-berry';
const auth = 'Basic ' + Buffer.from('owner:' + token).toString('base64');
const probe = createServer();
await new Promise((resolve, reject) => { probe.once('error', reject); probe.listen(port, '127.0.0.1', resolve); });
await new Promise(resolve => probe.close(resolve));
await mkdir(`${root}/.cache/analytics-proof`, { recursive: true });
const scratch = await mkdtemp(`${root}/.cache/analytics-proof/run-`);
const config = JSON.parse(await readFile(`${root}/wrangler.jsonc`, 'utf8'));
config.main = `${root}/analytics/worker.mjs`;
config.assets.directory = `${root}/.cache/site-builds/analytics`;
config.vars = { ANALYTICS_ENABLED: 'true', SITE_URL: local, LOCAL_ANALYTICS_TEST: 'true', STATS_OWNER_TOKEN: token };
const configPath = `${scratch}/wrangler.json`;
await writeFile(configPath, JSON.stringify(config));
const cli = `${root}/node_modules/wrangler/bin/wrangler.js`;
const env = { ...process.env, WRANGLER_SEND_METRICS: 'false', CLOUDFLARE_API_TOKEN: '', CLOUDFLARE_ACCOUNT_ID: '' };
const state = `${scratch}/state`;
const init = spawnSync(process.execPath, [cli, 'd1', 'execute', 'STATS_DB', '--local', '--persist-to', state, '--file', `${root}/analytics/schema.sql`, '--config', configPath], { cwd: root, encoding: 'utf8', env, timeout: 60000 });
assert.equal(init.status, 0, init.stdout + init.stderr);
const server = spawn(process.execPath, [cli, 'dev', '--local', '--ip', '127.0.0.1', '--port', String(port), '--config', configPath, '--persist-to', state, '--test-scheduled', '--log-level', 'error'], { cwd: root, stdio: ['ignore', 'pipe', 'pipe'], detached: true, env });
let logs = '', browser;
server.stdout.on('data', chunk => { logs += chunk; });
server.stderr.on('data', chunk => { logs += chunk; });
const isRunning = () => server.exitCode === null && server.signalCode === null;
const post = (body, headers = {}) => fetch(`${local}/api/stats`, { method: 'POST', headers: { origin: local, 'sec-fetch-site': 'same-origin', 'content-type': 'application/json', ...headers }, body: JSON.stringify(body) });
const dashboard = async () => {
  const result = await fetch(`${local}/admin/data?range=28`, { headers: { authorization: auth } });
  assert.equal(result.status, 200); return result.json();
};
try {
  let ready = false;
  for (let attempt = 0; attempt < 100; attempt++) {
    if (!isRunning()) throw new Error(logs || 'Local preview exited before becoming ready.');
    try { ready = (await fetch(local, { signal: AbortSignal.timeout(1000) })).ok; } catch {}
    if (ready) break; await delay(200);
  }
  assert.ok(ready, `Local preview did not start. ${logs}`);
  const response = await fetch(local);
  assert.equal(response.headers.get('x-frame-options'), 'DENY');
  assert.equal(response.headers.get('x-content-type-options'), 'nosniff');
  assert.equal(response.headers.get('content-security-policy'), "frame-ancestors 'none'");
  assert.equal(response.headers.get('referrer-policy'), 'strict-origin-when-cross-origin');
  assert.equal((await fetch(`${local}/missing-page/`)).status, 404);
  for (const path of ['/admin', '/admin/', '/admin/stats', '/admin/stats/', '/admin/data', '/admin/stats.js', '/admin/stats.css', '/admin/unknown']) {
    const result = await fetch(local + path); assert.equal(result.status, 401, path);
    assert.equal(result.headers.get('cache-control'), 'no-store'); assert.match(result.headers.get('x-robots-tag'), /noindex/);
  }
  assert.deepEqual((await dashboard()).rows, []);
  const valid = { v: 1, page: homeId, event: 'page_view', referrer: 'direct-unknown', device: 'desktop', browser: 'chrome' };
  assert.equal((await post({ ...valid, email: 'must-not-be-stored@example.test' })).status, 400);
  assert.equal((await post(valid, { origin: 'https://other.example.test' })).status, 403);
  assert.equal((await post(valid, { dnt: '1' })).status, 204);
  assert.deepEqual((await dashboard()).rows, []);
  assert.equal((await post(valid)).status, 204); assert.equal((await dashboard()).rows.length, 4);
  assert.equal((await fetch(`${local}/cdn-cgi/handler/scheduled`)).status, 200);
  assert.ok((await dashboard()).lastPurged);
  browser = await chromium.launch({ executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH });
  // Synthetic HTTPS origins route only to the local Worker, never a real site.
  async function contextFor({ privacy, sample = false } = {}) {
    const context = await browser.newContext();
    const events = [], unexpected = [], errors = [], statuses = [];
    await context.addInitScript(({ privacy, sample }) => {
      Math.random = () => sample ? 0 : .99;
      if (privacy === 'optout') { try { localStorage.setItem('berry.analytics.optout', 'true'); } catch {} }
      if (privacy === 'dnt') Object.defineProperty(navigator, 'doNotTrack', { value: '1' });
      if (privacy === 'gpc') Object.defineProperty(navigator, 'globalPrivacyControl', { value: true });
      if (privacy === 'storage') Object.defineProperty(window, 'localStorage', { get() { throw new Error('blocked storage'); } });
    }, { privacy, sample });
    context.on('page', page => page.on('pageerror', error => errors.push(error.message)));
    await context.route('**/*', async route => {
      const request = route.request(), url = new URL(request.url());
      if (![production, local].includes(url.origin)) { unexpected.push(url.href); return route.fulfill({ status: 200, contentType: 'text/plain', body: 'Local external-link fixture' }); }
      if (url.pathname === '/api/stats') {
        const event = request.postDataJSON(); events.push(event);
        assert.ok(validateEvent(event), 'Browser emitted an unknown or sensitive field');
        assert.equal(request.headers()['referer'], undefined); assert.equal(request.headers()['cookie'], undefined);
        const result = await post(event); statuses.push(result.status); return route.fulfill({ status: result.status });
      }
      const result = await fetch(`${local}${url.pathname}${url.search}`);
      const headers = Object.fromEntries(result.headers); delete headers['content-encoding']; delete headers['content-length'];
      return route.fulfill({ status: result.status, headers, body: Buffer.from(await result.arrayBuffer()) });
    });
    return { context, page: await context.newPage(), events, unexpected, errors, statuses };
  }
  const preview = await contextFor();
  await preview.page.goto(local); await preview.page.evaluate(() => document.fonts.ready); await delay(250);
  assert.deepEqual(preview.events, []); assert.deepEqual(preview.unexpected, []); assert.deepEqual(preview.errors, []); await preview.context.close();
  for (const privacy of ['optout', 'dnt', 'gpc', 'storage']) {
    const test = await contextFor({ privacy });
    await test.page.goto(production); await test.page.evaluate(() => document.fonts.ready); await delay(250);
    assert.deepEqual(test.events, [], `${privacy} must send no statistics`);
    assert.deepEqual(test.unexpected, []); assert.deepEqual(test.errors, []); await test.context.close();
  }
  const active = await contextFor();
  await active.page.goto(`${production}/?email=must-not-be-sent@example.test#private-fragment`);
  await active.page.evaluate(() => document.fonts.ready); await delay(300);
  assert.equal(active.events.filter(event => event.event === 'page_view').length, 1); assert.equal(active.events[0].page, homeId);
  await active.page.evaluate(() => document.dispatchEvent(new Event('visibilitychange'))); await delay(100);
  assert.equal(active.events.filter(event => event.event === 'page_view').length, 1);
  const link = active.page.locator('a[data-stats-target]:visible').first();
  const target = await link.getAttribute('data-stats-target'); assert.ok(targetIds.includes(target));
  await active.page.evaluate(() => document.addEventListener('click', event => event.preventDefault()));
  await link.click(); await link.click(); await delay(200);
  assert.equal(active.events.filter(event => event.target === target).length, 1);
  await active.page.goto(`${production}/privacy/`); await delay(250);
  const checkbox = active.page.locator('[data-analytics-optout]');
  await checkbox.check(); assert.equal(await active.page.evaluate(() => localStorage.getItem('berry.analytics.optout')), 'true');
  const before = active.events.length;
  await active.page.goto(production); await delay(250); assert.equal(active.events.length, before);
  await active.page.goto(`${production}/privacy/`); await delay(200); assert.equal(active.events.length, before);
  await checkbox.uncheck(); await delay(250); assert.equal(active.events.length, before + 1, 'Opt-in starts the current page');
  await active.page.goto(`${production}/unknown-private-path/?token=private`); await delay(250);
  assert.deepEqual(active.events.at(-1), { v: 1, page: 'page-not-found', event: 'not_found' });
  assert.ok(active.statuses.every(status => status === 204)); assert.deepEqual(active.unexpected, []); assert.deepEqual(active.errors, []);
  await active.context.close();
  const sampled = await contextFor({ sample: true });
  await sampled.page.goto(production); await sampled.page.evaluate(() => document.fonts.ready); await delay(300);
  await sampled.page.locator('main').click({ position: { x: 10, y: 10 } }); await delay(150);
  // Simulate backgrounding after real paints/interactions. Actual web-vitals
  // observers flush their measured values before route teardown can cancel relay.
  await sampled.page.evaluate(() => {
    Object.defineProperty(document, 'visibilityState', { value: 'hidden', configurable: true });
    document.dispatchEvent(new Event('visibilitychange', { bubbles: true }));
  });
  await delay(500);
  const vitals = sampled.events.filter(event => event.event === 'web_vital');
  assert.ok(vitals.some(event => event.metric === 'LCP'), 'Sampled page reports an LCP rating');
  assert.ok(vitals.some(event => event.metric === 'CLS'), 'Sampled page reports a CLS rating');
  assert.ok(vitals.every(event => Object.keys(event).sort().join(',') === 'event,metric,page,rating,v'));
  assert.deepEqual(sampled.unexpected, []); assert.deepEqual(sampled.errors, []); await sampled.context.close();

  // Time/depth are independently required for the docs reading proxy. The clock
  // advances all interval callbacks, without a real thirty-second blocking wait.
  if (chapterIds.length) {
    const reading = await contextFor();
    await reading.page.clock.install();
    await reading.page.addInitScript(() => {
      window.__statsVisibility = 'visible';
      Object.defineProperty(document, 'visibilityState', { get() { return window.__statsVisibility; } });
    });
    await reading.page.goto(`${production}/docs/customize/`);
    await reading.page.evaluate(() => document.fonts.ready);
    const depth = () => reading.page.evaluate(() => {
      const article = document.querySelector('.prose');
      const rect = article.getBoundingClientRect();
      window.scrollBy(0, rect.top + rect.height * .6 - innerHeight);
    });
    await reading.page.clock.runFor(14000);
    await reading.page.evaluate(() => { window.__statsVisibility = 'hidden'; document.dispatchEvent(new Event('visibilitychange')); });
    await depth();
    await reading.page.clock.runFor(31000);
    assert.ok(!reading.events.some(event => event.event === 'chapter_engaged'), 'Hidden time never qualifies as reading');
    await reading.page.evaluate(() => { window.__statsVisibility = 'visible'; document.dispatchEvent(new Event('visibilitychange')); });
    await reading.page.clock.runFor(14000);
    assert.ok(!reading.events.some(event => event.event === 'chapter_engaged'), 'Fewer than 30 visible seconds never qualify');
    await reading.page.clock.runFor(3000); await delay(100);
    assert.deepEqual(reading.events.filter(event => event.event === 'chapter_engaged'), [{ v: 1, page: 'chapter-customize', event: 'chapter_engaged' }]);
    await reading.page.clock.runFor(10000);
    assert.equal(reading.events.filter(event => event.event === 'chapter_engaged').length, 1, 'Reading proxy is once per load');
    await reading.page.evaluate(() => document.addEventListener('click', event => event.preventDefault()));
    await reading.page.locator('.source-note a[data-stats-target="desktop-source"]').click();
    await delay(150);
    assert.equal(reading.events.filter(event => event.event === 'outbound_click' && event.target === 'desktop-source').length, 1);
    assert.ok(reading.statuses.every(status => status === 204));
    assert.deepEqual(reading.unexpected, []); assert.deepEqual(reading.errors, []); await reading.context.close();

    const shallow = await contextFor();
    await shallow.page.clock.install();
    await shallow.page.goto(`${production}/docs/customize/`);
    await shallow.page.evaluate(() => document.fonts.ready);
    assert.ok(await shallow.page.evaluate(() => { const rect = document.querySelector('.prose').getBoundingClientRect(); return innerHeight - rect.top < rect.height * .5; }));
    await shallow.page.clock.runFor(31000);
    assert.ok(!shallow.events.some(event => event.event === 'chapter_engaged'), 'Visible time without 50% depth never qualifies');
    await shallow.page.evaluate(() => { const rect = document.querySelector('.prose').getBoundingClientRect(); window.scrollBy(0, rect.top + rect.height * .6 - innerHeight); });
    await shallow.page.clock.runFor(1000); await delay(100);
    assert.equal(shallow.events.filter(event => event.event === 'chapter_engaged').length, 1);
    assert.ok(shallow.statuses.every(status => status === 204));
    assert.deepEqual(shallow.unexpected, []); assert.deepEqual(shallow.errors, []); await shallow.context.close();
    console.log('PASS chapter engagement proxy: 30 visible seconds, 50% reading depth, hidden-time exclusion and once-per-load emission');
  }

  const owner = await browser.newContext({ httpCredentials: { username: 'owner', password: token } });
  const ownerPage = await owner.newPage(), errors = [];
  ownerPage.on('pageerror', error => errors.push(error.message));
  await ownerPage.goto(`${local}/admin/stats/`);
  await ownerPage.waitForFunction(() => document.querySelector('#results')?.hidden === false);
  for (const viewport of [{ width: 1280, height: 900 }, { width: 390, height: 844 }]) {
    await ownerPage.setViewportSize(viewport);
    assert.ok(await ownerPage.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'Dashboard must not overflow');
    await ownerPage.screenshot({ path: `${root}/.cache/analytics-proof/dashboard-${viewport.width}.png`, fullPage: true });
  }
  await ownerPage.selectOption('#range', '13m');
  await ownerPage.waitForFunction(() => !document.querySelector('#results').hidden && document.querySelector('#trend th')?.textContent === 'UTC month');
  const empty = { ...await dashboard(), rows: [] };
  await ownerPage.route('**/admin/data?*', route => route.fulfill({ contentType: 'application/json', body: JSON.stringify(empty) }));
  await ownerPage.locator('#refresh').click();
  await ownerPage.waitForFunction(() => !document.querySelector('#results').hidden && document.querySelector('#pages')?.textContent === 'No measurements in this window.');
  await ownerPage.unroute('**/admin/data?*');
  await ownerPage.route('**/admin/data?*', route => route.fulfill({ status: 503, body: 'Unavailable' }));
  await ownerPage.locator('#refresh').click();
  await ownerPage.waitForFunction(() => document.querySelector('#results').hidden && document.querySelector('#status')?.textContent?.includes('No stale data is shown'));
  assert.deepEqual(errors, []); await owner.close();
  const result = await dashboard();
  assert.ok(result.rows.every(row => pageIds.includes(row.page) && Number.isInteger(row.count) && row.count > 0));
  assert.doesNotMatch(JSON.stringify(result), /must-not|private-fragment|private-path|@example|user-agent|visitor|127\.0\.0\.1/);
  console.log('PASS local Worker/D1: headers, admin authentication, aggregates, scheduled cleanup, origin gating, DNT/GPC/storage/opt-out, trusted clicks, sampled vitals and responsive dashboard; zero live analytics');
} finally {
  try { await browser?.close(); }
  finally {
    if (isRunning()) {
      const stopped = once(server, 'exit');
      try { process.kill(-server.pid, 'SIGTERM'); } catch (error) { if (error.code !== 'ESRCH') throw error; }
      await Promise.race([stopped, delay(3000)]);
      if (isRunning()) {
        try { process.kill(-server.pid, 'SIGKILL'); } catch (error) { if (error.code !== 'ESRCH') throw error; }
        await Promise.race([stopped, delay(3000)]); assert.ok(!isRunning(), 'Local Worker did not stop.');
      }
    }
    await rm(scratch, { recursive: true, force: true });
  }
}
