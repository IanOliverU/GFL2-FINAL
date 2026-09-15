import * as THREE from 'three';
import { CEL_BANDS, celGradientMap, type CelBandCount } from './celBands';

/**
 * AD1 material families. Every lit surface in normal Grassland belongs to
 * exactly one family; the family selects the posterization band count.
 * Unlit readability surfaces (telegraphs, health bars, rings, projectiles,
 * damage feedback) stay MeshBasicMaterial and are intentionally not families.
 */
export const CEL_MATERIAL_FAMILIES = [
  'dollSkin',
  'dollHair',
  'dollCloth',
  'dollMetal',
  'varjagerCloth',
  'varjagerArmor',
  'weaponMetal',
  'envConcrete',
  'envSoil',
  'foliage',
  'interactive',
  'skillEmissive',
] as const;

export type CelMaterialFamily = (typeof CEL_MATERIAL_FAMILIES)[number];

/** Environment masses posterize flatter; actors keep the 3-band read. */
export function celFamilyBands(family: CelMaterialFamily): CelBandCount {
  switch (family) {
    case 'envConcrete':
    case 'envSoil':
    case 'foliage':
      return CEL_BANDS.FLAT;
    default:
      return CEL_BANDS.STANDARD;
  }
}

export interface CelToonOptions {
  color: THREE.ColorRepresentation;
  family: CelMaterialFamily;
  emissive?: THREE.ColorRepresentation;
  emissiveIntensity?: number;
  map?: THREE.Texture | null;
  transparent?: boolean;
  opacity?: number;
  alphaTest?: number;
  side?: THREE.Side;
  depthWrite?: boolean;
}

/** Imperative factory (tests, non-JSX owners). JSX call sites use CelSurface. */
export function createCelToonMaterial(options: CelToonOptions): THREE.MeshToonMaterial {
  const material = new THREE.MeshToonMaterial({
    color: options.color,
    gradientMap: celGradientMap(celFamilyBands(options.family)),
  });
  if (options.emissive !== undefined) material.emissive.set(options.emissive);
  if (options.emissiveIntensity !== undefined)
    material.emissiveIntensity = options.emissiveIntensity;
  if (options.map !== undefined) material.map = options.map;
  if (options.transparent !== undefined) material.transparent = options.transparent;
  if (options.opacity !== undefined) material.opacity = options.opacity;
  if (options.alphaTest !== undefined) material.alphaTest = options.alphaTest;
  if (options.side !== undefined) material.side = options.side;
  if (options.depthWrite !== undefined) material.depthWrite = options.depthWrite;
  return material;
}

export interface CelMmdReport {
  total: number;
  toonConverted: number;
  mapsPreserved: number;
  alphaPreserved: number;
  untouched: number;
}

/**
 * AD1 MMD audit: introduce the selected style without destroying face, hair,
 * outfit, alpha, or texture detail. Every MeshToonMaterial keeps its albedo
 * map, color, transparency mode, alpha test, and side; only the gradient map
 * is unified to the shared 3-band AD1 ramp and the pre-existing additive
 * sphere-map sheen attenuation is preserved. Non-toon materials are counted
 * and left untouched.
 */
export function applyCelToMmdMaterials(materials: readonly THREE.Material[]): CelMmdReport {
  const report: CelMmdReport = {
    total: materials.length,
    toonConverted: 0,
    mapsPreserved: 0,
    alphaPreserved: 0,
    untouched: 0,
  };
  for (const material of materials) {
    if (!(material instanceof THREE.MeshToonMaterial)) {
      report.untouched += 1;
      continue;
    }
    if (material.map) report.mapsPreserved += 1;
    if (material.alphaTest > 0 || material.transparent) report.alphaPreserved += 1;
    material.gradientMap = celGradientMap(CEL_BANDS.STANDARD);
    const toon = material as THREE.MeshToonMaterial & {
      envMap?: THREE.Texture | null;
      combine?: unknown;
      envMapIntensity?: number;
    };
    if (toon.envMap !== null && toon.combine === THREE.AddOperation) {
      toon.envMapIntensity = 0.4;
    }
    material.needsUpdate = true;
    report.toonConverted += 1;
  }
  return report;
}
