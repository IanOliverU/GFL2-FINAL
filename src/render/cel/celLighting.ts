/**
 * AD1 Grassland lighting foundation: overcast late afternoon. One soft main
 * directional light, broad cool ambient fill, one restrained cool rim for
 * character separation, muted fog that never obscures ordinary combat range.
 * No bloom, no extra real-time lights, no full-scene passes.
 *
 * AD1.1 correction: hemisphere fill 1.15 to 0.80 (indirect light bypasses
 * the toon gradient and was washing every band toward white), sun 2.3 to
 * 1.85 (most pale normals saturated into the lit band and clipped), rim
 * 0.5 to 0.65 (restores cool edge separation after the fill reduction).
 * Authored MMD albedo, exposure, fog, and shadow framing are untouched.
 */
export const celLighting = {
  sun: {
    color: '#ffe9c4',
    intensity: 1.85,
    position: [-22, 31, -18] as const,
  },
  hemisphere: {
    sky: '#cfd8cd',
    ground: '#3d4a38',
    intensity: 0.8,
  },
  rim: {
    color: '#bcd4ff',
    intensity: 0.65,
    position: [6, 3, -8] as const,
  },
  fog: {
    color: '#c3cfc6',
    near: 54,
    far: 118,
  },
  previewFog: {
    near: 45,
    far: 105,
  },
  shadow: {
    mapSize: 1024,
    left: -28,
    right: 28,
    top: 28,
    bottom: -28,
    bias: -0.0004,
  },
} as const;
