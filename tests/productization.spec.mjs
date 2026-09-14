import { test, expect } from '@playwright/test';

async function waitForShareState(page) {
  await page.waitForFunction(() => document.querySelector('#app')?.dataset.shareStateReady === 'true');
}

test('deep link restores an exact Moon mission', async ({ page }) => {
  const response = await page.goto('/#exp=moon&mode=natural&view=moon-apollo17', { waitUntil: 'domcontentloaded' });
  expect(response?.status()).toBe(200);
  await waitForShareState(page);
  await expect(page.locator('#app')).toHaveAttribute('data-experience','moon');
  await expect(page.locator('[data-exp-control="moon-apollo17"]')).toHaveClass(/active/);
  await expect(page.locator('#storyTitle')).toHaveText('A geologist. Another world.');
  await expect(page.locator('#shareStateButton')).toBeVisible();
  expect(page.url()).toContain('exp=moon');
  expect(page.url()).toContain('view=moon-apollo17');
});

test('browser history restores default and focused experience subviews', async ({ page }) => {
  await page.goto('/#exp=planet&mode=natural&age=0');
  await waitForShareState(page);
  await page.locator('.desktop-nav [data-experience-nav="oceans"]').click();
  await expect(page.locator('#app')).toHaveAttribute('data-experience','oceans');
  await expect(page.locator('[data-exp-control="ocean-global"]')).toHaveClass(/active/);
  await page.locator('[data-exp-control="ocean-gulf"]').click();
  await expect(page.locator('[data-exp-control="ocean-gulf"]')).toHaveClass(/active/);
  await expect.poll(() => page.url()).toContain('view=ocean-gulf');

  await page.goBack();
  await expect(page.locator('#app')).toHaveAttribute('data-experience','oceans');
  await expect(page.locator('[data-exp-control="ocean-global"]')).toHaveClass(/active/);
  expect(page.url()).not.toContain('view=ocean-gulf');

  await page.goBack();
  await expect(page.locator('#app')).toHaveAttribute('data-experience','planet');
  await expect(page.locator('#storyTitle')).toHaveText('Explore our planet.');
});

test('planet display preference persists without overriding experience defaults', async ({ page }) => {
  await page.goto('/#exp=planet&mode=dark&age=66');
  await waitForShareState(page);
  await expect(page.locator('#app')).toHaveAttribute('data-mode','dark');
  await expect(page.locator('#nowAge')).toContainText('66 million');

  await page.goto('/');
  await waitForShareState(page);
  await expect(page.locator('#app')).toHaveAttribute('data-experience','planet');
  await expect(page.locator('#app')).toHaveAttribute('data-mode','dark');

  await page.goto('/#exp=oceans');
  await waitForShareState(page);
  await expect(page.locator('#app')).toHaveAttribute('data-experience','oceans');
  await expect(page.locator('#app')).toHaveAttribute('data-mode','blue');
});

test('Share control publishes the current exact state URL', async ({ page, context }) => {
  await context.grantPermissions(['clipboard-read','clipboard-write'], { origin: 'http://127.0.0.1:4173' });
  await page.goto('/#exp=solar&mode=natural&view=solar-jupiter');
  await waitForShareState(page);
  await expect(page.locator('[data-exp-control="solar-jupiter"]')).toHaveClass(/active/);
  await page.locator('#shareStateButton').click();
  await expect(page.locator('#shareStateButton')).toHaveText('Copied');
  const clipboard = await page.evaluate(() => navigator.clipboard.readText());
  expect(clipboard).toContain('#exp=solar');
  expect(clipboard).toContain('view=solar-jupiter');
});
