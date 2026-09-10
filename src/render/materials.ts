import * as THREE from 'three';

export const worldPalette = {
  skyTop: '#68a9d7',
  skyHorizon: '#d7e5d3',
  cloud: '#f1eee3',
  grass: '#718b50',
  grassDark: '#3f5935',
  hillFar: '#577057',
  hillNear: '#425f43',
  ink: '#171819',
  armor: '#d5cbbd',
  orange: '#f05a28',
  warning: '#c93b2f',
  cyan: '#55b9c6',
  gold: '#d9a441',
} as const;

export function createTerrainTexture(size = 256): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('Canvas 2D context unavailable for terrain texture.');

  const gradient = context.createLinearGradient(0, 0, size, size);
  gradient.addColorStop(0, '#657d47');
  gradient.addColorStop(0.48, '#82965b');
  gradient.addColorStop(1, '#536e40');
  context.fillStyle = gradient;
  context.fillRect(0, 0, size, size);

  for (let y = 0; y < size; y += 8) {
    for (let x = 0; x < size; x += 8) {
      const noise = (Math.sin(x * 12.91 + y * 31.17) + 1) * 0.5;
      context.fillStyle = noise > 0.55 ? 'rgba(226,218,164,.045)' : 'rgba(29,51,25,.045)';
      context.fillRect(x, y, 8, 8);
    }
  }

  context.strokeStyle = 'rgba(39,61,31,.13)';
  context.lineWidth = 1;
  for (let i = -size; i < size * 2; i += 42) {
    context.beginPath();
    context.moveTo(i, 0);
    context.lineTo(i + size * 0.7, size);
    context.stroke();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(18, 18);
  texture.anisotropy = 4;
  return texture;
}
