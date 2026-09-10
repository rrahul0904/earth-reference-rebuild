import { test, expect } from '@playwright/test';

async function expectRenderedGlobe(page) {
  await page.waitForFunction(() => document.querySelector('#app')?.dataset.ready === 'true');
  await expect(page.locator('#fallback')).toBeHidden();
  const pixels = await page.locator('#globe').evaluate((canvas) => {
    const gl = canvas.getContext('webgl2');
    if (!gl) return null;
    const points = [[.5,.5],[.62,.47],[.3,.4],[.8,.2],[.1,.1],[.5,.8],[.7,.6],[.4,.3],[.9,.9]];
    return points.map(([x,y]) => {
      const rgba = new Uint8Array(4);
      gl.readPixels(Math.floor(canvas.width*x),Math.floor(canvas.height*y),1,1,gl.RGBA,gl.UNSIGNED_BYTE,rgba);
      return [...rgba];
    });
  });
  expect(pixels).not.toBeNull();
  const unique = new Set(pixels.map(p => p.join(',')));
  expect(unique.size).toBeGreaterThan(2);
}

test('desktop Earth renders and primary interactions work', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  const errors = [];
  page.on('pageerror', e => errors.push(String(e)));
  const response = await page.goto('/');
  expect(response?.status()).toBe(200);
  await expectRenderedGlobe(page);
  await expect(page.locator('#storyTitle')).toHaveText('Explore our planet.');
  await expect(page.locator('.control-dock')).toBeVisible();

  await page.locator('button[data-mode="dark"]').click();
  await expect(page.locator('#app')).toHaveAttribute('data-mode','dark');

  await page.locator('#backInTime').click();
  await expect(page.locator('#nowAge')).toContainText('4.54');
  await expect(page.locator('#storyTitle')).toHaveText('A world begins.');

  await page.locator('#readRecord').click();
  await expect(page.locator('#recordDialog')).toHaveJSProperty('open', true);
  await page.locator('#recordDialog .modal-close').click();

  await page.locator('#timeline').evaluate((el) => {
    el.value = '5000';
    el.dispatchEvent(new Event('input', { bubbles: true }));
  });
  await expect(page.locator('#nowAge')).not.toHaveText('Present day');

  await page.screenshot({ path: 'test-results/desktop-success.png', fullPage: true });
  expect(errors).toEqual([]);
});

test('mobile Earth-first layout and menu work', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const errors = [];
  page.on('pageerror', e => errors.push(String(e)));
  await page.goto('/');
  await expectRenderedGlobe(page);
  await expect(page.locator('#exploreButton')).toBeVisible();
  await expect(page.locator('.mobile-sheet')).toBeVisible();

  await page.locator('#exploreButton').click();
  await expect(page.locator('#exploreMenu')).toBeVisible();
  await page.locator('#closeExplore').click();

  await page.locator('#mobileMode').click();
  await expect(page.locator('#app')).toHaveAttribute('data-mode','dark');

  await page.locator('#mobilePrev').click();
  await expect(page.locator('#mobileAge')).not.toHaveText('Present day');

  await page.locator('#sheetHandle').click();
  await expect(page.locator('.mobile-sheet')).toHaveClass(/expanded/);
  await page.screenshot({ path: 'test-results/mobile-success.png', fullPage: true });
  expect(errors).toEqual([]);
});
