import { chromium } from '@playwright/test';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { PNG } from 'pngjs';

// AD1.1 correction evidence: re-capture the exact AD1 views after the
// lighting/ramp/grass fix, then compose matching before/after contact
// sheets. Before shots are the committed AD1 captures in
// artifacts/screenshots/ad1-*.png; after shots land beside them as
// artifacts/screenshots/ad1-1-*.png. No gameplay, camera, aiming, balance,
// enemy, layout, or asset change is made for this evidence.
const dev = process.env.AD1_DEV_URL ?? 'http://127.0.0.1:5173';
const game = process.env.AD1_GAME_URL ?? 'http://127.0.0.1:4173';
const shot = { width: 1280, height: 720 };

await mkdir('artifacts/art-direction', { recursive: true });
await mkdir('artifacts/screenshots', { recursive: true });

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
    { timeout: 25000 },
  );
  await page.waitForTimeout(900);
  const path = `artifacts/screenshots/ad1-1-${name}.png`;
  await page.screenshot({ path });
  shots[name] = path;
  await page.close();
}

await studyShot('tololo-front', 'tololo-front');
await studyShot('tololo-three-quarter', 'tololo-three-quarter');
await studyShot('tololo-front-neutral', 'tololo-front', 'neutral');
await studyShot('study-third', 'third');

