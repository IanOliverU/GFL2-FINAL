import { chromium } from '@playwright/test';
import { mkdir, stat, writeFile } from 'node:fs/promises';

// M1.1 dual-camera controls evidence: one third-person clip, one top-down
// clip, one camera-switch clip, two directional screenshots, and a compact
// JSON report with inputs, bases, displacements, dots, and yaw/pitch deltas.
// All motion uses real keyboard/mouse input on a clean combat arena; the
// development-only overlay (?controlsDebug=1) makes each press visible.
const baseUrl = process.env.GAME_URL ?? 'http://127.0.0.1:4173/?e2e=1&controlsDebug=1';
const summaryPath = 'artifacts/performance/m11-controls.json';
await mkdir('artifacts/videos', { recursive: true });
await mkdir('artifacts/performance', { recursive: true });
await mkdir('artifacts/screenshots', { recursive: true });

const browser = await chromium.launch({ channel: 'chromium' });
const errors = [];
const clips = [];
const screenshots = [];

function track(page) {
  page.on('pageerror', (error) => errors.push(`page: ${error.message}`));
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(`console: ${message.text()}`);
  });
}

async function state(page) {
  return page.evaluate(() => {
    const diagnostics = window.__THREE_GAME_DIAGNOSTICS__;
    if (!diagnostics) throw new Error('Game diagnostics were not published.');
    return {
      mode: diagnostics.cameraMode,
      position: [...diagnostics.player.position],
      yaw: diagnostics.player.facingYaw,
      pitch: diagnostics.player.aimPitch,
      controls: window.__GFL2_CONTROLS_DEBUG__ ?? null,
    };
  });
}

function basis(yaw) {
  return { forward: [Math.sin(yaw), Math.cos(yaw)], right: [-Math.cos(yaw), Math.sin(yaw)] };
}

function dot(a, b) {
  return a[0] * b[0] + a[1] * b[1];
}

function displacement(from, to) {
  return [to.position[0] - from.position[0], to.position[2] - from.position[2]];
}

async function startRun(page) {
  await page.goto(baseUrl, { waitUntil: 'networkidle' });
  await page.getByRole('button', { name: /start run/i }).click();
  await page.waitForFunction(() => window.__GFL2_TOLOLO_DIAGNOSTICS__?.loadState === 'loaded');
  await page.evaluate(() => window.__THREE_GAME_TEST_HOOKS__?.setState('tololo-model'));
  await page.waitForTimeout(800);
}

async function holdKey(page, code, ms) {
  await page.keyboard.down(code);
  await page.waitForTimeout(ms);
  await page.keyboard.up(code);
}

async function recordClip(name, viewport, actions) {
  const outputPath = `artifacts/videos/${name}.webm`;
  const context = await browser.newContext({
    viewport,
    recordVideo: { dir: 'artifacts/videos', size: viewport },
  });
  const page = await context.newPage();
  track(page);
  const started = Date.now();
  const report = await actions(page);
  const video = page.video();
  await page.close();
  if (!video) throw new Error(`Playwright did not create a recording for ${name}.`);
  await video.saveAs(outputPath);
  await context.close();
  const { size } = await stat(outputPath);
  clips.push({
    name,
    outputPath,
    viewport: `${viewport.width}x${viewport.height}`,
    durationMs: Date.now() - started,
    sizeBytes: size,
    ...report,
  });
  console.log(`captured ${outputPath}`);
}

async function lockPointer(page) {
  const box = await page.locator('canvas').first().boundingBox();
  if (!box) throw new Error('Gameplay canvas has no bounding box.');
  await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
  await page.waitForTimeout(400);
  return page.evaluate(() => (document.pointerLockElement ? 'locked' : 'unlocked'));
}

async function nudge(page, dx, dy, method) {
  if (method === 'synthetic') {
    await page.evaluate(
      ({ x, y }) =>
        window.dispatchEvent(new MouseEvent('mousemove', { movementX: x, movementY: y })),
      { x: dx, y: dy },
    );
  } else {
    await page.mouse.move(640 + dx, 360 + dy, { steps: 4 });
  }
  await page.waitForTimeout(350);
}

const DESKTOP = { width: 1280, height: 720 };
const MOBILE = { width: 390, height: 844 };

// 1. Third-person: cardinals, one diagonal, mouse look both axes.
await recordClip('tololo-m11-third-person', DESKTOP, async (page) => {
  await startRun(page);
  const samples = [];
  const moves = [];
  for (const key of ['KeyW', 'KeyS', 'KeyA', 'KeyD']) {
    const before = await state(page);
    await holdKey(page, key, 900);
    const after = await state(page);
    const { forward, right } = basis(after.yaw);
    const delta = displacement(before, after);
    const length = Math.hypot(...delta) || 1;
    moves.push({
      key,
      mode: 'thirdPerson',
      displacement: delta.map((v) => Number(v.toFixed(3))),
      dotForward: Number(dot([delta[0] / length, delta[1] / length], forward).toFixed(3)),
      dotRight: Number(dot([delta[0] / length, delta[1] / length], right).toFixed(3)),
    });
    samples.push({ label: key, yaw: after.yaw });
  }
  const diagonalBefore = await state(page);
  await page.keyboard.down('KeyW');
  await page.keyboard.down('KeyD');
  await page.waitForTimeout(900);
  await page.keyboard.up('KeyD');
  await page.keyboard.up('KeyW');
  const diagonalAfter = await state(page);
  const diagonalDelta = displacement(diagonalBefore, diagonalAfter);
  moves.push({
    key: 'W+D',
    mode: 'thirdPerson',
    displacement: diagonalDelta.map((v) => Number(v.toFixed(3))),
    length: Number(Math.hypot(...diagonalDelta).toFixed(3)),
  });

  const lock = await lockPointer(page);
  const method = lock === 'locked' ? 'real' : 'synthetic';
  const lookBefore = await state(page);
  await nudge(page, 240, 0, method);
  const lookRight = await state(page);
  await nudge(page, 0, -160, method);
  const lookUp = await state(page);
  const mouse = {
    method,
    yawDeltaRight: Number((lookRight.yaw - lookBefore.yaw).toFixed(3)),
    pitchDeltaUp: Number((lookUp.pitch - lookRight.pitch).toFixed(3)),
  };
  if (!(mouse.yawDeltaRight < -0.3)) throw new Error('Mouse-right did not turn right.');
  if (!(mouse.pitchDeltaUp > 0.15)) throw new Error('Mouse-up did not look up.');
  return { samples, moves, mouse };
});

