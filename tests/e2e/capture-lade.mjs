import { chromium } from '@playwright/test';
import { mkdir, stat, writeFile } from 'node:fs/promises';

// M2 Felagi Lade vertical-slice evidence: one proxy-inspection clip, one
// third-person encounter, one top-down encounter, one skill-interaction clip,
// four screenshots, and a compact JSON diagnostics report. All encounters use
// real input against hook-spawned Lades; references stay local-only.
const debugUrl = process.env.GAME_URL ?? 'http://127.0.0.1:4173/?e2e=1&ladeDebug=1';
const baseUrl = process.env.GAME_URL ?? 'http://127.0.0.1:4173/?e2e=1';
const summaryPath = 'artifacts/performance/m2-lade.json';
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
      player: {
        position: [...diagnostics.player.position],
        health: diagnostics.player.health,
        exp: diagnostics.player.exp,
        sardis: diagnostics.player.sardis,
      },
      enemies: diagnostics.enemies.map((enemy) => ({
        id: enemy.id,
        role: enemy.role,
        position: [...enemy.position],
        health: Math.round(enemy.health * 10) / 10,
        telegraph: Math.round(enemy.telegraph * 100) / 100,
        attackKind: enemy.attackKind,
        stagger: Math.round(enemy.stagger * 100) / 100,
      })),
      counters: {
        spawned: diagnostics.simulation.enemiesSpawned,
        defeated: diagnostics.simulation.enemiesDefeated,
        disposed: diagnostics.simulation.enemiesDisposed,
      },
      renderer: {
        calls: diagnostics.renderer.calls,
        triangles: diagnostics.renderer.triangles,
        geometries: diagnostics.renderer.geometries,
        textures: diagnostics.renderer.textures,
        dpr: diagnostics.renderer.dpr,
      },
    };
  });
}

async function startRun(page, url) {
  await page.goto(url, { waitUntil: 'networkidle' });
  await page.getByRole('button', { name: /start run/i }).click();
  await page.evaluate(() => window.__THREE_GAME_TEST_HOOKS__?.setState('tololo-model'));
  await page.waitForFunction(() => window.__GFL2_TOLOLO_DIAGNOSTICS__?.loadState === 'loaded');
  await page.waitForTimeout(800);
}

/** Real Start-run flow without test-state shortcuts, for preview evidence. */
async function startRealRun(page, url) {
  await page.goto(url, { waitUntil: 'networkidle' });
  await page.getByRole('button', { name: /start run/i }).click();
  await page.waitForFunction(() => window.__GFL2_TOLOLO_DIAGNOSTICS__?.loadState === 'loaded');
  await page.waitForTimeout(800);
}

async function spawn(page, x, z) {
  return page.evaluate(
    ({ px, pz }) => window.__THREE_GAME_TEST_HOOKS__?.spawnEnemy('lade', px, pz),
    { px: x, pz: z },
  );
}

async function faceEnemy(page, id) {
  await page.evaluate((eid) => {
    const diagnostics = window.__THREE_GAME_DIAGNOSTICS__;
    if (!diagnostics) throw new Error('Game diagnostics were not published.');
    const enemy = diagnostics.enemies.find((candidate) => candidate.id === eid);
    if (!enemy) throw new Error(`Lade ${eid} is missing from diagnostics.`);
    const [px, , pz] = diagnostics.player.position;
    const desired = Math.atan2(enemy.position[0] - px, enemy.position[2] - pz);
    const delta = diagnostics.player.facingYaw - desired;
    const totalX = delta / 0.0022;
    const totalY = diagnostics.player.aimPitch / 0.0018;
    const steps = Math.max(1, Math.ceil(Math.max(Math.abs(totalX), Math.abs(totalY)) / 200));
    for (let step = 0; step < steps; step += 1) {
      window.dispatchEvent(
        new MouseEvent('mousemove', { movementX: totalX / steps, movementY: totalY / steps }),
      );
    }
  }, id);
  await page.waitForTimeout(400);
}

async function lockPointer(page) {
  await page
    .locator('canvas')
    .first()
    .click({ position: { x: 64, y: 64 } });
  await page.waitForTimeout(400);
}

