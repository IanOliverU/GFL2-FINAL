import { chromium } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';

const url = process.env.GAME_URL ?? 'http://127.0.0.1:4173/?e2e=1';
const outputPath = process.env.AIM_REPRO_OUTPUT ?? 'artifacts/performance/aim-defect-baseline.json';
await mkdir('artifacts/performance', { recursive: true });

const browser = await chromium.launch({ channel: 'chromium' });
const context = await browser.newContext({ viewport: { width: 1280, height: 720 } });
const page = await context.newPage();
const errors = [];
page.on('pageerror', (error) => errors.push(`page: ${error.message}`));
page.on('console', (message) => {
  if (message.type() === 'error') errors.push(`console: ${message.text()}`);
});

await page.goto(url, { waitUntil: 'networkidle' });
await page.getByRole('button', { name: /start run/i }).click();
await page.evaluate(() => window.__THREE_GAME_TEST_HOOKS__?.setState('tololo-model'));
await page.waitForFunction(() => window.__GFL2_TOLOLO_DIAGNOSTICS__?.loadState === 'loaded');

const canvas = page.locator('canvas').first();
const box = await canvas.boundingBox();
if (!box) throw new Error('Gameplay canvas has no bounding box.');
const anchor = { x: box.x + box.width / 2, y: box.y + box.height / 2 };
await page.mouse.click(anchor.x, anchor.y);
await page.waitForFunction(() => document.pointerLockElement !== null);

// Trusted pointer input: converge the CameraRig yaw/pitch on the analytically
// solved crosshair orientation for a humanoid head at [0, 1.7, 20].
const desired = { yaw: 0.0875, pitch: 0.0963 };
let mouseX = anchor.x;
let mouseY = anchor.y;
for (let iteration = 0; iteration < 8; iteration += 1) {
  const current = await page.evaluate(() => {
    const player = window.__THREE_GAME_DIAGNOSTICS__?.player;
    if (!player) throw new Error('Player diagnostics unavailable.');
    return { yaw: player.facingYaw, pitch: player.aimPitch };
  });
  const movementX = Math.max(-180, Math.min(180, (current.yaw - desired.yaw) / 0.0022));
  const movementY = Math.max(-180, Math.min(180, (current.pitch - desired.pitch) / 0.0018));
  mouseX = Math.max(box.x + 2, Math.min(box.x + box.width - 2, mouseX + movementX));
  mouseY = Math.max(box.y + 2, Math.min(box.y + box.height - 2, mouseY + movementY));
  await page.mouse.move(mouseX, mouseY, { steps: 2 });
  await page.waitForTimeout(50);
}

const enemyId = await page.evaluate(() =>
  window.__THREE_GAME_TEST_HOOKS__?.spawnEnemy('melee', 0, 20),
);
if (typeof enemyId !== 'number') throw new Error('Enemy spawn hook failed.');
await page.waitForFunction(
  (id) => window.__THREE_GAME_DIAGNOSTICS__?.enemies.some((enemy) => enemy.id === id),
  enemyId,
);
const before = await page.evaluate((id) => {
  const diagnostics = window.__THREE_GAME_DIAGNOSTICS__;
  const enemy = diagnostics?.enemies.find((candidate) => candidate.id === id);
  if (!enemy || !diagnostics) throw new Error('Spawned enemy unavailable.');
  return {
    enemyPosition: [...enemy.position],
    health: enemy.health,
    yaw: diagnostics.player.facingYaw,
    pitch: diagnostics.player.aimPitch,
    ammo: diagnostics.player.ammo,
  };
}, enemyId);

await page.mouse.down({ button: 'left' });
await page.waitForTimeout(35);
await page.mouse.up({ button: 'left' });
await page.waitForTimeout(900);

const after = await page.evaluate((id) => {
  const diagnostics = window.__THREE_GAME_DIAGNOSTICS__;
  const enemy = diagnostics?.enemies.find((candidate) => candidate.id === id);
  if (!diagnostics) throw new Error('Diagnostics unavailable after firing.');
  return {
    enemyPosition: enemy ? [...enemy.position] : null,
    health: enemy?.health ?? 0,
    yaw: diagnostics.player.facingYaw,
    pitch: diagnostics.player.aimPitch,
    ammo: diagnostics.player.ammo,
    projectiles: diagnostics.simulation.activeProjectiles,
  };
}, enemyId);

const report = {
  baselineCommit: '90df58d',
  input: {
    pointerLocked: await page.evaluate(() => document.pointerLockElement !== null),
    trustedPlaywrightMouse: true,
    fire: 'page.mouse.down/up',
  },
  intendedTarget: { position: [0, 1.7, 20], bodyPart: 'head' },
  before,
  after,
  defectReproduced: after.ammo === before.ammo - 1 && after.health === before.health,
  errors,
};
await writeFile(outputPath, `${JSON.stringify(report, null, 2)}\n`);
await browser.close();

if (!report.defectReproduced) {
  throw new Error(`Defect not reproduced: ${JSON.stringify(report)}`);
}
console.log(JSON.stringify(report, null, 2));
