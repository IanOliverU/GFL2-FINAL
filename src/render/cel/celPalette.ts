/**
 * AD1 cel-shading color tokens (provisional production approximations).
 *
 * Hierarchy: muted atmospheric environment, slightly more saturated actors,
 * reserved saturated gameplay accents. Gameplay accent tokens reuse the
 * approved UI palette (signal-orange, warning-red, hydro-cyan, amber-gold,
 * success-green) so world readability and HUD language stay consistent.
 * No value here is claimed as a canonical GFL2 source value.
 */
export const celPalette = {
  // Environment: muted olive, desaturated green, weathered grey, dusty
  // brown, charcoal, low-saturation blue-grey atmosphere.
  grassGround: '#6b8452',
  grassBladeLight: '#7d9a58',
  grassBladeDark: '#496e39',
  hillFar: '#5c6f5c',
  hillNear: '#475c48',
  trunk: '#3d4a3a',
  crown: '#3c5a41',
  concrete: '#8b8d86',
  concreteDark: '#5f615c',
  soil: '#6e5f45',
  rock: '#7d7f78',
  boundary: '#4c5745',
  // Sky and atmosphere: overcast late afternoon, pale sun disc.
  skyTop: '#7fa8c8',
  skyHorizon: '#cfd8cd',
  cloud: '#eceadf',
  sunDisc: '#fff3ce',
  fogColor: '#c3cfc6',
  // Actors: Varjager military materials stay muted; threat accents never
  // borrow Tololo's cyan/gold families.
  varjagerCloth: '#5a5f43',
  varjagerArmor: '#3a3b39',
  varjagerLens: '#cfe3dd',
  varjagerMark: '#d9d6cc',
  weaponMetal: '#2b2b2e',
  weaponWood: '#6e5738',
  weaponSteel: '#9aa0a0',
  rust: '#7d4a2d',
  // Gameplay accents (shared with UI tokens).
  skillCyan: '#55b9c6',
  ultimateGold: '#d9a441',
  telegraphRed: '#c93b2f',
  supportGreen: '#7e9b63',
  interactOrange: '#f05a28',
  weakPointAmber: '#ffb347',
} as const;

export type CelPaletteKey = keyof typeof celPalette;
