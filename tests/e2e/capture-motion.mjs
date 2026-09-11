import { chromium } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';

// M0.1 correction evidence: separate slow reviewable clips, one per behavior.
// Each clip gets its own recording context plus sampled Tololo diagnostics.
const baseUrl = process.env.GAME_URL ?? 'http://127.0.0.1:4173/?e2e=1';
const summaryPath = 'artifacts/performance/m01-motion-clips.json';
await mkdir('artifacts/videos', { recursive: true });
await mkdir('artifacts/performance', { recursive: true });

const browser = await chromium.launch({ channel: 'chromium' });
const errors = [];
const clips = [];

function track(page) {
  page.on('pageerror', (error) => errors.push(`page: ${error.message}`));
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(`console: ${message.text()}`);
  });
}

async function tololo(page) {
  return page.evaluate(() => window.__GFL2_TOLOLO_DIAGNOSTICS__ ?? null);
}

async function sample(page, label) {
  const diagnostics = await tololo(page);
  return {
    label,
    timeMs: await page.evaluate(() => performance.now()),
    animation: diagnostics?.animation ?? null,
    muzzleError: diagnostics?.muzzleError ?? null,
    gripErrors: diagnostics?.gripErrors ?? null,
  };
}

async function startRun(page, state = 'tololo-model') {
  await page.goto(baseUrl, { waitUntil: 'networkidle' });
  await page.evaluate(async (requested) => {
    const hooks = window.__THREE_GAME_TEST_HOOKS__;
    if (!hooks) throw new Error('Test hooks unavailable; use ?e2e=1.');
    await hooks.setState(requested);
  }, state);
  await page.waitForFunction(() => window.__GFL2_TOLOLO_DIAGNOSTICS__?.loadState === 'loaded');
  await page.waitForFunction(() => window.__GFL2_TOLOLO_DIAGNOSTICS__?.animation != null);
}

async function canvasCenter(page) {
  const box = await page.locator('canvas').first().boundingBox();
  if (!box) throw new Error('Gameplay canvas has no bounding box.');
  return box;
}

async function recordClip(name, viewport, actions) {
  const outputPath = `artifacts/videos/${name}.webm`;
  const context = await browser.newContext({
    viewport,
    recordVideo: { dir: 'artifacts/videos', size: viewport },
  });
  const page = await context.newPage();
  track(page);
  const samples = await actions(page);
  const video = page.video();
  await page.close();
  if (!video) throw new Error(`Playwright did not create a recording for ${name}.`);
  await video.saveAs(outputPath);
  await context.close();
  clips.push({ name, outputPath, viewport: `${viewport.width}x${viewport.height}`, samples });
  console.log(`captured ${outputPath} (${samples.length} samples)`);
}

const DESKTOP = { width: 1280, height: 720 };

// 1. Idle, walk, sprint — slow locomotion review.
await recordClip('tololo-m01-locomotion', DESKTOP, async (page) => {
  const samples = [];
  await startRun(page);
  await page.waitForTimeout(2000);
  samples.push(await sample(page, 'idle'));
  await page.keyboard.down('KeyW');
  await page.waitForTimeout(4000);
  samples.push(await sample(page, 'walk'));
  await page.keyboard.down('ShiftLeft');
  await page.waitForTimeout(4000);
  samples.push(await sample(page, 'sprint'));
  await page.keyboard.up('ShiftLeft');
  await page.keyboard.up('KeyW');
  await page.waitForTimeout(800);
  return samples;
});

// 2. Aim, recoil, firing.
await recordClip('tololo-m01-aim-fire', DESKTOP, async (page) => {
  const samples = [];
  await startRun(page);
  const box = await canvasCenter(page);
  await page.mouse.move(box.x + box.width * 0.5, box.y + box.height * 0.45);
  await page.waitForTimeout(1500);
  samples.push(await sample(page, 'aim-center'));
  await page.mouse.move(box.x + box.width * 0.68, box.y + box.height * 0.4);
  await page.waitForTimeout(1500);
  samples.push(await sample(page, 'aim-right'));
  await page.mouse.down({ button: 'left' });
  await page.waitForTimeout(1200);
  samples.push(await sample(page, 'firing'));
  await page.mouse.up({ button: 'left' });
  await page.waitForTimeout(1200);
  samples.push(await sample(page, 'recoil-settle'));
  return samples;
});

// 3. Reload and return to aim.
await recordClip('tololo-m01-reload', DESKTOP, async (page) => {
  const samples = [];
  await startRun(page);
  const box = await canvasCenter(page);
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down({ button: 'left' });
  await page.waitForTimeout(600);
  await page.mouse.up({ button: 'left' });
  samples.push(await sample(page, 'after-fire'));
  await page.keyboard.down('KeyR');
  await page.waitForTimeout(400);
  await page.keyboard.up('KeyR');
  await page.waitForTimeout(1200);
  samples.push(await sample(page, 'reload'));
  await page.waitForTimeout(1800);
  samples.push(await sample(page, 'return-to-aim'));
  return samples;
});

