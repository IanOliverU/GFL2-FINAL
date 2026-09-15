import { expect, test } from '@playwright/test';

/**
 * AD0 aiming-presentation and comparison gating (production preview).
 * Development-only behavior (?laserPreview=1 beam, ?artCompare modes) is
 * verified on the dev server via npm run check:aim-guide, capture:ad0, and
 * profile:ad0; this spec guards normal gameplay and production gating.
 */

async function startRun(page) {
  await page.goto('http://127.0.0.1:4173/?e2e=1', { waitUntil: 'networkidle' });
  await page.getByRole('button', { name: /start run/i }).click();
  await page.evaluate(() => window.__THREE_GAME_TEST_HOOKS__?.setState('tololo-model'));
  await page.waitForFunction(() => window.__GFL2_TOLOLO_DIAGNOSTICS__?.loadState === 'loaded');
  await page.waitForFunction(() => window.__GFL2_AIM_GUIDE_COUNT__ !== undefined);
}

test('normal gameplay has crosshair but no grey guide or laser', async ({ page }) => {
  await startRun(page);
  await expect(page.locator('.gfl-crosshair')).toBeVisible();
  expect(await page.evaluate(() => window.__GFL2_AIM_GUIDE_COUNT__)).toBe(0);
  expect(await page.evaluate(() => window.__GFL2_LASER_PREVIEW_COUNT__ ?? 0)).toBe(0);
  await expect(page.locator('[data-testid="laser-preview-banner"]')).toHaveCount(0);
});

test('production build does not expose laser preview tooling', async ({ page }) => {
  await page.goto('http://127.0.0.1:4173/?e2e=1&laserPreview=1', { waitUntil: 'networkidle' });
  await page.getByRole('button', { name: /start run/i }).click();
  await page.waitForFunction(() => window.__GFL2_TOLOLO_DIAGNOSTICS__?.loadState === 'loaded');
  await expect(page.locator('[data-testid="laser-preview-banner"]')).toHaveCount(0);
});

test('production build does not expose comparison tooling', async ({ page }) => {
  for (const mode of ['cel3d', 'pixel3d', 'pixel2d']) {
    await page.goto(`http://127.0.0.1:4173/?artCompare=${mode}&artView=third&artT=1.5`, {
      waitUntil: 'networkidle',
    });
    await expect(page.locator('.gfl-art-compare')).toHaveCount(0);
    await expect(page.locator('[data-testid="art-compare-label"]')).toHaveCount(0);
  }
});

test('production build keeps debug helpers disabled', async ({ page }) => {
  await page.goto('http://127.0.0.1:4173/?e2e=1&aimDebug=1', { waitUntil: 'networkidle' });
  await page.getByRole('button', { name: /start run/i }).click();
  await page.waitForFunction(() => window.__GFL2_TOLOLO_DIAGNOSTICS__?.loadState === 'loaded');
  await expect(page.locator('[data-testid="aim-debug-legend"]')).toHaveCount(0);
});

test('normal Grassland is unchanged without the comparison query', async ({ page }) => {
  await startRun(page);
  await expect(page.locator('.gfl-art-compare')).toHaveCount(0);
  await expect(page.locator('[data-testid="art-compare-label"]')).toHaveCount(0);
});
