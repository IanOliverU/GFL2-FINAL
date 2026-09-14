import { expect, test, type Page } from '@playwright/test';
import { thirdPersonCrosshairRay, type Vec3 } from '../../src/game';

type EnemyRole = 'melee' | 'flanker' | 'ranged' | 'heavy' | 'elite' | 'lade';
const pointerPositions = new WeakMap<Page, { x: number; y: number }>();

async function startControlledRun(page: Page): Promise<void> {
  await page.goto('/?e2e=1&controlsDebug=1&aimDebug=1', { waitUntil: 'networkidle' });
  await page.getByRole('button', { name: /start run/i }).click();
  await page.evaluate(() => window.__THREE_GAME_TEST_HOOKS__?.setState('tololo-model'));
  await page.waitForFunction(() => window.__GFL2_TOLOLO_DIAGNOSTICS__?.loadState === 'loaded');
  // Production preview must disable ?aimDebug=1 even in the e2e harness.
  await expect(page.getByTestId('aim-debug-legend')).toHaveCount(0);
}

async function lockPointer(
  page: Page,
): Promise<{ x: number; y: number; width: number; height: number }> {
  const canvas = page.locator('canvas').first();
  const box = await canvas.boundingBox();
  if (!box) throw new Error('Gameplay canvas has no bounding box.');
  await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2, { button: 'middle' });
  await page.waitForFunction(() => document.pointerLockElement !== null);
  pointerPositions.set(page, { x: box.x + box.width / 2, y: box.y + box.height / 2 });
  return box;
}

async function spawn(
  page: Page,
  role: EnemyRole,
  x: number,
  z: number,
  stationary = true,
): Promise<number> {
  const id = await page.evaluate(
    ({ enemyRole, px, pz, locked }) =>
      window.__THREE_GAME_TEST_HOOKS__?.spawnEnemy(enemyRole, px, pz, locked),
    { enemyRole: role, px: x, pz: z, locked: stationary },
  );
  if (typeof id !== 'number') throw new Error('Enemy spawn hook failed.');
  await page.waitForFunction(
    (enemyId) => window.__THREE_GAME_DIAGNOSTICS__?.enemies.some((enemy) => enemy.id === enemyId),
    id,
  );
  await page.waitForFunction(
    (enemyId) => window.__GFL2_ENEMY_SCREEN__?.[String(enemyId)] !== undefined,
    id,
  );
  return id;
}

async function projected(page: Page, id: number) {
  return page.evaluate((enemyId) => {
    const value = window.__GFL2_ENEMY_SCREEN__?.[String(enemyId)];
    if (!value) throw new Error(`No screen projection for enemy ${enemyId}.`);
    return value;
  }, id);
}

function rayMiss(player: Vec3, yaw: number, pitch: number, target: Vec3, aspect: number): number {
  const ray = thirdPersonCrosshairRay(player, yaw, pitch, aspect);
  const tx = target[0] - ray.origin[0];
  const ty = target[1] - ray.origin[1];
  const tz = target[2] - ray.origin[2];
  const along = tx * ray.direction[0] + ty * ray.direction[1] + tz * ray.direction[2];
  if (along <= 0) return Number.POSITIVE_INFINITY;
  return Math.hypot(
    ray.origin[0] + ray.direction[0] * along - target[0],
    ray.origin[1] + ray.direction[1] * along - target[1],
    ray.origin[2] + ray.direction[2] * along - target[2],
  );
}

function solveCrosshair(player: Vec3, target: Vec3, aspect: number, initialYaw: number) {
  let best = { yaw: initialYaw, pitch: 0 };
  let bestError = rayMiss(player, best.yaw, best.pitch, target, aspect);
  for (const amount of [0.08, 0.04, 0.02, 0.01, 0.005, 0.002, 0.001, 0.0004]) {
    for (let iteration = 0; iteration < 80; iteration += 1) {
      let improved = false;
      for (const yawStep of [-amount, 0, amount]) {
        for (const pitchStep of [-amount * 0.5, 0, amount * 0.5]) {
          const candidate = { yaw: best.yaw + yawStep, pitch: best.pitch + pitchStep };
          const error = rayMiss(player, candidate.yaw, candidate.pitch, target, aspect);
          if (error < bestError) {
            best = candidate;
            bestError = error;
            improved = true;
          }
        }
      }
      if (!improved) break;
    }
  }
  return best;
}

