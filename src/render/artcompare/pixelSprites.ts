import * as THREE from 'three';

export type PixelActor = 'tololo' | 'lade';
export type PixelDir = 'front' | 'back' | 'left' | 'right';

/**
 * Smallest honest 2.5D sprite source: code-generated pixel silhouettes derived
 * locally from the study palette/scales (not hand-drawn production sprites).
 * Tololo: pale hair + dark outfit; Lade: olive coat + pale mask lenses.
 * 48x64 px, NearestFilter, 4 directions x 2 frames. Directional popping is
 * intentional and must be shown honestly in evidence.
 */

const W = 48;
const H = 64;

function paint(
  ctx: CanvasRenderingContext2D,
  actor: PixelActor,
  dir: PixelDir,
  frame: number,
): void {
  ctx.clearRect(0, 0, W, H);
  const bob = frame === 0 ? 0 : 2;
  if (actor === 'tololo') {
    ctx.fillStyle = '#e8e4da';
    ctx.fillRect(18, 4 + bob, 12, 10);
    ctx.fillStyle = '#f2eee6';
    if (dir === 'left') ctx.fillRect(12, 6 + bob, 8, 8);
    if (dir === 'right') ctx.fillRect(28, 6 + bob, 8, 8);
    ctx.fillStyle = '#23262b';
    ctx.fillRect(16, 16 + bob, 16, 24);
    ctx.fillStyle = '#3a3f45';
    ctx.fillRect(14, 20 + bob, 4, 12);
    ctx.fillRect(30, 20 + bob, 4, 12);
    ctx.fillStyle = '#14161a';
    ctx.fillRect(17, 40 + bob, 5, 18 - bob);
    ctx.fillRect(26, 40 + bob, 5, 18 - (frame === 0 ? 0 : 2));
    ctx.fillStyle = '#1b1e20';
    const gun = dir === 'back' ? -1 : 1;
    ctx.fillRect(dir === 'left' ? 4 : dir === 'right' ? 36 : 20 + gun * 4, 26 + bob, 10, 3);
  } else {
    ctx.fillStyle = '#5a5f43';
    ctx.fillRect(14, 16 + bob, 20, 26);
    ctx.fillStyle = '#474b36';
    ctx.fillRect(12, 20 + bob, 5, 14);
    ctx.fillRect(31, 20 + bob, 5, 14);
    ctx.fillStyle = '#2b2d2c';
    ctx.fillRect(18, 6 + bob, 12, 10);
    ctx.fillStyle = '#cfe3dd';
    ctx.fillRect(19, 9 + bob, 4, 4);
    ctx.fillRect(25, 9 + bob, 4, 4);
    ctx.fillStyle = '#8d87a0';
    ctx.fillRect(16, 15 + bob, 16, 3);
    ctx.fillStyle = '#7d4a2d';
    const bx = dir === 'left' ? 6 : dir === 'right' ? 36 : 32;
    ctx.fillRect(bx, 12 + bob, 4, 26);
    ctx.fillStyle = '#14161a';
    ctx.fillRect(16, 42 + bob, 6, 16 - bob);
    ctx.fillRect(26, 42 + bob, 6, 16 - (frame === 0 ? 0 : 2));
  }
  if (dir === 'back') {
    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    ctx.fillRect(0, 0, W, H);
  }
}

const cache = new Map<string, THREE.CanvasTexture>();

export function pixelSpriteTexture(
  actor: PixelActor,
  dir: PixelDir,
  frame: number,
): THREE.CanvasTexture {
  const key = `${actor}/${dir}/${frame}`;
  const hit = cache.get(key);
  if (hit) return hit;
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas 2D unavailable for pixel sprites.');
  paint(ctx, actor, dir, frame);
  const texture = new THREE.CanvasTexture(canvas);
  texture.magFilter = THREE.NearestFilter;
  texture.minFilter = THREE.NearestFilter;
  texture.generateMipmaps = false;
  texture.colorSpace = THREE.SRGBColorSpace;
  cache.set(key, texture);
  return texture;
}

export function quantizePixelDir(yaw: number): PixelDir {
  const a = Math.atan2(Math.sin(yaw), Math.cos(yaw));
  if (Math.abs(a) < Math.PI / 4) return 'front';
  if (Math.abs(a) > (3 * Math.PI) / 4) return 'back';
  return a > 0 ? 'right' : 'left';
}

export function disposePixelSpriteCache(): number {
  let count = 0;
  for (const texture of cache.values()) {
    texture.dispose();
    count += 1;
  }
  cache.clear();
  return count;
}
