import { expect, test } from '@playwright/test';

test('mobile navigation supports focus trapping, closing and local chapter navigation', async ({ page }, info) => {
  await page.goto('/');
  const toggle = page.locator('#open-navigation');
  const dialog = page.getByRole('dialog', { name: 'Navigation', exact: true });
  if (info.project.name === 'desktop') {
    await expect(toggle).toBeHidden();
    await expect(page.locator('.desktop-nav')).toBeVisible();
    return;
  }
  const before = (await toggle.boundingBox())!;
  expect(before.width).toBe(44);
  expect(before.height).toBe(44);
  await toggle.click();
  await expect(dialog).toBeVisible();
  await expect(toggle).toHaveAttribute('aria-expanded', 'true');
  const close = dialog.getByRole('button', { name: 'Close menu' });
  await expect(close).toBeFocused();
  const after = (await close.boundingBox())!;
  for (const key of ['x', 'y', 'width', 'height'] as const) expect(after[key]).toBeCloseTo(before[key], 0);
  const box = (await dialog.boundingBox())!;
  expect(box.width).toBeCloseTo(page.viewportSize()!.width, 0);
  expect(box.height).toBeCloseTo(page.viewportSize()!.height, 0);
  expect(await page.evaluate(() => getComputedStyle(document.documentElement).overflow)).toBe('hidden');
  const scroll = await page.evaluate(() => scrollY);
  await page.mouse.wheel(0, 300);
  expect(await page.evaluate(() => scrollY)).toBe(scroll);
  await page.keyboard.press('Shift+Tab');
  await expect(dialog.getByRole('link', { name: /Website/ })).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(close).toBeFocused();
  await page.screenshot({ path: info.outputPath('mobile-navigation.png') });
  await page.keyboard.press('Escape');
  await expect(dialog).toBeHidden();
  await expect(toggle).toBeFocused();
  await toggle.click();
  await close.click();
  await expect(dialog).toBeHidden();
  await toggle.click();
  await dialog.getByRole('link', { name: 'Chapters', exact: true }).click();
  await expect(page).toHaveURL(/\/docs\/$/);
  await toggle.click();
  await page.setViewportSize({ width: 1100, height: 812 });
  await expect(dialog).toBeHidden();
  await expect(page.locator('html')).not.toHaveClass(/navigation-open/);
  await expect(page.locator('.desktop-nav a[aria-current]')).toBeFocused();
});

test('documentation landing and chapter pages have safe links and no runtime errors', async ({ page, request }, info) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
  page.on('response', response => { if (response.status() >= 400) errors.push(`${response.status()} ${response.url()}`); });
  const titles: Record<string, string> = {
    '/': 'Linux presets, setup and recovery | Berry docs', '/docs/': 'Linux presets, setup and recovery | Berry docs', '/privacy/': 'Privacy | Berry docs',
    '/docs/overview/': 'Berry Linux presets: overview | Berry docs', '/docs/start/': 'Set up your first application preset | Berry docs',
    '/docs/customize/': 'Customize your Linux configuration | Berry docs', '/docs/apply-recover/': 'Apply and recover application presets | Berry docs',
    '/docs/update/': 'Update your configuration safely | Berry docs', '/docs/reference/': 'Configuration files and troubleshooting | Berry docs',
  };
  for (const [path, title] of Object.entries(titles)) {
    await page.goto(path);
    await expect(page).toHaveTitle(title);
    await expect(page.getByRole('heading', { level: 1 })).toHaveCount(1);
    for (const link of await page.locator('a[href^="http"]').all()) {
      await expect(link).toHaveAttribute('target', '_blank');
      expect((await link.getAttribute('rel'))?.split(/\s+/)).toEqual(expect.arrayContaining(['noopener', 'noreferrer']));
      await expect(link.locator('.sr-only')).toHaveText(' (opens in a new tab)');
    }
    for (const link of await page.locator('a[href^="/"], a[href^="#"]').all()) expect(await link.getAttribute('target')).toBeNull();
    for (const route of ['/work/', '/about/', '/code/']) await expect(page.locator(`a[href="${route}"]`)).toHaveCount(0);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    if (path === '/') {
      await expect(page.locator('.chapter-result')).toHaveCount(6);
      await page.screenshot({ path: info.outputPath('docs-home.png'), fullPage: true });
    }
  }
  expect(errors).toEqual([]);
  for (const path of ['/work/', '/work/softlysang/', '/about/', '/code/']) expect((await request.get(path)).status()).toBe(404);
});

test('website link opens a new tab while the documentation stays open', async ({ page, context }) => {
  await context.route('http://127.0.0.1:4321/**', route => route.fulfill({ contentType: 'text/html', body: '<title>Website link check</title>' }));
  await page.goto('/docs/customize/');
  const link = page.locator('footer').getByRole('link', { name: /Website/ });
  await expect(link).toHaveAttribute('href', 'http://127.0.0.1:4321/');
  const popupPromise = page.waitForEvent('popup');
  await link.click();
  const popup = await popupPromise;
  try {
    await expect(popup).toHaveTitle('Website link check');
    await expect(page).toHaveURL(/\/docs\/customize\/$/);
  } finally { await popup.close(); }
});

test('header artwork and favicon retain responsive image delivery', async ({ browser, baseURL, request }, info) => {
  const context = await browser.newContext({ baseURL, viewport: info.project.use.viewport, deviceScaleFactor: 3 });
  const page = await context.newPage();
  try {
    await page.goto('/');
    const image = page.locator('.header-avatar');
    const dimensions = await image.evaluate(async element => {
      const rendered = element as HTMLImageElement;
      const source = new Image();
      source.src = rendered.currentSrc;
      await source.decode();
      return { pixels: source.naturalWidth, width: parseFloat(getComputedStyle(rendered).width), source: rendered.currentSrc };
    });
    expect(dimensions.pixels).toBeGreaterThanOrEqual(Math.floor(dimensions.width * 3));
    expect((await request.get(dimensions.source)).headers()['content-type']).toContain('image/webp');
    const favicon = new URL((await page.locator('link[rel="icon"]').getAttribute('href'))!, page.url()).href;
    const bytes = await (await request.get(favicon)).body();
    expect([bytes.readUInt32BE(16), bytes.readUInt32BE(20)]).toEqual([32, 32]);
  } finally { await context.close(); }
});
