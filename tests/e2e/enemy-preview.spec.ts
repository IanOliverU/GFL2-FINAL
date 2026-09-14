import { expect, test, type Page } from '@playwright/test';

type Diagnostics = {
  cameraMode: string;
  enemyPreview: 'lade' | null;
  player: { position: readonly number[]; ammo: number };
  enemies: Array<{ id: number; role: string }>;
};

function collectErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(`page: ${error.message}`));
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(`console: ${message.text()}`);
  });
  return errors;
}

async function diagnostics(page: Page): Promise<Diagnostics> {
  return page.evaluate(() => {
    const value = (window as unknown as { __THREE_GAME_DIAGNOSTICS__?: Diagnostics })
      .__THREE_GAME_DIAGNOSTICS__;
    if (!value) throw new Error('Diagnostics were not published.');
    return value;
  });
}

async function ladeCount(page: Page): Promise<number> {
  return (await diagnostics(page)).enemies.filter((enemy) => enemy.role === 'lade').length;
}

/**
 * Focused M2.1 coverage for the development-only `?enemyPreview=lade` mode.
 * Uses the real Start-run flow and the real encounter director throughout:
 * no test-hook spawns. Normal progression (no query parameter) must never
 * arm the mode; the preview run must show the banner, spawn a Lade within
 * the first 10 seconds, and keep movement, shooting, and both cameras live.
 */
test('Lade preview mode arms only with the query and runs real encounters', async ({ page }) => {
  const errors = collectErrors(page);

  // Normal progression: no banner, preview stays disarmed.
  await page.goto('/?e2e=1');
  await expect(page.locator('.gfl-app')).toBeVisible();
  await page.getByRole('button', { name: /start run/i }).click();
  await expect(page.locator('[data-screen="game"]')).toBeVisible();
  expect(await diagnostics(page).then((snapshot) => snapshot.enemyPreview)).toBeNull();
  await page.waitForTimeout(3000);
  await expect(page.getByTestId('lade-preview-banner')).toHaveCount(0);

  // Preview run: banner is explicit and encounters come from the director.
  await page.goto('/?e2e=1&enemyPreview=lade');
  await expect(page.locator('.gfl-app')).toBeVisible();
  await page.getByRole('button', { name: /start run/i }).click();
  await expect(page.locator('[data-screen="game"]')).toBeVisible();
  await expect(page.getByTestId('lade-preview-banner')).toHaveText(
    'LADE PREVIEW — NOT NORMAL PROGRESSION.',
  );
  expect(await diagnostics(page).then((snapshot) => snapshot.enemyPreview)).toBe('lade');

  // Normal movement still works.
  const before = (await diagnostics(page)).player.position;
  await page.keyboard.down('KeyW');
  await page.waitForTimeout(600);
  await page.keyboard.up('KeyW');
  const moved = (await diagnostics(page)).player.position;
  expect(Math.hypot(moved[0] - before[0], moved[2] - before[2])).toBeGreaterThan(0.5);

  // A Lade arrives within the first 10 seconds without any hook spawn.
  await expect.poll(async () => ladeCount(page), { timeout: 15_000 }).toBeGreaterThan(0);

  // Normal shooting still works.
  await page
    .locator('canvas')
    .first()
    .click({ position: { x: 64, y: 64 } });
  const ammoBefore = (await diagnostics(page)).player.ammo;
  await page.mouse.down({ button: 'left' });
  await page.waitForTimeout(500);
  await page.mouse.up({ button: 'left' });
  expect((await diagnostics(page)).player.ammo).toBeLessThan(ammoBefore);

  // Both cameras share the same preview encounter.
  await page.keyboard.down('KeyV');
  await page.waitForTimeout(80);
  await page.keyboard.up('KeyV');
  await expect(page.locator('[data-camera-mode="topDown"]')).toBeVisible();
  await expect.poll(async () => ladeCount(page)).toBeGreaterThan(0);
  await expect(page.getByTestId('lade-preview-banner')).toBeVisible();
  await page.keyboard.down('KeyV');
  await page.waitForTimeout(80);
  await page.keyboard.up('KeyV');
  await expect(page.locator('[data-camera-mode="thirdPerson"]')).toBeVisible();
  await expect.poll(async () => ladeCount(page)).toBeGreaterThan(0);

  expect(errors).toEqual([]);
});
