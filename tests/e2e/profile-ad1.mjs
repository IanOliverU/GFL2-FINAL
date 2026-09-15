import { chromium } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';

// AD1 gameplay performance: average FPS, 1% low FPS, p95, draw calls,
// triangles, programs, geometries, textures, heap delta, load time, and
// error counts across third-person, ADS, top-down, narrow viewport, and
// one controlled Lade encounter. Render targets are code-determined
// (single shadow map; zero post passes/targets) and reported as such.
const game = process.env.AD1_GAME_URL ?? 'http://127.0.0.1:4173';
const durationMs = Number(process.env.PROFILE_DURATION_MS ?? 8_000);
const browser = await chromium.launch({
  channel: 'chromium',
  args: ['--enable-precise-memory-info'],
});
await mkdir('artifacts/art-direction', { recursive: true });

function summarize(intervals) {
  const sorted = [...intervals].sort((a, b) => a - b);
  const avg = intervals.reduce((a, b) => a + b, 0) / intervals.length;
  const lowCount = Math.max(1, Math.floor(intervals.length * 0.01));
  const slowest = [...intervals].sort((a, b) => b - a).slice(0, lowCount);
  const low1 = slowest.reduce((a, b) => a + b, 0) / slowest.length;
  const at = (p) => sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * p))] ?? 0;
  return {
    frames: intervals.length,
    averageFps: (intervals.length * 1_000) / intervals.reduce((a, b) => a + b, 0),
    averageFrameMs: avg,
    low1Fps: 1000 / low1,
    low1FrameMs: low1,
    p95FrameMs: at(0.95),
    p99FrameMs: at(0.99),
    worstFrameMs: Math.max(...intervals),
  };
}

async function profileScenario({ name, viewport, url, state, holdAds, settleMs }) {
  const context = await browser.newContext({ viewport });
  const page = await context.newPage();
  const errors = [];
  const resources = [];
  page.on('pageerror', (e) => errors.push(`page: ${e.message}`));
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(`console: ${m.text()}`);
  });
  page.on('requestfailed', (r) => resources.push(`${r.url()}`));
  const start = Date.now();
  await page.goto(url, { waitUntil: 'networkidle' });
  await page.getByRole('button', { name: /start run/i }).click();
  await page.evaluate((s) => window.__THREE_GAME_TEST_HOOKS__?.setState(s), state);
  await page.waitForFunction(() => window.__GFL2_TOLOLO_DIAGNOSTICS__?.loadState === 'loaded');
  await page.waitForFunction(() => window.__THREE_GAME_DIAGNOSTICS__?.renderer != null);
  const loadMs = Date.now() - start;
  await page.waitForTimeout(settleMs);
  if (holdAds) {
    await page.mouse.move(viewport.width / 2, viewport.height / 2);
    await page.mouse.down({ button: 'right' });
  }
  const client = await context.newCDPSession(page);
  await client.send('HeapProfiler.collectGarbage');
  const before = await page.evaluate(() => ({
    renderer: window.__THREE_GAME_DIAGNOSTICS__?.renderer ?? null,
    heap: performance.memory?.usedJSHeapSize ?? null,
  }));
  const intervals = await page.evaluate(
    (ms) =>
      new Promise((resolve) => {
        const times = [];
        const startedAt = performance.now();
        let previous = startedAt;
        const tick = (now) => {
          times.push(now - previous);
          previous = now;
          if (now - startedAt < ms) requestAnimationFrame(tick);
          else resolve(times);
        };
        requestAnimationFrame(tick);
      }),
    durationMs,
  );
  if (holdAds) await page.mouse.up({ button: 'right' });
  await client.send('HeapProfiler.collectGarbage');
  const after = await page.evaluate(() => ({
    renderer: window.__THREE_GAME_DIAGNOSTICS__?.renderer ?? null,
    heap: performance.memory?.usedJSHeapSize ?? null,
  }));
  await context.close();
  return {
    name,
    viewport: `${viewport.width}x${viewport.height}`,
    loadMs,
    frames: summarize(intervals),
    rendererBefore: before.renderer,
    rendererAfter: after.renderer,
    heapBeforeBytes: before.heap,
    heapAfterBytes: after.heap,
    heapDeltaBytes: before.heap == null || after.heap == null ? null : after.heap - before.heap,
    renderTargets: { shadowMap: 1, postPasses: 0, note: 'code-determined: no EffectComposer' },
    errors,
    resourceErrors: resources,
  };
}

const desktop = { width: 1280, height: 720 };
const narrow = { width: 390, height: 844 };
const reports = [];
reports.push(
  await profileScenario({
    name: 'third-person',
    viewport: desktop,
    url: `${game}/?e2e=1`,
    state: 'active-third',
    settleMs: 1000,
  }),
);
reports.push(
  await profileScenario({
    name: 'ads',
    viewport: desktop,
    url: `${game}/?e2e=1`,
    state: 'active-third',
    holdAds: true,
    settleMs: 1000,
  }),
);
reports.push(
  await profileScenario({
    name: 'top-down',
    viewport: desktop,
    url: `${game}/?e2e=1`,
    state: 'active-top',
    settleMs: 1000,
  }),
);
reports.push(
  await profileScenario({
    name: 'narrow-third',
    viewport: narrow,
    url: `${game}/?e2e=1`,
    state: 'active-third',
    settleMs: 1000,
  }),
);
reports.push(
  await profileScenario({
    name: 'controlled-lade',
    viewport: desktop,
    url: `${game}/?e2e=1&enemyPreview=lade`,
    state: 'tololo-model',
    settleMs: 11000,
  }),
);
await browser.close();

await writeFile(
  'artifacts/art-direction/ad1-performance.json',
  `${JSON.stringify({ reports }, null, 2)}\n`,
);
console.log(
  JSON.stringify(
    reports.map((r) => ({
      name: r.name,
      avgFps: r.frames.averageFps,
      low1Fps: r.frames.low1Fps,
      p95: r.frames.p95FrameMs,
      calls: r.rendererAfter?.calls,
      tris: r.rendererAfter?.triangles,
      programs: r.rendererAfter?.programs,
      errors: r.errors.length,
    })),
    null,
    1,
  ),
);
if (reports.some((r) => r.errors.length > 0 || r.resourceErrors.length > 0)) process.exitCode = 1;
