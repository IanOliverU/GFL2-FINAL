import { chromium } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';

// AD1 review captures: cel3d study views (dev server: artCompare is
// development-only) plus normal-gameplay distances (preview server).
const dev = process.env.AD1_DEV_URL ?? 'http://127.0.0.1:5173';
const game = process.env.AD1_GAME_URL ?? 'http://127.0.0.1:4173';
const shot = { width: 1280, height: 720 };

await mkdir('artifacts/art-direction', { recursive: true });
await mkdir('artifacts/screenshots', { recursive: true });
await mkdir('artifacts/videos', { recursive: true });

const browser = await chromium.launch({ channel: 'chromium' });
const errors = [];
const shots = {};

async function studyShot(name, view, light = 'final', t = 1.5) {
  const page = await browser.newPage({ viewport: shot });
  page.on('pageerror', (e) => errors.push(`${name}: ${e.message}`));
  await page.goto(`${dev}/?artCompare=cel3d&artView=${view}&artT=${t}&artLight=${light}`, {
    waitUntil: 'networkidle',
  });
  await page.waitForFunction(() => window.__GFL2_ART_COMPARE__?.ready === true);
  await page.waitForFunction(
    () => window.__GFL2_TOLOLO_DIAGNOSTICS__?.loadState === 'loaded',
    null,
    {
      timeout: 25000,
    },
  );
  await page.waitForTimeout(900);
  const path = `artifacts/screenshots/ad1-${name}.png`;
  await page.screenshot({ path });
  shots[name] = path;
  await page.close();
}

await studyShot('tololo-front', 'tololo-front');
await studyShot('tololo-side', 'tololo-side');
await studyShot('tololo-rear', 'tololo-rear');
await studyShot('tololo-three-quarter', 'tololo-three-quarter');
await studyShot('tololo-front-neutral', 'tololo-front', 'neutral');
await studyShot('tololo-three-quarter-neutral', 'tololo-three-quarter', 'neutral');
await studyShot('lade-face', 'lade-face');
await studyShot('lade-face-neutral', 'lade-face', 'neutral');
await studyShot('lade-side', 'lade-side');
await studyShot('lade-front', 'lade-front');
await studyShot('silhouette', 'silhouette');
await studyShot('study-third', 'third');
await studyShot('study-ads', 'ads');
await studyShot('study-top', 'top');
await studyShot('telegraph', 'telegraph', 'final', 1.8);
await studyShot('muzzle', 'muzzle', 'final', 0.05);
await studyShot('impact', 'muzzle', 'final', 0.27);

async function gameplayShot(name, setup) {
  const page = await browser.newPage({ viewport: shot });
  page.on('pageerror', (e) => errors.push(`${name}: ${e.message}`));
  await page.goto(`${game}/?e2e=1`, { waitUntil: 'networkidle' });
  await page.getByRole('button', { name: /start run/i }).click();
  await page.evaluate(() => window.__THREE_GAME_TEST_HOOKS__?.setState('tololo-model'));
  await page.waitForFunction(() => window.__GFL2_TOLOLO_DIAGNOSTICS__?.loadState === 'loaded');
  await setup(page);
  const path = `artifacts/screenshots/ad1-${name}.png`;
  await page.screenshot({ path });
  shots[name] = path;
  await page.close();
}

await gameplayShot('gameplay-third', async (page) => {
  await page.waitForTimeout(1200);
});
await gameplayShot('gameplay-ads', async (page) => {
  await page.mouse.move(640, 360);
  await page.mouse.down({ button: 'right' });
  await page.waitForTimeout(1200);
  await page.mouse.up({ button: 'right' });
});
await gameplayShot('gameplay-top', async (page) => {
  await page.mouse.click(640, 360);
  await page.keyboard.press('v');
  await page.waitForFunction(
    () => document.querySelector('.gfl-app')?.getAttribute('data-camera-mode') === 'topDown',
  );
  await page.waitForTimeout(1200);
});
await gameplayShot('gameplay-combat', async (page) => {
  await page.evaluate(() => window.__THREE_GAME_TEST_HOOKS__?.setState('active-third'));
  await page.mouse.move(640, 300);
  await page.mouse.down();
  await page.waitForTimeout(1500);
  await page.mouse.up();
});

async function gameplayVideo(name, url, beats) {
  const context = await browser.newContext({
    viewport: shot,
    recordVideo: { dir: 'artifacts/videos', size: shot },
  });
  const page = await context.newPage();
  page.on('pageerror', (e) => errors.push(`${name}: ${e.message}`));
  await page.goto(url, { waitUntil: 'networkidle' });
  await page.getByRole('button', { name: /start run/i }).click();
  await page.evaluate(() => window.__THREE_GAME_TEST_HOOKS__?.setState('tololo-model'));
  await page.waitForFunction(() => window.__GFL2_TOLOLO_DIAGNOSTICS__?.loadState === 'loaded');
  await beats(page);
  await context.close();
}

