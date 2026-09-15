import { chromium } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';

const base = process.env.GAME_URL ?? 'http://127.0.0.1:4173';
const modes = ['cel3d', 'pixel3d', 'pixel2d'];
const sheetViews = ['third', 'ads', 'top', 'silhouette'];
const extraViews = [
  'tololo-front',
  'tololo-three-quarter',
  'lade-front',
  'lade-side',
  'telegraph',
  'muzzle',
  'movement',
  'rotation',
];
const shot = { width: 1280, height: 720 };

await mkdir('artifacts/art-direction', { recursive: true });
await mkdir('artifacts/screenshots', { recursive: true });
await mkdir('artifacts/videos', { recursive: true });

const browser = await chromium.launch({ channel: 'chromium' });
const errors = [];
const shots = {};

for (const mode of modes) {
  for (const view of [...sheetViews, ...extraViews]) {
    const page = await browser.newPage({ viewport: shot });
    page.on('pageerror', (e) => errors.push(`${mode}/${view}: ${e.message}`));
    const t = view === 'telegraph' ? 1.8 : view === 'muzzle' ? 0.05 : 1.5;
    await page.goto(`${base}/?artCompare=${mode}&artView=${view}&artT=${t}`, {
      waitUntil: 'networkidle',
    });
    await page.waitForFunction(() => window.__GFL2_ART_COMPARE__?.ready === true);
    if (mode !== 'pixel2d') {
      await page.waitForFunction(
        () => window.__GFL2_TOLOLO_DIAGNOSTICS__?.loadState === 'loaded',
        null,
        { timeout: 25000 },
      );
    }
    await page.waitForTimeout(900);
    const path = `artifacts/screenshots/ad0-${mode}-${view}.png`;
    await page.screenshot({ path });
    shots[`${mode}/${view}`] = path;
    await page.close();
  }
}

for (const [name, url, path] of [
  ['normal-no-guide', `${base}/?e2e=1`, 'artifacts/screenshots/ad0-normal-no-guide.png'],
  ['laser-preview', `${base}/?e2e=1&laserPreview=1`, 'artifacts/screenshots/ad0-laser-preview.png'],
]) {
  const page = await browser.newPage({ viewport: shot });
  await page.goto(url, { waitUntil: 'networkidle' });
  await page.getByRole('button', { name: /start run/i }).click();
  await page.waitForFunction(() => window.__GFL2_TOLOLO_DIAGNOSTICS__?.loadState === 'loaded');
  await page.waitForTimeout(800);
  await page.screenshot({ path });
  shots[name] = path;
  await page.close();
}

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
  'ad0-third-person-comparison.png',
  'AD0 third-person — CEL-SHADED 3D / PIXEL-STYLED 3D / 2D-2.5D PIXEL',
  [
    ['CEL-SHADED 3D', shots['cel3d/third']],
    ['PIXEL-STYLED 3D', shots['pixel3d/third']],
    ['2D/2.5D PIXEL', shots['pixel2d/third']],
  ],
);
await contactSheet(
  'ad0-ads-comparison.png',
  'AD0 ADS — CEL-SHADED 3D / PIXEL-STYLED 3D / 2D-2.5D PIXEL',
  [
    ['CEL-SHADED 3D', shots['cel3d/ads']],
    ['PIXEL-STYLED 3D', shots['pixel3d/ads']],
    ['2D/2.5D PIXEL', shots['pixel2d/ads']],
  ],
);
await contactSheet(
  'ad0-top-down-comparison.png',
  'AD0 top-down — CEL-SHADED 3D / PIXEL-STYLED 3D / 2D-2.5D PIXEL',
  [
    ['CEL-SHADED 3D', shots['cel3d/top']],
    ['PIXEL-STYLED 3D', shots['pixel3d/top']],
    ['2D/2.5D PIXEL', shots['pixel2d/top']],
  ],
);
await contactSheet(
  'ad0-silhouette-comparison.png',
  'AD0 silhouette — CEL-SHADED 3D / PIXEL-STYLED 3D / 2D-2.5D PIXEL',
  [
    ['CEL-SHADED 3D', shots['cel3d/silhouette']],
    ['PIXEL-STYLED 3D', shots['pixel3d/silhouette']],
    ['2D/2.5D PIXEL', shots['pixel2d/silhouette']],
  ],
);

for (const mode of modes) {
  const context = await browser.newContext({
    viewport: shot,
    recordVideo: { dir: 'artifacts/videos', size: shot },
  });
  const page = await context.newPage();
  const beats = [
    ['third', 0.4],
    ['movement', 1.2],
    ['rotation', 1.2],
    ['third', 0.05],
    ['muzzle', 0.05],
    ['telegraph', 1.8],
    ['muzzle', 0.27],
    ['top', 2.5],
  ];
  for (const [index, [view, t]] of beats.entries()) {
    await page.goto(`${base}/?artCompare=${mode}&artView=${view}&artT=${t}`, {
      waitUntil: 'networkidle',
    });
    await page.waitForFunction(() => window.__GFL2_ART_COMPARE__?.ready === true);
    if (index === 0 && mode !== 'pixel2d') {
      await page.waitForFunction(
        () => window.__GFL2_TOLOLO_DIAGNOSTICS__?.loadState === 'loaded',
        null,
        { timeout: 25000 },
      );
    }
    await page.waitForTimeout(900);
  }
  await context.close();
}

await writeFile(
  'artifacts/art-direction/ad0-capture.json',
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
const recent = withTime.slice(-3).map((x) => x.f);
for (let i = 0; i < modes.length && i < recent.length; i += 1) {
  await rename(`artifacts/videos/${recent[i]}`, `artifacts/videos/ad0-${modes[i]}.tmp.webm`);
}
for (const mode of modes) {
  try {
    await rename(`artifacts/videos/ad0-${mode}.tmp.webm`, `artifacts/videos/ad0-${mode}.webm`);
  } catch {
    /* keep original if rename order differed */
  }
}