// 4. Dodge from multiple directions (cooldown is 1.2 s between dodges).
await recordClip('tololo-m01-dodge', DESKTOP, async (page) => {
  const samples = [];
  await startRun(page);
  for (const [key, label] of [
    ['KeyW', 'dodge-forward'],
    ['KeyA', 'dodge-left'],
    ['KeyD', 'dodge-right'],
  ]) {
    await page.keyboard.down(key);
    await page.waitForTimeout(300);
    await page.keyboard.down('Space');
    await page.waitForTimeout(120);
    await page.keyboard.up('Space');
    samples.push(await sample(page, label));
    await page.keyboard.up(key);
    await page.waitForTimeout(1600);
  }
  return samples;
});

// 5. Hit reaction, death, and retry.
await recordClip('tololo-m01-hit-death-retry', DESKTOP, async (page) => {
  const samples = [];
  await startRun(page);
  await page.waitForTimeout(1200);
  await page.evaluate(() => window.__THREE_GAME_TEST_HOOKS__?.damagePlayer(10));
  await page.waitForTimeout(700);
  samples.push(await sample(page, 'hit'));
  await page.evaluate(() => window.__THREE_GAME_TEST_HOOKS__?.damagePlayer(9_999));
  await page.waitForTimeout(1800);
  samples.push(await sample(page, 'death'));
  await page.getByRole('button', { name: 'Retry Grassland' }).click();
  await page.waitForTimeout(1500);
  samples.push(await sample(page, 'retry'));
  return samples;
});

// 6. Third-person and top-down camera continuity.
await recordClip('tololo-m01-camera-continuity', DESKTOP, async (page) => {
  const samples = [];
  await startRun(page);
  await page.keyboard.down('KeyW');
  await page.waitForTimeout(2500);
  samples.push(await sample(page, 'third-person-walk'));
  await page.keyboard.up('KeyW');
  await page.keyboard.down('KeyV');
  await page.waitForTimeout(80);
  await page.keyboard.up('KeyV');
  await page.waitForTimeout(2000);
  samples.push(await sample(page, 'top-down'));
  await page.keyboard.down('KeyW');
  await page.waitForTimeout(2500);
  samples.push(await sample(page, 'top-down-walk'));
  await page.keyboard.up('KeyW');
  return samples;
});

// 7. Mobile third-person framing (narrow portrait viewport).
await recordClip('tololo-m01-mobile-framing', { width: 390, height: 844 }, async (page) => {
  const samples = [];
  await startRun(page);
  await page.waitForTimeout(2000);
  const screen = await page.evaluate(() => window.__GFL2_PLAYER_SCREEN__ ?? null);
  samples.push({ ...(await sample(page, 'mobile-idle')), screen });
  await page.keyboard.down('KeyW');
  await page.waitForTimeout(2500);
  const moving = await page.evaluate(() => window.__GFL2_PLAYER_SCREEN__ ?? null);
  samples.push({ ...(await sample(page, 'mobile-walk')), screen: moving });
  await page.keyboard.up('KeyW');
  return samples;
});

// 8. Pause freeze with before/after phase comparison.
await recordClip('tololo-m01-pause-freeze', DESKTOP, async (page) => {
  const samples = [];
  await startRun(page);
  await page.keyboard.down('KeyW');
  await page.waitForTimeout(2000);
  await page.keyboard.up('KeyW');
  await page.evaluate(() => window.__THREE_GAME_TEST_HOOKS__?.setPausedForScreenshot(true));
  await page.waitForTimeout(500);
  const before = await page.evaluate(
    () => window.__GFL2_TOLOLO_DIAGNOSTICS__?.animation?.phase ?? null,
  );
  await page.waitForTimeout(2500);
  samples.push(await sample(page, 'paused'));
  const after = await page.evaluate(
    () => window.__GFL2_TOLOLO_DIAGNOSTICS__?.animation?.phase ?? null,
  );
  await page.evaluate(() => window.__THREE_GAME_TEST_HOOKS__?.setPausedForScreenshot(false));
  await page.waitForTimeout(800);
  samples.push(await sample(page, 'resumed'));
  samples.push({ label: 'pause-check', before, after, frozen: before === after });
  return samples;
});

await browser.close();

await writeFile(
  summaryPath,
  `${JSON.stringify({ baseUrl, summaryPath, errors, clips }, null, 2)}\n`,
);
console.log(JSON.stringify({ summaryPath, clipCount: clips.length, errors }, null, 2));
if (errors.length > 0) process.exitCode = 1;
