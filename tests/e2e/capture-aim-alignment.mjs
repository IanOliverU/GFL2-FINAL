import { chromium } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';

const url = process.env.GAME_URL ?? 'http://127.0.0.1:5173/?e2e=1&controlsDebug=1&aimDebug=1';
await mkdir('artifacts/videos', { recursive: true });
await mkdir('artifacts/screenshots', { recursive: true });
await mkdir('artifacts/performance', { recursive: true });

const browser = await chromium.launch({ channel: 'chromium' });
const errors = [];
const resourceErrors = [];
const shots = [];
const pointerPositions = new WeakMap();

function track(page) {
  page.on('pageerror', (error) => errors.push(`page: ${error.message}`));
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(`console: ${message.text()}`);
  });
  page.on('requestfailed', (request) =>
    resourceErrors.push(
      `${request.method()} ${request.url()}: ${request.failure()?.errorText ?? 'failed'}`,
    ),
  );
  page.on('response', (response) => {
    if (response.status() >= 400) resourceErrors.push(`${response.status()} ${response.url()}`);
  });
}

function crosshairRay(player, yaw, pitch, aspect) {
  const portrait = Math.max(0, Math.min(1, (0.9 - aspect) / 0.4));
  const ox = 0;
  const oy = 2.8 + (2.1 - 2.8) * portrait;
  const oz = -6.6 + (-4.6 + 6.6) * portrait;
  const targetY = player[1] + 1.25 + (1 - 1.25) * portrait;
  const origin = [
    player[0] + Math.cos(yaw) * ox + Math.sin(yaw) * oz,
    targetY + oy,
    player[2] - Math.sin(yaw) * ox + Math.cos(yaw) * oz,
  ];
  const look = [
    player[0] + Math.sin(yaw) * 12,
    targetY + Math.sin(pitch) * 12,
    player[2] + Math.cos(yaw) * 12,
  ];
  const length = Math.hypot(look[0] - origin[0], look[1] - origin[1], look[2] - origin[2]);
  return { origin, direction: look.map((value, index) => (value - origin[index]) / length) };
}

function rayMiss(player, yaw, pitch, target, aspect) {
  const ray = crosshairRay(player, yaw, pitch, aspect);
  const relative = target.map((value, index) => value - ray.origin[index]);
  const along = relative.reduce((sum, value, index) => sum + value * ray.direction[index], 0);
  if (along <= 0) return Number.POSITIVE_INFINITY;
  return Math.hypot(
    ...target.map((value, index) => ray.origin[index] + ray.direction[index] * along - value),
  );
}

function solveCrosshair(player, target, aspect, initialYaw) {
  let best = { yaw: initialYaw, pitch: 0 };
  let error = rayMiss(player, best.yaw, best.pitch, target, aspect);
  for (const amount of [0.08, 0.04, 0.02, 0.01, 0.005, 0.002, 0.001, 0.0004]) {
    for (let iteration = 0; iteration < 80; iteration += 1) {
      let improved = false;
      for (const yawStep of [-amount, 0, amount]) {
        for (const pitchStep of [-amount * 0.5, 0, amount * 0.5]) {
          const candidate = { yaw: best.yaw + yawStep, pitch: best.pitch + pitchStep };
          const next = rayMiss(player, candidate.yaw, candidate.pitch, target, aspect);
          if (next < error) {
            best = candidate;
            error = next;
            improved = true;
          }
        }
      }
      if (!improved) break;
    }
  }
  return best;
}

async function start(page) {
  await page.goto(url, { waitUntil: 'networkidle' });
  await page.getByRole('button', { name: /start run/i }).click();
  await page.evaluate(() => window.__THREE_GAME_TEST_HOOKS__?.setState('tololo-model'));
  await page.waitForFunction(() => window.__GFL2_TOLOLO_DIAGNOSTICS__?.loadState === 'loaded');
  await page.waitForFunction(() => document.querySelector('[data-testid="aim-debug-legend"]'));
}

async function lock(page) {
  const canvas = page.locator('canvas').first();
  const box = await canvas.boundingBox();
  if (!box) throw new Error('Gameplay canvas missing.');
  await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2, { button: 'middle' });
  await page.waitForFunction(() => document.pointerLockElement !== null);
  pointerPositions.set(page, { x: box.x + box.width / 2, y: box.y + box.height / 2 });
  return box;
}

