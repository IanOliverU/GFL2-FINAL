import { expect, test } from '@playwright/test';

/**
 * AD2A isolated Lade-candidate review. The viewer is development-only:
 * production builds must never expose the route, the candidate must never
 * appear in normal Grassland, and the existing Lade proxy flow is unchanged.
 * Dev-server route tests run only when a dev server is reachable (local
 * Blender-review workflow); they skip otherwise instead of failing CI.
 */

async function devReachable(): Promise<boolean> {
  try {
    const response = await fetch('http://127.0.0.1:5173/', { signal: AbortSignal.timeout(3000) });
    return response.ok;
  } catch {
    return false;
  }
}

async function startNormalRun(page) {
  await page.goto('http://127.0.0.1:4173/?e2e=1', { waitUntil: 'networkidle' });
  await page.getByRole('button', { name: /start run/i }).click();
  await page.evaluate(() => window.__THREE_GAME_TEST_HOOKS__?.setState('tololo-model'));
  await page.waitForFunction(() => window.__GFL2_TOLOLO_DIAGNOSTICS__?.loadState === 'loaded');
}

test('production build keeps the model-review route disabled', async ({ page }) => {
  await page.goto('http://127.0.0.1:4173/?modelReview=lade', { waitUntil: 'networkidle' });
  await expect(page.locator('[data-testid="model-review-root"]')).toHaveCount(0);
  await expect(page.locator('.gfl-app, .gfl-menu, .gfl-game-scene').first()).toBeVisible();
});

test('normal Grassland never loads the candidate', async ({ page }) => {
  await startNormalRun(page);
  expect(await page.evaluate(() => window.__GFL2_MODEL_REVIEW__ ?? null)).toBeNull();
  expect(await page.evaluate(() => window.__GFL2_CEL_STYLE__?.style)).toBe('cel-shaded-3d');
});

test('dev-only review route loads the candidate when the dev server runs', async ({ page }) => {
  test.skip(!(await devReachable()), 'dev server not running; start npm run dev for review tests');
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('http://127.0.0.1:5173/?modelReview=lade&view=three-quarter', {
    waitUntil: 'networkidle',
  });
  await expect(page.locator('[data-testid="model-review-root"]')).toBeVisible();
  await page.waitForFunction(() => window.__GFL2_MODEL_REVIEW__?.ready === true, null, {
    timeout: 30000,
  });
  const flag = await page.evaluate(() => window.__GFL2_MODEL_REVIEW__);
  expect(flag.triangles).toBeGreaterThan(8000);
  expect(flag.triangles).toBeLessThanOrEqual(40000);
  expect(flag.sockets).toBe(10);
  expect(errors).toEqual([]);
});

test('dev-only review shows the missing-file fallback when the GLB is absent', async ({ page }) => {
  test.skip(!(await devReachable()), 'dev server not running; start npm run dev for review tests');
  await page.route('**/model-review/lade-candidate.glb', (route) => route.abort());
  await page.goto('http://127.0.0.1:5173/?modelReview=lade', { waitUntil: 'networkidle' });
  await expect(page.locator('[data-testid="model-review-fallback"]')).toBeVisible();
});
