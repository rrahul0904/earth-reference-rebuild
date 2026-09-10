import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  testMatch: '**/browser.spec.mjs',
  timeout: 60_000,
  expect: { timeout: 10_000 },
  reporter: [['list'], ['html', { outputFolder: 'playwright-report', open: 'never' }]],
  use: {
    baseURL: 'http://127.0.0.1:4173',
    headless: true,
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
    video: 'retain-on-failure',
    launchOptions: {
      args: ['--use-angle=swiftshader', '--enable-webgl', '--ignore-gpu-blocklist', '--disable-dev-shm-usage']
    }
  },
  webServer: {
    command: 'python3 -m http.server 4173 --bind 127.0.0.1',
    url: 'http://127.0.0.1:4173',
    reuseExistingServer: false,
    timeout: 20_000
  }
});
