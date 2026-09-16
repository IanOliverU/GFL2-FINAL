import { chromium } from '@playwright/test';
import { mkdir, readFile, writeFile } from 'node:fs/promises';

// AD2A evidence battery: browser captures of the dev-only ?modelReview=lade
// viewer (local GLB, never committed) plus committed contact sheets composed
// from Blender renders (assets-dev, local-only) and viewer frames. The
// protected reference image is used ONLY for a local-only side-by-side in
// assets-dev and is never embedded into committed evidence.
const dev = process.env.AD2A_DEV_URL ?? 'http://127.0.0.1:5173';
const local = 'assets-dev/lade/renders';

await mkdir('artifacts/art-direction', { recursive: true });

const browser = await chromium.launch({ channel: 'chromium' });
const errors = [];
const shots = {};

async function viewerShot(name, query) {
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  page.on('pageerror', (e) => errors.push(`${name}: ${e.message}`));
  await page.goto(`${dev}/?modelReview=lade&${query}`, { waitUntil: 'networkidle' });
  await page.waitForFunction(() => window.__GFL2_MODEL_REVIEW__?.ready === true, null, {
    timeout: 30000,
  });
  await page.waitForTimeout(800);
  const path = `${local}/viewer-${name}.png`;
  await page.screenshot({ path });
  shots[name] = path;
  await page.close();
}

await viewerShot('ortho-front', 'view=front&light=neutral&compare=0');
await viewerShot('ortho-side', 'view=side&light=neutral&compare=0');
await viewerShot('gameplay-third', 'view=third&light=grassland&compare=0');
await viewerShot('gameplay-ads', 'view=ads&light=grassland&compare=0');
await viewerShot('gameplay-top', 'view=top&light=grassland&compare=0');
await viewerShot('compare-front', 'view=front&light=grassland&compare=1');
await viewerShot('compare-third', 'view=third&light=grassland&compare=1');
await viewerShot('compare-top', 'view=top&light=grassland&compare=1');
await viewerShot('compare-quarter', 'view=three-quarter&light=grassland&compare=1');

async function contactSheet(name, title, rows, columns = 3, outDir = 'artifacts/art-direction') {
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
    `<body style="margin:0;background:#0b0d0e;color:#fff;font-family:system-ui"><h1 style="font-size:18px;padding:12px 16px;margin:0">${title}</h1><div style="display:grid;grid-template-columns:repeat(${columns},1fr);gap:8px;padding:0 12px 12px">${cells.join('')}</div></body>`,
  );
  await page.waitForTimeout(400);
  await page.screenshot({ path: `${outDir}/${name}` });
  await page.close();
}

await contactSheet(
  'ad2a-lade-orthographic.png',
  'AD2A Lade candidate — orthographic views (neutral studio)',
  [
    ['Front', `${local}/review-front.png`],
    ['Right side', `${local}/review-side.png`],
    ['Left side', `${local}/review-side-left.png`],
    ['Rear', `${local}/review-rear.png`],
    ['Front three-quarter', `${local}/review-three-quarter.png`],
    ['Top-down', `${local}/review-top.png`],
  ],
);
await contactSheet('ad2a-lade-materials.png', 'AD2A Lade candidate — materials and face identity', [
  ['Face (macro)', `${local}/review-face.png`],
  ['Material groups', `${local}/analysis-materials.png`],
  ['Clay (Blender)', `${local}/analysis-clay.png`],
  ['Clay (AD1 toon)', `${local}/iter3-clay.png`],
  ['Head detail', `${local}/review-head.png`],
  ['Hip detail', `${local}/review-hip.png`],
]);
await contactSheet('ad2a-lade-poses.png', 'AD2A Lade candidate — review poses (not animation)', [
  ['Neutral', `${local}/review-three-quarter.png`],
  ['Tactical 3/4', `${local}/pose-tactical-three-quarter.png`],
  ['Wind-up 3/4', `${local}/pose-windup-three-quarter.png`],
  ['Stagger 3/4', `${local}/pose-stagger-three-quarter.png`],
  ['Tactical front', `${local}/pose-tactical-front.png`],
  ['Stagger front', `${local}/pose-stagger-front.png`],
]);
await contactSheet(
  'ad2a-lade-gameplay-distance.png',
  'AD2A Lade candidate — gameplay distances (AD1 Grassland treatment in viewer)',
  [
    ['Third-person (viewer)', shots['gameplay-third']],
    ['ADS (viewer)', shots['gameplay-ads']],
    ['Top-down (viewer)', shots['gameplay-top']],
    ['Third-person (studio)', `${local}/analysis-dist-third.png`],
    ['ADS (studio)', `${local}/analysis-dist-ads.png`],
    ['Top-down (studio)', `${local}/analysis-dist-top.png`],
  ],
);
await contactSheet('ad2a-lade-topology.png', 'AD2A Lade candidate — topology and rig readiness', [
  ['Wireframe', `${local}/analysis-wireframe.png`],
  ['Shoulder loops', `${local}/analysis-topology-shoulder.png`],
  ['Hip loops', `${local}/analysis-topology-hip.png`],
  ['Knee loops', `${local}/analysis-topology-knee.png`],
  ['Silhouette', `${local}/analysis-silhouette.png`],
  ['Clay', `${local}/analysis-clay.png`],
]);
await contactSheet(
  'ad2a-lade-scale-comparison.png',
  'AD2A Lade candidate (1.888 m) beside Tololo (1.72 m, unmodified)',
  [
    ['Front + Tololo', shots['compare-front']],
    ['Third-person + Tololo', shots['compare-third']],
    ['Top-down + Tololo', shots['compare-top']],
    ['Three-quarter + Tololo', shots['compare-quarter']],
  ],
  2,
);

// Local-only reference side-by-side: NEVER committed (assets-dev is ignored).
await contactSheet(
  'ref-compare-local-only.png',
  'LOCAL ONLY — candidate beside protected reference (do not commit)',
  [
    ['Protected reference (local only)', 'assets-source/GFL2 Enemies References/FelagiㆍLade.webp'],
    ['Candidate front', `${local}/review-front.png`],
    ['Candidate tactical', `${local}/pose-tactical-three-quarter.png`],
  ],
  3,
  'assets-dev/lade',
);

await writeFile(
  'artifacts/art-direction/ad2a-lade-capture.json',
  `${JSON.stringify({ shots, errors }, null, 2)}\n`,
);
console.log(JSON.stringify({ shots: Object.keys(shots).length, errors }, null, 2));
await browser.close();
