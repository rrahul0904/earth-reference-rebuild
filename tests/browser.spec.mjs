import { test, expect } from '@playwright/test';

async function expectRenderedGlobe(page) {
  await page.waitForFunction(() => document.querySelector('#app')?.dataset.ready === 'true');
  await expect(page.locator('#fallback')).toBeHidden();
  const pixels = await page.locator('#globe').evaluate((canvas) => {
    if (typeof renderGlobe === 'function') renderGlobe();
    const gl = canvas.getContext('webgl2');
    if (!gl) return null;
    const points = [[.61,.46],[.57,.43],[.66,.49],[.1,.1],[.9,.9],[.5,.8]];
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

async function expectReferenceEarthReady(page) {
  await expect(page.locator('#app')).toHaveAttribute('data-visual-grade','reference-v3',{timeout:15000});
  await expect(page.locator('.reference-earth-canvas')).toHaveAttribute('data-ready','true',{timeout:45000});
  await expect(page.locator('#app')).toHaveAttribute('data-hires-earth','true');
}

async function desktopReady(page) {
  await page.setViewportSize({ width: 1440, height: 900 });
  const errors = [];
  page.on('pageerror', e => errors.push(String(e)));
  const response = await page.goto('/');
  expect(response?.status()).toBe(200);
  await expectRenderedGlobe(page);
  await expectReferenceEarthReady(page);
  return errors;
}

async function switchExperience(page, name) {
  await page.locator(`.desktop-nav [data-experience-nav="${name}"]`).click();
  await expect(page.locator('#app')).toHaveAttribute('data-experience', name);
  await page.waitForTimeout(500);
}

async function expectSharpMoonReady(page) {
  await expect(page.locator('.moon-fidelity-canvas')).toHaveAttribute('data-ready','true',{timeout:15000});
}

test('desktop planet uses the reference-grade photographic renderer and deep-time still works', async ({ page }) => {
  const errors = await desktopReady(page);
  await expect(page.locator('#storyTitle')).toHaveText('Explore our planet.');
  await expect(page.locator('.control-dock')).toBeVisible();
  await expect(page.locator('.desktop-nav [data-experience-nav="orbit"]')).toBeVisible();
  const presentRadius = await page.evaluate(() => getSphereLayout().radius);
  expect(presentRadius).toBeGreaterThan(180);
  expect(presentRadius).toBeLessThan(290);
  await page.screenshot({ path: 'test-results/00-planet-present.png', fullPage: true });
  await page.locator('button[data-mode="dark"]').click();
  await expect(page.locator('#app')).toHaveAttribute('data-mode','dark');
  await page.locator('#backInTime').click();
  await expect(page.locator('#nowAge')).toContainText('4.54');
  await expect(page.locator('#storyTitle')).toHaveText('A world begins.');
  await expect(page.locator('.reference-earth-canvas')).toHaveCSS('opacity','0');
  await page.screenshot({ path: 'test-results/desktop-success.png', fullPage: true });
  expect(errors).toEqual([]);
});

test('desktop orbit is a true system overview and Moon remains sharp', async ({ page }) => {
  const errors = await desktopReady(page);
  await switchExperience(page,'orbit');
  await expect(page.locator('#storyTitle')).toHaveText('A world in orbit.');
  await expect(page.locator('#experiencePanel')).toContainText('19,847');
  const orbitRadius = await page.evaluate(() => getSphereLayout().radius);
  expect(orbitRadius).toBeLessThan(100);
  await page.screenshot({ path: 'test-results/01-orbit.png', fullPage: true });
  await page.locator('[data-exp-control="orbit-crewed"]').click();
  await expect(page.locator('#experiencePanel')).toContainText('Humanity in orbit.');
  const crewedRadius = await page.evaluate(() => getSphereLayout().radius);
  expect(crewedRadius).toBeGreaterThan(120);
  await switchExperience(page,'moon');
  await expect(page.locator('#storyTitle')).toHaveText('Another world. Within reach.');
  await expectSharpMoonReady(page);
  await page.locator('[data-exp-control="moon-apollo17"]').click();
  await expect(page.locator('#storyTitle')).toHaveText('A geologist. Another world.');
  await expect(page.locator('#experiencePanel')).toContainText('11 DEC 1972');
  await page.screenshot({ path: 'test-results/02-moon-apollo17.png', fullPage: true });
  expect(errors).toEqual([]);
});

test('desktop solar, earthquake and ocean reference modes work with the v3 renderer', async ({ page }) => {
  const errors = await desktopReady(page);
  await switchExperience(page,'solar');
  await expect(page.locator('#storyTitle')).toHaveText('Everything in motion.');
  await page.locator('[data-exp-control="solar-jupiter"]').click();
  await expect(page.locator('#experiencePanel')).toContainText('Jupiter');
  await page.screenshot({ path: 'test-results/03-solar-jupiter.png', fullPage: true });
  await switchExperience(page,'earthquakes');
  await expect(page.locator('#storyTitle')).toContainText('Earthquakes');
  await page.locator('[data-exp-control="quake-japan"]').click();
  await expect(page.locator('#experiencePanel')).toContainText('M 9.1');
  await expect(page.locator('.reference-earth-canvas')).toHaveCSS('opacity','1');
  await page.screenshot({ path: 'test-results/04-earthquakes-japan.png', fullPage: true });
  await switchExperience(page,'oceans');
  await expect(page.locator('#storyTitle')).toHaveText('An ocean. Always moving.');
  await page.locator('[data-exp-control="ocean-gulf"]').click();
  await expect(page.locator('#experiencePanel')).toContainText('Gulf Stream');
  await expect(page.locator('.reference-earth-canvas')).toHaveCSS('opacity','1');
  await page.screenshot({ path: 'test-results/05-oceans-gulf.png', fullPage: true });
  expect(errors).toEqual([]);
});

test('mobile navigation exposes reference modes with the high-resolution Earth layer available', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const errors = [];
  page.on('pageerror', e => errors.push(String(e)));
  await page.goto('/');
  await expectRenderedGlobe(page);
  await expectReferenceEarthReady(page);
  await expect(page.locator('#exploreButton')).toBeVisible();
  await expect(page.locator('.mobile-sheet')).toBeVisible();
  await page.locator('#exploreButton').click();
  await expect(page.locator('#exploreMenu')).toBeVisible();
  await page.locator('#exploreMenu [data-experience-nav="moon"]').click();
  await expect(page.locator('#app')).toHaveAttribute('data-experience','moon');
  await expect(page.locator('#experienceFooter')).toBeVisible();
  await expect(page.locator('#storyTitle')).toHaveText('Another world. Within reach.');
  await expectSharpMoonReady(page);
  await page.screenshot({ path: 'test-results/mobile-moon.png', fullPage: true });
  await page.locator('#exploreButton').click();
  await page.locator('#exploreMenu [data-experience-nav="oceans"]').click();
  await expect(page.locator('#app')).toHaveAttribute('data-experience','oceans');
  await expect(page.locator('#storyTitle')).toHaveText('An ocean. Always moving.');
  await page.screenshot({ path: 'test-results/mobile-success.png', fullPage: true });
  expect(errors).toEqual([]);
});
