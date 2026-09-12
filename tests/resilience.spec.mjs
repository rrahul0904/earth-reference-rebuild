import { test, expect } from '@playwright/test';

async function openMoon(page) {
  await page.setViewportSize({ width: 1440, height: 900 });
  const response = await page.goto('/', { waitUntil: 'domcontentloaded' });
  expect(response?.status()).toBe(200);
  await page.waitForFunction(() => document.querySelector('#app')?.dataset.ready === 'true');
  await page.locator('.desktop-nav [data-experience-nav="moon"]').click();
  await expect(page.locator('#app')).toHaveAttribute('data-experience','moon');
}

async function expectFallbackMoonRendered(page) {
  await expect(page.locator('.moon-fidelity-canvas')).toHaveAttribute('data-ready','fallback',{timeout:10000});
  const alpha = await page.locator('.moon-fidelity-canvas').evaluate(canvas => {
    const ctx = canvas.getContext('2d');
    const cx = innerWidth * .63;
    const cy = innerHeight * .465;
    const dpr = Math.min(devicePixelRatio || 1, 2);
    return ctx.getImageData(Math.round(cx*dpr), Math.round(cy*dpr), 1, 1).data[3];
  });
  expect(alpha).toBeGreaterThan(0);
  await expect(page.locator('#storyTitle')).toHaveText('Another world. Within reach.');
}

test('Earth is ready even when optional remote night imagery fails', async ({ page }) => {
  const errors = [];
  page.on('pageerror', e => errors.push(String(e)));
  await page.route('https://raw.githubusercontent.com/vasturiano/three-globe/**', route => route.abort());
  await page.setViewportSize({ width: 1440, height: 900 });
  const response = await page.goto('/', { waitUntil: 'domcontentloaded' });
  expect(response?.status()).toBe(200);
  await page.waitForFunction(() => document.querySelector('#app')?.dataset.ready === 'true');
  await expect(page.locator('.final-earth-canvas')).toHaveAttribute('data-ready','true',{timeout:10000});
  await expect(page.locator('#app')).toHaveAttribute('data-day-earth','bundled');
  await expect(page.locator('#app')).toHaveAttribute('data-night-earth','day-fallback');
  await expect(page.locator('#app')).toHaveAttribute('data-final-earth','true');
  expect(errors).toEqual([]);
});

test('Moon remains functional when NASA image fails', async ({ page }) => {
  const errors = [];
  page.on('pageerror', e => errors.push(String(e)));
  await page.route('https://svs.gsfc.nasa.gov/**', route => route.abort());
  await openMoon(page);
  await expect(page.locator('#app')).toHaveAttribute('data-moon-source','fallback');
  await expectFallbackMoonRendered(page);
  await page.screenshot({ path: 'test-results/06-moon-fallback.png', fullPage: true });
  expect(errors).toEqual([]);
});

test('Moon falls back when NASA image request stalls', async ({ page }) => {
  const errors = [];
  page.on('pageerror', e => errors.push(String(e)));
  // A matched route stalls by default until it is continued, fulfilled or aborted.
  // Returning from the handler keeps the request pending without leaving a handler Promise unresolved.
  await page.route('https://svs.gsfc.nasa.gov/**', () => {});
  await openMoon(page);
  await expect(page.locator('#app')).toHaveAttribute('data-moon-source','fallback-timeout',{timeout:7000});
  await expectFallbackMoonRendered(page);
  await page.screenshot({ path: 'test-results/07-moon-timeout-fallback.png', fullPage: true });
  expect(errors).toEqual([]);
});