async function gameplayShot(name, setup) {
  const page = await browser.newPage({ viewport: shot });
  page.on('pageerror', (e) => errors.push(`${name}: ${e.message}`));
  await page.goto(`${game}/?e2e=1`, { waitUntil: 'networkidle' });
  await page.getByRole('button', { name: /start run/i }).click();
  await page.evaluate(() => window.__THREE_GAME_TEST_HOOKS__?.setState('tololo-model'));
  await page.waitForFunction(() => window.__GFL2_TOLOLO_DIAGNOSTICS__?.loadState === 'loaded');
  await setup(page);
  const path = `artifacts/screenshots/ad1-1-${name}.png`;
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

function frameMetrics(png) {
  let sum = 0;
  let nearBlack = 0;
  let nearWhite = 0;
  const distinct = new Set();
  const total = png.width * png.height;
  for (let i = 0; i < png.data.length; i += 4) {
    const r = png.data[i] ?? 0;
    const g = png.data[i + 1] ?? 0;
    const b = png.data[i + 2] ?? 0;
    sum += r * 0.2126 + g * 0.7152 + b * 0.0722;
    if (r < 20 && g < 20 && b < 20) nearBlack += 1;
    if (r > 235 && g > 235 && b > 235) nearWhite += 1;
    distinct.add(`${r >> 4}-${g >> 4}-${b >> 4}`);
  }
  return {
    meanLuminance: Math.round((sum / total) * 100) / 100,
    nearBlackFraction: Math.round((nearBlack / total) * 10000) / 10000,
    nearWhiteFraction: Math.round((nearWhite / total) * 10000) / 10000,
    distinctColors4bit: distinct.size,
  };
}

// Same metric on the AD1 before shot and the AD1.1 after shot. HUD chrome
// is identical in both, so deltas isolate the lighting/ramp/grass change.
const pairs = [
  ['tololo-front', 'artifacts/screenshots/ad1-tololo-front.png'],
  ['tololo-three-quarter', 'artifacts/screenshots/ad1-tololo-three-quarter.png'],
  ['tololo-front-neutral', 'artifacts/screenshots/ad1-tololo-front-neutral.png'],
  ['study-third', 'artifacts/screenshots/ad1-study-third.png'],
  ['gameplay-third', 'artifacts/screenshots/ad1-gameplay-third.png'],
  ['gameplay-ads', 'artifacts/screenshots/ad1-gameplay-ads.png'],
  ['gameplay-top', 'artifacts/screenshots/ad1-gameplay-top.png'],
];
const metrics = {};
for (const [name, beforePath] of pairs) {
  const before = PNG.sync.read(await readFile(beforePath));
  const after = PNG.sync.read(await readFile(shots[name]));
  metrics[name] = { before: frameMetrics(before), after: frameMetrics(after) };
}

async function contactSheet(name, title, rows) {
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  const cells = [];
  for (const [label, src] of rows) {
    const bytes = await readFile(src);
    const data = `data:image/png;base64,${bytes.toString('base64')}`;
    cells.push(
      `<figure style="margin:0"><img src="${data}" style="width:100%;display:block"/><figcaption style="font:700 13px system-ui;padding:6px 8px;background:#111;color:#fff">${label}</figcaption></figure>`,
    );
  }
  await page.setContent(
    `<body style="margin:0;background:#0b0d0e;color:#fff;font-family:system-ui"><h1 style="font-size:18px;padding:12px 16px;margin:0">${title}</h1><div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;padding:0 12px 12px">${cells.join('')}</div></body>`,
  );
  await page.waitForTimeout(400);
  await page.screenshot({ path: `artifacts/art-direction/${name}` });
  await page.close();
}

const before = (n) => `artifacts/screenshots/ad1-${n}.png`;
const after = (n) => shots[n];

await contactSheet('ad1-1-tololo-lighting.png', 'AD1.1 Tololo — before (AD1) vs after (AD1.1)', [
  ['BEFORE Tololo front (final)', before('tololo-front')],
  ['AFTER Tololo front (final)', after('tololo-front')],
  ['BEFORE Tololo 3/4 (final)', before('tololo-three-quarter')],
  ['AFTER Tololo 3/4 (final)', after('tololo-three-quarter')],
  ['BEFORE Tololo front (neutral)', before('tololo-front-neutral')],
  ['AFTER Tololo front (neutral, unchanged rig)', after('tololo-front-neutral')],
]);
await contactSheet(
  'ad1-1-gameplay.png',
  'AD1.1 gameplay readability — before (AD1) vs after (AD1.1)',
  [
    ['BEFORE third-person', before('gameplay-third')],
    ['AFTER third-person', after('gameplay-third')],
    ['BEFORE ADS', before('gameplay-ads')],
    ['AFTER ADS', after('gameplay-ads')],
    ['BEFORE top-down', before('gameplay-top')],
    ['AFTER top-down', after('gameplay-top')],
  ],
);
await contactSheet(
  'ad1-1-grass-distance.png',
  'AD1.1 grass at distance — before (AD1) vs after (AD1.1)',
  [
    ['BEFORE grass near (third-person)', before('gameplay-third')],
    ['AFTER grass near (third-person)', after('gameplay-third')],
    ['BEFORE grass medium (study third)', before('study-third')],
    ['AFTER grass medium (study third)', after('study-third')],
    ['BEFORE grass far (top-down masses)', before('gameplay-top')],
    ['AFTER grass far (top-down masses)', after('gameplay-top')],
  ],
);
await contactSheet('ad1-1-sky-ground.png', 'AD1.1 actor contrast — before (AD1) vs after (AD1.1)', [
  ['BEFORE Tololo vs bright sky (third)', before('gameplay-third')],
  ['AFTER Tololo vs bright sky (third)', after('gameplay-third')],
  ['BEFORE Tololo vs dark ground (top-down)', before('gameplay-top')],
  ['AFTER Tololo vs dark ground (top-down)', after('gameplay-top')],
]);

const correction = {
  before: {
    sun: 2.3,
    hemisphere: 1.15,
    rim: 0.5,
    previewSun: 2.25,
    previewHemisphere: 1.5,
    studyFinalSun: 2.0,
    studyFinalHemisphere: 0.95,
    standardRamp: [120, 180, 255],
    flatRamp: [150, 255],
    grassVertexColors: true,
  },
  after: {
    sun: 1.85,
    hemisphere: 0.8,
    rim: 0.65,
    previewSun: 1.8,
    previewHemisphere: 1.05,
    studyFinalSun: 1.6,
    studyFinalHemisphere: 0.65,
    standardRamp: [120, 170, 240],
    flatRamp: [175, 255],
    grassVertexColors: false,
  },
  frameMetrics: metrics,
  errors,
};
await writeFile(
  'artifacts/art-direction/ad1-1-correction.json',
  `${JSON.stringify(correction, null, 2)}\n`,
);
console.log(JSON.stringify({ shots: Object.keys(shots).length, errors, metrics }, null, 2));
await browser.close();
