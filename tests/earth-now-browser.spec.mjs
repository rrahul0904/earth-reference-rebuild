import { test, expect } from '@playwright/test';

async function ready(page) {
  await page.goto('/');
  await page.waitForFunction(() => document.querySelector('#app')?.dataset.ready === 'true');
  await page.waitForFunction(() => document.querySelector('#app')?.dataset.convergenceReady === 'true');
  await page.waitForFunction(() => document.querySelector('#app')?.dataset.earthNowReady === 'true');
}

test('Earth Now loads as an explicit fixture-only slice without a live claim', async ({ page }) => {
  await ready(page);

  expect(await page.evaluate(() => window.EarthConvergence.snapshot().activeLayers)).toEqual([]);
  expect(await page.evaluate(() => window.EarthConvergence.snapshot().eventCount)).toBe(0);
  await expect(page.locator('#app')).toHaveAttribute('data-earth-now-mode', 'fixture');
  expect(await page.evaluate(() => window.EarthNow.mode)).toBe('fixture');
  expect(await page.evaluate(() => window.EarthNow.asOf)).toBe('2026-10-07T18:05:00.000Z');

  await page.evaluate(() => window.EarthConvergence.open());
  await expect(page.locator('#convergenceDrawer')).toBeVisible();
  await expect(page.locator('#earthNowPanel')).toBeVisible();
  await expect(page.locator('#earthNowPanel')).toContainText('FIXTURE · NO NETWORK');
  await expect(page.locator('#earthNowPanel')).toContainText('not a live-feed claim');
  await expect(page.locator('#earthNowPanel')).not.toContainText('latest undefined');
  await expect(page.locator('[data-earth-now-event]')).toHaveCount(3);

  await page.locator('#earthNowTimeline').evaluate((slider) => { slider.value = '500'; slider.dispatchEvent(new Event('input', { bubbles: true })); });
  expect(await page.evaluate(() => window.EarthConvergence.snapshot().dataTime)).toBe(0.5);
  await page.locator('#earthNowTimeline').evaluate((slider) => { slider.value = '1000'; slider.dispatchEvent(new Event('input', { bubbles: true })); });

  const snapshot = await page.evaluate(() => window.EarthConvergence.snapshot());
  expect(snapshot.eventCount).toBe(0);
  expect(snapshot.activeLayers).toEqual([]);

  await page.locator('#earthNowLoadFixtures').click();
  await expect(page.locator('#convergenceMetricLayers')).toHaveText('1');
  expect(await page.evaluate(() => window.EarthConvergence.snapshot().activeLayers)).toEqual(['events']);
  expect(await page.evaluate(() => window.EarthConvergence.snapshot().eventCount)).toBe(3);

  const digest = await page.evaluate(() => window.EarthNow.getDigest());
  expect(digest).toMatch(/^[a-f0-9]{64}$/);
});

test('Earth Now fixture refresh preserves the selected events-layer visibility', async ({ page }) => {
  await ready(page);
  await page.evaluate(() => window.EarthConvergence.open());

  await page.locator('#earthNowLoadFixtures').click();
  expect(await page.evaluate(() => window.EarthConvergence.snapshot().activeLayers)).toEqual(['events']);
  await page.evaluate(() => window.EarthNow.loadFixtures());
  expect(await page.evaluate(() => window.EarthConvergence.snapshot().activeLayers)).toEqual(['events']);

  await page.locator('[data-layer="events"]').click();
  expect(await page.evaluate(() => window.EarthConvergence.snapshot().activeLayers)).toEqual([]);
  await page.evaluate(() => window.EarthNow.loadFixtures());
  expect(await page.evaluate(() => window.EarthConvergence.snapshot().activeLayers)).toEqual([]);
  expect(await page.evaluate(() => window.EarthConvergence.snapshot().eventCount)).toBe(3);
});

test('Earth Now isolates provider failure while preserving cached geographic evidence', async ({ page }) => {
  await ready(page);
  await page.evaluate(() => window.EarthConvergence.open());
  await page.locator('#earthNowLoadFixtures').click();

  await page.locator('#earthNowSimulateOutage').click();
  await expect(page.locator('#app')).toHaveAttribute('data-earth-now-provider', 'down');
  await expect(page.locator('#app')).toHaveAttribute('data-earth-now-display', 'cached-provider-down');
  await expect(page.locator('#earthNowPanel')).toContainText('cached provider down');

  const duringOutage = await page.evaluate(() => ({
    eventCount: window.EarthConvergence.snapshot().eventCount,
    quakeSignals: window.EarthNow.getQuakeSignals().length,
    kpSignals: window.EarthNow.getKpSignals().length
  }));
  expect(duringOutage.eventCount).toBe(3);
  expect(duringOutage.quakeSignals).toBe(3);
  expect(duringOutage.kpSignals).toBe(3);

  await page.locator('#earthNowRestore').click();
  await expect(page.locator('#app')).toHaveAttribute('data-earth-now-provider', 'healthy');
  await expect(page.locator('#app')).toHaveAttribute('data-earth-now-display', 'current');
});

