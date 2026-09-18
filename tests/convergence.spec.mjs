import { test, expect } from '@playwright/test';

const ready = async page => {
  await page.goto('/');
  await page.waitForFunction(() => document.querySelector('#app')?.dataset.ready === 'true');
  await page.waitForFunction(() => document.querySelector('#app')?.dataset.convergenceReady === 'true');
};

const openConvergence = async page => {
  if (!(await page.locator('#convergenceDrawer').isVisible())) {
    await page.locator('#exploreButton').click();
    await expect(page.locator('#exploreMenu')).toBeVisible();
    await openConvergence(page);
    await expect(page.locator('#convergenceDrawer')).toBeVisible();
  }
};

test('consolidated Earth systems explorer loads without changing the default experience', async ({ page }) => {
  await ready(page);
  await expect(page.locator('#app')).toHaveAttribute('data-experience', 'planet');
  await expect(page.locator('#convergenceTrigger')).toBeVisible();
  await openConvergence(page);
  await expect(page.locator('[data-layer]')).toHaveCount(7);
  await expect(page.locator('#convergenceMetricLayers')).toHaveText('0');
  const baseSnapshot = await page.evaluate(() => window.EarthConvergence.snapshot());
  expect(baseSnapshot.orbit.enabled).toBe(false);
  await page.screenshot({ path: 'test-results/20-convergence-layers.png', fullPage: true });
});

test('geospatial layer registry toggles deterministic data layers', async ({ page }) => {
  await ready(page);
  await openConvergence(page);
  await page.locator('[data-layer="cities"]').click();
  await page.locator('[data-layer="migration"]').click();
  const snapshot = await page.evaluate(() => window.EarthConvergence.snapshot());
  expect(snapshot.activeLayers).toEqual(['cities', 'migration']);
  await expect(page.locator('#convergenceMetricLayers')).toHaveText('2');
  await page.locator('#convergenceDataTime').evaluate(el => { el.value = '500'; el.dispatchEvent(new Event('input', { bubbles: true })); });
  const timeSnapshot = await page.evaluate(() => window.EarthConvergence.snapshot());
  expect(timeSnapshot.dataTime).toBeCloseTo(0.5, 2);

  await page.locator('[data-layer="heatmap"]').click();
  await page.locator('[data-layer="clusters"]').click();
  await page.locator('#convergenceRegion').selectOption('americas');
  const filtered = await page.evaluate(() => window.EarthConvergence.snapshot());
  expect(filtered.region).toBe('americas');
  expect(filtered.activeLayers).toEqual(['cities', 'clusters', 'heatmap', 'migration']);
});

test('Moonstake-derived landmark exploration integrates with the existing Moon experience', async ({ page }) => {
  await ready(page);
  const selected = await page.evaluate(() => window.EarthConvergence.selectMoonLandmark('apollo11'));
  expect(selected).toBeTruthy();
  await expect(page.locator('#app')).toHaveAttribute('data-experience', 'moon');
  await expect(page.locator('#app')).toHaveAttribute('data-convergence-selected', 'apollo11');
  await expect(page.locator('[data-exp-control="moon-apollo11"]')).toHaveClass(/active/);

  await openConvergence(page);
  await page.locator('[data-convergence-tab="places"]').click();
  await expect(page.locator('#convergencePlaceContext')).toHaveText('Lunar landmarks');
  await expect(page.locator('#convergencePlaceList')).toContainText('Apollo 11');
  await expect(page.locator('#convergencePlaceList')).toContainText('Shackleton');
  await page.screenshot({ path: 'test-results/21-convergence-moon-landmarks.png', fullPage: true });
});