const fire = async (page) => {
  await page.mouse.move(640, 320);
  await page.mouse.down();
  await page.waitForTimeout(1200);
  await page.mouse.up();
};
const drive = async (page) => {
  await page.keyboard.down('w');
  await page.waitForTimeout(1500);
  await page.keyboard.up('w');
  await page.keyboard.down('a');
  await page.waitForTimeout(900);
  await page.keyboard.up('a');
};

await gameplayVideo('ad1-third-person', `${game}/?e2e=1`, async (page) => {
  await drive(page);
  await fire(page);
});
await gameplayVideo('ad1-ads', `${game}/?e2e=1`, async (page) => {
  await page.mouse.move(640, 360);
  await page.mouse.down({ button: 'right' });
  await page.waitForTimeout(2500);
  await page.mouse.up({ button: 'right' });
});
await gameplayVideo('ad1-top-down', `${game}/?e2e=1`, async (page) => {
  await page.mouse.click(640, 360);
  await page.keyboard.press('v');
  await page.waitForTimeout(800);
  await drive(page);
  await fire(page);
});
await gameplayVideo('ad1-controlled-lade', `${game}/?e2e=1&enemyPreview=lade`, async (page) => {
  await page.waitForTimeout(9000);
  await drive(page);
  await fire(page);
});

async function contactSheet(name, title, rows) {
  const { readFile } = await import('node:fs/promises');
  const page = await browser.newPage({ viewport: { width: 1280, height: 860 } });
  const cells = [];
  for (const [label, src] of rows) {
    const bytes = await readFile(src);
    const data = `data:image/png;base64,${bytes.toString('base64')}`;
    cells.push(
      `<figure style="margin:0"><img src="${data}" style="width:100%;display:block"/><figcaption style="font:700 13px system-ui;padding:6px 8px;background:#111;color:#fff">${label}</figcaption></figure>`,
    );
  }
  await page.setContent(
    `<body style="margin:0;background:#0b0d0e;color:#fff;font-family:system-ui"><h1 style="font-size:18px;padding:12px 16px;margin:0">${title}</h1><div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;padding:0 12px 12px">${cells.join('')}</div></body>`,
  );
  await page.waitForTimeout(400);
  await page.screenshot({ path: `artifacts/art-direction/${name}` });
  await page.close();
}

await contactSheet(
  'ad1-character-materials.png',
  'AD1 Tololo — cel-shaded 3D material review (final + neutral light)',
  [
    ['Tololo front (final)', shots['tololo-front']],
    ['Tololo side (final)', shots['tololo-side']],
    ['Tololo rear (final)', shots['tololo-rear']],
    ['Tololo 3/4 (final)', shots['tololo-three-quarter']],
    ['Tololo front (neutral)', shots['tololo-front-neutral']],
    ['Tololo 3/4 (neutral)', shots['tololo-three-quarter-neutral']],
  ],
);
await contactSheet(
  'ad1-enemy-readability.png',
  'AD1 Lade proxy (temporary) — silhouette and telegraph readability',
  [
    ['Lade face (final)', shots['lade-face']],
    ['Lade face (neutral)', shots['lade-face-neutral']],
    ['Lade side (final)', shots['lade-side']],
    ['Lade rear 3/4 (final)', shots['lade-front']],
    ['Telegraph (final)', shots['telegraph']],
    ['Silhouette (final)', shots['silhouette']],
  ],
);
await contactSheet(
  'ad1-camera-readability.png',
  'AD1 dual-camera readability — gameplay distances + study framing',
  [
    ['Gameplay third-person', shots['gameplay-third']],
    ['Gameplay ADS', shots['gameplay-ads']],
    ['Gameplay top-down', shots['gameplay-top']],
    ['Study third', shots['study-third']],
    ['Study ADS', shots['study-ads']],
    ['Study top-down', shots['study-top']],
  ],
);
await contactSheet(
  'ad1-effects-readability.png',
  'AD1 combat effects — muzzle, impact, telegraph, live fire',
  [
    ['Muzzle flash', shots['muzzle']],
    ['Impact', shots['impact']],
    ['Telegraph ring', shots['telegraph']],
    ['Live combat fire', shots['gameplay-combat']],
  ],
);

await writeFile(
  'artifacts/art-direction/ad1-capture.json',
  `${JSON.stringify({ shots, errors }, null, 2)}\n`,
);
console.log(JSON.stringify({ shots: Object.keys(shots).length, errors }, null, 2));
await browser.close();

// Rename recorded videos to required names (Playwright generates random names).
const { readdir, rename, stat } = await import('node:fs/promises');
const all = (await readdir('artifacts/videos')).filter((f) => f.endsWith('.webm'));
const withTime = [];
for (const f of all) {
  const s = await stat(`artifacts/videos/${f}`);
  withTime.push({ f, m: s.mtimeMs });
}
withTime.sort((a, b) => a.m - b.m);
const names = ['ad1-third-person', 'ad1-ads', 'ad1-top-down', 'ad1-controlled-lade'];
const recent = withTime.slice(-4).map((x) => x.f);
for (let i = 0; i < names.length && i < recent.length; i += 1) {
  try {
    await rename(`artifacts/videos/${recent[i]}`, `artifacts/videos/${names[i]}.webm`);
  } catch {
    /* keep original if rename order differed */
  }
}
