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

async function expectFinalEarthReady(page) {
  await expect(page.locator('#app')).toHaveAttribute('data-visual-grade','reference-v3',{timeout:15000});
  await expect(page.locator('.final-earth-canvas')).toHaveAttribute('data-ready','true',{timeout:45000});
  await expect(page.locator('#app')).toHaveAttribute('data-final-earth','true');
}

async function expectReferencePolishReady(page) {
  await expect(page.locator('.reference-polish-canvas')).toHaveAttribute('data-ready','true',{timeout:30000});
  await expect(page.locator('#app')).toHaveAttribute('data-reference-polish','true');
  await expect(page.locator('.reference-finalizer-canvas')).toHaveAttribute('data-ready','true',{timeout:15000});
  await expect(page.locator('#app')).toHaveAttribute('data-reference-finalizer','true');
}

async function desktopReady(page) {
  await page.setViewportSize({ width: 1440, height: 900 });
  const errors = [];
  page.on('pageerror', e => errors.push(String(e)));
  const response = await page.goto('/');
  expect(response?.status()).toBe(200);
  await expectRenderedGlobe(page);
  await expectFinalEarthReady(page);
  await expectReferencePolishReady(page);
  return errors;
}

async function switchExperience(page, name) {
  await page.locator(`.desktop-nav [data-experience-nav="${name}"]`).click();
  await expect(page.locator('#app')).toHaveAttribute('data-experience', name);
  await page.waitForTimeout(900);
}

async function expectSharpMoonReady(page) {
  await expect(page.locator('.moon-fidelity-canvas')).toHaveAttribute('data-ready','true',{timeout:15000});
}

test('desktop planet uses the final photographic Earth and deep-time still works', async ({ page }) => {
  const errors = await desktopReady(page);
  await expect(page.locator('#storyTitle')).toHaveText('Explore our planet.');
  await expect(page.locator('.control-dock')).toBeVisible();
  await expect(page.locator('.desktop-nav [data-experience-nav="orbit"]')).toBeVisible();
  const presentRadius = await page.evaluate(() => getSphereLayout().radius);
  expect(presentRadius).toBeGreaterThan(180);
  expect(presentRadius).toBeLessThan(290);
  await expect(page.locator('.final-earth-canvas')).toHaveCSS('opacity','1');
  await page.screenshot({ path: 'test-results/00-planet-present.png', fullPage: true });
  await page.locator('button[data-mode="dark"]').click();
  await expect(page.locator('#app')).toHaveAttribute('data-mode','dark');
  await page.locator('#backInTime').click();
  await expect(page.locator('#nowAge')).toContainText('4.54');
  await expect(page.locator('#storyTitle')).toHaveText('A world begins.');
  await expect(page.locator('.final-earth-canvas')).toHaveCSS('opacity','0');
  await page.screenshot({ path: 'test-results/desktop-success.png', fullPage: true });
  expect(errors).toEqual([]);
});

test('desktop orbit is a true system overview and Moon uses only sharp reference layers', async ({ page }) => {
  const errors = await desktopReady(page);
  await switchExperience(page,'orbit');
  await expect(page.locator('#storyTitle')).toHaveText('A world in orbit.');
  await expect(page.locator('#experiencePanel')).toContainText('19,847');
  await expect(page.locator('#experienceCard')).toBeHidden();
  const orbitRadius = await page.evaluate(() => getSphereLayout().radius);
  expect(orbitRadius).toBeLessThan(100);
  await page.screenshot({ path: 'test-results/01-orbit.png', fullPage: true });
  await page.locator('[data-exp-control="orbit-crewed"]').click();
  await expect(page.locator('#experiencePanel')).toContainText('Humanity in orbit.');
  await expect(page.locator('#experienceCard')).toBeVisible();
  const crewedRadius = await page.evaluate(() => getSphereLayout().radius);
  expect(crewedRadius).toBeGreaterThan(120);
  await switchExperience(page,'moon');
  await expect(page.locator('#storyTitle')).toHaveText('Another world. Within reach.');
  await expectSharpMoonReady(page);
  await expect(page.locator('#experienceCanvas')).toHaveCSS('display','none');
  await expect(page.locator('.reference-scene-canvas')).toHaveCSS('opacity','0');
  await expect(page.locator('#experienceCard')).toBeHidden();
  await page.locator('[data-exp-control="moon-apollo17"]').click();
  await expect(page.locator('#storyTitle')).toHaveText('A geologist. Another world.');
  await expect(page.locator('#experiencePanel')).toContainText('11 DEC 1972');
  await page.screenshot({ path: 'test-results/02-moon-apollo17.png', fullPage: true });
  expect(errors).toEqual([]);
});

