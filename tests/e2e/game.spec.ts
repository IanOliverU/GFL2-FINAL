import { expect, test, type Page } from '@playwright/test';
import { PNG } from 'pngjs';

type BrowserTestHooks = {
  setState: (name: string) => Promise<{ state: string }>;
  setPausedForScreenshot: (paused: boolean) => void;
  damagePlayer: (amount: number) => void;
  grantExperience: (amount: number) => void;
  spawnEnemy: (
    role: 'melee' | 'flanker' | 'ranged' | 'heavy' | 'elite' | 'lade',
    x: number,
    z: number,
  ) => number;
};

type KitDiagnostics = {
  weapon: {
    ammo: number;
    magazineSize: number;
    reloading: number;
    reloadProgress: number;
    recoil: number;
  };
  passive: { hits: number };
  skills: Array<{ id: string; unlocked: boolean; rank: number; cooldown: number }>;
  lastSkill: { tick: number; id: string | null } | null;
  lastDamage: { tick: number; value: number } | null;
  seed: number;
  cameraMode: string;
};

async function kit(page: Page): Promise<KitDiagnostics> {
  return page.evaluate(() => {
    const diagnostics = (
      window as unknown as { __THREE_GAME_DIAGNOSTICS__?: { kit?: KitDiagnostics } }
    ).__THREE_GAME_DIAGNOSTICS__;
    if (!diagnostics?.kit) throw new Error('Tololo kit diagnostics were not published.');
    return diagnostics.kit;
  });
}

async function grantExperience(page: Page, amount: number): Promise<void> {
  await page.evaluate((value) => {
    const hooks = (window as unknown as { __THREE_GAME_TEST_HOOKS__?: BrowserTestHooks })
      .__THREE_GAME_TEST_HOOKS__;
    if (!hooks) throw new Error('Test hooks were not installed.');
    hooks.grantExperience(value);
  }, amount);
}

async function spawnEnemy(page: Page, role: EnemyRole, x: number, z: number): Promise<number> {
  return page.evaluate(
    ({ requestedRole, px, pz }) => {
      const hooks = (window as unknown as { __THREE_GAME_TEST_HOOKS__?: BrowserTestHooks })
        .__THREE_GAME_TEST_HOOKS__;
      if (!hooks) throw new Error('Test hooks were not installed.');
      return hooks.spawnEnemy(requestedRole, px, pz);
    },
    { requestedRole: role, px: x, pz: z },
  );
}

type EnemyRole = 'melee' | 'flanker' | 'ranged' | 'heavy' | 'elite' | 'lade';

type EnemyState = {
  id: number;
  role: string;
  position: readonly number[];
  health: number;
  maxHealth: number;
  telegraph: number;
  attackKind: string | null;
  stagger: number;
};

async function enemies(page: Page): Promise<EnemyState[]> {
  return page.evaluate(() => {
    const diagnostics = (
      window as unknown as { __THREE_GAME_DIAGNOSTICS__?: { enemies?: EnemyState[] } }
    ).__THREE_GAME_DIAGNOSTICS__;
    if (!diagnostics) throw new Error('Diagnostics were not published.');
    return diagnostics.enemies ?? [];
  });
}

async function ladeById(page: Page, id: number): Promise<EnemyState> {
  const found = (await enemies(page)).find((enemy) => enemy.id === id);
  if (!found) throw new Error(`Lade ${id} is missing from diagnostics.`);
  return found;
}

function enemyDistance(player: readonly number[], enemy: EnemyState): number {
  return Math.hypot(enemy.position[0] - player[0], enemy.position[2] - player[2]);
}

async function lockPointer(page: Page): Promise<void> {
  await page
    .locator('canvas')
    .first()
    .click({ position: { x: 64, y: 64 } });
  await expect
    .poll(async () => page.evaluate(() => (document.pointerLockElement ? 'locked' : 'unlocked')))
    .toBe('locked');
}