async function recordClip(name, viewport, url, actions) {
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

const DESKTOP = { width: 1280, height: 720 };

// 1. Proxy inspection with debug rings and turntable (front to side).
await recordClip('lade-m2-inspection', DESKTOP, debugUrl, async (page) => {
  await startRun(page, debugUrl);
  const baseline = await state(page);
  await spawn(page, 0, 6);
  await page.evaluate(() => window.__THREE_GAME_TEST_HOOKS__?.setPausedForScreenshot(true));
  await page.waitForTimeout(1200);
  const threeQuarter = await state(page);
  await page.waitForTimeout(1400);
  const side = await state(page);
  await page.waitForTimeout(2600);
  const front = await state(page);
  await page.waitForTimeout(1800);
  return { baseline: baseline.renderer, threeQuarter, side, front };
});

// 2. Third-person encounter: approach, telegraph, hit, dodge, AK kill.
await recordClip('lade-m2-third-person', DESKTOP, baseUrl, async (page) => {
  await startRun(page, baseUrl);
  const id = await spawn(page, 0, 9);
  const samples = [];
  await page.waitForFunction(
    (eid) =>
      window.__THREE_GAME_DIAGNOSTICS__?.enemies.some(
        (e) => e.id === eid && e.attackKind === 'ladeSlash',
      ),
    id,
  );
  samples.push({ label: 'telegraph', ...(await state(page)) });
  await page.waitForFunction(
    () => window.__THREE_GAME_DIAGNOSTICS__?.player.health < 100,
    undefined,
    {
      timeout: 15000,
    },
  );
  samples.push({ label: 'hit-taken', ...(await state(page)) });
  await page.waitForFunction((eid) => {
    const e = window.__THREE_GAME_DIAGNOSTICS__?.enemies.find((x) => x.id === eid);
    return e && e.attackKind === 'ladeSlash' && e.telegraph < 0.25 && e.telegraph > 0;
  }, id);
  await page.keyboard.down('KeyD');
  await page.keyboard.down('Space');
  await page.waitForTimeout(120);
  await page.keyboard.up('Space');
  await page.keyboard.up('KeyD');
  await page.waitForTimeout(900);
  samples.push({ label: 'dodged', ...(await state(page)) });
  await lockPointer(page);
  await faceEnemy(page, id);
  const box = await page.locator('canvas').first().boundingBox();
  if (!box) throw new Error('Gameplay canvas has no bounding box.');
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await faceEnemy(page, id);
  await page.mouse.down({ button: 'left' });
  await page.keyboard.down('KeyS');
  await page.waitForFunction(
    (eid) => !window.__THREE_GAME_DIAGNOSTICS__?.enemies.some((x) => x.id === eid),
    id,
    { timeout: 30000 },
  );
  await page.keyboard.up('KeyS');
  await page.mouse.up({ button: 'left' });
  samples.push({ label: 'killed', ...(await state(page)) });
  return { samples };
});

// 3. Top-down encounter with camera parity.
await recordClip('lade-m2-top-down', DESKTOP, baseUrl, async (page) => {
  await startRun(page, baseUrl);
  await page.keyboard.down('KeyV');
  await page.waitForTimeout(80);
  await page.keyboard.up('KeyV');
  await page.waitForTimeout(500);
  const id = await spawn(page, 0, 9);
  await page.waitForFunction(
    (eid) =>
      window.__THREE_GAME_DIAGNOSTICS__?.enemies.some(
        (e) => e.id === eid && e.attackKind === 'ladeSlash',
      ),
    id,
  );
  const telegraph = await state(page);
  // Aim above center: in top-down the cursor maps to the ground target and
  // screen-up is +Z, so the approaching Lade walks into the stream.
  const box = await page.locator('canvas').first().boundingBox();
  if (!box) throw new Error('Gameplay canvas has no bounding box.');
  await page.mouse.move(box.x + box.width / 2, box.y + box.height * 0.3, { steps: 5 });
  await page.waitForTimeout(400);
  await page.mouse.down({ button: 'left' });
  await page.mouse.down({ button: 'left' });
  await page.waitForFunction(
    (eid) => !window.__THREE_GAME_DIAGNOSTICS__?.enemies.some((x) => x.id === eid),
    id,
    { timeout: 30000 },
  );
  await page.mouse.up({ button: 'left' });
  const killed = await state(page);
  return { telegraph, killed };
});

// 4. Tololo-skill interaction: stagger, mark, starfall.
await recordClip('lade-m2-skills', DESKTOP, baseUrl, async (page) => {
  await startRun(page, baseUrl);
  const grant = (amount) =>
    page.evaluate((v) => window.__THREE_GAME_TEST_HOOKS__?.grantExperience(v), amount);
  const card = async (name) => {
    await page.getByRole('heading', { name: /field adaptation/i }).waitFor();
    await page.waitForTimeout(400);
    await page.getByRole('button', { name }).click();
    await page.waitForTimeout(300);
  };
  await grant(60);
  await card(/Hydro Barrage/);
  await grant(120);
  await card(/Tidal Step/);
  await grant(180);
  await card(/Starfall Recursion/);
  await spawn(page, 0, 4);
  const press = async (code) => {
    await page.keyboard.down(code);
    await page.waitForTimeout(90);
    await page.keyboard.up(code);
  };
  await press('KeyE');
  await page.waitForTimeout(300);
  const staggered = await state(page);
  await press('KeyQ');
  await page.waitForTimeout(700);
  const marked = await state(page);
  await press('KeyF');
  await page.waitForTimeout(700);
  const starfall = await state(page);
  return { staggered, marked, starfall };
});

async function screenshot(name, viewport, url, setup) {
  const context = await browser.newContext({ viewport });
  const page = await context.newPage();
  track(page);
  await startRun(page, url);
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

await screenshot('lade-front-inspection', DESKTOP, debugUrl, async (page) => {
  await spawn(page, 0, 6);
  await page.evaluate(() => window.__THREE_GAME_TEST_HOOKS__?.setPausedForScreenshot(true));
  await page.waitForTimeout(5200);
});

await screenshot('lade-side-inspection', DESKTOP, debugUrl, async (page) => {
  await spawn(page, 0, 6);
  await page.evaluate(() => window.__THREE_GAME_TEST_HOOKS__?.setPausedForScreenshot(true));
  await page.waitForTimeout(2600);
});

await screenshot('lade-third-person-combat', DESKTOP, baseUrl, async (page) => {
  const id = await spawn(page, 0, 8);
  await page.waitForFunction(
    (eid) =>
      window.__THREE_GAME_DIAGNOSTICS__?.enemies.some(
        (e) => e.id === eid && e.attackKind === 'ladeSlash',
      ),
    id,
  );
  await page.waitForTimeout(300);
});

await screenshot('lade-top-down-combat', DESKTOP, baseUrl, async (page) => {
  await page.keyboard.down('KeyV');
  await page.waitForTimeout(80);
  await page.keyboard.up('KeyV');
  await page.waitForTimeout(500);
  await spawn(page, 0, 8);
  await page.waitForTimeout(2500);
});

// Preview banner over a real director-spawned encounter (no test-state
// shortcuts, no hook spawns): separate flow because startRun disables the
// normal spawner for deterministic hook encounters.
{
  const context = await browser.newContext({ viewport: DESKTOP });
  const page = await context.newPage();
  track(page);
  await startRealRun(page, `${baseUrl}&enemyPreview=lade`);
  await page.waitForFunction(
    () => window.__THREE_GAME_DIAGNOSTICS__?.enemies.some((e) => e.role === 'lade'),
    undefined,
    { timeout: 15000 },
  );
  // Face the director-spawned Lade through the real mouse handler so the
  // banner and the encounter share one frame.
  const previewId = await page.evaluate(
    () => window.__THREE_GAME_DIAGNOSTICS__.enemies.find((e) => e.role === 'lade').id,
  );
  await lockPointer(page);
  await faceEnemy(page, previewId);
  await page.waitForTimeout(400);
  const outputPath = 'artifacts/screenshots/lade-preview-banner.png';
  await page.screenshot({ path: outputPath });
  const { size } = await stat(outputPath);
  screenshots.push({
    name: 'lade-preview-banner',
    outputPath,
    viewport: `${DESKTOP.width}x${DESKTOP.height}`,
    sizeBytes: size,
  });
  console.log(`captured ${outputPath}`);
  await page.close();
  await context.close();
}

await browser.close();

await writeFile(
  summaryPath,
  `${JSON.stringify({ baseUrl, summaryPath, errors, screenshots, clips }, null, 2)}\n`,
);
console.log(JSON.stringify({ summaryPath, clipCount: clips.length, errors }, null, 2));
if (errors.length > 0) process.exitCode = 1;
