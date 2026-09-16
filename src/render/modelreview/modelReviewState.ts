import * as THREE from 'three';

/**
 * AD2A model-review state helpers. Component-free so unit tests can prove
 * fixture budgets, naming, reference-independence, and resource disposal
 * without a WebGL context.
 */

export const LADE_REQUIRED_OBJECTS = [
  'Lade_Body',
  'Lade_Head',
  'Lade_Mask',
  'Lade_Lenses',
  'Lade_Helmet',
  'Lade_Headlamp',
  'Lade_Scarf',
  'Lade_Vest',
  'Lade_Backpack',
  'Lade_Rifle',
  'Lade_BackBlade',
  'Lade_Armor',
  'Lade_Boot_L',
  'Lade_Boot_R',
] as const;

export const LADE_REQUIRED_SOCKETS = [
  'Socket_Root',
  'Socket_Head',
  'Socket_Hand_Dominant',
  'Socket_Hand_Support',
  'Socket_RifleGrip',
  'Socket_RifleSupport',
  'Socket_Muzzle',
  'Socket_Backpack',
  'Socket_Blade',
  'Socket_AttackOrigin',
] as const;

export const LADE_MAX_TRIANGLES = 40000;
export const LADE_MIN_HEIGHT = 1.85;
export const LADE_MAX_HEIGHT = 1.9;

const AD1_FAMILIES = new Set([
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
]);

interface LadeFixtureShape {
  height?: unknown;
  groundOffset?: unknown;
  totals?: { triangleCount?: unknown };
  textureCount?: unknown;
  objectNames?: unknown;
  socketNames?: unknown;
  materialFamilies?: unknown;
}

/** Returns violation descriptions; empty means the fixture passes. */
export function validateLadeFixture(fixture: unknown): string[] {
  const violations: string[] = [];
  if (typeof fixture !== 'object' || fixture === null) {
    return ['fixture is not an object'];
  }
  const shape = fixture as LadeFixtureShape;
  if (
    typeof shape.height !== 'number' ||
    shape.height < LADE_MIN_HEIGHT ||
    shape.height > LADE_MAX_HEIGHT
  ) {
    violations.push(
      `height ${String(shape.height)} outside ${LADE_MIN_HEIGHT}-${LADE_MAX_HEIGHT} m`,
    );
  }
  if (typeof shape.groundOffset !== 'number' || Math.abs(shape.groundOffset) >= 0.01) {
    violations.push(`groundOffset ${String(shape.groundOffset)} is not grounded at 0`);
  }
  const tris = shape.totals?.triangleCount;
  if (typeof tris !== 'number' || tris <= 0 || tris > LADE_MAX_TRIANGLES) {
    violations.push(`triangleCount ${String(tris)} exceeds budget ${LADE_MAX_TRIANGLES}`);
  }
  if (shape.textureCount !== 0) {
    violations.push(`textureCount ${String(shape.textureCount)} must be 0 (no reference textures)`);
  }
  const objects = Array.isArray(shape.objectNames) ? shape.objectNames : [];
  for (const required of LADE_REQUIRED_OBJECTS) {
    if (!objects.includes(required)) violations.push(`missing required object ${required}`);
  }
  const sockets = Array.isArray(shape.socketNames) ? shape.socketNames : [];
  for (const required of LADE_REQUIRED_SOCKETS) {
    if (!sockets.includes(required)) violations.push(`missing required socket ${required}`);
  }
  if (typeof shape.materialFamilies === 'object' && shape.materialFamilies !== null) {
    for (const [material, family] of Object.entries(shape.materialFamilies)) {
      if (typeof family !== 'string' || !AD1_FAMILIES.has(family)) {
        violations.push(`material ${material} has unknown AD1 family ${String(family)}`);
      }
    }
  } else {
    violations.push('materialFamilies is missing');
  }
  const serialized = JSON.stringify(fixture).toLowerCase();
  for (const forbidden of ['.webp', '.png', '.jpg', 'felagi', '__local-mmd']) {
    if (serialized.includes(forbidden)) {
      violations.push(`fixture references forbidden runtime asset marker ${forbidden}`);
    }
  }
  return violations;
}

/** Traverse-dispose every GPU resource owned by a loaded review scene. */
export function disposeLoadedScene(root: THREE.Object3D): void {
  const geometries = new Set<THREE.BufferGeometry>();
  const materials = new Set<THREE.Material>();
  const textures = new Set<THREE.Texture>();
  root.traverse((object) => {
    const mesh = object as THREE.Mesh;
    if (mesh.geometry instanceof THREE.BufferGeometry) geometries.add(mesh.geometry);
    const material = (mesh as THREE.Mesh).material as
      THREE.Material | readonly THREE.Material[] | undefined;
    const list = Array.isArray(material) ? material : material !== undefined ? [material] : [];
    for (const entry of list) {
      materials.add(entry);
      for (const value of Object.values(entry)) {
        if (value instanceof THREE.Texture) textures.add(value);
      }
    }
  });
  for (const texture of textures) texture.dispose();
  for (const material of materials) material.dispose();
  for (const geometry of geometries) geometry.dispose();
}
