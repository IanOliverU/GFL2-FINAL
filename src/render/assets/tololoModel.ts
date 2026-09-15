import * as THREE from 'three';
import { MMDLoader } from 'three-stdlib';
import { applyCelToMmdMaterials } from '../cel/celMaterial';

export const TOLOLO_MODEL_URL =
  '/__local-mmd/Tololo%20(Default)/GirlsFrontline%20TololoDefault.pmx';
export const TOLOLO_TARGET_HEIGHT = 1.72;
export const TOLOLO_RAW_BOUNDS = {
  min: [-7.238325595855713, -0.000019397461073822342, -3.83981990814209] as const,
  max: [7.2383270263671875, 20.002002716064453, 1.7889755964279175] as const,
  size: [14.4766526222229, 20.002022113525527, 5.628795504570007] as const,
};
export const TOLOLO_SCALE = TOLOLO_TARGET_HEIGHT / TOLOLO_RAW_BOUNDS.size[1];
export const TOLOLO_GROUND_OFFSET = -TOLOLO_RAW_BOUNDS.min[1] * TOLOLO_SCALE;

const TRANSPARENT_PIXEL =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4z8DwHwAFgAI/ScL3WQAAAABJRU5ErkJggg==';

export interface TololoModelDiagnostics {
  format: 'pmx-direct';
  sourceUrl: string;
  loadMs: number;
  skinnedMeshes: number;
  vertices: number;
  triangles: number;
  materials: number;
  textures: number;
  bones: number;
  morphs: number;
  rawBounds: typeof TOLOLO_RAW_BOUNDS;
  targetHeight: number;
  scale: number;
  groundingOffset: number;
  resourceErrors: readonly string[];
}

export interface LoadedTololoModel {
  mesh: THREE.SkinnedMesh;
  diagnostics: TololoModelDiagnostics;
}

function normalizeResourceUrl(url: string): string {
  const normalized = url.replaceAll('\\', '/');
  const path = decodeURIComponent(normalized.split('?')[0] ?? normalized).replace(/\/+$/, '');
  if (/\/(spa|textures)$/i.test(path)) return TRANSPARENT_PIXEL;
  return normalized;
}

function countUniqueTextures(materials: readonly THREE.Material[]): number {
  const textures = new Set<THREE.Texture>();
  for (const material of materials) {
    for (const value of Object.values(material)) {
      if (value instanceof THREE.Texture) textures.add(value);
    }
  }
  return textures.size;
}

export async function loadTololoModel(): Promise<LoadedTololoModel> {
  const startedAt = performance.now();
  const resourceErrors: string[] = [];
  const manager = new THREE.LoadingManager();
  manager.setURLModifier(normalizeResourceUrl);
  manager.onError = (url) => resourceErrors.push(url);
  const resourcesSettled = new Promise<void>((resolve) => {
    manager.onLoad = resolve;
  });
  const loader = new MMDLoader(manager);
  const mesh = await loader.loadAsync(TOLOLO_MODEL_URL);
  await resourcesSettled;

  mesh.name = 'tololo-default-pmx';
  mesh.geometry.computeBoundingBox();
  mesh.geometry.computeBoundingSphere();
  mesh.frustumCulled = true;
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
  for (const material of materials) {
    material.name ||= 'tololo-mmd-material';
    if (material instanceof THREE.MeshToonMaterial) {
      if (material.map) material.map.colorSpace = THREE.SRGBColorSpace;
      if (material.name === 'EyeShadow') material.alphaTest = 0.01;
    }
  }
  // AD1 audit: unify the loader's toon materials on the shared 3-band ramp
  // while preserving albedo maps, alpha, transparency, and the attenuated
  // additive sphere-map sheen. Face, hair, outfit, and texture detail stay
  // exactly as authored; only the lighting response is posterized.
  applyCelToMmdMaterials(materials);

  return {
    mesh,
    diagnostics: {
      format: 'pmx-direct',
      sourceUrl: TOLOLO_MODEL_URL,
      loadMs: performance.now() - startedAt,
      skinnedMeshes: 1,
      vertices: mesh.geometry.getAttribute('position')?.count ?? 0,
      triangles: mesh.geometry.index ? mesh.geometry.index.count / 3 : 0,
      materials: materials.length,
      textures: countUniqueTextures(materials),
      bones: mesh.skeleton.bones.length,
      morphs: Object.keys(mesh.morphTargetDictionary ?? {}).length,
      rawBounds: TOLOLO_RAW_BOUNDS,
      targetHeight: TOLOLO_TARGET_HEIGHT,
      scale: TOLOLO_SCALE,
      groundingOffset: TOLOLO_GROUND_OFFSET,
      resourceErrors,
    },
  };
}

export function disposeTololoModel(mesh: THREE.SkinnedMesh): void {
  const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
  const textures = new Set<THREE.Texture>();
  for (const material of materials) {
    for (const value of Object.values(material)) {
      if (value instanceof THREE.Texture) textures.add(value);
    }
    material.dispose();
  }
  for (const texture of textures) texture.dispose();
  mesh.geometry.dispose();
  mesh.skeleton.dispose();
}
