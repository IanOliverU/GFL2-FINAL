import { expect, test, type Page } from '@playwright/test';
import { PNG } from 'pngjs';

type BrowserTestHooks = {
  setState: (name: string) => Promise<{ state: string }>;
  setPausedForScreenshot: (paused: boolean) => void;
};

function collectErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(`page: ${error.message}`));
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(`console: ${message.text()}`);
  });
  return errors;
}

async function setState(page: Page, state: string, paused = false): Promise<void> {
  await page.evaluate(
    async ({ requested, freeze }) => {
      const hooks = (window as unknown as { __THREE_GAME_TEST_HOOKS__?: BrowserTestHooks })
        .__THREE_GAME_TEST_HOOKS__;
      if (!hooks) throw new Error('Test hooks were not installed.');
      const result = await hooks.setState(requested);
      if (result.state !== requested) throw new Error(`State mismatch: ${result.state}`);
      hooks.setPausedForScreenshot(freeze);
    },
    { requested: state, freeze: paused },
  );
}

async function expectNonBlankCanvas(page: Page): Promise<void> {
  const buffer = await page.locator('canvas').first().screenshot();
  const png = PNG.sync.read(buffer);
  const colors = new Set<string>();
  let minimum = 255;
  let maximum = 0;
  for (let index = 0; index < png.data.length; index += 64) {
    const red = png.data[index] ?? 0;
    const green = png.data[index + 1] ?? 0;
    const blue = png.data[index + 2] ?? 0;
    const luminance = Math.round(red * 0.2126 + green * 0.7152 + blue * 0.0722);
    minimum = Math.min(minimum, luminance);
    maximum = Math.max(maximum, luminance);
    colors.add(`${red >> 4}-${green >> 4}-${blue >> 4}`);
  }
  expect(colors.size).toBeGreaterThan(24);
  expect(maximum - minimum).toBeGreaterThan(45);
}

async function diagnostics(page: Page) {
  return page.evaluate(() => {
    const value = (window as unknown as { __THREE_GAME_DIAGNOSTICS__?: Record<string, unknown> })
      .__THREE_GAME_DIAGNOSTICS__;
    if (!value) throw new Error('Diagnostics were not published.');
    return value as {
      frame: number;
      state: string;
      cameraMode: string;
      player: {
        position: readonly number[];
        ammo: number;
        magazineSize: number;
        reloading: number;
      };
      renderer: { calls: number; triangles: number; renderer: string; vendor: string } | null;
    };
  });
}

test.beforeEach(async ({ page }) => {
  await page.goto('/?e2e=1');
  await expect(page.locator('.gfl-app')).toBeVisible();
});

test('main menu renders live preview and reduced-motion state', async ({ page }, testInfo) => {
  const errors = collectErrors(page);
  await expect(page.getByRole('heading', { name: /GFL2 Field Protocol/i })).toBeVisible();
  await expect(page.locator('.gfl-menu-preview')).toHaveAttribute(
    'data-preview-motion',
    'orbiting',
  );
  await expectNonBlankCanvas(page);
  await page.screenshot({ path: `artifacts/screenshots/${testInfo.project.name}-main-menu.png` });

  await page.getByRole('button', { name: /^Settings/i }).click();
  await expect(page.locator('.gfl-menu-preview')).toHaveAttribute('data-preview-motion', 'paused');
  await page.getByLabel('Reduced motion').check();
  await page.getByRole('button', { name: 'Apply and close' }).click();
  await expect(page.locator('.gfl-menu-preview')).toHaveAttribute('data-preview-motion', 'paused');
  expect(errors).toEqual([]);
});

test('real input moves, fires, reloads, and switches the shared world', async ({
  page,
}, testInfo) => {
  const errors = collectErrors(page);
  await page.getByRole('button', { name: /Start run/i }).click();
  await expect(page.locator('[data-screen="game"]')).toBeVisible();
  await setState(page, 'active-third');
  await expectNonBlankCanvas(page);

  const before = await diagnostics(page);
  await page.keyboard.down('KeyW');
  await page.waitForTimeout(350);
  await page.keyboard.up('KeyW');
  const moved = await diagnostics(page);
  expect(moved.player.position).not.toEqual(before.player.position);

  const canvas = page.locator('canvas').first();
  const box = await canvas.boundingBox();
  if (!box) throw new Error('Gameplay canvas has no bounding box.');
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down({ button: 'left' });
  await page.waitForTimeout(180);
  await page.mouse.up({ button: 'left' });
  const fired = await diagnostics(page);
  expect(fired.player.ammo).toBeLessThan(fired.player.magazineSize);

  await page.keyboard.down('KeyR');
  await page.waitForTimeout(80);
  await page.keyboard.up('KeyR');
  await expect.poll(async () => (await diagnostics(page)).player.reloading).toBeGreaterThan(0);
  await page.screenshot({
    path: `artifacts/screenshots/${testInfo.project.name}-third-person-gameplay.png`,
  });

  await page.keyboard.down('KeyV');
  await page.waitForTimeout(80);
  await page.keyboard.up('KeyV');
  await expect(page.locator('[data-camera-mode="topDown"]')).toBeVisible();
  await page.screenshot({
    path: `artifacts/screenshots/${testInfo.project.name}-top-down-gameplay.png`,
  });
  expect(errors).toEqual([]);
});

test('level-up, attachment, boss break, extraction, death, and retry are reachable', async ({
  page,
}, testInfo) => {
  const errors = collectErrors(page);

  await setState(page, 'level-up');
  await expect(page.getByRole('heading', { name: /field adaptation/i })).toBeVisible();
  await page.screenshot({ path: `artifacts/screenshots/${testInfo.project.name}-level-up.png` });
  await page.locator('.gfl-upgrade-card').first().click();
  await expect(page.locator('.gfl-upgrade-card')).toHaveCount(0);

  await setState(page, 'attachment');
  await expect(page.getByRole('heading', { name: 'Attachment recovered' })).toBeVisible();
  await page.screenshot({ path: `artifacts/screenshots/${testInfo.project.name}-attachment.png` });
  await page.getByRole('button', { name: /Upgrade rarity/i }).click();
  await page.getByRole('button', { name: 'Equip attachment' }).click();

  await setState(page, 'boss-break', true);
  await expect(page.getByText('Core exposed')).toBeVisible();
  await page.screenshot({ path: `artifacts/screenshots/${testInfo.project.name}-boss-break.png` });

  await setState(page, 'extraction');
  await expect(page.getByRole('heading', { name: 'Field terminal' })).toBeVisible();
  await page.screenshot({ path: `artifacts/screenshots/${testInfo.project.name}-extraction.png` });
  await page.getByRole('button', { name: 'Complete extraction' }).click();
  await expect(page.getByRole('heading', { name: 'Grassland extracted' })).toBeVisible();

  await setState(page, 'death');
  await expect(page.getByRole('heading', { name: 'Doll signal lost' })).toBeVisible();
  await page.getByRole('button', { name: 'Retry Grassland' }).click();
  await expect(page.locator('[data-run-state="active"]')).toBeVisible();
  expect(errors).toEqual([]);
});

test('pedestal activation works through the real interact input', async ({ page }) => {
  const errors = collectErrors(page);
  await setState(page, 'pedestal-ready');
  await page.keyboard.down('KeyG');
  await page.waitForTimeout(80);
  await page.keyboard.up('KeyG');
  await expect(page.locator('[data-run-state="boss"]')).toBeVisible();
  expect(errors).toEqual([]);
});