async function spawn(page, role, x, z, stationary = true) {
  const id = await page.evaluate(
    ({ role: enemyRole, x: px, z: pz, stationary: locked }) =>
      window.__THREE_GAME_TEST_HOOKS__?.spawnEnemy(enemyRole, px, pz, locked),
    { role, x, z, stationary },
  );
  await page.waitForFunction(
    (enemyId) => window.__GFL2_ENEMY_SCREEN__?.[String(enemyId)] !== undefined,
    id,
  );
  return id;
}

async function placeLane(page, role, distance, stationary = true) {
  const state = await page.evaluate(() => {
    const diagnostics = window.__THREE_GAME_DIAGNOSTICS__;
    return { pedestal: diagnostics.objective.targetPosition, player: diagnostics.player.position };
  });
  const x = state.pedestal[0] >= 0 ? -20 : 20;
  const z = -5;
  await page.evaluate(
    ({ x: px, z: pz }) => window.__THREE_GAME_TEST_HOOKS__?.setPlayerPosition(px, pz),
    { x, z },
  );
  return spawn(page, role, x, z + distance, stationary);
}

async function aimThird(page, id, box) {
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
      const enemy = diagnostics.enemies.find((candidate) => candidate.id === enemyId);
      return {
        player: diagnostics.player.position,
        target: [enemy.position[0], 1.05, enemy.position[2]],
        yaw: controls.aimYaw,
        pitch: controls.aimPitch,
      };
    }, id);
    const desired = solveCrosshair(state.player, state.target, box.width / box.height, state.yaw);
    const movementX = (state.yaw - desired.yaw) / 0.0022;
    const movementY = (state.pitch - desired.pitch) / 0.0018;
    await page.mouse.move(mouseX + movementX, mouseY + movementY, {
      steps: Math.max(1, Math.ceil(Math.max(Math.abs(movementX), Math.abs(movementY)) / 120)),
    });
    mouseX += movementX;
    mouseY += movementY;
    await page.waitForTimeout(350);
    const screen = await page.evaluate(
      (enemyId) => window.__GFL2_ENEMY_SCREEN__?.[String(enemyId)],
      id,
    );
    if (screen && Math.hypot(screen.x, screen.y) < 0.06) {
      pointerPositions.set(page, { x: mouseX, y: mouseY });
      return { x: mouseX, y: mouseY };
    }
  }
  throw new Error(`Unable to center enemy ${id} with trusted mouse input.`);
}

async function fire(page, id, pointer, cameraMode, distance, expected = 'damage') {
  const before = await page.evaluate((enemyId) => {
    const diagnostics = window.__THREE_GAME_DIAGNOSTICS__;
    return {
      health: diagnostics.enemies.find((enemy) => enemy.id === enemyId)?.health ?? 0,
      shots: diagnostics.simulation.shotsFired,
      hits: diagnostics.simulation.projectileHits,
      blocked: diagnostics.simulation.projectilesBlocked,
    };
  }, id);
  await page.mouse.click(pointer.x, pointer.y, { button: 'left' });
  await page.waitForFunction(
    (count) =>
      window.__THREE_GAME_DIAGNOSTICS__?.simulation.shotsFired === count + 1 &&
      window.__THREE_GAME_DIAGNOSTICS__?.simulation.activeProjectiles === 0,
    before.shots,
  );
  const after = await page.evaluate((enemyId) => {
    const diagnostics = window.__THREE_GAME_DIAGNOSTICS__;
    const aim = diagnostics.aim;
    return {
      health: diagnostics.enemies.find((enemy) => enemy.id === enemyId)?.health ?? 0,
      hits: diagnostics.simulation.projectileHits,
      blocked: diagnostics.simulation.projectilesBlocked,
      projectileId: aim?.projectileSegment?.projectileId ?? null,
      targetEnemyId: aim?.selectedCollision?.targetEnemyId ?? null,
    };
  }, id);
  shots.push({
    cameraMode,
    distance,
    expected,
    enemyId: id,
    healthBefore: before.health,
    healthAfter: after.health,
    confirmedCollision: after.hits > before.hits,
    worldBlocked: after.blocked > before.blocked,
    projectileCleaned: true,
    projectileId: after.projectileId,
    targetEnemyId: after.targetEnemyId,
  });
  if (expected === 'damage' && !(after.health < before.health))
    throw new Error('Controlled hit missed.');
  if (expected === 'blocked' && after.health !== before.health)
    throw new Error('Cover did not block.');
}

