import { chromium } from '@playwright/test';
import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises';

// AD2A.1 evidence battery: browser captures of the dev-only ?modelReview=lade
// viewer for the ad2a1-neutral / ad2a1-ready variants (local GLBs, never
// committed) plus committed contact sheets composed from Blender stills
// (assets-dev, local-only) and viewer frames. Socket markers stay hidden in
// normal material and gameplay-distance captures (sockets=1 only where the
// socket layout itself is the subject). The protected reference image is used
// ONLY for a local-only side-by-side in assets-dev and is never embedded
// into committed evidence.
const dev = process.env.AD2A_DEV_URL ?? 'http://127.0.0.1:5173';
const local = 'assets-dev/lade-ad2a1/renders';
const oldLocal = 'assets-dev/lade/renders';

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
  const flag = await page.evaluate(() => window.__GFL2_MODEL_REVIEW__);
  shots[name] = { path, flag };
  await page.close();
}

const N = 'variant=ad2a1-neutral';
const R = 'variant=ad2a1-ready';
await viewerShot('n-ortho-front', `${N}&view=front&light=neutral`);
await viewerShot('n-ortho-side', `${N}&view=side&light=neutral`);
await viewerShot('n-ortho-side-left', `${N}&view=side-left&light=neutral`);
await viewerShot('n-ortho-rear', `${N}&view=rear&light=neutral`);
await viewerShot('n-clay', `${N}&view=three-quarter&light=neutral&shade=clay`);
await viewerShot('n-silhouette', `${N}&view=three-quarter&light=neutral&shade=silhouette`);
await viewerShot('n-wireframe', `${N}&view=three-quarter&light=neutral&shade=wireframe`);
await viewerShot('n-sockets', `${N}&view=three-quarter&light=neutral&sockets=1`);
await viewerShot('n-gameplay-third', `${N}&view=third&light=grassland`);
await viewerShot('n-gameplay-ads', `${N}&view=ads&light=grassland`);
await viewerShot('n-gameplay-top', `${N}&view=top&light=grassland`);
await viewerShot('n-compare-front', `${N}&view=front&light=grassland&compare=1`);
await viewerShot('n-compare-third', `${N}&view=third&light=grassland&compare=1`);
await viewerShot('n-compare-top', `${N}&view=top&light=grassland&compare=1`);
await viewerShot('n-compare-quarter', `${N}&view=three-quarter&light=grassland&compare=1`);
await viewerShot('r-front', `${R}&view=front&light=neutral`);
await viewerShot('r-quarter', `${R}&view=three-quarter&light=neutral`);
await viewerShot('r-gameplay-third', `${R}&view=third&light=grassland`);

// Frame-time sample on the neutral gameplay view (environment-specific).
const perfPage = await browser.newPage({ viewport: { width: 1280, height: 720 } });
await perfPage.goto(`${dev}/?modelReview=lade&${N}&view=third&light=grassland`, {
  waitUntil: 'networkidle',
});
await perfPage.waitForFunction(() => window.__GFL2_MODEL_REVIEW__?.ready === true, null, {
  timeout: 30000,
});
await perfPage.waitForTimeout(1000);
const perf = await perfPage.evaluate(
  () =>
    new Promise((resolve) => {
      const samples = [];
      let last = performance.now();
      const tick = (now) => {
        samples.push(now - last);
        last = now;
        if (samples.length < 120) requestAnimationFrame(tick);
        else {
          samples.sort((a, b) => a - b);
          resolve({
            frames: samples.length,
            avgMs: samples.reduce((s, v) => s + v, 0) / samples.length,
            p95Ms: samples[Math.floor(samples.length * 0.95)],
          });
        }
      };
      requestAnimationFrame(tick);
    }),
);
const perfFlag = await perfPage.evaluate(() => window.__GFL2_MODEL_REVIEW__);
await perfPage.close();

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

