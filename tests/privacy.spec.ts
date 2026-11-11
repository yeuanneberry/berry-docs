import { expect, test } from '@playwright/test';

test('privacy choice stores only an opt-out and stays usable in disabled builds', async ({ page }, info) => {
  const statistics: string[] = [];
  page.on('request', request => { if (new URL(request.url()).pathname === '/api/stats') statistics.push(request.url()); });
  await page.goto('/privacy/');
  await expect(page).toHaveTitle('Privacy | Berry docs');
  await expect(page.locator('.statistics-status')).toContainText('First-party statistics are disabled');
  const control = page.getByRole('checkbox', { name: 'Turn off analytics for this browser on this site' });
  await expect(control).not.toBeChecked();
  await control.focus();
  await page.keyboard.press('Space');
  await expect(control).toBeChecked();
  expect(await page.evaluate(() => ({ ...localStorage }))).toEqual({ 'berry.analytics.optout': 'true' });
  await page.reload();
  await expect(control).toBeChecked();
  await expect(page.locator('[data-analytics-status]')).toContainText('Collection is disabled for this build');
  await control.uncheck();
  expect(await page.evaluate(() => ({ ...localStorage }))).toEqual({});
  expect(statistics).toEqual([]);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: info.outputPath('privacy.png'), fullPage: true });
});

test('unavailable preference storage fails closed', async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(window, 'localStorage', { get() { throw new Error('Storage disabled for test'); } });
  });
  await page.goto('/privacy/');
  await expect(page.getByRole('checkbox', { name: 'Turn off analytics for this browser on this site' })).toBeChecked();
  await expect(page.locator('[data-analytics-status]')).toContainText('Collection is disabled for this build');
});
