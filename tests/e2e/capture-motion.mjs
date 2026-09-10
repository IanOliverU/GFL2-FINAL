import { chromium } from '@playwright/test';
import { mkdir } from 'node:fs/promises';

const url = process.env.GAME_URL ?? 'http://127.0.0.1:4173/?e2e=1';
const outputPath = 'artifacts/videos/placeholder-run-reload.webm';
await mkdir('artifacts/videos', { recursive: true });

const browser = await chromium.launch({ channel: 'chromium' });
const context = await browser.newContext({
  viewport: { width: 1280, height: 720 },
  recordVideo: { dir: 'artifacts/videos', size: { width: 1280, height: 720 } },
});
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
});
await page.waitForTimeout(600);

await page.keyboard.down('KeyW');
await page.waitForTimeout(1_800);
await page.keyboard.up('KeyW');

const canvas = page.locator('canvas').first();
const box = await canvas.boundingBox();
if (!box) throw new Error('Gameplay canvas has no bounding box.');
await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
await page.mouse.down({ button: 'left' });
await page.waitForTimeout(420);
await page.mouse.up({ button: 'left' });
await page.keyboard.press('KeyR');
await page.waitForTimeout(2_700);

await page.waitForTimeout(800);

const video = page.video();
await page.close();
if (!video) throw new Error('Playwright did not create a motion recording.');
await video.saveAs(outputPath);
await context.close();
await browser.close();

console.log(JSON.stringify({ url, outputPath, errors }, null, 2));
if (errors.length > 0) process.exitCode = 1;
