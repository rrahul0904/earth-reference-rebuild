import { test, expect } from '@playwright/test';

const baseUrl = process.env.EARTH_BASE_URL || '';
const previewHost = (() => {
  try {
    const host = new URL(baseUrl).hostname;
    return host.endsWith('.vercel.app') && host !== 'earth-reference-rebuild.vercel.app';
  } catch {
    return false;
  }
})();

test.skip(!previewHost, 'Set EARTH_BASE_URL to a non-production Vercel Preview URL to exercise deployed provider functions.');

test('Vercel Preview provider functions return bounded evidence receipts through same-origin routes', async ({ page }) => {
  const directProviderRequests = [];
  page.on('request', (request) => {
    const host = new URL(request.url()).hostname;
    if (host === 'earthquake.usgs.gov' || host === 'services.swpc.noaa.gov') directProviderRequests.push(host);
  });

  await page.goto('/');
  await page.waitForFunction(() => document.querySelector('#app')?.dataset.ready === 'true');
  await page.waitForFunction(() => document.querySelector('#app')?.dataset.convergenceReady === 'true');
  await page.waitForFunction(() => document.querySelector('#app')?.dataset.earthNowReady === 'true');
  await page.evaluate(() => window.EarthConvergence.open());
  await page.locator('#earthNowLoadLive').click();

  await expect(page.locator('#app')).toHaveAttribute('data-earth-now-mode', 'live');
  expect(directProviderRequests).toEqual([]);

  const receipts = await page.evaluate(async () => {
    const paths = ['/api/earth-now/earthquakes', '/api/earth-now/planetary-kp'];
    return Promise.all(paths.map(async (path) => {
      const response = await fetch(path, { headers: { Accept: 'application/json' } });
      if (!response.ok) throw new Error(`${path} HTTP ${response.status}`);
      const body = await response.json();
      return { status: response.status, body };
    }));
  });
  for (const { status, body } of receipts) {
    expect(status).toBe(200);
    expect(body.schemaVersion).toBe('earth-now-provider/v1');
    expect(body.layerState.schemaVersion).toBe('earth-signal/v1');
    expect(['healthy', 'down']).toContain(body.sourceStatus);
    expect(body.receipt.schemaVersion).toBe('evidence-receipt/v1');
    expect(body.receipt.hash).toMatch(/^[a-f0-9]{64}$/);
    expect(body.receipt.sourceUrl).toMatch(/^https:\/\//);
    expect(body.layerState.signals.length).toBeLessThanOrEqual(10_000);
  }
});
