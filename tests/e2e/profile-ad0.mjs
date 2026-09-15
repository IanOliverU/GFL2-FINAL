import { chromium } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';

const base = process.env.GAME_URL ?? 'http://127.0.0.1:4173';
const modes = ['cel3d', 'pixel3d', 'pixel2d'];
const viewports = [
  { name: 'desktop', width: 1280, height: 720 },
  { name: 'narrow', width: 390, height: 664 },
];
await mkdir('artifacts/art-direction', { recursive: true });

const browser = await chromium.launch({ channel: 'chromium' });
const reports = [];

for (const mode of modes) {
  for (const viewport of viewports) {
    const page = await browser.newPage({
      viewport: { width: viewport.width, height: viewport.height },
    });
    const errors = [];
    page.on('pageerror', (e) => errors.push(e.message));
    const start = Date.now();
    await page.goto(`${base}/?artCompare=${mode}&artView=third&artT=1.5`, {
      waitUntil: 'networkidle',
    });
    await page.waitForFunction(() => window.__GFL2_ART_COMPARE__?.ready === true);
    const loadMs = Date.now() - start;
    await page.waitForTimeout(1200);
    const sample = await page.evaluate(
      () =>
        new Promise((resolve) => {
          const times = [];
          let last = performance.now();
          let frames = 0;
          function tick(now) {
            times.push(now - last);
            last = now;
            frames += 1;
            if (frames < 240) requestAnimationFrame(tick);
            else resolve(times);
          }
          requestAnimationFrame(tick);
        }),
    );
    const sorted = [...sample].sort((a, b) => a - b);
    const avg = sample.reduce((a, b) => a + b, 0) / sample.length;
    const p95 = sorted[Math.floor(sorted.length * 0.95)] ?? 0;
    const p99 = sorted[Math.floor(sorted.length * 0.99)] ?? 0;
    // 1% low: mean of the slowest 1% of frames, expressed as ms and fps.
    // Every comparison profile must include this low-frame metric.
    const lowCount = Math.max(1, Math.floor(sample.length * 0.01));
    const slowest = [...sample].sort((a, b) => b - a).slice(0, lowCount);
    const low1FrameMs = slowest.reduce((a, b) => a + b, 0) / slowest.length;
    const low1Fps = 1000 / low1FrameMs;
    // Spike forensics for p95 outliers (e.g. pixel3d desktop): split warmup
    // (first 30 frames: shader compilation, first-upload, instrumentation)
    // from steady state, and count recurring late frames.
    const warmup = sample.slice(0, 30);
    const steady = sample.slice(30);
    const steadySorted = [...steady].sort((a, b) => a - b);
    const warmupAvg = warmup.reduce((a, b) => a + b, 0) / Math.max(1, warmup.length);
    const steadyAvg = steady.reduce((a, b) => a + b, 0) / Math.max(1, steady.length);
    const steadyP95 = steadySorted[Math.floor(steadySorted.length * 0.95)] ?? 0;
    const median = sorted[Math.floor(sorted.length * 0.5)] ?? 0;
    const spikeThreshold = Math.max(25, median * 2);
    const spikeFrames = sample
      .map((ms, index) => ({ index, ms }))
      .filter((entry) => entry.ms >= spikeThreshold);
    const renderer = await page.evaluate(() => window.__GFL2_ART_RENDERER__ ?? null);
    const heap = await page.evaluate(() =>
      performance.memory
        ? { used: performance.memory.usedJSHeapSize, total: performance.memory.totalJSHeapSize }
        : null,
    );
    reports.push({
      mode,
      viewport: viewport.name,
      loadMs,
      averageFps: 1000 / avg,
      averageFrameMs: avg,
      p95FrameMs: p95,
      p99FrameMs: p99,
      low1FrameMs,
      low1Fps,
      warmupAverageMs: warmupAvg,
      steadyAverageMs: steadyAvg,
      steadyP95Ms: steadyP95,
      spikeThresholdMs: spikeThreshold,
      spikeCount: spikeFrames.length,
      spikeIndices: spikeFrames.map((entry) => entry.index),
      worstFrameMs: Math.max(...sample),
      renderer,
      heap,
      errors,
    });
    await page.close();
  }
}

// Disposal check: load cel3d then pixel2d in the same page and confirm hook increments.
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
await page.goto(`${base}/?artCompare=cel3d&artView=third&artT=1.5`, { waitUntil: 'networkidle' });
await page.waitForFunction(() => window.__GFL2_ART_COMPARE__?.ready === true);
await page.goto(`${base}/?artCompare=pixel2d&artView=third&artT=1.5`, { waitUntil: 'networkidle' });
await page.waitForFunction(() => window.__GFL2_ART_COMPARE__?.ready === true);
const disposal = await page.evaluate(() => window.__GFL2_ART_COMPARE__);
await browser.close();

await writeFile(
  'artifacts/art-direction/ad0-profile.json',
  `${JSON.stringify({ reports, disposal }, null, 2)}\n`,
);
console.log(JSON.stringify({ reports: reports.length, disposal }, null, 2));