/** Turn the third-person camera to face an enemy through the real mouse handler. */
async function faceEnemy(page: Page, id: number): Promise<void> {
  let error = Number.POSITIVE_INFINITY;
  for (let attempt = 0; attempt < 12 && error >= 0.2; attempt += 1) {
    error = await page.evaluate((enemyId) => {
      const diagnostics = (
        window as unknown as {
          __THREE_GAME_DIAGNOSTICS__?: {
            player: { position: readonly number[]; facingYaw: number; aimPitch: number };
            enemies: EnemyState[];
          };
        }
      ).__THREE_GAME_DIAGNOSTICS__;
      if (!diagnostics) throw new Error('Diagnostics were not published.');
      const enemy = diagnostics.enemies.find((candidate) => candidate.id === enemyId);
      if (!enemy) throw new Error(`Lade ${enemyId} is missing from diagnostics.`);
      const [px, , pz] = diagnostics.player.position;
      const desired = Math.atan2(
        (enemy.position[0] ?? 0) - (px ?? 0),
        (enemy.position[2] ?? 0) - (pz ?? 0),
      );
      let delta = diagnostics.player.facingYaw - desired;
      while (delta > Math.PI) delta -= Math.PI * 2;
      while (delta < -Math.PI) delta += Math.PI * 2;
      const totalX = delta / 0.0022;
      const totalY = diagnostics.player.aimPitch / 0.0018;
      const steps = Math.max(1, Math.ceil(Math.max(Math.abs(totalX), Math.abs(totalY)) / 200));
      for (let step = 0; step < steps; step += 1) {
        window.dispatchEvent(
          new MouseEvent('mousemove', {
            movementX: totalX / steps,
            movementY: totalY / steps,
          }),
        );
      }
      return Math.abs(delta) + Math.abs(diagnostics.player.aimPitch);
    }, id);
    await page.waitForTimeout(80);
  }
  expect(error).toBeLessThan(0.2);
}

/** Spawn a Lade straight ahead of the current aim so forward fire connects. */
async function spawnAhead(page: Page, distance: number): Promise<number> {
  const { id } = await page.evaluate((ahead) => {
    const diagnostics = window as unknown as {
      __THREE_GAME_DIAGNOSTICS__?: {
        player: { position: readonly number[]; facingYaw: number };
      };
      __THREE_GAME_TEST_HOOKS__?: BrowserTestHooks;
    };
    const snapshot = diagnostics.__THREE_GAME_DIAGNOSTICS__;
    if (!snapshot) throw new Error('Diagnostics were not published.');
    const hooks = diagnostics.__THREE_GAME_TEST_HOOKS__;
    if (!hooks) throw new Error('Test hooks were not installed.');
    const [px, , pz] = snapshot.player.position;
    const yaw = snapshot.player.facingYaw;
    const spawned = hooks.spawnEnemy(
      'lade',
      (px ?? 0) + Math.sin(yaw) * ahead,
      (pz ?? 0) + Math.cos(yaw) * ahead,
    );
    return { id: spawned };
  }, distance);
  return id as number;
}

/** Re-aim between short real-input bursts so a pursuing target cannot drift off-ray. */
async function fireUntilDefeated(page: Page, id: number): Promise<void> {
  for (let burst = 0; burst < 8; burst += 1) {
    if (!(await enemies(page)).some((enemy) => enemy.id === id)) return;
    await faceEnemy(page, id);
    await page.keyboard.down('KeyS');
    await page.mouse.down({ button: 'left' });
    await page.waitForTimeout(550);
    await page.mouse.up({ button: 'left' });
    await page.keyboard.up('KeyS');
    if (((await diagnostics(page)).player.ammo as number) === 0) {
      await page.keyboard.press('KeyR');
      await expect
        .poll(async () => {
          const snapshot = await diagnostics(page);
          return (
            (snapshot.player.ammo as number) > 0 ||
            !(snapshot.enemies as EnemyState[]).some((enemy) => enemy.id === id)
          );
        })
        .toBe(true);
    }
  }
  await expect
    .poll(async () => (await enemies(page)).find((enemy) => enemy.id === id))
    .toBeUndefined();
}

async function pressSkill(page: Page, code: 'KeyQ' | 'KeyE' | 'KeyF'): Promise<void> {
  await page.keyboard.down(code);
  await page.waitForTimeout(90);
  await page.keyboard.up(code);
}

async function unlockSkill(page: Page, amount: number, cardName: RegExp): Promise<void> {
  await grantExperience(page, amount);
  await expect(page.getByRole('heading', { name: /field adaptation/i })).toBeVisible();
  await page.getByRole('button', { name: cardName }).click();
  await expect(page.locator('.gfl-upgrade-card')).toHaveCount(0);
}

type TololoDiagnostics = {
  loadState: string;
  runtimeInstances: number;
  disposals: number;
  model: {
    format: string;
    vertices: number;
    bones: number;
    resourceErrors: readonly string[];
  } | null;
  missingBones: readonly string[];
  animation: { state: string; phase: number } | null;
  groundingError: number | null;
  muzzleError: number | null;
  gripErrors: { left: number; right: number } | null;
};

type PlayerScreen = { x: number; y: number; behind: boolean };

async function playerScreen(page: Page): Promise<PlayerScreen> {
  return page.evaluate(() => {
    const value = (window as unknown as { __GFL2_PLAYER_SCREEN__?: PlayerScreen })
      .__GFL2_PLAYER_SCREEN__;
    if (!value) throw new Error('Player screen position was not published.');
    return value;
  });
}

async function sceneDebugCount(page: Page): Promise<number> {
  return page.evaluate(() => {
    const value = (window as unknown as { __GFL2_SCENE_DEBUG_COUNT__?: number })
      .__GFL2_SCENE_DEBUG_COUNT__;
    if (value === undefined) throw new Error('Scene debug count was not published.');
    return value;
  });
}

