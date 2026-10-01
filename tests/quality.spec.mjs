import { test, expect } from '@playwright/test';

async function ready(page) {
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => window.EarthConvergence && document.querySelector('#app').dataset.shareStateReady === 'true');
}

// Check numerical behavior independently from the renderer and the implementation constants.
test('orbital predictions conserve a bounded circular radius across LEO, MEO and GEO', async ({ page }) => {
  await ready(page);
  for (const altitude of [420, 20200, 35786]) {
    const prediction = await page.evaluate(alt => window.EarthConvergence.predictOrbit(alt, 360), altitude);
    const expectedRadius = 6371 + altitude;
    const expectedPeriod = 2 * Math.PI * Math.sqrt(expectedRadius ** 3 / 398600.4418);
    expect(prediction.points).toHaveLength(361);
    expect(prediction.periodSeconds).toBeCloseTo(expectedPeriod, 6);
    expect(prediction.radiusKm).toBe(expectedRadius);
    for (const point of prediction.points) {
      expect(Number.isFinite(point.x) && Number.isFinite(point.y) && Number.isFinite(point.t)).toBe(true);
      expect(Math.abs(Math.hypot(point.x, point.y) / expectedRadius - 1)).toBeLessThan(.001);
    }
    expect(Math.hypot(prediction.points.at(-1).x - expectedRadius, prediction.points.at(-1).y) / expectedRadius).toBeLessThan(.001);
    const repeat = await page.evaluate(alt => window.EarthConvergence.predictOrbit(alt, 360), altitude);
    expect(repeat).toEqual(prediction);
  }
});

test('regional filters constrain the Places catalog as well as map counters', async ({ page }) => {
  await ready(page);
  await page.evaluate(() => window.EarthConvergence.open());
  const expected = {
    global: ['Cairo', 'Lagos', 'London', 'Istanbul', 'Mumbai', 'Beijing', 'Tokyo', 'New York', 'Mexico City', 'São Paulo', 'Sydney'],
    americas: ['New York', 'Mexico City', 'São Paulo'],
    europe: ['London', 'Istanbul'],
    'africa-middle-east': ['Cairo', 'Lagos'],
    'asia-pacific': ['Mumbai', 'Beijing', 'Tokyo', 'Sydney']
  };
  for (const [region, cities] of Object.entries(expected)) {
    await page.locator('[data-convergence-tab="layers"]').click();
    await page.locator('#convergenceRegion').selectOption(region);
    await page.locator('[data-convergence-tab="places"]').click();
    await expect(page.locator('#convergencePlaceList strong')).toHaveText(cities);
  }
});

test('selected events are cleared on retention eviction and automatic IDs stay unique', async ({ page }) => {
  await ready(page);
  const result = await page.evaluate(() => {
    const api = window.EarthConvergence;
    api.clearEvents();
    const initial = api.ingestEvent({ lat: 1, lon: 2 });
    api.selectEvent(initial.id);
    for (let i = 0; i < 500; i++) api.ingestEvent({ lat: i % 90, lon: 0 });
    const current = api.snapshot();
    return {
      count: current.eventCount,
      firstId: initial.id,
      selectedId: current.selectedPlace,
      selectedAttribute: document.querySelector('#app').dataset.convergenceSelected
    };
  });
  expect(result.count).toBe(500);
  expect(result.selectedId).toBeNull();
  expect(result.selectedAttribute).toBeUndefined();
  expect(result.firstId).toBe('event-1');
});

test('neighborhood selections are keyboard reachable and focus their city', async ({ page }) => {
  await ready(page);
  await page.evaluate(() => { window.EarthConvergence.selectCity('cairo'); window.EarthConvergence.open(); });
  await page.locator('[data-convergence-tab="places"]').click();
  const before = await page.evaluate(() => state.targetZoom);
  const neighborhood = page.locator('[data-neighborhood="Historic Cairo"]');
  await expect(neighborhood).toBeVisible();
  await neighborhood.focus();
  await expect(neighborhood).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(neighborhood).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('[data-neighborhood-detail]')).toContainText('city-centered neighborhood overview');
  expect(await page.evaluate(() => state.targetZoom)).toBeGreaterThan(before);
});

