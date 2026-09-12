import { test, expect } from '@playwright/test';

test('Moon remains functional when NASA image is unavailable', async ({ page }) => {
  const errors = [];
  page.on('pageerror', e => errors.push(String(e)));
  await page.route('https://svs.gsfc.nasa.gov/**', route => route.abort());
  await page.setViewportSize({ width: 1440, height: 900 });
  const response = await page.goto('/');
  expect(response?.status()).toBe(200);
  await page.waitForFunction(() => document.querySelector('#app')?.dataset.ready === 'true');
  await page.locator('.desktop-nav [data-experience-nav="moon"]').click();
  await expect(page.locator('#app')).toHaveAttribute('data-experience','moon');
  await expect(page.locator('.moon-fidelity-canvas')).toHaveAttribute('data-ready','fallback',{timeout:15000});
  await expect(page.locator('#app')).toHaveAttribute('data-moon-source','fallback');
  const alpha = await page.locator('.moon-fidelity-canvas').evaluate(canvas => {
    const ctx = canvas.getContext('2d');
    const r = Math.min(innerWidth * .255, innerHeight * .40);
    const cx = innerWidth * .63;
    const cy = innerHeight * .465;
    const dpr = Math.min(devicePixelRatio || 1, 2);
    return ctx.getImageData(Math.round(cx*dpr), Math.round(cy*dpr), 1, 1).data[3];
  });
  expect(alpha).toBeGreaterThan(0);
  await expect(page.locator('#storyTitle')).toHaveText('Another world. Within reach.');
  await page.screenshot({ path: 'test-results/06-moon-fallback.png', fullPage: true });
  expect(errors).toEqual([]);
});
