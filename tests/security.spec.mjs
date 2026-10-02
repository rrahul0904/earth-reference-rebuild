import { test, expect } from '@playwright/test';

const ready = async (page, fragment = '') => {
  await page.goto(`/${fragment}`);
  await page.waitForFunction(() => document.querySelector('#app')?.dataset.shareStateReady === 'true');
  await page.waitForFunction(() => Boolean(window.EarthConvergence));
};

for (const stored of ['null', '[]', '42', '"dark"', '{broken']) {
  test(`malformed saved preferences ${stored} preserve URL restoration`, async ({ page }) => {
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.addInitScript(value => localStorage.setItem('earth.preferences.v1', value), stored);
    await ready(page, '#exp=planet&age=125');
    await expect(page.locator('#app')).toHaveAttribute('data-experience', 'planet');
    expect(new URLSearchParams(new URL(page.url()).hash.slice(1)).get('age')).toBe('125');
    expect(errors).toEqual([]);
  });
}

test('untrusted URL fields cannot inject selectors or HTML and numeric ages stay finite', async ({ page }) => {
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  const attack = '"><img id="url-xss" src=x onerror="window.__urlXss=1">';
  const params = new URLSearchParams({ exp: attack, mode: attack, age: 'Infinity', view: attack });
  await ready(page, `#${params}`);
  await expect(page.locator('#app')).toHaveAttribute('data-experience', 'planet');
  await expect(page.locator('#url-xss')).toHaveCount(0);
  expect(await page.evaluate(() => window.__urlXss || 0)).toBe(0);
  const canonical = new URLSearchParams(new URL(page.url()).hash.slice(1));
  expect(canonical.get('exp')).toBe('planet');
  expect(Number.isFinite(Number(canonical.get('age')))).toBe(true);
  expect(errors).toEqual([]);
});

test('external events reject invalid coordinates atomically, bound strings and render them as text', async ({ page }) => {
  await ready(page);
  const result = await page.evaluate(() => {
    const api = window.EarthConvergence;
    api.clearEvents();
    const invalid = [{}, { lat: NaN, lon: 0 }, { lat: Infinity, lon: 0 }, { lat: 91, lon: 0 }, { lat: 0, lon: -181 }];
    const rejected = invalid.map(event => { try { api.ingestEvent(event); return false; } catch { return true; } });
    const countAfterInvalid = api.snapshot().eventCount;
    const event = api.ingestEvent({
      id: 'safe-event', lat: 0, lon: 0, time: Infinity, weight: 999,
      name: '<img id="event-xss" src=x onerror="window.__eventXss=1">' + 'x'.repeat(20000),
      region: '<svg id="region-xss" onload="window.__eventXss=1">' + 'r'.repeat(20000)
    });
    api.selectEvent(event.id);
    api.open();
    return { rejected, countAfterInvalid, event };
  });
  expect(result.rejected).toEqual([true, true, true, true, true]);
  expect(result.countAfterInvalid).toBe(0);
  expect(result.event.name.length).toBe(180);
  expect(result.event.region.length).toBe(96);
  expect(result.event.weight).toBe(4);
  expect(result.event.time).toBeGreaterThanOrEqual(0);
  expect(result.event.time).toBeLessThanOrEqual(1);
  await expect(page.locator('#convergencePlaceDetail')).toContainText('<img id="event-xss"');
  await expect(page.locator('#event-xss, #region-xss')).toHaveCount(0);
  expect(await page.evaluate(() => window.__eventXss || 0)).toBe(0);
});

test('event retention stays bounded while recent events remain selectable', async ({ page }) => {
  await ready(page);
  const result = await page.evaluate(() => {
    const api = window.EarthConvergence;
    api.clearEvents();
    for (let i = 0; i < 510; i++) api.ingestEvent({ id: `bounded-${i}`, lat: i % 90, lon: 0 });
    return { count: api.snapshot().eventCount, old: api.selectEvent('bounded-0'), recent: api.selectEvent('bounded-509') };
  });
  expect(result).toEqual({ count: 500, old: false, recent: true });
});

test('duplicate live event identifiers fail without mutating the bounded event ledger', async ({ page }) => {
  await ready(page);
  const result = await page.evaluate(() => {
    const api = window.EarthConvergence;
    api.clearEvents();
    const first = api.ingestEvent({ id: 'unique-event', lat: 12, lon: 34 });
    let rejected = false;
    try { api.ingestEvent({ id: 'unique-event', lat: 56, lon: 78 }); } catch { rejected = true; }
    return { rejected, count: api.snapshot().eventCount, stillSelectable: api.selectEvent(first.id) };
  });
  expect(result).toEqual({ rejected: true, count: 1, stillSelectable: true });
});
