import { test, expect } from '@playwright/test';

async function expectRenderedGlobe(page) {
  await page.waitForFunction(() => document.querySelector('#app')?.dataset.ready === 'true');
  await expect(page.locator('#fallback')).toBeHidden();
  const pixels = await page.locator('#globe').evaluate((canvas) => {
    if (typeof renderGlobe === 'function') renderGlobe();
    const gl = canvas.getContext('webgl2');
    if (!gl) return null;
    const points = [[.62,.47],[.57,.43],[.67,.50],[.1,.1],[.9,.9],[.5,.8]];
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

async function switchExperience(page, name) {
  await page.locator(`.desktop-nav [data-experience-nav="${name}"]`).click();
  await expect(page.locator('#app')).toHaveAttribute('data-experience', name);
}

test('desktop Earth renders and reference-video experience suite works', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  const errors = [];
  page.on('pageerror', e => errors.push(String(e)));
  const response = await page.goto('/');
  expect(response?.status()).toBe(200);
  await expectRenderedGlobe(page);
  await expect(page.locator('#storyTitle')).toHaveText('Explore our planet.');
  await expect(page.locator('.control-dock')).toBeVisible();
  await expect(page.locator('.desktop-nav [data-experience-nav="orbit"]')).toBeVisible();

  await switchExperience(page,'orbit');
  await expect(page.locator('#storyTitle')).toHaveText('A world in orbit.');
  await expect(page.locator('#experiencePanel')).toContainText('19,847');
  await page.locator('[data-exp-control="orbit-crewed"]').click();
  await expect(page.locator('#experiencePanel')).toContainText('Humanity in orbit.');

  await switchExperience(page,'moon');
  await expect(page.locator('#storyTitle')).toHaveText('Another world. Within reach.');
  await page.locator('[data-exp-control="moon-apollo17"]').click();
  await expect(page.locator('#storyTitle')).toHaveText('A geologist. Another world.');
  await expect(page.locator('#experiencePanel')).toContainText('11 DEC 1972');

  await switchExperience(page,'solar');
  await expect(page.locator('#storyTitle')).toHaveText('Everything in motion.');
  await page.locator('[data-exp-control="solar-jupiter"]').click();
  await expect(page.locator('#experiencePanel')).toContainText('Jupiter');

  await switchExperience(page,'earthquakes');
  await expect(page.locator('#storyTitle')).toContainText('Earthquakes');
  await page.locator('[data-exp-control="quake-japan"]').click();
  await expect(page.locator('#experiencePanel')).toContainText('M 9.1');

  await switchExperience(page,'oceans');
  await expect(page.locator('#storyTitle')).toHaveText('An ocean. Always moving.');
  await page.locator('[data-exp-control="ocean-gulf"]').click();
  await expect(page.locator('#experiencePanel')).toContainText('Gulf Stream');

  await switchExperience(page,'planet');
  await expect(page.locator('.control-dock')).toBeVisible();
  await page.locator('button[data-mode="dark"]').click();
  await expect(page.locator('#app')).toHaveAttribute('data-mode','dark');
  await page.locator('#backInTime').click();
  await expect(page.locator('#nowAge')).toContainText('4.54');
  await expect(page.locator('#storyTitle')).toHaveText('A world begins.');

  await page.screenshot({ path: 'test-results/desktop-success.png', fullPage: true });
  expect(errors).toEqual([]);
});

test('mobile navigation exposes and switches all reference-video modes', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const errors = [];
  page.on('pageerror', e => errors.push(String(e)));
  await page.goto('/');
  await expectRenderedGlobe(page);
  await expect(page.locator('#exploreButton')).toBeVisible();
  await expect(page.locator('.mobile-sheet')).toBeVisible();

  await page.locator('#exploreButton').click();
  await expect(page.locator('#exploreMenu')).toBeVisible();
  await expect(page.locator('#exploreMenu [data-experience-nav="moon"]')).toBeVisible();
  await page.locator('#exploreMenu [data-experience-nav="moon"]').click();
  await expect(page.locator('#app')).toHaveAttribute('data-experience','moon');
  await expect(page.locator('#experienceFooter')).toBeVisible();
  await expect(page.locator('#storyTitle')).toHaveText('Another world. Within reach.');

  await page.locator('#exploreButton').click();
  await page.locator('#exploreMenu [data-experience-nav="oceans"]').click();
  await expect(page.locator('#app')).toHaveAttribute('data-experience','oceans');
  await expect(page.locator('#storyTitle')).toHaveText('An ocean. Always moving.');

  await page.screenshot({ path: 'test-results/mobile-success.png', fullPage: true });
  expect(errors).toEqual([]);
});
