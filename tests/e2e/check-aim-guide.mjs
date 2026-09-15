import { chromium } from '@playwright/test';

const base = process.env.GAME_URL ?? 'http://127.0.0.1:4173/?e2e=1';
const browser = await chromium.launch({ channel: 'chromium' });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
page.on('console', (m) => {
  if (m.type() === 'error') errors.push(m.text());
});

await page.goto(base, { waitUntil: 'networkidle' });
await page.getByRole('button', { name: /start run/i }).click();
await page.waitForFunction(() => window.__GFL2_TOLOLO_DIAGNOSTICS__?.loadState === 'loaded');
await page.waitForFunction(() => window.__GFL2_AIM_GUIDE_COUNT__ !== undefined, null, {
  timeout: 10000,
});
const crosshair = await page.locator('.gfl-crosshair').count();
const guide = await page.evaluate(() => window.__GFL2_AIM_GUIDE_COUNT__ ?? null);
const laser = await page.evaluate(() => window.__GFL2_LASER_PREVIEW_COUNT__ ?? null);
const laserBanner = await page.locator('[data-testid="laser-preview-banner"]').count();
const debugCount = await page.evaluate(() => window.__GFL2_SCENE_DEBUG_COUNT__ ?? null);
await browser.close();

const report = {
  crosshairVisible: crosshair === 1,
  aimGuideCount: guide,
  laserPreviewCount: laser,
  laserBannerCount: laserBanner,
  debugHelperCount: debugCount,
  consoleErrors: errors,
  pass: crosshair === 1 && guide === 0 && laser === 0 && laserBanner === 0 && errors.length === 0,
};
console.log(JSON.stringify(report, null, 2));
if (!report.pass) process.exit(1);
