import { test, expect } from '@playwright/test';

async function ready(page) {
  await page.goto('/');
  await page.waitForFunction(() => document.querySelector('#app')?.dataset.ready === 'true');
  await page.waitForFunction(() => document.querySelector('#app')?.dataset.convergenceReady === 'true');
  await page.waitForFunction(() => document.querySelector('#app')?.dataset.earthNowReady === 'true');
}

test('Earth Now loads as an explicit fixture-only slice without a live claim', async ({ page }) => {
  await ready(page);

  await expect(page.locator('#app')).toHaveAttribute('data-earth-now-mode', 'fixture');
  expect(await page.evaluate(() => window.EarthNow.mode)).toBe('fixture');
  expect(await page.evaluate(() => window.EarthNow.asOf)).toBe('2026-10-07T18:05:00.000Z');

  await page.evaluate(() => window.EarthConvergence.open());
  await expect(page.locator('#convergenceDrawer')).toBeVisible();
  await expect(page.locator('#earthNowPanel')).toBeVisible();
  await expect(page.locator('#earthNowPanel')).toContainText('FIXTURE · NO NETWORK');
  await expect(page.locator('#earthNowPanel')).toContainText('not a live-feed claim');
  await expect(page.locator('[data-earth-now-event]')).toHaveCount(3);

  const snapshot = await page.evaluate(() => window.EarthConvergence.snapshot());
  expect(snapshot.eventCount).toBe(3);
  expect(snapshot.activeLayers).toContain('events');

  const digest = await page.evaluate(() => window.EarthNow.getDigest());
  expect(digest).toMatch(/^[a-f0-9]{64}$/);
});

test('Earth Now isolates provider failure while preserving cached geographic evidence', async ({ page }) => {
  await ready(page);
  await page.evaluate(() => window.EarthConvergence.open());

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

  const first = page.locator('[data-earth-now-event]').first();
  await expect(first).toContainText('Fixture · northwest Pacific');
  await first.click();

  await expect(page.locator('#app')).toHaveAttribute('data-convergence-selected', 'earth-now-fixture-japan');
  const selected = await page.evaluate(() => window.EarthConvergence.snapshot().selectedPlace);
  expect(selected).toBe('earth-now-fixture-japan');
});
