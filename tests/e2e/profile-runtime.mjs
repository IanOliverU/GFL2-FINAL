import { chromium } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';

const url = process.env.GAME_URL ?? 'http://127.0.0.1:4173/?e2e=1';
const durationMs = Number(process.env.PROFILE_DURATION_MS ?? 10_000);
const outputPath = 'artifacts/performance/runtime-profile.json';
const browser = await chromium.launch({
  channel: 'chromium',
  args: ['--enable-precise-memory-info'],
});

async function profileConfiguration(name, viewport, deviceScaleFactor) {
  const context = await browser.newContext({ viewport, deviceScaleFactor });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (error) => errors.push(`page: ${error.message}`));
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(`console: ${message.text()}`);
  });

  await page.goto(url, { waitUntil: 'networkidle' });
  await page.evaluate(async () => {
    const hooks = window.__THREE_GAME_TEST_HOOKS__;
    if (!hooks) throw new Error('Test hooks unavailable; use ?e2e=1.');
    await hooks.setState('active-third');
    hooks.setPausedForScreenshot(false);
  });
  await page.waitForFunction(() => window.__THREE_GAME_DIAGNOSTICS__?.renderer != null);
  await page.waitForTimeout(1_000);

  const client = await context.newCDPSession(page);
  await client.send('HeapProfiler.collectGarbage');
  const before = await page.evaluate(() => ({
    diagnostics: window.__THREE_GAME_DIAGNOSTICS__ ?? null,
    heapBytes: performance.memory?.usedJSHeapSize ?? null,
    navigation: (() => {
      const entry = performance.getEntriesByType('navigation')[0];
      if (!(entry instanceof PerformanceNavigationTiming)) return null;
      return {
        responseEndMs: entry.responseEnd,
        domContentLoadedMs: entry.domContentLoadedEventEnd,
        loadEventMs: entry.loadEventEnd,
        transferBytes: entry.transferSize,
        encodedBodyBytes: entry.encodedBodySize,
        decodedBodyBytes: entry.decodedBodySize,
      };
    })(),
  }));

  const frameSample = await page.evaluate(
    (sampleDurationMs) =>
      new Promise((resolve) => {
        const intervals = [];
        const startedAt = performance.now();
        let previous = startedAt;

        const sample = (now) => {
          intervals.push(now - previous);
          previous = now;
          if (now - startedAt < sampleDurationMs) {
            requestAnimationFrame(sample);
            return;
          }

          intervals.shift();
          intervals.sort((left, right) => left - right);
          const percentile = (fraction) =>
            intervals[Math.min(intervals.length - 1, Math.floor(intervals.length * fraction))] ?? 0;
          const elapsedMs = now - startedAt;
          resolve({
            durationMs: elapsedMs,
            frames: intervals.length,
            averageFps: (intervals.length * 1_000) / elapsedMs,
            averageFrameMs:
              intervals.reduce((total, interval) => total + interval, 0) / intervals.length,
            p50FrameMs: percentile(0.5),
            p95FrameMs: percentile(0.95),
            p99FrameMs: percentile(0.99),
            framesOver20ms: intervals.filter((interval) => interval > 20).length,
            framesOver33ms: intervals.filter((interval) => interval > 33.34).length,
          });
        };

        requestAnimationFrame(sample);
      }),
    durationMs,
  );

  await client.send('HeapProfiler.collectGarbage');
  const after = await page.evaluate(() => ({
    diagnostics: window.__THREE_GAME_DIAGNOSTICS__ ?? null,
    heapBytes: performance.memory?.usedJSHeapSize ?? null,
  }));
  const report = {
    name,
    viewport,
    deviceScaleFactor,
    durationMs,
    navigation: before.navigation,
    frameSample,
    heap: {
      beforeBytes: before.heapBytes,
      afterBytes: after.heapBytes,
      deltaBytes:
        before.heapBytes == null || after.heapBytes == null
          ? null
          : after.heapBytes - before.heapBytes,
    },
    rendererBefore: before.diagnostics?.renderer ?? null,
    rendererAfter: after.diagnostics?.renderer ?? null,
    simulationAfter: after.diagnostics?.simulation ?? null,
    errors,
  };

  await context.close();
  return report;
}

const reports = [];
reports.push(await profileConfiguration('desktop', { width: 1440, height: 900 }, 1));
reports.push(await profileConfiguration('mobile', { width: 390, height: 664 }, 1.75));
await browser.close();

await mkdir('artifacts/performance', { recursive: true });
await writeFile(outputPath, `${JSON.stringify({ url, reports }, null, 2)}\n`);
console.log(JSON.stringify({ url, reports }, null, 2));

if (reports.some((report) => report.errors.length > 0)) process.exitCode = 1;