test('main navigation remains interactive and interrupts Story playback above its drawer', async ({ page }) => {
  await ready(page);
  await page.evaluate(() => { window.EarthConvergence.renderAt(0); window.EarthConvergence.open(); });
  await page.locator('[data-convergence-tab="story"]').click();
  await page.locator('#convergenceStoryToggle').click();
  await expect(page.locator('#convergenceStoryToggle')).toHaveText('Pause story');
  await expect(page.locator('.desktop-nav [data-experience-nav="moon"]')).toBeInViewport();
  const navReceivesPointer = await page.locator('.desktop-nav [data-experience-nav="moon"]').evaluate(element => {
    const rect = element.getBoundingClientRect();
    const hit = document.elementFromPoint(rect.left + rect.width / 2, rect.top + rect.height / 2);
    return hit === element || element.contains(hit);
  });
  expect(navReceivesPointer).toBe(true);
  await page.locator('.desktop-nav [data-experience-nav="moon"]').click();
  await expect(page.locator('#app')).toHaveAttribute('data-experience', 'moon');
  await expect.poll(() => page.evaluate(() => window.EarthConvergence.snapshot().story.playing)).toBe(false);
});

test('rapid story scrubbing cannot apply an earlier scene callback to the final scene', async ({ page }) => {
  await ready(page);
  await page.evaluate(() => {
    window.EarthConvergence.renderAt(0);
    window.EarthConvergence.renderAt(21);
  });
  await expect(page.locator('#app')).toHaveAttribute('data-experience', 'moon');
  await expect(page.locator('[data-exp-control="moon-apollo11"]')).toHaveClass(/active/);
  // The Moon selection changes Earth age to present. A stale Planet callback would set it to 750 Ma.
  await expect.poll(() => page.evaluate(() => state.ageMa)).toBe(0);
});

for (const viewport of [{ width: 1440, height: 900 }, { width: 390, height: 844 }]) {
  test(`reduced motion supports every Story scene and pause at ${viewport.width}px`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await ready(page);
    for (const [index, experience] of ['planet', 'civilization', 'orbit', 'moon', 'earthquakes', 'oceans', 'solar'].entries()) {
      await page.evaluate(time => window.EarthConvergence.renderAt(time), index * 7);
      await expect(page.locator('#app')).toHaveAttribute('data-experience', experience);
      const snapshot = await page.evaluate(() => window.EarthConvergence.snapshot());
      expect(snapshot.story.scene).toBe(index);
      expect(snapshot.story.playing).toBe(false);
      expect(Number.isFinite(snapshot.camera.yaw) && Number.isFinite(snapshot.camera.pitch)).toBe(true);
    }
    await page.evaluate(() => window.EarthConvergence.open());
    await page.locator('[data-convergence-tab="story"]').click();
    await page.locator('#convergenceStoryToggle').click();
    await expect(page.locator('#convergenceStoryToggle')).toHaveText('Pause story');
    await page.locator('#convergenceStoryToggle').click();
    const paused = await page.evaluate(() => window.EarthConvergence.snapshot().story);
    await page.waitForTimeout(250);
    expect(await page.evaluate(() => window.EarthConvergence.snapshot().story)).toEqual(paused);
  });
}

test('deep-time and civilization state survive reload and Back/Forward', async ({ page }) => {
  await page.goto('/#exp=planet&mode=dark&age=66', { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => document.querySelector('#app').dataset.shareStateReady === 'true');
  await expect.poll(() => page.evaluate(() => state.ageMa)).toBe(66);
  await expect(page.locator('#app')).toHaveAttribute('data-mode', 'dark');
  await page.locator('.desktop-nav [data-experience-nav="civilization"]').click();
  await expect.poll(() => page.url()).toContain('exp=civilization');
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => document.querySelector('#app').dataset.shareStateReady === 'true');
  await expect(page.locator('#app')).toHaveAttribute('data-experience', 'civilization');
  await expect.poll(() => page.evaluate(() => state.ageMa)).toBe(.125);
  await page.goBack({ waitUntil: 'domcontentloaded' });
  await expect(page.locator('#app')).toHaveAttribute('data-experience', 'planet');
  await expect.poll(() => page.evaluate(() => state.ageMa)).toBe(66);
  await page.goForward({ waitUntil: 'domcontentloaded' });
  await expect(page.locator('#app')).toHaveAttribute('data-experience', 'civilization');
  await expect.poll(() => page.evaluate(() => state.ageMa)).toBe(.125);
});
