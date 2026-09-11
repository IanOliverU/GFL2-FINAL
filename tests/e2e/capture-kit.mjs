import { chromium } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';

// M1 Tololo combat-kit evidence: separate slow reviewable clips, one per behavior.
// Each clip starts a fresh run through the real Start button and samples the
// development-only kit diagnostics plus the Tololo animation state.
const baseUrl = process.env.GAME_URL ?? 'http://127.0.0.1:4173/?e2e=1';
const summaryPath = 'artifacts/performance/m1-kit-clips.json';
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

async function kit(page) {
  return page.evaluate(() => window.__GFL2_TOLOLO_DIAGNOSTICS__ ?? null);
}

async function kitState(page) {
  return page.evaluate(() => window.__THREE_GAME_DIAGNOSTICS__?.kit ?? null);
}

async function sample(page, label) {
  const diagnostics = await kit(page);
  const kitBlock = await kitState(page);
  return {
    label,
    timeMs: await page.evaluate(() => performance.now()),
    kit: kitBlock,
    animation: diagnostics?.animation?.state ?? null,
    muzzleError: diagnostics?.muzzleError ?? null,
  };
}

async function startRun(page) {
  await page.goto(baseUrl, { waitUntil: 'networkidle' });
  await page.getByRole('button', { name: /start run/i }).click();
  await page.waitForFunction(() => window.__GFL2_TOLOLO_DIAGNOSTICS__?.loadState === 'loaded');
  await page.waitForFunction(() => window.__THREE_GAME_DIAGNOSTICS__?.kit != null);
}

async function hooks(page) {
  return page.evaluate(() => {
    const available = window.__THREE_GAME_TEST_HOOKS__;
    if (!available) throw new Error('Test hooks unavailable; use ?e2e=1.');
    return true;
  });
}

async function grant(page, amount) {
  await page.evaluate((value) => window.__THREE_GAME_TEST_HOOKS__?.grantExperience(value), amount);
}

async function chooseCard(page, name) {
  await page.getByRole('heading', { name: /field adaptation/i }).waitFor();
  await page.waitForTimeout(600);
  await page.getByRole('button', { name }).click();
  await page.waitForTimeout(400);
}

async function pressSkill(page, code) {
  await page.keyboard.down(code);
  await page.waitForTimeout(90);
  await page.keyboard.up(code);
}

