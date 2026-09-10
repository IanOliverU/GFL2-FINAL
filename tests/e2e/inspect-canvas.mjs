import { chromium } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import { PNG } from 'pngjs';

const url = process.env.GAME_URL ?? 'http://127.0.0.1:4173/?e2e=1';
const state = process.env.GAME_STATE ?? 'active-third';
const browser = await chromium.launch({ channel: 'chromium' });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const errors = [];
page.on('pageerror', (error) => errors.push(`page: ${error.message}`));
page.on('console', (message) => {
  if (message.type() === 'error') errors.push(`console: ${message.text()}`);
});

await page.goto(url, { waitUntil: 'networkidle' });
await page.evaluate(async (requested) => {
  const hooks = window.__THREE_GAME_TEST_HOOKS__;
  if (!hooks) throw new Error('Test hooks unavailable; use ?e2e=1.');
  const applied = await hooks.setState(requested);
  if (applied.state !== requested)
    throw new Error(`Expected ${requested}, received ${applied.state}.`);
  hooks.setPausedForScreenshot(true);
}, state);
await page.waitForTimeout(300);

const canvas = page.locator('canvas').first();
const image = await canvas.screenshot();
const png = PNG.sync.read(image);
const colors = new Set();
let minLuminance = 255;
let maxLuminance = 0;
for (let index = 0; index < png.data.length; index += 32) {
  const red = png.data[index] ?? 0;
  const green = png.data[index + 1] ?? 0;
  const blue = png.data[index + 2] ?? 0;
  colors.add(`${red >> 4}-${green >> 4}-${blue >> 4}`);
  const luminance = Math.round(red * 0.2126 + green * 0.7152 + blue * 0.0722);
  minLuminance = Math.min(minLuminance, luminance);
  maxLuminance = Math.max(maxLuminance, luminance);
}
const diagnostics = await page.evaluate(() => window.__THREE_GAME_DIAGNOSTICS__ ?? null);
const context = await page.evaluate(() => {
  const canvas = document.querySelector('canvas');
  const gl = canvas?.getContext('webgl2') ?? canvas?.getContext('webgl');
  if (!gl) return null;
  const extension = gl.getExtension('WEBGL_debug_renderer_info');
  return extension
    ? {
        renderer: String(gl.getParameter(extension.UNMASKED_RENDERER_WEBGL)),
        vendor: String(gl.getParameter(extension.UNMASKED_VENDOR_WEBGL)),
      }
    : {
        renderer: String(gl.getParameter(gl.RENDERER)),
        vendor: String(gl.getParameter(gl.VENDOR)),
      };
});

await mkdir('artifacts/screenshots', { recursive: true });
await mkdir('artifacts/performance', { recursive: true });
await writeFile(`artifacts/screenshots/inspection-${state}.png`, image);
const report = {
  url,
  state,
  viewport: { width: 1440, height: 900 },
  nonblank: colors.size > 24 && maxLuminance - minLuminance > 45,
  sampledColors: colors.size,
  luminanceContrast: maxLuminance - minLuminance,
  errors,
  gpu: context,
  softwareRendered: /swiftshader|llvmpipe|software/i.test(context?.renderer ?? ''),
  diagnostics,
};
await writeFile(
  `artifacts/performance/inspection-${state}.json`,
  `${JSON.stringify(report, null, 2)}\n`,
);
await browser.close();

if (!report.nonblank || errors.length > 0) {
  console.error(JSON.stringify(report, null, 2));
  process.exitCode = 1;
} else {
  console.log(JSON.stringify(report, null, 2));
}