async function record(name, action) {
  const context = await browser.newContext({
    viewport: { width: 1280, height: 720 },
    recordVideo: { dir: 'artifacts/videos', size: { width: 1280, height: 720 } },
  });
  const page = await context.newPage();
  track(page);
  await start(page);
  await action(page);
  await page.waitForTimeout(700);
  const video = page.video();
  await context.close();
  await video?.saveAs(`artifacts/videos/${name}.webm`);
}

await record('aim-alignment-third-person', async (page) => {
  const box = await lock(page);
  const id = await placeLane(page, 'heavy', 16);
  const pointer = await aimThird(page, id, box);
  await fire(page, id, pointer, 'thirdPerson', 16);
  await page.waitForTimeout(300);
  await page.screenshot({ path: 'artifacts/screenshots/aim-alignment-debug.png' });

  await page.evaluate(() => window.__THREE_GAME_TEST_HOOKS__?.setState('tololo-model'));
  const pedestal = await page.evaluate(
    () => window.__THREE_GAME_DIAGNOSTICS__.objective.targetPosition,
  );
  await page.evaluate(
    ([x, , z]) => window.__THREE_GAME_TEST_HOOKS__?.setPlayerPosition(x, z - 6),
    pedestal,
  );
  const coverId = await spawn(page, 'heavy', pedestal[0], pedestal[2] + 5);
  const coverPointer = await aimThird(page, coverId, box);
  await fire(page, coverId, coverPointer, 'thirdPerson', 11, 'blocked');
});

await record('aim-alignment-ads', async (page) => {
  const box = await lock(page);
  const id = await placeLane(page, 'lade', 18);
  await page.mouse.down({ button: 'right' });
  const pointer = await aimThird(page, id, box);
  await fire(page, id, pointer, 'thirdPersonAds', 18);
  await page.mouse.up({ button: 'right' });
});

await record('aim-alignment-top-down', async (page) => {
  const box = await lock(page);
  await page.keyboard.press('KeyV');
  await page.waitForFunction(() => window.__THREE_GAME_DIAGNOSTICS__?.cameraMode === 'topDown');
  const pedestal = await page.evaluate(
    () => window.__THREE_GAME_DIAGNOSTICS__.objective.targetPosition,
  );
  const laneX = pedestal[0] >= 0 ? -20 : 20;
  await page.evaluate(({ x, z }) => window.__THREE_GAME_TEST_HOOKS__?.setPlayerPosition(x, z), {
    x: laneX,
    z: -5,
  });
  const id = await spawn(page, 'heavy', laneX, 7);
  await page.waitForTimeout(500);
  const screen = await page.evaluate(
    (enemyId) => window.__GFL2_ENEMY_SCREEN__?.[String(enemyId)],
    id,
  );
  const pointer = {
    x: box.x + ((screen.x + 1) * box.width) / 2,
    y: box.y + ((1 - screen.y) * box.height) / 2,
  };
  await page.mouse.move(pointer.x, pointer.y, { steps: 5 });
  await page.waitForTimeout(250);
  await fire(page, id, pointer, 'topDown', 12);
});

const report = {
  shotCount: shots.length,
  confirmedCollisionCount: shots.filter((shot) => shot.confirmedCollision).length,
  damageEventCount: shots.filter((shot) => shot.healthAfter < shot.healthBefore).length,
  missCount: shots.filter((shot) => !shot.confirmedCollision && !shot.worldBlocked).length,
  worldBlockedCount: shots.filter((shot) => shot.worldBlocked).length,
  projectileCleanupCount: shots.filter((shot) => shot.projectileCleaned).length,
  shots,
  consoleErrors: errors,
  resourceErrors,
};
await writeFile(
  'artifacts/performance/aim-alignment-report.json',
  `${JSON.stringify(report, null, 2)}\n`,
);
await browser.close();

if (errors.length > 0 || resourceErrors.length > 0) {
  throw new Error(`Capture errors: ${JSON.stringify({ errors, resourceErrors })}`);
}
console.log(JSON.stringify(report, null, 2));