test('Earth Now reuses the existing globe event-selection path', async ({ page }) => {
  await ready(page);
  await page.evaluate(() => window.EarthConvergence.open());
  await page.locator('#earthNowLoadFixtures').click();

  const first = page.locator('[data-earth-now-event]').first();
  await expect(first).toContainText('Fixture · northwest Pacific');
  await first.click();

  await expect(page.locator('#app')).toHaveAttribute('data-convergence-selected', 'earth-now-fixture-japan');
  const selected = await page.evaluate(() => window.EarthConvergence.snapshot().selectedPlace);
  expect(selected).toBe('earth-now-fixture-japan');
});

test('Earth Now live mode uses only normalized same-origin provider endpoints', async ({ page }) => {
  const calls = [];
  const provider = (providerId, signals, status = 'healthy') => ({
    schemaVersion: 'earth-now-provider/v1',
    providerId,
    sourceStatus: status,
    servedFromCache: false,
    fetchedAt: '2026-10-13T12:00:00.000Z',
    layerState: {
      schemaVersion: 'earth-signal/v1',
      layer: {
        id: providerId === 'usgs-earthquakes' ? 'earth-now-earthquakes' : 'earth-now-planetary-kp',
        provider: { sourceRef: providerId === 'usgs-earthquakes' ? 'https://earthquake.usgs.gov/earthquakes/feed/v1.0/geojson.php' : 'https://services.swpc.noaa.gov/products/noaa-planetary-k-index.json' }
      },
      provider: { providerId, status, checkedAt: '2026-10-13T12:00:00.000Z', detail: status === 'down' ? 'Provider temporarily unavailable.' : 'Retrieved and validated.', lastSuccessAt: '2026-10-13T11:59:00.000Z' },
      displayState: status === 'down' ? (signals.length ? 'cached-provider-down' : 'unavailable') : 'current',
      signals
    }
  });
  const quakeSignal = {
    id: 'live-quake-1', layerId: 'earth-now-earthquakes', evidenceClass: 'observation',
    observedAt: '2026-10-13T11:55:00.000Z', freshness: 'fresh', title: 'M 4.4 · Live test region',
    summary: 'Observed earthquake event.', position: { lat: 11, lon: 22 }, properties: { magnitude: 4.4 }
  };
  const kpSignal = {
    id: 'kp-live-1', layerId: 'earth-now-planetary-kp', evidenceClass: 'observation',
    observedAt: '2026-10-13T09:00:00.000Z', freshness: 'fresh', title: 'Planetary Kp 5.00',
    summary: 'Planetary geomagnetic storm-level Kp observation.', position: null, properties: { kp: 5 }
  };
  await page.route('**/api/earth-now/**', async (route) => {
    const url = new URL(route.request().url());
    calls.push(url.pathname);
    const isUsgs = url.pathname.endsWith('/earthquakes');
    const body = isUsgs
      ? provider('usgs-earthquakes', [quakeSignal])
      : provider('noaa-swpc-kp', [kpSignal], 'down');
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(body) });
  });

  await ready(page);
  await page.evaluate(() => window.EarthConvergence.open());
  expect(await page.evaluate(() => window.EarthConvergence.snapshot().activeLayers)).toEqual([]);
  await page.locator('[data-layer="events"]').click();
  await page.locator('#earthNowLoadLive').click();

  await expect(page.locator('#app')).toHaveAttribute('data-earth-now-mode', 'live');
  await expect(page.locator('#earthNowPanel')).toContainText('LIVE SOURCES · DEGRADED');
  await expect(page.locator('#earthNowPanel')).toContainText('cached provider down');
  await expect(page.locator('#earthNowSimulateOutage')).toBeHidden();
  await expect(page.locator('[data-earth-now-event]')).toHaveCount(1);
  expect(await page.evaluate(() => window.EarthConvergence.snapshot().activeLayers)).toEqual(['events']);
  expect(await page.evaluate(() => window.EarthNow.mode)).toBe('live');
  await page.locator('[data-layer="events"]').click();
  await page.evaluate(() => window.EarthNow.loadLive());
  expect(await page.evaluate(() => window.EarthConvergence.snapshot().activeLayers)).toEqual([]);
  await page.locator('#earthNowPanel').screenshot({ path: 'test-results/earth-now-live-panel.png' });
  expect(calls.sort()).toEqual([
    '/api/earth-now/earthquakes', '/api/earth-now/earthquakes',
    '/api/earth-now/planetary-kp', '/api/earth-now/planetary-kp'
  ]);
});