test('desktop Solar System matches the restrained reference composition', async ({ page }) => {
  const errors = await desktopReady(page);
  await switchExperience(page,'solar');
  await expect(page.locator('#storyTitle')).toHaveText('Everything in motion.');
  await expect(page.locator('#experienceCard')).toBeHidden();
  await page.screenshot({ path: 'test-results/03-solar-system.png', fullPage: true });
  await page.locator('[data-exp-control="solar-jupiter"]').click();
  await expect(page.locator('#experiencePanel')).toContainText('Jupiter');
  await expect(page.locator('#experienceCard')).toBeHidden();
  await page.screenshot({ path: 'test-results/03b-solar-jupiter.png', fullPage: true });
  expect(errors).toEqual([]);
});

test('desktop earthquake mode uses photographic night Earth and selected-event evidence', async ({ page }) => {
  const errors = await desktopReady(page);
  await switchExperience(page,'earthquakes');
  await expect(page.locator('#storyTitle')).toContainText('Earthquakes');
  await expect(page.locator('#experienceCard')).toBeHidden();
  await page.screenshot({ path: 'test-results/04-earthquakes-global.png', fullPage: true });
  await page.locator('[data-exp-control="quake-japan"]').click();
  await expect(page.locator('#experiencePanel')).toContainText('M 9.1');
  await expect(page.locator('.final-earth-canvas')).toHaveCSS('opacity','1');
  await expect(page.locator('#experienceCard')).toBeVisible();
  await page.screenshot({ path: 'test-results/04b-earthquakes-japan.png', fullPage: true });
  expect(errors).toEqual([]);
});

test('desktop Oceans uses dark reference lighting and organic flow filaments', async ({ page }) => {
  const errors = await desktopReady(page);
  await switchExperience(page,'oceans');
  await expect(page.locator('#storyTitle')).toHaveText('An ocean. Always moving.');
  await expect(page.locator('.final-earth-canvas')).toHaveCSS('opacity','1');
  await expect(page.locator('.reference-scene-canvas')).toHaveCSS('opacity','0');
  await expect(page.locator('.reference-polish-canvas')).toBeVisible();
  await expect(page.locator('.reference-finalizer-canvas')).toBeVisible();
  await expect(page.locator('#experienceCard')).toBeHidden();
  await page.waitForTimeout(1200);
  await page.screenshot({ path: 'test-results/05-oceans-global.png', fullPage: true });
  await page.locator('[data-exp-control="ocean-gulf"]').click();
  await expect(page.locator('#experiencePanel')).toContainText('Gulf Stream');
  await expect(page.locator('#experienceCard')).toBeHidden();
  await page.waitForTimeout(1000);
  await page.screenshot({ path: 'test-results/05b-oceans-gulf.png', fullPage: true });
  expect(errors).toEqual([]);
});

test('mobile navigation exposes polished Moon and ocean modes', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const errors = [];
  page.on('pageerror', e => errors.push(String(e)));
  await page.goto('/');
  await expectRenderedGlobe(page);
  await expectFinalEarthReady(page);
  await expectReferencePolishReady(page);
  await expect(page.locator('#exploreButton')).toBeVisible();
  await expect(page.locator('.mobile-sheet')).toBeVisible();
  await page.locator('#exploreButton').click();
  await expect(page.locator('#exploreMenu')).toBeVisible();
  await page.locator('#exploreMenu [data-experience-nav="moon"]').click();
  await expect(page.locator('#app')).toHaveAttribute('data-experience','moon');
  await expect(page.locator('#experienceFooter')).toBeVisible();
  await expect(page.locator('#storyTitle')).toHaveText('Another world. Within reach.');
  await expectSharpMoonReady(page);
  await expect(page.locator('.reference-scene-canvas')).toHaveCSS('opacity','0');
  await page.screenshot({ path: 'test-results/mobile-moon.png', fullPage: true });
  await page.locator('#exploreButton').click();
  await page.locator('#exploreMenu [data-experience-nav="oceans"]').click();
  await expect(page.locator('#app')).toHaveAttribute('data-experience','oceans');
  await expect(page.locator('#storyTitle')).toHaveText('An ocean. Always moving.');
  await expect(page.locator('.reference-scene-canvas')).toHaveCSS('opacity','0');
  await page.waitForTimeout(900);
  await page.screenshot({ path: 'test-results/mobile-success.png', fullPage: true });
  expect(errors).toEqual([]);
});