test('Orbital Speeders-derived simulation computes a physical orbital period and replays in Orbit', async ({ page }) => {
  await ready(page);
  const orbit = await page.evaluate(() => window.EarthConvergence.setOrbit(420, 51.6));
  expect(orbit.enabled).toBe(true);
  expect(orbit.altitudeKm).toBe(420);
  expect(orbit.inclinationDeg).toBeCloseTo(51.6, 1);
  expect(orbit.periodSeconds).toBeGreaterThan(5400);
  expect(orbit.periodSeconds).toBeLessThan(5700);

  const prediction = await page.evaluate(() => window.EarthConvergence.predictOrbit(420, 180));
  expect(prediction.points).toHaveLength(181);
  expect(prediction.periodSeconds).toBeGreaterThan(5400);
  expect(prediction.periodSeconds).toBeLessThan(5700);
  expect(Math.abs(prediction.points[0].x - prediction.points.at(-1).x)).toBeLessThan(100);

  await openConvergence(page);
  await page.locator('[data-convergence-tab="simulation"]').click();
  await page.locator('[data-orbit-preset="geo"]').click();
  await expect(page.locator('#app')).toHaveAttribute('data-experience', 'orbit');
  await expect(page.locator('#convergenceOrbitAltitude')).toHaveText('35,786 km');
  await expect(page.locator('#convergenceOrbitPeriod')).toContainText('h');

  await page.locator('#convergenceSimTrack').click();
  await expect(page.locator('#convergenceSimTrack')).toHaveClass(/active/);
  await expect(page.locator('#convergenceSimTrack')).toContainText('Tracking');

  const snapshot = await page.evaluate(() => window.EarthConvergence.snapshot());
  expect(snapshot.activeLayers).toContain('groundtrack');
  const frozen = await page.evaluate(() => {
    window.EarthConvergence.setSimulationTime(42);
    return window.EarthConvergence.snapshot();
  });
  expect(frozen.orbit.altitudeKm).toBe(35786);
});

test('semantic renderAt timeline deterministically orchestrates existing experiences', async ({ page }) => {
  await ready(page);
  const first = await page.evaluate(() => window.EarthConvergence.renderAt(21));
  expect(first.story.time).toBe(21);
  expect(first.story.scene).toBe(3);
  await expect(page.locator('#app')).toHaveAttribute('data-experience', 'moon');
  await expect(page.locator('[data-exp-control="moon-apollo11"]')).toHaveClass(/active/);

  const second = await page.evaluate(() => window.EarthConvergence.renderAt(21));
  expect(second.story.time).toBe(first.story.time);
  expect(second.story.scene).toBe(first.story.scene);
  expect(second.selectedPlace).toBe(first.selectedPlace);

  await page.evaluate(() => window.EarthConvergence.renderAt(35));
  await expect(page.locator('#app')).toHaveAttribute('data-experience', 'oceans');
  await expect(page.locator('[data-exp-control="ocean-gulf"]')).toHaveClass(/active/);
  await openConvergence(page);
  await page.screenshot({ path: 'test-results/22-convergence-story-oceans.png', fullPage: true });
});

test('city selection reuses globe interaction without importing game or marketplace mechanics', async ({ page }) => {
  await ready(page);
  const selected = await page.evaluate(() => window.EarthConvergence.selectCity('cairo'));
  expect(selected).toBeTruthy();
  await expect(page.locator('#app')).toHaveAttribute('data-convergence-selected', 'cairo');
  await expect(page.locator('#app')).toHaveAttribute('data-experience', 'planet');
  await openConvergence(page);
  await page.locator('[data-convergence-tab="places"]').click();
  await expect(page.locator('#convergencePlaceDetail')).toContainText('Historic Cairo');
  await expect(page.locator('#convergencePlaceDetail')).toContainText('Modern metropolitan system');

  const body = await page.locator('body').innerText();
  expect(body).not.toContain('Buy land');
  expect(body).not.toContain('Leaderboard');
  expect(body).not.toContain('Fuel economy');
});

test('mobile keeps the consolidated explorer reachable and usable', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await ready(page);
  await expect(page.locator('#convergenceTrigger')).toBeVisible();
  await openConvergence(page);
  await page.locator('[data-convergence-tab="places"]').click();
  await expect(page.locator('#convergencePlaceSearch')).toBeVisible();
});