// 2. Top-down: screen-relative cardinals, diagonal, cursor-quadrant aiming.
await recordClip('tololo-m11-top-down', DESKTOP, async (page) => {
  await startRun(page);
  await page.keyboard.down('KeyV');
  await page.waitForTimeout(80);
  await page.keyboard.up('KeyV');
  await page.waitForTimeout(600);
  const moves = [];
  for (const key of ['KeyW', 'KeyS', 'KeyA', 'KeyD']) {
    const before = await state(page);
    await holdKey(page, key, 900);
    const after = await state(page);
    moves.push({
      key,
      mode: 'topDown',
      displacement: displacement(before, after).map((v) => Number(v.toFixed(3))),
    });
  }
  const box = await page.locator('canvas').first().boundingBox();
  if (!box) throw new Error('Gameplay canvas has no bounding box.');
  const aim = [];
  for (const [label, x, y] of [
    ['cursor-right', box.x + box.width * 0.8, box.y + box.height * 0.5],
    ['cursor-left', box.x + box.width * 0.2, box.y + box.height * 0.5],
    ['cursor-above', box.x + box.width * 0.5, box.y + box.height * 0.2],
    ['cursor-below', box.x + box.width * 0.5, box.y + box.height * 0.8],
  ]) {
    await page.mouse.move(x, y, { steps: 5 });
    await page.waitForTimeout(500);
    const current = await state(page);
    aim.push({ label, yaw: Number(current.yaw.toFixed(3)) });
  }
  return { moves, aim };
});

// 3. Camera-switch continuity while holding W through both transitions.
await recordClip('tololo-m11-switch', DESKTOP, async (page) => {
  await startRun(page);
  await page.keyboard.down('KeyW');
  await page.waitForTimeout(900);
  const Held = await state(page);
  await page.keyboard.down('KeyV');
  await page.waitForTimeout(80);
  await page.keyboard.up('KeyV');
  await page.waitForTimeout(900);
  const switched = await state(page);
  await page.keyboard.down('KeyV');
  await page.waitForTimeout(80);
  await page.keyboard.up('KeyV');
  await page.waitForTimeout(900);
  await page.keyboard.up('KeyW');
  const back = await state(page);
  const firstLeg = displacement(Held, switched);
  const secondLeg = displacement(switched, back);
  const continuity = {
    modes: [Held.mode, switched.mode, back.mode],
    firstLeg: firstLeg.map((v) => Number(v.toFixed(3))),
    secondLeg: secondLeg.map((v) => Number(v.toFixed(3))),
    keptAdvancing: firstLeg[1] > 0.3 && secondLeg[1] > 0.3,
    noReversal: firstLeg[1] > 0 && secondLeg[1] > 0,
  };
  if (!continuity.keptAdvancing || !continuity.noReversal) {
    throw new Error('Camera switch interrupted held movement.');
  }
  return { continuity };
});

// 4. Directional screenshots with the overlay visible.
async function screenshot(name, viewport, setup) {
  const context = await browser.newContext({ viewport });
  const page = await context.newPage();
  track(page);
  await startRun(page);
  await setup(page);
  const outputPath = `artifacts/screenshots/${name}.png`;
  await page.screenshot({ path: outputPath });
  const { size } = await stat(outputPath);
  screenshots.push({
    name,
    outputPath,
    viewport: `${viewport.width}x${viewport.height}`,
    sizeBytes: size,
  });
  console.log(`captured ${outputPath}`);
  await page.close();
  await context.close();
}

await screenshot('desktop-controls-third-person', DESKTOP, async (page) => {
  await page.keyboard.down('KeyD');
  await page.waitForTimeout(900);
  await page.keyboard.up('KeyD');
});

await screenshot('mobile-controls-top-down', MOBILE, async (page) => {
  await page.keyboard.down('KeyV');
  await page.waitForTimeout(80);
  await page.keyboard.up('KeyV');
  await page.waitForTimeout(600);
  await page.keyboard.down('KeyW');
  await page.waitForTimeout(900);
  await page.keyboard.up('KeyW');
});

await browser.close();

await writeFile(
  summaryPath,
  `${JSON.stringify({ baseUrl, summaryPath, errors, screenshots, clips }, null, 2)}\n`,
);
console.log(JSON.stringify({ summaryPath, clipCount: clips.length, errors }, null, 2));
if (errors.length > 0) process.exitCode = 1;
