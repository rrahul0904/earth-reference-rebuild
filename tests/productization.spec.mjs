import { test, expect } from '@playwright/test';

const ready = page => page.waitForFunction(
  () => document.querySelector('#app')?.dataset.shareStateReady === 'true'
);

test('deep link restores Moon and share control', async ({ page }) => {
  await page.goto('/#exp=moon&view=moon-apollo17');
  await ready(page);
  await expect(page.locator('#app')).toHaveAttribute('data-experience', 'moon');
  await expect(page.locator('[data-exp-control="moon-apollo17"]')).toHaveClass(/active/);
  await expect(page.locator('#shareStateButton')).toBeVisible();
});

test('mobile keeps Share visible', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/#exp=planet&age=0');
  await ready(page);
  await expect(page.locator('#shareStateButton')).toBeVisible();
});

test('non-state fragment preserves experience', async ({ page }) => {
  await page.goto('/#exp=moon');
  await ready(page);
  await page.evaluate(() => { location.hash = 'story'; });
  await page.waitForTimeout(100);
  await expect(page.locator('#app')).toHaveAttribute('data-experience', 'moon');
  expect(page.url()).toContain('#story');
});

test('civilization omitted age keeps route default', async ({ page }) => {
  await page.goto('/#exp=civilization');
  await ready(page);
  await expect(page.locator('#app')).toHaveAttribute('data-experience', 'civilization');
  await expect(page.locator('#nowAge')).toContainText('125 thousand years ago');
});

test('visible quake card shortcut updates URL history', async ({ page }) => {
  await page.goto('/#exp=earthquakes&view=quake-pacific');
  await ready(page);
  await expect(page.locator('[data-exp-control="quake-pacific"]')).toHaveClass(/active/);

  const shortcut = page.locator('[data-card-action="quake"]');
  await expect(shortcut).toBeVisible();
  await shortcut.click();
  await expect.poll(() => page.url()).toContain('view=quake-japan');
  await expect(page.locator('[data-exp-control="quake-japan"]')).toHaveClass(/active/);

  await page.goBack();
  await expect(page.locator('[data-exp-control="quake-pacific"]')).toHaveClass(/active/);
  await expect.poll(() => page.url()).toContain('view=quake-pacific');
});
