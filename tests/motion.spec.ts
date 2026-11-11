import { expect, test } from '@playwright/test';

test('every main page introduction shares the entrance and honors reduced motion', async ({ page }) => {
  const introductions = [['/', '.index-intro'], ['/docs/', '.index-intro']];
  for (const [path, selector] of introductions) {
    await page.goto(path!);
    const intro = page.locator(selector!);
    await expect(intro).toHaveCSS('animation-name', 'introduction');
    await expect(intro).toHaveCSS('animation-duration', '0.32s');
    await expect(intro).toHaveCSS('opacity', '1');
  }
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.reload();
  await expect(page.locator('.index-intro')).toHaveCSS('animation-name', 'none');
  await page.goto('/');
  await expect(page.locator('.index-intro')).toHaveCSS('animation-name', 'none');
  await expect(page.locator('.index-intro')).toHaveCSS('opacity', '1');
});

test('mobile controls work before any animation module downloads', async ({ page }, info) => {
  if (info.project.name === 'desktop') return;
  let release!: () => void;
  const gate = new Promise<void>(resolve => { release = resolve; });
  let blocked = 0;
  await page.route('**/*', async route => {
    if (route.request().resourceType() === 'script') { blocked++; await gate; }
    await route.continue();
  });
  await page.addInitScript(() => {
    let frames = 0;
    function sample() {
      const nav = document.querySelector('.desktop-nav');
      if (nav) {
        frames++;
        document.documentElement.dataset.startupFrames = String(frames);
        if (getComputedStyle(nav).display !== 'none') document.documentElement.dataset.navFlash = 'true';
      }
      if (frames < 10) requestAnimationFrame(sample);
    }
    requestAnimationFrame(sample);
  });
  try {
    await page.goto('/', { waitUntil: 'commit' });
    await expect(page.getByRole('button', { name: 'Open menu' })).toBeVisible();
    await expect(page.locator('.desktop-nav')).toBeHidden();
    await page.getByRole('button', { name: 'Open menu' }).click();
    await expect(page.getByRole('dialog', { name: 'Navigation' })).toBeVisible();
    await page.getByRole('button', { name: 'Close menu' }).click();
    await expect(page.getByRole('dialog', { name: 'Navigation' })).toBeHidden();
    await expect.poll(() => page.evaluate(() => Number(document.documentElement.dataset.startupFrames))).toBeGreaterThanOrEqual(3);
    expect(await page.locator('html').getAttribute('data-nav-flash')).toBeNull();
    expect(blocked).toBeGreaterThan(0);
  } finally { release(); await page.waitForLoadState('load'); }
});

test('menu transitions survive interruption, repeated close and desktop resize', async ({ page }, info) => {
  if (info.project.name === 'desktop') return;
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('/');
  const panel = page.locator('#mobile-navigation');
  for (let cycle = 0; cycle < 3; cycle++) {
    await page.getByRole('button', { name: 'Open menu' }).click();
    await expect(panel).toBeVisible();
    expect(await panel.evaluate(element => element.getAnimations({ subtree: true }).length)).toBeGreaterThan(0);
    await page.keyboard.press('Escape');
    await page.keyboard.press('Escape');
    await expect(panel).toBeHidden();
    await expect(page.locator('html')).not.toHaveClass(/navigation-open/);
  }
  await page.getByRole('button', { name: 'Open menu' }).click();
  await page.getByRole('button', { name: 'Close menu' }).click();
  await page.setViewportSize({ width: 1100, height: 812 });
  await expect(panel).toBeHidden();
  await expect(page.locator('.desktop-nav')).toBeVisible();
  await expect(page.locator('html')).not.toHaveClass(/navigation-open/);
  await page.setViewportSize({ width: 375, height: 812 });
  await page.getByRole('button', { name: 'Open menu' }).click();
  await expect(panel).toBeVisible();
  await expect(panel.locator('.mobile-nav a').first()).toHaveCSS('opacity', '1');
  expect(errors).toEqual([]);
});

test('reduced motion keeps content visible and menu animation disabled', async ({ page }, info) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  await expect(page.locator('.index-intro')).toHaveCSS('opacity', '1');
  expect(await page.locator('.index-intro').evaluate(element => element.getAnimations().length)).toBe(0);
  if (info.project.name === 'phone') {
    await page.getByRole('button', { name: 'Open menu' }).click();
    const panel = page.locator('#mobile-navigation');
    expect(await panel.evaluate(element => element.getAnimations({ subtree: true }).length)).toBe(0);
    await page.keyboard.press('Escape');
    await expect(panel).toBeHidden();
    await expect(page.locator('html')).not.toHaveClass(/navigation-open/);
  }
});

test('short landscape menus scroll without moving the close control', async ({ page }, info) => {
  if (info.project.name === 'desktop') return;
  await page.setViewportSize({ width: 812, height: 375 });
  await page.goto('/');
  const toggle = page.getByRole('button', { name: 'Open menu' });
  const before = (await toggle.boundingBox())!;
  await toggle.click();
  const close = page.getByRole('button', { name: 'Close menu' });
  const nav = page.locator('.mobile-nav');
  expect(await nav.evaluate(element => element.scrollHeight > element.clientHeight)).toBe(true);
  await nav.evaluate(element => { element.scrollTop = element.scrollHeight; });
  const after = (await close.boundingBox())!;
  for (const key of ['x', 'y', 'width', 'height'] as const) expect(after[key]).toBeCloseTo(before[key], 0);
  await expect(close).toBeInViewport();
  await close.click();
  await expect(page.locator('#mobile-navigation')).toBeHidden();
});