async function waitForPlayerScreen(page: Page): Promise<void> {
  await page.waitForFunction(
    () =>
      (window as unknown as { __GFL2_PLAYER_SCREEN__?: PlayerScreen }).__GFL2_PLAYER_SCREEN__ !=
      null,
    undefined,
    { timeout: 15_000 },
  );
}

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
        facingYaw: number;
        aimPitch: number;
        health: number;
        maxHealth: number;
        exp: number;
        sardis: number;
      };
      renderer: { calls: number; triangles: number; renderer: string; vendor: string } | null;
    };
  });
}

async function tololoDiagnostics(page: Page): Promise<TololoDiagnostics> {
  return page.evaluate(() => {
    const value = (window as unknown as { __GFL2_TOLOLO_DIAGNOSTICS__?: TololoDiagnostics })
      .__GFL2_TOLOLO_DIAGNOSTICS__;
    if (!value) throw new Error('Tololo diagnostics were not published.');
    return value;
  });
}

async function waitForTololo(page: Page): Promise<void> {
  await page.waitForFunction(
    () =>
      (
        window as unknown as {
          __GFL2_TOLOLO_DIAGNOSTICS__?: TololoDiagnostics;
        }
      ).__GFL2_TOLOLO_DIAGNOSTICS__?.loadState === 'loaded',
    undefined,
    { timeout: 15_000 },
  );
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
  await waitForTololo(page);
  await expectNonBlankCanvas(page);

  const before = await diagnostics(page);
  await page.keyboard.down('KeyW');
  await expect.poll(async () => (await tololoDiagnostics(page)).animation?.state).toBe('walk');
  await page.keyboard.down('ShiftLeft');
  await expect.poll(async () => (await tololoDiagnostics(page)).animation?.state).toBe('sprint');
  await page.keyboard.down('Space');
  await page.waitForTimeout(80);
  await page.keyboard.up('Space');
  await expect.poll(async () => (await tololoDiagnostics(page)).animation?.state).toBe('dodge');
  await page.keyboard.up('ShiftLeft');
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
  await expect.poll(async () => (await tololoDiagnostics(page)).animation?.state).toBe('reload');
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

test('WASD follows the expected basis in both cameras', async ({ page }) => {
  const errors = collectErrors(page);
  await page.getByRole('button', { name: /Start run/i }).click();
  await setState(page, 'active-third');
  await waitForTololo(page);

  const position = async () => (await diagnostics(page)).player.position as number[];

  const start = await position();
  await page.keyboard.down('KeyW');
  await page.waitForTimeout(450);
  await page.keyboard.up('KeyW');
  const afterW = await position();
  expect(afterW[2]).toBeGreaterThan(start[2] + 0.5);
  expect(Math.abs(afterW[0] - start[0])).toBeLessThan(0.6);

  await page.keyboard.down('KeyD');
  await page.waitForTimeout(450);
  await page.keyboard.up('KeyD');
  const afterD = await position();
  // Screen-right is -X while the third-person camera looks toward +Z.
  expect(afterD[0]).toBeLessThan(afterW[0] - 0.5);

  await page.keyboard.down('KeyV');
  await page.waitForTimeout(80);
  await page.keyboard.up('KeyV');
  await expect(page.locator('[data-camera-mode="topDown"]')).toBeVisible();

  const topStart = await position();
  await page.keyboard.down('KeyW');
  await page.waitForTimeout(450);
  await page.keyboard.up('KeyW');
  const topW = await position();
  expect(topW[2]).toBeGreaterThan(topStart[2] + 0.5);

  await page.keyboard.down('KeyD');
  await page.waitForTimeout(450);
  await page.keyboard.up('KeyD');
  const topD = await position();
  expect(topD[0]).toBeLessThan(topW[0] - 0.5);
  expect(errors).toEqual([]);
});

test('diagonals stay normalized in both cameras', async ({ page }) => {
  const errors = collectErrors(page);
  await page.getByRole('button', { name: /Start run/i }).click();
  await setState(page, 'active-third');
  await waitForTololo(page);

  const position = async () => (await diagnostics(page)).player.position as number[];
  const length = (from: number[], to: number[]) => Math.hypot(to[0] - from[0], to[2] - from[2]);

  const cardinalStart = await position();
  await page.keyboard.down('KeyW');
  await page.waitForTimeout(350);
  await page.keyboard.up('KeyW');
  const cardinalEnd = await position();
  const cardinalLength = length(cardinalStart, cardinalEnd);
  expect(cardinalLength).toBeGreaterThan(0.5);

  const diagonalStart = await position();
  await page.keyboard.down('KeyW');
  await page.keyboard.down('KeyD');
  await page.waitForTimeout(350);
  await page.keyboard.up('KeyD');
  await page.keyboard.up('KeyW');
  const diagonalEnd = await position();
  // At yaw 0 the W+D bisector is screen (-1, +1)/sqrt(2): rightward and away.
  const dx = diagonalEnd[0] - diagonalStart[0];
  const dz = diagonalEnd[2] - diagonalStart[2];
  const diagonalLength = Math.hypot(dx, dz);
  expect(dx).toBeLessThan(-0.3);
  expect(dz).toBeGreaterThan(0.3);
  expect(diagonalLength).toBeGreaterThan(cardinalLength * 0.8);
  expect(diagonalLength).toBeLessThan(cardinalLength * 1.2);

  await page.keyboard.down('KeyV');
  await page.waitForTimeout(80);
  await page.keyboard.up('KeyV');
  await expect(page.locator('[data-camera-mode="topDown"]')).toBeVisible();
  const topStart = await position();
  await page.keyboard.down('KeyW');
  await page.keyboard.down('KeyD');
  await page.waitForTimeout(350);
  await page.keyboard.up('KeyD');
  await page.keyboard.up('KeyW');
  const topEnd = await position();
  expect(topEnd[0] - topStart[0]).toBeLessThan(-0.3);
  expect(topEnd[2] - topStart[2]).toBeGreaterThan(0.3);
  expect(errors).toEqual([]);
});

test('mouse look turns and tilts deterministically', async ({ page }) => {
  const errors = collectErrors(page);
  await page.getByRole('button', { name: /Start run/i }).click();
  await setState(page, 'active-third');
  await waitForTololo(page);
  await expect(page.locator('[data-controls-overlay]')).toHaveCount(0);

  const canvas = page.locator('canvas').first();
  await canvas.click({ position: { x: 64, y: 64 } });
  await expect
    .poll(async () => page.evaluate(() => (document.pointerLockElement ? 'locked' : 'unlocked')))
    .toBe('locked');

  const look = () => diagnostics(page).then((state) => state.player.facingYaw as number);
  const tilt = () => diagnostics(page).then((state) => state.player.aimPitch as number);
  const nudge = (movementX: number, movementY: number) =>
    page.evaluate(
      ({ dx, dy }) => {
        window.dispatchEvent(new MouseEvent('mousemove', { movementX: dx, movementY: dy }));
      },
      { dx: movementX, dy: movementY },
    );

  const yawBefore = await look();
  await nudge(200, 0);
  await expect.poll(async () => look()).toBeLessThan(yawBefore - 0.35);
  await nudge(-100, 0);
  await expect.poll(async () => look()).toBeGreaterThan(yawBefore - 0.44 + 0.17);

  const pitchBefore = await tilt();
  await nudge(0, -150);
  await expect.poll(async () => tilt()).toBeGreaterThan(pitchBefore + 0.2);
  await nudge(0, 100);
  await expect.poll(async () => tilt()).toBeLessThan(pitchBefore + 0.27 - 0.13);
  expect(errors).toEqual([]);
});

test('switching while moving immediately follows the new basis', async ({ page }) => {
  const errors = collectErrors(page);
  await page.getByRole('button', { name: /Start run/i }).click();
  await setState(page, 'active-third');
  await waitForTololo(page);

  const canvas = page.locator('canvas').first();
  await canvas.click({ position: { x: 64, y: 64 } });
  await expect
    .poll(async () => page.evaluate(() => (document.pointerLockElement ? 'locked' : 'unlocked')))
    .toBe('locked');
  // Rotate to yaw -PI/2 (facing west) so the two bases disagree on D.
  await page.evaluate(() => {
    window.dispatchEvent(new MouseEvent('mousemove', { movementX: 714, movementY: 0 }));
  });
  await expect
    .poll(async () => (await diagnostics(page)).player.facingYaw as number)
    .toBeLessThan(-1.3);

  const position = async () => (await diagnostics(page)).player.position as number[];
  await page.keyboard.down('KeyD');
  await page.waitForTimeout(500);
  const thirdA = await position();
  await page.waitForTimeout(500);
  const thirdB = await position();
  // Third-person D at yaw -PI/2 drives -Z while held.
  expect(thirdB[2] - thirdA[2]).toBeLessThan(-0.5);
  expect(Math.abs(thirdB[0] - thirdA[0])).toBeLessThan(0.6);
  await page.keyboard.down('KeyV');
  await page.waitForTimeout(80);
  await page.keyboard.up('KeyV');
  await expect(page.locator('[data-camera-mode="topDown"]')).toBeVisible();
  const atSwitch = await position();
  await page.waitForTimeout(500);
  await page.keyboard.up('KeyD');
  const postSwitch = await position();
  // Top-down D drives -X immediately with no opposite-direction impulse.
  expect(postSwitch[0] - atSwitch[0]).toBeLessThan(-0.5);
  expect(Math.abs(postSwitch[2] - atSwitch[2])).toBeLessThan(0.6);
  expect(postSwitch[0]).toBeLessThan(thirdB[0]);
  expect(errors).toEqual([]);
});

test('controls overlay appears only under its diagnostic flag', async ({ page }) => {
  const errors = collectErrors(page);
  await page.getByRole('button', { name: /Start run/i }).click();
  await setState(page, 'active-third');
  await expect(page.locator('[data-controls-overlay]')).toHaveCount(0);
  await page.goto('/?e2e=1&controlsDebug=1');
  await page.getByRole('button', { name: /Start run/i }).click();
  await setState(page, 'active-third');
  await expect(page.locator('[data-controls-overlay]')).toHaveCount(1);
  await expect(page.locator('[data-controls-overlay]')).toContainText('cam thirdPerson');
  expect(errors).toEqual([]);
});

test('Tololo PMX loads once, stays unique on retry, and disposes on menu return', async ({
  page,
}) => {
  const errors = collectErrors(page);
  await page.getByRole('button', { name: /Start run/i }).click();
  await setState(page, 'tololo-model');
  await waitForTololo(page);

  const loaded = await tololoDiagnostics(page);
  expect(loaded.runtimeInstances).toBe(1);
  expect(loaded.model?.format).toBe('pmx-direct');
  expect(loaded.model?.vertices).toBe(30_905);
  expect(loaded.model?.bones).toBe(409);
  expect(loaded.model?.resourceErrors).toEqual([]);
  expect(loaded.missingBones).toEqual([]);
  expect(Math.abs(loaded.groundingError ?? 1)).toBeLessThan(0.01);
  expect(loaded.muzzleError).toBeLessThan(0.001);
  expect(loaded.gripErrors?.right).toBeLessThan(0.03);
  expect(loaded.gripErrors?.left).toBeLessThan(0.04);
  await expect.poll(sceneDebugCount.bind(null, page)).toBe(0);

  await page.getByRole('button', { name: 'Pause game' }).click();
  await expect(page.getByRole('heading', { name: 'Field operation paused' })).toBeVisible();
  await page.getByRole('button', { name: /Restart run/i }).click();
  await expect.poll(async () => (await tololoDiagnostics(page)).runtimeInstances).toBe(1);

  await page.getByRole('button', { name: 'Pause game' }).click();
  await page.getByRole('button', { name: /Return to main menu/i }).click();
  await expect(page.locator('[data-screen="menu"]')).toBeVisible();
  await expect.poll(async () => (await tololoDiagnostics(page)).runtimeInstances).toBe(0);
  expect((await tololoDiagnostics(page)).disposals).toBeGreaterThanOrEqual(1);
  expect(errors).toEqual([]);
});

test('debug query enables helpers while normal mode stays clean', async ({ page }) => {
  const errors = collectErrors(page);
  await page.goto('/?e2e=1&modelDebug=1');
  await expect(page.locator('.gfl-app')).toBeVisible();
  await page.getByRole('button', { name: /Start run/i }).click();
  await setState(page, 'tololo-model');
  await waitForTololo(page);
  await expect.poll(sceneDebugCount.bind(null, page)).toBeGreaterThan(0);
  expect(errors).toEqual([]);
});

test('pause freezes procedural animation while rendering continues', async ({ page }) => {
  const errors = collectErrors(page);
  await page.getByRole('button', { name: /Start run/i }).click();
  await setState(page, 'active-third');
  await waitForTololo(page);
  await page.getByRole('button', { name: 'Pause game' }).click();
  await expect(page.getByRole('heading', { name: 'Field operation paused' })).toBeVisible();
  await page.waitForTimeout(400);
  const before = (await tololoDiagnostics(page)).animation?.phase ?? null;
  await page.waitForTimeout(500);
  const after = (await tololoDiagnostics(page)).animation?.phase ?? null;
  expect(before).not.toBeNull();
  expect(after).toBe(before);
  await expectNonBlankCanvas(page);
  expect(errors).toEqual([]);
});

test('framing keeps Tololo visible and cameras share one simulation', async ({ page }) => {
  const errors = collectErrors(page);
  await page.getByRole('button', { name: /Start run/i }).click();
  await setState(page, 'active-third');
  await waitForTololo(page);
  await waitForPlayerScreen(page);
  await page.waitForTimeout(800);
  const screen = await playerScreen(page);
  expect(screen.behind).toBe(false);
  expect(Math.abs(screen.x)).toBeLessThanOrEqual(0.95);
  expect(screen.y).toBeGreaterThanOrEqual(-1);
  expect(screen.y).toBeLessThanOrEqual(0.95);

  const third = await diagnostics(page);
  await page.keyboard.down('KeyV');
  await page.waitForTimeout(80);
  await page.keyboard.up('KeyV');
  await expect(page.locator('[data-camera-mode="topDown"]')).toBeVisible();
  const top = await diagnostics(page);
  expect(top.cameraMode).toBe('topDown');
  expect(top.player.position).toEqual(third.player.position);
  await expectNonBlankCanvas(page);
  expect(errors).toEqual([]);
});

test('Tololo combat kit unlocks, fires, cools down, and resets', async ({ page }, testInfo) => {
  const errors = collectErrors(page);
  await page.getByRole('button', { name: /Start run/i }).click();
  await expect(page.locator('[data-screen="game"]')).toBeVisible();
  await waitForTololo(page);

  // Fresh run: full magazine, armed passive counter, three locked skills.
  const fresh = await kit(page);
  expect(fresh.weapon.ammo).toBe(fresh.weapon.magazineSize);
  expect(fresh.passive.hits).toBe(0);
  expect(fresh.skills).toHaveLength(3);
  expect(fresh.skills.every((skill) => !skill.unlocked)).toBe(true);
  await expect(page.locator('.gfl-skill', { hasText: 'Locked' })).toHaveCount(3);
  await expect(page.locator('.gfl-lightspike')).toContainText('0/6');
  await page.screenshot({
    path: `artifacts/screenshots/${testInfo.project.name}-kit-locked.png`,
  });

  // Locked inputs are inert.
  await pressSkill(page, 'KeyQ');
  await pressSkill(page, 'KeyE');
  await pressSkill(page, 'KeyF');
  await page.waitForTimeout(300);
  expect((await kit(page)).lastSkill).toBeNull();

  await spawnEnemy(page, 'melee', 0, 10);

  // Level 2 unlocks Skill 1; activation starts its cooldown and damages a target.
  await unlockSkill(page, 60, /Hydro Barrage/);
  await page.screenshot({
    path: `artifacts/screenshots/${testInfo.project.name}-kit-skill1-card.png`,
  });
  const damageBefore = (await kit(page)).lastDamage?.tick ?? -1;
  await pressSkill(page, 'KeyQ');
  await expect
    .poll(async () => (await kit(page)).skills.find((skill) => skill.id === 'skill1')?.cooldown)
    .toBeGreaterThan(0);
  await expect.poll(async () => (await kit(page)).lastSkill?.id).toBe('skill1');
  await expect
    .poll(async () => (await kit(page)).lastDamage?.tick ?? -1)
    .toBeGreaterThan(damageBefore);
  await expect(page.locator('.gfl-skill', { hasText: 'Hydro Barrage' })).toBeVisible();

  // Re-activation on cooldown does not reset the timer.
  const cooling = await kit(page);
  const coolingValue = cooling.skills.find((skill) => skill.id === 'skill1')?.cooldown ?? 0;
  await pressSkill(page, 'KeyQ');
  await page.waitForTimeout(400);
  const stillCooling =
    (await kit(page)).skills.find((skill) => skill.id === 'skill1')?.cooldown ?? 0;
  expect(stillCooling).toBeLessThan(coolingValue);

  // Level 3 unlocks Skill 2; Level 4 unlocks the Ultimate.
  await unlockSkill(page, 120, /Tidal Step/);
  await page.screenshot({
    path: `artifacts/screenshots/${testInfo.project.name}-kit-skill2-card.png`,
  });
  await pressSkill(page, 'KeyE');
  await expect
    .poll(async () => (await kit(page)).skills.find((skill) => skill.id === 'skill2')?.cooldown)
    .toBeGreaterThan(0);

  await unlockSkill(page, 180, /Starfall Recursion/);
  await page.screenshot({
    path: `artifacts/screenshots/${testInfo.project.name}-kit-ultimate-card.png`,
  });
  await expect(page.locator('.gfl-skill.is-ultimate-ready')).toBeVisible();
  await page.screenshot({
    path: `artifacts/screenshots/${testInfo.project.name}-kit-ultimate-ready.png`,
  });
  await pressSkill(page, 'KeyF');
  await expect
    .poll(async () => (await kit(page)).skills.find((skill) => skill.id === 'ultimate')?.cooldown)
    .toBeGreaterThan(0);
  await expect.poll(async () => (await kit(page)).lastSkill?.id).toBe('ultimate');
  await page.screenshot({
    path: `artifacts/screenshots/${testInfo.project.name}-kit-third-person.png`,
  });

  // Camera switching preserves the kit while combat continues in both views.
  await page.keyboard.down('KeyV');
  await page.waitForTimeout(80);
  await page.keyboard.up('KeyV');
  await expect(page.locator('[data-camera-mode="topDown"]')).toBeVisible();
  expect((await kit(page)).skills.every((skill) => skill.unlocked)).toBe(true);
  await page.screenshot({
    path: `artifacts/screenshots/${testInfo.project.name}-kit-top-down.png`,
  });

  // Pause freezes an active cooldown; death and retry reset the whole kit.
  await pressSkill(page, 'KeyQ');
  await expect
    .poll(async () => (await kit(page)).skills.find((skill) => skill.id === 'skill1')?.cooldown)
    .toBeGreaterThan(0);
  await page.getByRole('button', { name: 'Pause game' }).click();
  const frozen = (await kit(page)).skills.find((skill) => skill.id === 'skill1')?.cooldown ?? -1;
  await page.waitForTimeout(500);
  expect((await kit(page)).skills.find((skill) => skill.id === 'skill1')?.cooldown).toBe(frozen);
  await page.getByRole('button', { name: /Resume/i }).click();

  await page.evaluate(() => {
    const hooks = (window as unknown as { __THREE_GAME_TEST_HOOKS__?: BrowserTestHooks })
      .__THREE_GAME_TEST_HOOKS__;
    hooks?.damagePlayer(9999);
  });
  await expect(page.getByRole('heading', { name: 'Doll signal lost' })).toBeVisible();
  await page.getByRole('button', { name: 'Retry Grassland' }).click();
  await expect(page.locator('[data-run-state="active"]')).toBeVisible();
  const retried = await kit(page);
  expect(retried.skills.every((skill) => !skill.unlocked)).toBe(true);
  expect(retried.weapon.ammo).toBe(retried.weapon.magazineSize);
  expect(retried.passive.hits).toBe(0);
  await expect(page.locator('.gfl-skill', { hasText: 'Locked' })).toHaveCount(3);

  await page.getByRole('button', { name: 'Pause game' }).click();
  await page.getByRole('button', { name: /Return to main menu/i }).click();
  await expect(page.locator('[data-screen="menu"]')).toBeVisible();
  await expect.poll(async () => (await tololoDiagnostics(page)).runtimeInstances).toBe(0);
  expect(errors).toEqual([]);
});

test('Felagi Lade duel: approach, telegraph, dodge, stagger, mark, kills, rewards', async ({
  page,
}) => {
  const errors = collectErrors(page);
  await page.getByRole('button', { name: /Start run/i }).click();
  await expect(page.locator('[data-screen="game"]')).toBeVisible();
  await setState(page, 'tololo-model');
  await waitForTololo(page);

  const playerPosition = async () => (await diagnostics(page)).player.position as number[];
  const playerHealth = async () => (await diagnostics(page)).player.health as number;
  const playerExp = async () => (await diagnostics(page)).player.exp as number;

  // 2. Controlled Lade-only encounter through the development hook.
  const ladeId = await spawnEnemy(page, 'lade', 0, 8);
  await expect.poll(async () => (await ladeById(page, ladeId)).role).toBe('lade');

  // 3-4. Approach observed, then the readable ladeSlash telegraph.
  await expect
    .poll(async () => enemyDistance(await playerPosition(), await ladeById(page, ladeId)))
    .toBeLessThan(3);
  await expect.poll(async () => (await ladeById(page, ladeId)).attackKind).toBe('ladeSlash');
  await expect.poll(async () => (await ladeById(page, ladeId)).telegraph).toBeGreaterThan(0);

  // 5. One valid attack lands while standing still.
  const fullHealth = await playerHealth();
  await expect.poll(async () => playerHealth()).toBeLessThan(fullHealth);

  // 6. A later telegraph is dodged sideways with Space once the damage frame is near.
  await expect.poll(async () => (await ladeById(page, ladeId)).attackKind).toBe('ladeSlash');
  await expect.poll(async () => (await ladeById(page, ladeId)).telegraph).toBeLessThan(0.25);
  const beforeDodge = await playerHealth();
  await page.keyboard.down('KeyD');
  await page.keyboard.down('Space');
  await page.waitForTimeout(120);
  await page.keyboard.up('Space');
  await page.keyboard.up('KeyD');
  await page.waitForTimeout(1200);
  expect(await playerHealth()).toBe(beforeDodge);

  // 7-8. Tidal Step staggers Lade; Hydro Barrage marks and damages it.
  // Cards are picked before pointer lock so modal clicks stay unblocked.
  await unlockSkill(page, 60, /Hydro Barrage/);
  await unlockSkill(page, 120, /Tidal Step/);
  await lockPointer(page);
  await faceEnemy(page, ladeId);
  await pressSkill(page, 'KeyE');
  await expect.poll(async () => (await ladeById(page, ladeId)).stagger).toBeGreaterThan(0);
  // Back away while it is staggered: forward fire spawns at the muzzle
  // 0.82 m ahead, so an adjacent target must be given distance first.
  await page.keyboard.down('KeyS');
  await page.waitForTimeout(400);
  await page.keyboard.up('KeyS');
  await faceEnemy(page, ladeId);
  const markedHealth = (await ladeById(page, ladeId)).health;
  await pressSkill(page, 'KeyQ');
  await expect.poll(async () => (await ladeById(page, ladeId)).health).toBeLessThan(markedHealth);

  // 9. AK-Alfa kill through short, re-aimed real-mouse bursts while kiting.
  const expBefore = await playerExp();
  await fireUntilDefeated(page, ladeId);

  // 10. A second Lade, spawned straight ahead, falls to Starfall Recursion
  // plus follow-up fire. Pointer lock is released for the modal card pick.
  await page.evaluate(() => document.exitPointerLock());
  await unlockSkill(page, 180, /Starfall Recursion/);
  await lockPointer(page);
  const secondId = await spawnAhead(page, 8);
  // Re-aim at actual geometry, stagger for free hits and damage reduction.
  await faceEnemy(page, secondId);
  await pressSkill(page, 'KeyE');
  await page.mouse.down({ button: 'left' });
  await page.keyboard.down('KeyS');
  await page.waitForTimeout(400);
  await page.keyboard.up('KeyS');
  await page.mouse.up({ button: 'left' });
  await pressSkill(page, 'KeyF');
  await fireUntilDefeated(page, secondId);

  // 11. XP was awarded exactly once per kill (plus the 180 grant between them).
  await expect.poll(async () => playerExp()).toBe(expBefore + 240);
  // Dismiss any level-up earned from kill XP so later inputs stay unblocked.
  if (await page.getByRole('heading', { name: /field adaptation/i }).isVisible()) {
    await page.locator('.gfl-upgrade-card').first().click();
  }

  // 12. Camera switching preserves the approaching attacker.
  const thirdId = await spawnEnemy(page, 'lade', 0, 10);
  await page.waitForTimeout(1200);
  const approaching = enemyDistance(await playerPosition(), await ladeById(page, thirdId));
  await page.keyboard.down('KeyV');
  await page.waitForTimeout(80);
  await page.keyboard.up('KeyV');
  await expect(page.locator('[data-camera-mode="topDown"]')).toBeVisible();
  await page.waitForTimeout(1200);
  expect(enemyDistance(await playerPosition(), await ladeById(page, thirdId))).toBeLessThan(
    approaching,
  );
  await page.keyboard.down('KeyV');
  await page.waitForTimeout(80);
  await page.keyboard.up('KeyV');
  await expect(page.locator('[data-camera-mode="thirdPerson"]')).toBeVisible();

  // 13. Pause freezes an active anticipation.
  await expect.poll(async () => (await ladeById(page, thirdId)).attackKind).toBe('ladeSlash');
  await page.getByRole('button', { name: 'Pause game' }).click();
  const frozenTelegraph = (await ladeById(page, thirdId)).telegraph;
  await page.waitForTimeout(500);
  expect((await ladeById(page, thirdId)).telegraph).toBe(frozenTelegraph);
  await page.getByRole('button', { name: /Resume/i }).click();

  // 14. Death and retry clear Lade with the run.
  await page.evaluate(() => {
    const hooks = (window as unknown as { __THREE_GAME_TEST_HOOKS__?: BrowserTestHooks })
      .__THREE_GAME_TEST_HOOKS__;
    hooks?.damagePlayer(9999);
  });
  await expect(page.getByRole('heading', { name: 'Doll signal lost' })).toBeVisible();
  await page.getByRole('button', { name: 'Retry Grassland' }).click();
  await expect(page.locator('[data-run-state="active"]')).toBeVisible();
  expect(await enemies(page)).toHaveLength(0);

  // 15. Menu return disposes the Tololo runtime.
  await page.getByRole('button', { name: 'Pause game' }).click();
  await page.getByRole('button', { name: /Return to main menu/i }).click();
  await expect(page.locator('[data-screen="menu"]')).toBeVisible();
  await expect.poll(async () => (await tololoDiagnostics(page)).runtimeInstances).toBe(0);
  expect(errors).toEqual([]);
});

test('Felagi Lade essential flow at the narrow viewport', async ({ page }) => {
  const errors = collectErrors(page);
  await page.getByRole('button', { name: /Start run/i }).click();
  await expect(page.locator('[data-screen="game"]')).toBeVisible();
  await setState(page, 'tololo-model');
  await waitForTololo(page);
  const ladeId = await spawnEnemy(page, 'lade', 0, 8);
  await expect
    .poll(async () => {
      const me = (await diagnostics(page)).player.position as number[];
      return enemyDistance(me, await ladeById(page, ladeId));
    })
    .toBeLessThan(3);
  await expect.poll(async () => (await ladeById(page, ladeId)).attackKind).toBe('ladeSlash');
  const canvas = page.locator('canvas').first();
  const box = await canvas.boundingBox();
  if (!box) throw new Error('Gameplay canvas has no bounding box.');
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down({ button: 'left' });
  await expect
    .poll(async () => (await enemies(page)).find((enemy) => enemy.id === ladeId))
    .toBeUndefined();
  await page.mouse.up({ button: 'left' });
  await expectNonBlankCanvas(page);
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