/** Trusted pointer-lock aim; no synthetic events or simulation aim calls. */
async function aimThirdPersonAt(
  page: Page,
  id: number,
  box: Awaited<ReturnType<typeof lockPointer>>,
) {
  const previous = pointerPositions.get(page) ?? {
    x: box.x + box.width / 2,
    y: box.y + box.height / 2,
  };
  let mouseX = previous.x;
  let mouseY = previous.y;
  for (let iteration = 0; iteration < 3; iteration += 1) {
    const state = await page.evaluate((enemyId) => {
      const diagnostics = window.__THREE_GAME_DIAGNOSTICS__;
      const controls = window.__GFL2_CONTROLS_DEBUG__;
      const enemy = diagnostics?.enemies.find((candidate) => candidate.id === enemyId);
      if (!diagnostics || !controls || !enemy) throw new Error('Aim diagnostics unavailable.');
      return {
        player: diagnostics.player.position as Vec3,
        target: [enemy.position[0], 1.05, enemy.position[2]] as Vec3,
        yaw: controls.aimYaw,
        pitch: controls.aimPitch,
      };
    }, id);
    const desired = solveCrosshair(state.player, state.target, box.width / box.height, state.yaw);
    const movementX = (state.yaw - desired.yaw) / 0.0022;
    const movementY = (state.pitch - desired.pitch) / 0.0018;
    const steps = Math.max(1, Math.ceil(Math.max(Math.abs(movementX), Math.abs(movementY)) / 120));
    await page.mouse.move(mouseX + movementX, mouseY + movementY, { steps });
    mouseX += movementX;
    mouseY += movementY;
    await page.waitForTimeout(350);
    const result = await projected(page, id);
    if (Math.hypot(result.x, result.y) < 0.055) {
      pointerPositions.set(page, { x: mouseX, y: mouseY });
      return { x: mouseX, y: mouseY };
    }
  }
  const result = await projected(page, id);
  expect(Math.hypot(result.x, result.y)).toBeLessThan(0.075);
  pointerPositions.set(page, { x: mouseX, y: mouseY });
  return { x: mouseX, y: mouseY };
}

async function fireOneAndRead(
  page: Page,
  id: number,
  pointer: { x: number; y: number },
  expectHit = true,
) {
  const before = await page.evaluate((enemyId) => {
    const diagnostics = window.__THREE_GAME_DIAGNOSTICS__;
    const enemy = diagnostics?.enemies.find((candidate) => candidate.id === enemyId);
    if (!diagnostics || !enemy) throw new Error(`Enemy ${enemyId} missing before shot.`);
    return {
      health: enemy.health,
      ammo: diagnostics.player.ammo,
      hits: diagnostics.simulation.projectileHits,
      blocked: diagnostics.simulation.projectilesBlocked,
      shots: diagnostics.simulation.shotsFired,
    };
  }, id);
  await page.mouse.click(pointer.x, pointer.y, { button: 'left' });
  await page.waitForFunction(
    (shots) => (window.__THREE_GAME_DIAGNOSTICS__?.simulation.shotsFired ?? 0) > shots,
    before.shots,
    { timeout: 1_000 },
  );
  await expect
    .poll(async () =>
      page.evaluate(() => {
        const diagnostics = window.__THREE_GAME_DIAGNOSTICS__;
        return {
          shots: diagnostics?.simulation.shotsFired ?? 0,
          active: diagnostics?.simulation.activeProjectiles ?? 0,
        };
      }),
    )
    .toEqual({ shots: before.shots + 1, active: 0 });
  const after = await page.evaluate((enemyId) => {
    const diagnostics = window.__THREE_GAME_DIAGNOSTICS__;
    const enemy = diagnostics?.enemies.find((candidate) => candidate.id === enemyId);
    if (!diagnostics || !enemy) throw new Error(`Enemy ${enemyId} missing after shot.`);
    return {
      health: enemy.health,
      ammo: diagnostics.player.ammo,
      hits: diagnostics.simulation.projectileHits,
      blocked: diagnostics.simulation.projectilesBlocked,
      shots: diagnostics.simulation.shotsFired,
    };
  }, id);
  expect(after.ammo).toBe(before.ammo - 1);
  if (expectHit) {
    if (after.health === before.health) {
      const screen = await projected(page, id);
      const detail = await page.evaluate(() => ({
        controls: window.__GFL2_CONTROLS_DEBUG__,
        simulation: window.__THREE_GAME_DIAGNOSTICS__?.simulation,
      }));
      throw new Error(
        `Crosshair shot missed: ${JSON.stringify({ before, after, screen, detail })}`,
      );
    }
    expect(after.health).toBeLessThan(before.health);
    expect(after.hits).toBe(before.hits + 1);
    await page.waitForTimeout(250);
    const stableHealth = await page.evaluate(
      (enemyId) =>
        window.__THREE_GAME_DIAGNOSTICS__?.enemies.find((enemy) => enemy.id === enemyId)?.health,
      id,
    );
    expect(stableHealth).toBe(after.health);
  } else {
    expect(after.health).toBe(before.health);
    expect(after.blocked).toBe(before.blocked + 1);
  }
  return { before, after };
}

async function resetAndSpawnAhead(
  page: Page,
  role: EnemyRole,
  distance: number,
  stationary = true,
) {
  await page.evaluate(() => window.__THREE_GAME_TEST_HOOKS__?.setState('tololo-model'));
  await page.waitForTimeout(100);
  const pedestal = await page.evaluate(
    () => window.__THREE_GAME_DIAGNOSTICS__?.objective.targetPosition,
  );
  if (!pedestal) throw new Error('Pedestal diagnostics unavailable.');
  const laneX = pedestal[0] >= 0 ? -20 : 20;
  await page.evaluate(({ x, z }) => window.__THREE_GAME_TEST_HOOKS__?.setPlayerPosition(x, z), {
    x: laneX,
    z: -5,
  });
  const player = await page.evaluate(() => window.__THREE_GAME_DIAGNOSTICS__?.player.position);
  if (!player) throw new Error('Player diagnostics unavailable.');
  return spawn(page, role, player[0], player[2] + distance, stationary);
}