const shot = (name) => shots[name].path;
await contactSheet(
  'ad2a1-humanoid-orthographic.png',
  'AD2A.1 Lade humanoid base — orthographic views (neutral studio)',
  [
    ['Front', `${local}/h-review-front.png`],
    ['Right side', `${local}/h-review-side.png`],
    ['Left side', `${local}/h-review-side-left.png`],
    ['Rear', `${local}/h-review-rear.png`],
    ['Front three-quarter', `${local}/h-review-three-quarter.png`],
    ['Top-down', `${local}/h-review-top.png`],
  ],
);
await contactSheet(
  'ad2a1-humanoid-materials.png',
  'AD2A.1 Lade humanoid base — materials, face identity, unarmored clay',
  [
    ['Face (macro)', `${local}/h-macro-face.png`],
    ['Shoulder (macro)', `${local}/h-macro-shoulder.png`],
    ['Knee (macro)', `${local}/h-macro-knee.png`],
    ['Clay (Blender)', `${local}/h-clay.png`],
    ['Clay front (Blender)', `${local}/h-clay-front.png`],
    ['Body-only clay (no armor)', `${local}/h-bodyonly-clay-front.png`],
  ],
);
await contactSheet(
  'ad2a1-humanoid-vs-rejected.png',
  'AD2A.1 humanoid base (right) beside the rejected AD2A primitive candidate (left)',
  [
    ['REJECTED front (AD2A)', `${oldLocal}/review-front.png`],
    ['Humanoid front (AD2A.1)', `${local}/h-review-front.png`],
    ['REJECTED three-quarter (AD2A)', `${oldLocal}/review-three-quarter.png`],
    ['Humanoid three-quarter (AD2A.1)', `${local}/h-review-three-quarter.png`],
  ],
  2,
);
await contactSheet(
  'ad2a1-humanoid-poses.png',
  'AD2A.1 Lade humanoid base — neutral, rifle-ready, wind-up, stagger (not animation)',
  [
    ['Neutral 3/4', `${local}/h-review-three-quarter.png`],
    ['Rifle-ready 3/4', `${local}/h-ready-three-quarter.png`],
    ['Rifle-ready front', `${local}/h-ready-front.png`],
    ['Wind-up 3/4', `${local}/h-pose-windup.png`],
    ['Stagger 3/4', `${local}/h-pose-stagger.png`],
    ['Ready gameplay dist', `${local}/h-ready-dist-third.png`],
  ],
);
await contactSheet(
  'ad2a1-humanoid-gameplay-distance.png',
  'AD2A.1 Lade humanoid base — gameplay distances (socket markers hidden)',
  [
    ['Third-person neutral (viewer)', shot('n-gameplay-third')],
    ['ADS neutral (viewer)', shot('n-gameplay-ads')],
    ['Top-down neutral (viewer)', shot('n-gameplay-top')],
    ['Third-person ready (viewer)', shot('r-gameplay-third')],
    ['Third-person (studio)', `${local}/h-dist-third.png`],
    ['Top-down (studio)', `${local}/h-dist-top.png`],
  ],
);
await contactSheet(
  'ad2a1-humanoid-topology.png',
  'AD2A.1 Lade humanoid base — continuous topology and silhouette',
  [
    ['Wireframe 3/4', `${local}/h-wireframe.png`],
    ['Shoulder loops', `${local}/h-wire-shoulder.png`],
    ['Hip loops', `${local}/h-wire-hip.png`],
    ['Knee loops', `${local}/h-wire-knee.png`],
    ['Silhouette', `${local}/h-silhouette.png`],
    ['Sockets (markers on)', shot('n-sockets')],
  ],
);
await contactSheet(
  'ad2a1-humanoid-deformation.png',
  'AD2A.1 test-armature deformation studies (temporary rig, not animation)',
  [
    ['Shoulder 60°', `${local}/h-deform-shoulder.png`],
    ['Elbow 90°+', `${local}/h-deform-elbow.png`],
    ['Hip 70°', `${local}/h-deform-hip.png`],
    ['Knee 90°+', `${local}/h-deform-knee.png`],
    ['Wrist flex', `${local}/h-deform-wrist.png`],
    ['Ankle flex', `${local}/h-deform-ankle.png`],
  ],
);
await contactSheet(
  'ad2a1-humanoid-scale-comparison.png',
  'AD2A.1 Lade humanoid base (1.86 m) beside Tololo (1.72 m, unmodified)',
  [
    ['Front + Tololo', shot('n-compare-front')],
    ['Third-person + Tololo', shot('n-compare-third')],
    ['Top-down + Tololo', shot('n-compare-top')],
    ['Three-quarter + Tololo', shot('n-compare-quarter')],
  ],
  2,
);

// Local-only reference side-by-side: NEVER committed (assets-dev is ignored).
const refDir = 'assets-source/GFL2 Enemies References';
const refFiles = await readdir(refDir);
const ladeRef = refFiles.find((name) => name.toLowerCase().includes('lade'));
if (ladeRef !== undefined) {
  await contactSheet(
    'ref-compare-local-only.png',
    'LOCAL ONLY — humanoid candidate beside protected reference (do not commit)',
    [
      ['Protected reference (local only)', `${refDir}/${ladeRef}`],
      ['Humanoid front', `${local}/h-review-front.png`],
      ['Humanoid rifle-ready', `${local}/h-ready-three-quarter.png`],
    ],
    3,
    'assets-dev/lade-ad2a1',
  );
}

await writeFile(
  'artifacts/art-direction/ad2a1-lade-capture.json',
  `${JSON.stringify({ shots: Object.keys(shots), errors, perf, perfFlag }, null, 2)}\n`,
);
console.log(JSON.stringify({ shots: Object.keys(shots).length, errors, perf }, null, 2));
await browser.close();
