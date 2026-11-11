import { expect, test } from '@playwright/test';

test('sharing metadata, local font and preview indexing are consistent', async ({ page, request }) => {
  await page.goto('/');
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', 'noindex, nofollow');
  await expect(page.locator('link[rel="canonical"]')).toHaveCount(0);
  await expect(page.locator('meta[name="twitter:card"]')).toHaveAttribute('content', 'summary_large_image');
  await expect(page).toHaveTitle('Linux presets, setup and recovery | Berry docs');
  await expect(page.locator('meta[property="og:image:alt"]')).toHaveAttribute('content', 'Linux presets, setup and recovery — Berry docs. 6 reviewed Berry guides for Linux application presets, customization, safe updates and recovery.');
  const imageURL = await page.locator('meta[property="og:image"]').getAttribute('content');
  expect(new URL(imageURL!).pathname).toMatch(/^\/og\/docs-index-[a-f0-9]{16}\.png$/);
  const image = await request.get(new URL(imageURL!).pathname);
  expect(image.status()).toBe(200);
  const bytes = await image.body();
  expect(bytes.readUInt32BE(16)).toBe(1200);
  expect(bytes.readUInt32BE(20)).toBe(630);
  const fonts = await page.evaluate(() => performance.getEntriesByType('resource').map(entry => entry.name).filter(name => /\.(woff2|ttf)$/.test(name)));
  expect(fonts).toHaveLength(1);
  expect(fonts[0]).toMatch(/JetBrainsMono-Regular\.woff2$/);
  expect((await request.get('/robots.txt')).status()).toBe(200);
  expect(await (await request.get('/robots.txt')).text()).toContain('Disallow: /');
});

test('unknown addresses return a usable 404 page', async ({ page }) => {
  const response = await page.goto('/this-page-does-not-exist/');
  expect(response?.status()).toBe(404);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Page not found');
  await page.locator('main').getByRole('link', { name: 'Home', exact: false }).click();
  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Documentation');
});
