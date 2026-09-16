import * as THREE from 'three';

/**
 * AD1 posterized lighting bands. Two shared gradient maps cover every
 * toon material in the game so repeated objects reuse one texture and one
 * compiled program family instead of duplicating shaders per object:
 * - STANDARD (3 bands): characters, enemies, bosses, weapons, interactables.
 * - FLAT (2 bands): environment masses, foliage, ground (calmer response).
 *
 * Gradient values are light multipliers: shadow band, mid band, lit band.
 * NearestFilter keeps the band edges hard (posterized, not smooth).
 *
 * AD1.1 correction: STANDARD lit 255 to 240 gives near-white cloth/hair a
 * 6% headroom against clipping so highlight gradation survives ACES, mid
 * 180 to 170 deepens the lit/mid step for hair and clothing volume, shadow
 * stays 120 to keep dark accessories distinguishable. FLAT floor
 * 150 to 175 lifts the cone/ground shadow minimum (0.588 to 0.686) so dark
 * foliage stops reading near-black; environment lit stays 1.0.
 */
export const CEL_BANDS = { FLAT: 2, STANDARD: 3 } as const;
export type CelBandCount = (typeof CEL_BANDS)[keyof typeof CEL_BANDS];

export const CEL_GRADIENT_STOPS: Record<CelBandCount, readonly number[]> = {
  [CEL_BANDS.FLAT]: [175, 255],
  [CEL_BANDS.STANDARD]: [120, 170, 240],
};

const gradientCache = new Map<CelBandCount, THREE.DataTexture>();

export function celGradientMap(bands: CelBandCount): THREE.DataTexture {
  const cached = gradientCache.get(bands);
  if (cached) return cached;
  const stops = CEL_GRADIENT_STOPS[bands];
  const data = new Uint8Array(stops.length * 4);
  for (let index = 0; index < stops.length; index += 1) {
    const value = stops[index] ?? 255;
    data[index * 4] = value;
    data[index * 4 + 1] = value;
    data[index * 4 + 2] = value;
    data[index * 4 + 3] = 255;
  }
  const texture = new THREE.DataTexture(data, stops.length, 1, THREE.RGBAFormat);
  texture.minFilter = THREE.NearestFilter;
  texture.magFilter = THREE.NearestFilter;
  texture.generateMipmaps = false;
  texture.needsUpdate = true;
  gradientCache.set(bands, texture);
  return texture;
}

/** App-teardown only. Per-material dispose must never free the shared maps. */
export function disposeCelGradientMaps(): void {
  for (const texture of gradientCache.values()) texture.dispose();
  gradientCache.clear();
}