async function spawnAhead(page, role = 'melee', distance = 10) {
  await page.evaluate(
    ({ requestedRole, z }) => window.__THREE_GAME_TEST_HOOKS__?.spawnEnemy(requestedRole, 0, z),
    { requestedRole: role, z: distance },
  );
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

// 1. AK-Alfa firing and reload.
await recordClip('tololo-m1-firing-reload', DESKTOP, async (page) => {
  const samples = [];
  await startRun(page);
  await hooks(page);
  const box = await page.locator('canvas').first().boundingBox();
  if (!box) throw new Error('Gameplay canvas has no bounding box.');
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.waitForTimeout(1200);
  samples.push(await sample(page, 'ready'));
  await page.mouse.down({ button: 'left' });
  await page.waitForTimeout(1500);
  samples.push(await sample(page, 'firing'));
  await page.mouse.up({ button: 'left' });
  await page.keyboard.down('KeyR');
  await page.waitForTimeout(300);
  await page.keyboard.up('KeyR');
  await page.waitForTimeout(1200);
  samples.push(await sample(page, 'reloading'));
  await page.waitForTimeout(1500);
  samples.push(await sample(page, 'reloaded'));
  return samples;
});

// 2. Lightspike rhythm: pips fill, then the guaranteed critical resets them.
await recordClip('tololo-m1-passive', DESKTOP, async (page) => {
  const samples = [];
  await startRun(page);
  await hooks(page);
  await spawnAhead(page, 'elite', 10);
  await page.waitForTimeout(800);
  for (let shot = 0; shot < 6; shot += 1) {
    await page.mouse.down({ button: 'left' });
    await page.waitForTimeout(140);
    await page.mouse.up({ button: 'left' });
    await page.waitForTimeout(900);
    samples.push(await sample(page, shot < 5 ? `hit-${shot + 1}` : 'rhythm-crit'));
  }
  return samples;
});

// 3. Skill 1: unlock, targeting, activation, cooldown.
await recordClip('tololo-m1-skill1', DESKTOP, async (page) => {
  const samples = [];
  await startRun(page);
  await hooks(page);
  await grant(page, 60);
  await chooseCard(page, /Hydro Barrage/);
  samples.push(await sample(page, 'unlocked'));
  await spawnAhead(page, 'melee', 10);
  await page.waitForTimeout(800);
  await pressSkill(page, 'KeyQ');
  await page.waitForTimeout(900);
  samples.push(await sample(page, 'activated'));
  await page.waitForTimeout(2500);
  samples.push(await sample(page, 'cooling-down'));
  return samples;
});

// 4. Skill 2: unlock, activation, buff state.
await recordClip('tololo-m1-skill2', DESKTOP, async (page) => {
  const samples = [];
  await startRun(page);
  await hooks(page);
  await grant(page, 60);
  await chooseCard(page, /Hydro Barrage/);
  await grant(page, 120);
  await chooseCard(page, /Tidal Step/);
  samples.push(await sample(page, 'unlocked'));
  await pressSkill(page, 'KeyE');
  await page.waitForTimeout(900);
  samples.push(await sample(page, 'buffed'));
  await page.waitForTimeout(2500);
  samples.push(await sample(page, 'cooling-down'));
  return samples;
});

// 5. Ultimate: unlock, activation, result.
await recordClip('tololo-m1-ultimate', DESKTOP, async (page) => {
  const samples = [];
  await startRun(page);
  await hooks(page);
  await grant(page, 60);
  await chooseCard(page, /Hydro Barrage/);
  await grant(page, 120);
  await chooseCard(page, /Tidal Step/);
  await grant(page, 180);
  await chooseCard(page, /Starfall Recursion/);
  samples.push(await sample(page, 'ultimate-ready'));
  await spawnAhead(page, 'melee', 10);
  await page.waitForTimeout(800);
  await pressSkill(page, 'KeyF');
  await page.waitForTimeout(1200);
  samples.push(await sample(page, 'starfall'));
  await page.waitForTimeout(2000);
  samples.push(await sample(page, 'cooling-down'));
  return samples;
});

// 6. Level 2-4 unlock progression with readable cards.
await recordClip('tololo-m1-unlocks', DESKTOP, async (page) => {
  const samples = [];
  await startRun(page);
  await hooks(page);
  await grant(page, 60);
  await page.getByRole('heading', { name: /field adaptation/i }).waitFor();
  await page.waitForTimeout(1500);
  samples.push(await sample(page, 'level-2-cards'));
  await page.getByRole('button', { name: /Hydro Barrage/ }).click();
  await grant(page, 120);
  await page.getByRole('heading', { name: /field adaptation/i }).waitFor();
  await page.waitForTimeout(1500);
  samples.push(await sample(page, 'level-3-cards'));
  await page.getByRole('button', { name: /Tidal Step/ }).click();
  await grant(page, 180);
  await page.getByRole('heading', { name: /field adaptation/i }).waitFor();
  await page.waitForTimeout(1500);
  samples.push(await sample(page, 'level-4-cards'));
  await page.getByRole('button', { name: /Starfall Recursion/ }).click();
  await page.waitForTimeout(800);
  samples.push(await sample(page, 'kit-complete'));
  return samples;
});

// 7. Camera switching during active cooldowns.
await recordClip('tololo-m1-camera-abilities', DESKTOP, async (page) => {
  const samples = [];
  await startRun(page);
  await hooks(page);
  await grant(page, 60);
  await chooseCard(page, /Hydro Barrage/);
  await pressSkill(page, 'KeyQ');
  await page.waitForTimeout(500);
  samples.push(await sample(page, 'third-person-cooldown'));
  await page.keyboard.down('KeyV');
  await page.waitForTimeout(80);
  await page.keyboard.up('KeyV');
  await page.waitForTimeout(1800);
  samples.push(await sample(page, 'top-down-cooldown'));
  await page.keyboard.down('KeyV');
  await page.waitForTimeout(80);
  await page.keyboard.up('KeyV');
  await page.waitForTimeout(1200);
  samples.push(await sample(page, 'back-to-third-person'));
  return samples;
});

// 8. Pause freeze, death, and retry.
await recordClip('tololo-m1-pause-death-retry', DESKTOP, async (page) => {
  const samples = [];
  await startRun(page);
  await hooks(page);
  await grant(page, 60);
  await chooseCard(page, /Hydro Barrage/);
  await pressSkill(page, 'KeyQ');
  await page.waitForTimeout(500);
  await page.evaluate(() => window.__THREE_GAME_TEST_HOOKS__?.setPausedForScreenshot(true));
  await page.waitForTimeout(600);
  const frozen = await kitState(page);
  await page.waitForTimeout(2000);
  samples.push(await sample(page, 'paused'));
  const stillFrozen = await kitState(page);
  samples.push({
    ...(await sample(page, 'pause-check')),
    frozenCooldown: frozen?.skills?.find((skill) => skill.id === 'skill1')?.cooldown ?? null,
    stillFrozenCooldown:
      stillFrozen?.skills?.find((skill) => skill.id === 'skill1')?.cooldown ?? null,
  });
  await page.evaluate(() => window.__THREE_GAME_TEST_HOOKS__?.setPausedForScreenshot(false));
  await page.evaluate(() => window.__THREE_GAME_TEST_HOOKS__?.damagePlayer(9999));
  await page.waitForTimeout(1500);
  samples.push(await sample(page, 'dead'));
  await page.getByRole('button', { name: 'Retry Grassland' }).click();
  await page.waitForTimeout(1500);
  samples.push(await sample(page, 'retried'));
  return samples;
});

// 9. Mobile portrait combat framing with an unlocked skill.
await recordClip('tololo-m1-mobile-framing', { width: 390, height: 844 }, async (page) => {
  const samples = [];
  await startRun(page);
  await hooks(page);
  await grant(page, 60);
  await chooseCard(page, /Hydro Barrage/);
  await page.waitForTimeout(1200);
  const idle = await page.evaluate(() => window.__GFL2_PLAYER_SCREEN__ ?? null);
  samples.push({ ...(await sample(page, 'mobile-idle')), screen: idle });
  await pressSkill(page, 'KeyQ');
  await page.keyboard.down('KeyW');
  await page.waitForTimeout(2200);
  const moving = await page.evaluate(() => window.__GFL2_PLAYER_SCREEN__ ?? null);
  samples.push({ ...(await sample(page, 'mobile-skill-walk')), screen: moving });
  await page.keyboard.up('KeyW');
  return samples;
});

await browser.close();

await writeFile(
  summaryPath,
  `${JSON.stringify({ baseUrl, summaryPath, errors, clips }, null, 2)}\n`,
);
console.log(JSON.stringify({ summaryPath, clipCount: clips.length, errors }, null, 2));
if (errors.length > 0) process.exitCode = 1;
