import { expect, test } from '@playwright/test';
import { writeFile } from 'node:fs/promises';

test('initial pages stay within asset budgets and record local loading metrics', async ({ browser, baseURL }, info) => {
  const report = [];
  for (const path of ['/', '/docs/', '/docs/customize/']) {
    const context = await browser.newContext({ baseURL, viewport: info.project.use.viewport });
    const page = await context.newPage();
    const external: string[] = [];
    page.on('request', request => { if (new URL(request.url()).origin !== new URL(baseURL!).origin) external.push(request.url()); });
    await page.addInitScript(() => {
      const metrics = { lcp: 0, cls: 0 };
      (window as any).__loadingMetrics = metrics;
      new PerformanceObserver(list => { for (const entry of list.getEntries()) metrics.lcp = entry.startTime; })
        .observe({ type: 'largest-contentful-paint', buffered: true });
      new PerformanceObserver(list => {
        for (const entry of list.getEntries() as any[]) if (!entry.hadRecentInput) metrics.cls += entry.value;
      }).observe({ type: 'layout-shift', buffered: true });
    });
    try {
      await page.goto(path);
      await page.evaluate(async () => {
        await document.fonts.ready;
        // Closed native details can retain pending, non-visible transitions.
        // Observe the page introduction rather than waiting on hidden controls.
        const intro = document.querySelector('.index-intro');
        await Promise.all((intro?.getAnimations() ?? []).map(animation => animation.finished.catch(() => {})));
        await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
      });
      const reading = await page.evaluate(() => {
        const resources = performance.getEntriesByType('resource') as PerformanceResourceTiming[];
        const sum = (pattern: RegExp) => resources.filter(entry => pattern.test(new URL(entry.name).pathname)).reduce((bytes, entry) => bytes + entry.decodedBodySize, 0);
        return {
          ...(window as any).__loadingMetrics,
          firstContentfulPaint: performance.getEntriesByName('first-contentful-paint')[0]?.startTime ?? null,
          javascriptBytes: sum(/\.js$/), cssBytes: sum(/\.css$/), fontBytes: sum(/\.(woff2?|ttf)$/),
          resources: resources.map(entry => ({ path: new URL(entry.name).pathname, bytes: entry.decodedBodySize })),
        };
      });
      expect(external).toEqual([]);
      expect(reading.javascriptBytes).toBeLessThan(25_000);
      expect(reading.cssBytes).toBeLessThan(30_000);
      expect(reading.fontBytes).toBeGreaterThan(0);
      expect(reading.fontBytes).toBeLessThan(100_000);
      expect(reading.cls).toBeLessThanOrEqual(0.1);
      report.push({ path, ...reading });
    } finally { await context.close(); }
  }
  const artifact = info.outputPath('performance.json');
  await writeFile(artifact, JSON.stringify({ environment: 'local Chromium, cold contexts, unthrottled network; lab observations only', viewport: info.project.use.viewport, pages: report }, null, 2));
  await info.attach('performance', { path: artifact, contentType: 'application/json' });
});
