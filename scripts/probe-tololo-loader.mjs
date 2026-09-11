import { chromium } from '@playwright/test';

const url = process.env.GAME_URL ?? 'http://127.0.0.1:5173/';
const browser = await chromium.launch({ channel: 'chromium' });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const errors = [];
page.on('pageerror', (error) => errors.push(`page: ${error.message}`));
page.on('console', (message) => {
  if (message.type() === 'error') errors.push(`console: ${message.text()}`);
});

await page.goto(url, { waitUntil: 'networkidle' });
const result = await page.evaluate(async () => {
  const module = await import('/src/render/assets/tololoModel.ts');
  const loaded = await module.loadTololoModel();
  const result = {
    diagnostics: loaded.diagnostics,
    meshName: loaded.mesh.name,
    materialNames: (Array.isArray(loaded.mesh.material)
      ? loaded.mesh.material
      : [loaded.mesh.material]
    ).map((material) => material.name),
    firstBones: loaded.mesh.skeleton.bones.slice(0, 16).map((bone) => bone.name),
  };
  module.disposeTololoModel(loaded.mesh);
  return result;
});

await browser.close();
console.log(JSON.stringify({ url, result, errors }, null, 2));
if (errors.length > 0 || result.diagnostics.resourceErrors.length > 0) process.exitCode = 1;