test.describe('authoritative crosshair alignment', () => {
  test('real mouse: hip, ADS, top-down, Lade, movement, ranges, and cover', async ({
    page,
  }, testInfo) => {
    test.skip(testInfo.project.name !== 'desktop-chromium', 'Desktop comprehensive flow.');
    test.setTimeout(120_000);
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    page.on('console', (message) => {
      if (message.type() === 'error') errors.push(message.text());
    });
    await startControlledRun(page);
    const box = await lockPointer(page);

    for (const [role, distance, ads] of [
      ['ranged', 3, false],
      ['heavy', 16, false],
      ['heavy', 34, true],
    ] as const) {
      const id = await resetAndSpawnAhead(page, role, distance);
      if (ads) await page.mouse.down({ button: 'right' });
      const pointer = await aimThirdPersonAt(page, id, box);
      await fireOneAndRead(page, id, pointer);
      if (ads) await page.mouse.up({ button: 'right' });
    }

    await page.evaluate(() => window.__THREE_GAME_TEST_HOOKS__?.setState('tololo-model'));
    const movingPlayer = await page.evaluate(
      () => window.__THREE_GAME_DIAGNOSTICS__?.player.position,
    );
    if (!movingPlayer) throw new Error('Player diagnostics unavailable.');
    const movingId = await spawn(page, 'heavy', movingPlayer[0] + 4, movingPlayer[2] + 16, false);
    const movingPointer = await aimThirdPersonAt(page, movingId, box);
    await fireOneAndRead(page, movingId, movingPointer);

    const adsId = await resetAndSpawnAhead(page, 'heavy', 18);
    await page.mouse.down({ button: 'right' });
    const adsPointer = await aimThirdPersonAt(page, adsId, box);
    await fireOneAndRead(page, adsId, adsPointer);
    await page.mouse.up({ button: 'right' });

    const ladeId = await resetAndSpawnAhead(page, 'lade', 12);
    await page.mouse.down({ button: 'right' });
    const ladePointer = await aimThirdPersonAt(page, ladeId, box);
    await fireOneAndRead(page, ladeId, ladePointer);
    await page.mouse.up({ button: 'right' });

    await page.evaluate(() => window.__THREE_GAME_TEST_HOOKS__?.setState('tololo-model'));
    await page.keyboard.press('KeyV');
    await expect(page.locator('[data-camera-mode="topDown"]')).toBeVisible();
    const topPedestal = await page.evaluate(
      () => window.__THREE_GAME_DIAGNOSTICS__?.objective.targetPosition,
    );
    if (!topPedestal) throw new Error('Pedestal diagnostics unavailable.');
    const topLaneX = topPedestal[0] >= 0 ? -20 : 20;
    await page.evaluate(({ x, z }) => window.__THREE_GAME_TEST_HOOKS__?.setPlayerPosition(x, z), {
      x: topLaneX,
      z: -5,
    });
    const topId = await spawn(page, 'heavy', topLaneX, 7, true);
    await page.waitForTimeout(500);
    const topProjection = await projected(page, topId);
    const topPointer = {
      x: box.x + ((topProjection.x + 1) * box.width) / 2,
      y: box.y + ((1 - topProjection.y) * box.height) / 2,
    };
    await page.mouse.move(topPointer.x, topPointer.y, { steps: 5 });
    await page.waitForTimeout(180);
    await fireOneAndRead(page, topId, topPointer);

    await page.evaluate(() => window.__THREE_GAME_TEST_HOOKS__?.setState('tololo-model'));
    const pedestal = await page.evaluate(
      () => window.__THREE_GAME_DIAGNOSTICS__?.objective.targetPosition,
    );
    if (!pedestal) throw new Error('Pedestal diagnostics unavailable.');
    await page.evaluate(
      ([x, , z]) => window.__THREE_GAME_TEST_HOOKS__?.setPlayerPosition(x, z - 6),
      pedestal,
    );
    await expect(page.locator('[data-camera-mode="thirdPerson"]')).toBeVisible();
    const coverId = await spawn(page, 'heavy', pedestal[0], pedestal[2] + 5, true);
    await lockPointer(page);
    const coverPointer = await aimThirdPersonAt(page, coverId, box);
    await fireOneAndRead(page, coverId, coverPointer, false);

    expect(errors).toEqual([]);
  });

  test('narrow viewport essential real-mouse torso shot', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'mobile-chromium', 'Narrow viewport flow.');
    await startControlledRun(page);
    const box = await lockPointer(page);
    const id = await resetAndSpawnAhead(page, 'lade', 10);
    const pointer = await aimThirdPersonAt(page, id, box);
    await fireOneAndRead(page, id, pointer);
  });
});
