import { chromium } from '@playwright/test';

const baseUrl = process.env.GAME_URL ?? 'http://127.0.0.1:5173/';
const args = new Set(process.argv.slice(2));

// Capture modes. Each writes a distinct screenshot for the evidence manifest.
//   (default)  skeleton/bounds overlay + debug helpers
//   --front    clean front inspection, no helpers
//   --detail   front inspection, full-torso crop
//   --side     clean side-profile inspection, no helpers
//   --grips    front inspection, tight rifle/grip crop
//   --face     front inspection, face/material crop
//   --normal   default third-person gameplay framing, no helpers, no inspect cam
const MODES = {
  '--detail': {
    path: 'artifacts/screenshots/tololo-model-detail.png',
    inspect: 'front',
    debug: false,
    clip: { x: 460, y: 210, width: 360, height: 440 },
  },
  '--grips': {
    path: 'artifacts/screenshots/tololo-model-grips.png',
    inspect: 'front',
    debug: false,
    clip: { x: 500, y: 280, width: 280, height: 280 },
  },
  '--face': {
    path: 'artifacts/screenshots/tololo-model-face.png',
    inspect: 'front',
    debug: false,
    clip: { x: 490, y: 130, width: 300, height: 260 },
  },
  '--side': {
    path: 'artifacts/screenshots/tololo-model-side.png',
    inspect: 'side',
    debug: false,
  },
  '--front': {
    path: 'artifacts/screenshots/tololo-model-front.png',
    inspect: 'front',
    debug: false,
  },
  '--normal': {
    path: 'artifacts/screenshots/tololo-model-normal.png',
    inspect: null,
    debug: false,
  },
};

let mode = null;
for (const [flag, config] of Object.entries(MODES)) {
  if (args.has(flag)) {
    mode = config;
    break;
  }
}
mode ??= {
  path: 'artifacts/screenshots/tololo-model-debug.png',
  inspect: null,
  debug: true,
};

const screenshotPath = process.env.TOLOLO_SCREENSHOT ?? mode.path;
const url = new URL(baseUrl);
url.searchParams.set('e2e', '1');
if (mode.debug) url.searchParams.set('modelDebug', '1');
if (mode.inspect !== null) url.searchParams.set('modelInspect', mode.inspect);

const browser = await chromium.launch({ channel: 'chromium' });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const errors = [];
page.on('pageerror', (error) => errors.push(`page: ${error.message}`));
page.on('console', (message) => {
  if (message.type() === 'error') errors.push(`console: ${message.text()}`);
});

await page.goto(url.href, { waitUntil: 'networkidle' });
await page.getByRole('button', { name: /start run/i }).click();
await page.evaluate(async () => {
  const hooks = window.__THREE_GAME_TEST_HOOKS__;
  if (!hooks) throw new Error('Test hooks were not installed.');
  await hooks.setState('tololo-model');
  hooks.setPausedForScreenshot(true);
  hooks.hideDebugUi();
});
await page.waitForFunction(
  () => window.__GFL2_TOLOLO_DIAGNOSTICS__?.loadState === 'loaded',
  undefined,
  { timeout: 15_000 },
);
await page.waitForFunction(() => window.__GFL2_TOLOLO_DIAGNOSTICS__?.animation != null, undefined, {
  timeout: 15_000,
});
await page.waitForTimeout(750);
await page.screenshot({
  path: screenshotPath,
  ...(mode.clip ? { clip: mode.clip } : {}),
});
const diagnostics = await page.evaluate(() => window.__GFL2_TOLOLO_DIAGNOSTICS__);
const screen = await page.evaluate(() => window.__GFL2_PLAYER_SCREEN__ ?? null);
const debugCount = await page.evaluate(() => window.__GFL2_SCENE_DEBUG_COUNT__ ?? null);

await browser.close();
console.log(
  JSON.stringify(
    { url: url.href, screenshotPath, diagnostics, screen, debugCount, errors },
    null,
    2,
  ),
);
if (errors.length > 0 || diagnostics?.loadState !== 'loaded') process.exitCode = 1;
