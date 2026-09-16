import * as THREE from 'three';
import { describe, expect, it, vi } from 'vitest';
import {
  LADE_MAX_TRIANGLES,
  disposeLoadedScene,
  validateLadeFixture,
} from '../../src/render/modelreview/modelReviewState';
import { requestedModelReview } from '../../src/render/modelreview/modelReviewMode';
import fixture from '../../src/render/modelreview/ladeCandidate.fixture.json';
import modelReviewRaw from '../../src/render/modelreview/ModelReviewApp.tsx?raw';
import appRaw from '../../src/app/App.tsx?raw';

describe('AD2A Lade candidate fixture', () => {
  it('passes structural validation (height, grounding, budgets, names)', () => {
    expect(validateLadeFixture(fixture)).toEqual([]);
  });

  it('stays inside the triangle budget with zero textures', () => {
    const typed = fixture as { totals: { triangleCount: number }; textureCount: number };
    expect(typed.totals.triangleCount).toBeGreaterThan(0);
    expect(typed.totals.triangleCount).toBeLessThanOrEqual(LADE_MAX_TRIANGLES);
    expect(typed.textureCount).toBe(0);
  });

  it('rejects bad fixtures without weakening the gate', () => {
    const typed = fixture as Record<string, unknown>;
    expect(validateLadeFixture(null)).not.toEqual([]);
    expect(validateLadeFixture({ ...typed, height: 2.4 })).not.toEqual([]);
    expect(
      validateLadeFixture({ ...typed, totals: { triangleCount: LADE_MAX_TRIANGLES + 1 } }),
    ).not.toEqual([]);
    expect(validateLadeFixture({ ...typed, textureCount: 1 })).not.toEqual([]);
    expect(validateLadeFixture({ ...typed, objectNames: [] })).not.toEqual([]);
    expect(
      validateLadeFixture({
        ...typed,
        materialFamilies: { M_Olive: 'someone-elses-shader' },
      }),
    ).not.toEqual([]);
    expect(
      validateLadeFixture({
        ...typed,
        objectNames: [...(typed.objectNames as string[]), 'Felagi.webp'],
      }),
    ).not.toEqual([]);
  });
});

describe('AD2A review route gating', () => {
  it('stays disabled outside a dev browser (node has no window)', () => {
    expect(requestedModelReview()).toBeNull();
  });

  it('wires the dev-only route without touching normal gameplay', () => {
    expect(appRaw).toContain('requestedModelReview');
    expect(appRaw).toContain('ModelReviewApp');
    expect(appRaw).not.toContain('lade-candidate');
  });

  it('never references the protected reference image', () => {
    expect(modelReviewRaw.toLowerCase()).not.toContain('webp');
    expect(modelReviewRaw).not.toContain('Felagi');
    expect(modelReviewRaw).not.toContain('__local-mmd');
  });
});

describe('AD2A resource disposal', () => {
  it('traverse-disposes geometries, materials, and textures', () => {
    const scene = new THREE.Group();
    const geometry = new THREE.BoxGeometry(1, 1, 1);
    const texture = new THREE.DataTexture(new Uint8Array(4), 1, 1);
    const material = new THREE.MeshStandardMaterial({ map: texture });
    scene.add(new THREE.Mesh(geometry, material));
    const disposeMaterial = vi.spyOn(material, 'dispose');
    const disposeGeometry = vi.spyOn(geometry, 'dispose');
    const disposeTexture = vi.spyOn(texture, 'dispose');
    disposeLoadedScene(scene);
    expect(disposeMaterial).toHaveBeenCalled();
    expect(disposeGeometry).toHaveBeenCalled();
    expect(disposeTexture).toHaveBeenCalled();
  });
});
