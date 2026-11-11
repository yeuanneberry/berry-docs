import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: 0,
  workers: 2,
  reporter: 'list',
  use: {
    baseURL: 'http://127.0.0.1:4332',
    trace: 'retain-on-failure',
    launchOptions: {
      executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH,
    },
  },
  projects: [
    { name: 'desktop', use: { viewport: { width: 1440, height: 900 } } },
    { name: 'phone', use: { viewport: { width: 375, height: 812 } } },
  ],
  webServer: {
    // Astro auto-backgrounds under agent environments; this documented one-off
    // foreground mode lets Playwright own and terminate the preview process.
    command: 'pnpm --filter web preview --ignore-lock --host 127.0.0.1 --port 4332',
    url: 'http://127.0.0.1:4332',
    reuseExistingServer: false,
    timeout: 30_000,
  },
});
