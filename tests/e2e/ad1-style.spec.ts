import { expect, test } from '@playwright/test';

/**
 * AD1 cel-shaded style gating (production preview). Proves normal Grassland
 * runs the selected style, the centered third-person camera, both camera
 * modes, ADS survival, and that AD0 tooling plus debug helpers stay
 * development-only. Simulation-balance and aiming-contract proof lives in
 * the Vitest suites and aim-alignment.spec.ts; this spec guards style
 * integration and production gating.
 */

async function startRun(page) {
  await page.goto('http://127.0.0.1:4173/?e2e=1', { waitUntil: 'networkidle' });
  await page.getByRole('button', { name: /start run/i }).click();
  await page.evaluate(() => window.__THREE_GAME_TEST_HOOKS__?.setState('tololo-model'));
  await page.waitForFunction(() => window.__GFL2_TOLOLO_DIAGNOSTICS__?.loadState === 'loaded');
  await page.waitForFunction(() => window.__GFL2_CEL_STYLE__ !== undefined);
  await page.waitForFunction(() => window.__GFL2_PLAYER_SCREEN__ !== undefined);
}

test('normal Grassland runs the selected cel-shaded style', async ({ page }) => {
  await startRun(page);
  const style = await page.evaluate(() => window.__GFL2_CEL_STYLE__);
  expect(style.style).toBe('cel-shaded-3d');
  expect(style.actorBands).toBe(3);
  expect(style.envBands).toBe(2);
  expect(style.globalOutlinePass).toBe(false);
  expect(style.fog).toEqual({ color: '#c3cfc6', near: 54, far: 118 });
});

test('third-person camera centers horizontally on the character', async ({ page }) => {
  await startRun(page);
  await page.waitForTimeout(800);
  const screen = await page.evaluate(() => window.__GFL2_PLAYER_SCREEN__);
  expect(screen.behind).toBe(false);
  expect(Math.abs(screen.x)).toBeLessThanOrEqual(0.25);
});

test('normal gameplay keeps the crosshair with no guide or laser', async ({ page }) => {
  await startRun(page);
  await expect(page.locator('.gfl-crosshair')).toBeVisible();
  expect(await page.evaluate(() => window.__GFL2_AIM_GUIDE_COUNT__)).toBe(0);
  expect(await page.evaluate(() => window.__GFL2_LASER_PREVIEW_COUNT__ ?? 0)).toBe(0);
  await expect(page.locator('[data-testid="laser-preview-banner"]')).toHaveCount(0);
});

test('ADS holds without errors under the cel style', async ({ page }) => {
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await startRun(page);
  await page.mouse.move(640, 360);
  await page.mouse.down({ button: 'right' });
  await page.waitForTimeout(1200);
  await page.mouse.up({ button: 'right' });
  expect(errors).toEqual([]);
  const style = await page.evaluate(() => window.__GFL2_CEL_STYLE__);
  expect(style.style).toBe('cel-shaded-3d');
});

test('top-down keeps the cel style and readable framing', async ({ page }) => {
  await startRun(page);
  await page.mouse.click(640, 360);
  await page.keyboard.press('v');
  await page.waitForFunction(
    () => document.querySelector('.gfl-app')?.getAttribute('data-camera-mode') === 'topDown',
  );
  const style = await page.evaluate(() => window.__GFL2_CEL_STYLE__);
  expect(style.style).toBe('cel-shaded-3d');
  expect(style.globalOutlinePass).toBe(false);
  const screen = await page.evaluate(() => window.__GFL2_PLAYER_SCREEN__);
  expect(screen.behind).toBe(false);
  expect(Math.abs(screen.x)).toBeLessThanOrEqual(0.95);
});

test('level-up leaves the cursor free for card selection', async ({ page }) => {
  await startRun(page);
  await page.evaluate(() => window.__THREE_GAME_TEST_HOOKS__?.setState('level-up'));
  await expect(page.locator('.gfl-upgrade-grid')).toBeVisible();
  // Headless Chromium rarely holds a real pointer lock, so this documents
  // the invariant while tests/unit/pointer-lock-guard.test.ts proves the
  // acquisition gate and App's modal effect releases a held lock.
  expect(await page.evaluate(() => document.pointerLockElement)).toBeNull();
  await expect(page.locator('.gfl-upgrade-card').first()).toBeVisible();
});

test('production build keeps AD0 comparison tooling disabled', async ({ page }) => {
  for (const mode of ['cel3d', 'pixel3d', 'pixel2d']) {
    await page.goto(`http://127.0.0.1:4173/?artCompare=${mode}&artView=third&artT=1.5`, {
      waitUntil: 'networkidle',
    });
    await expect(page.locator('.gfl-art-compare')).toHaveCount(0);
  }
});

test('production build keeps laser preview and debug helpers disabled', async ({ page }) => {
  await page.goto('http://127.0.0.1:4173/?e2e=1&laserPreview=1', { waitUntil: 'networkidle' });
  await page.getByRole('button', { name: /start run/i }).click();
  await page.waitForFunction(() => window.__GFL2_TOLOLO_DIAGNOSTICS__?.loadState === 'loaded');
  await expect(page.locator('[data-testid="laser-preview-banner"]')).toHaveCount(0);
  await page.goto('http://127.0.0.1:4173/?e2e=1&aimDebug=1', { waitUntil: 'networkidle' });
  await page.getByRole('button', { name: /start run/i }).click();
  await page.waitForFunction(() => window.__GFL2_TOLOLO_DIAGNOSTICS__?.loadState === 'loaded');
  await expect(page.locator('[data-testid="aim-debug-legend"]')).toHaveCount(0);
});
