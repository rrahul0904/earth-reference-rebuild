import { defineConfig } from '@playwright/test';

const remoteURL = process.env.EARTH_BASE_URL;
const port = Number(process.env.EARTH_PORT || 4173);

export default defineConfig({
  testDir: './tests',
  testMatch: '**/*.spec.mjs',
  timeout: 240_000,
  workers: 1,
  expect: { timeout: 10_000 },
  reporter: [['list'], ['html', { outputFolder: 'playwright-report', open: 'never' }]],
  use: {
    baseURL: remoteURL || `http://127.0.0.1:${port}`,
    headless: true,
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
    video: 'retain-on-failure',
    launchOptions: {
      ...(process.env.EARTH_CHROMIUM_EXECUTABLE ? { executablePath: process.env.EARTH_CHROMIUM_EXECUTABLE } : {}),
      args: ['--use-angle=swiftshader', '--enable-webgl', '--ignore-gpu-blocklist', '--disable-dev-shm-usage']
    }
  },
  webServer: remoteURL ? undefined : {
    command: `python3 -m http.server ${port} --bind 127.0.0.1`,
    url: `http://127.0.0.1:${port}`,
    reuseExistingServer: false,
    timeout: 20_000
  }
});
