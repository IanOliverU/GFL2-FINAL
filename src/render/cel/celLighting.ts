/**
 * AD1 Grassland lighting foundation: overcast late afternoon. One soft main
 * directional light, broad cool ambient fill, one restrained cool rim for
 * character separation, muted fog that never obscures ordinary combat range.
 * No bloom, no extra real-time lights, no full-scene passes.
 */
export const celLighting = {
  sun: {
    color: '#ffe9c4',
    intensity: 2.3,
    position: [-22, 31, -18] as const,
  },
  hemisphere: {
    sky: '#cfd8cd',
    ground: '#3d4a38',
    intensity: 1.15,
  },
  rim: {
    color: '#bcd4ff',
    intensity: 0.5,
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
