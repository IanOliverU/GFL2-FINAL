import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import {
  CEL_BANDS,
  CEL_GRADIENT_STOPS,
  celGradientMap,
  disposeCelGradientMaps,
} from '../../src/render/cel/celBands';
import {
  applyCelToMmdMaterials,
  CEL_MATERIAL_FAMILIES,
  celFamilyBands,
  createCelToonMaterial,
} from '../../src/render/cel/celMaterial';
import { celLighting } from '../../src/render/cel/celLighting';
import { celPalette } from '../../src/render/cel/celPalette';
import { bossWeakPointOutline } from '../../src/render/cel/outlinePolicy';
import celSurfaceRaw from '../../src/render/cel/CelSurface.tsx?raw';
import contextOutlineRaw from '../../src/render/cel/ContextualOutline.tsx?raw';
import wardenRaw from '../../src/render/actors/WardenBoss.tsx?raw';
import gameSceneRaw from '../../src/render/scene/GameScene.tsx?raw';
import grasslandRaw from '../../src/render/world/GrasslandWorld.tsx?raw';

describe('AD1 cel-shaded direction tokens', () => {
  it('pins the provisional palette (never canonical GFL2 values)', () => {
    expect(celPalette.grassGround).toBe('#6b8452');
    expect(celPalette.fogColor).toBe('#c3cfc6');
    expect(celPalette.skyTop).toBe('#7fa8c8');
    expect(celPalette.skillCyan).toBe('#55b9c6');
    expect(celPalette.ultimateGold).toBe('#d9a441');
    expect(celPalette.telegraphRed).toBe('#c93b2f');
    expect(celPalette.interactOrange).toBe('#f05a28');
    expect(celPalette.weakPointAmber).toBe('#ffb347');
  });

  it('configures two shared lighting bands (3 actor, 2 environment)', () => {
    expect(CEL_BANDS.STANDARD).toBe(3);
    expect(CEL_BANDS.FLAT).toBe(2);
    expect(CEL_GRADIENT_STOPS[CEL_BANDS.STANDARD]).toEqual([120, 180, 255]);
    expect(CEL_GRADIENT_STOPS[CEL_BANDS.FLAT]).toEqual([150, 255]);
    const standard = celGradientMap(CEL_BANDS.STANDARD);
    expect(standard).toBe(celGradientMap(CEL_BANDS.STANDARD));
    expect(standard.minFilter).toBe(THREE.NearestFilter);
    expect(standard.magFilter).toBe(THREE.NearestFilter);
  });

  it('covers all twelve material families with band assignments', () => {
    expect(CEL_MATERIAL_FAMILIES).toHaveLength(12);
    for (const family of [
      'dollSkin',
      'dollHair',
      'dollCloth',
      'dollMetal',
      'varjagerCloth',
      'varjagerArmor',
      'weaponMetal',
      'interactive',
      'skillEmissive',
    ] as const) {
      expect(celFamilyBands(family)).toBe(CEL_BANDS.STANDARD);
    }
    for (const family of ['envConcrete', 'envSoil', 'foliage'] as const) {
      expect(celFamilyBands(family)).toBe(CEL_BANDS.FLAT);
    }
  });

  it('builds toon materials on the shared ramp without per-object shaders', () => {
    const first = createCelToonMaterial({ color: '#5a5f43', family: 'varjagerCloth' });
    const second = createCelToonMaterial({ color: '#3a3b39', family: 'varjagerArmor' });
    expect(first).toBeInstanceOf(THREE.MeshToonMaterial);
    expect(first.gradientMap).toBe(celGradientMap(CEL_BANDS.STANDARD));
    expect(second.gradientMap).toBe(first.gradientMap);
    const flat = createCelToonMaterial({ color: '#6b8452', family: 'foliage' });
    expect(flat.gradientMap).toBe(celGradientMap(CEL_BANDS.FLAT));
    const emissive = createCelToonMaterial({
      color: '#cfe3dd',
      family: 'varjagerArmor',
      emissive: '#cfe3dd',
      emissiveIntensity: 1.4,
    });
    expect(emissive.emissiveIntensity).toBe(1.4);
    first.dispose();
    second.dispose();
    flat.dispose();
    emissive.dispose();
  });

  it('audits MMD materials without destroying face, hair, outfit, or alpha', () => {
    const map = new THREE.Texture();
    const skin = new THREE.MeshToonMaterial({ color: '#f2d7c4', map });
    skin.alphaTest = 0.5;
    const hair = new THREE.MeshToonMaterial({ color: '#e8e4da', transparent: true });
    const legacy = new THREE.MeshStandardMaterial({ color: '#222222' });
    const report = applyCelToMmdMaterials([skin, hair, legacy]);
    expect(report).toEqual({
      total: 3,
      toonConverted: 2,
      mapsPreserved: 1,
      alphaPreserved: 2,
      untouched: 1,
    });
    for (const material of [skin, hair]) {
      expect(material.map).toBe(material === skin ? map : null);
      expect(material.gradientMap).toBe(celGradientMap(CEL_BANDS.STANDARD));
    }
    expect(skin.alphaTest).toBe(0.5);
    expect(hair.transparent).toBe(true);
    expect('gradientMap' in legacy).toBe(false);
    map.dispose();
    skin.dispose();
    hair.dispose();
    legacy.dispose();
  });

  it('attenuates additive sphere-map sheen while keeping albedo', () => {
    const sheen = new THREE.MeshToonMaterial({ color: '#ffffff' }) as THREE.MeshToonMaterial & {
      envMap: THREE.Texture | null;
      combine: unknown;
      envMapIntensity: number;
    };
    sheen.envMap = new THREE.Texture();
    sheen.combine = THREE.AddOperation;
    applyCelToMmdMaterials([sheen]);
    expect(sheen.envMapIntensity).toBe(0.4);
    expect(sheen.color.getHexString()).toBe('ffffff');
    sheen.envMap.dispose();
    sheen.dispose();
  });

  it('keeps shared ramps alive across per-material dispose', () => {
    const before = celGradientMap(CEL_BANDS.STANDARD);
    createCelToonMaterial({ color: '#111111', family: 'dollCloth' }).dispose();
    expect(celGradientMap(CEL_BANDS.STANDARD)).toBe(before);
    disposeCelGradientMaps();
    expect(celGradientMap(CEL_BANDS.STANDARD)).not.toBe(before);
  });
});

describe('AD1 lighting, fog, and outline policy', () => {
  it('locks the overcast late-afternoon rig and muted fog', () => {
    expect(celLighting.sun).toMatchObject({ color: '#ffe9c4', intensity: 2.3 });
    expect(celLighting.hemisphere).toMatchObject({ intensity: 1.15 });
    expect(celLighting.rim).toMatchObject({ color: '#bcd4ff', intensity: 0.5 });
    expect(celLighting.fog).toMatchObject({ color: '#c3cfc6', near: 54, far: 118 });
    expect(celLighting.fog.far).toBeGreaterThan(100);
  });

  it('gates the weak-point outline to readable threat states only', () => {
    expect(bossWeakPointOutline({ vulnerable: false, telegraph: null })).toBeNull();
    expect(bossWeakPointOutline({ vulnerable: true, telegraph: null })).toEqual({
      color: '#d9a441',
      opacity: 0.55,
    });
    expect(bossWeakPointOutline({ vulnerable: false, telegraph: 'slam' })).toEqual({
      color: '#c93b2f',
      opacity: 0.3,
    });
  });

  it('ships no global heavy-outline pass', () => {
    for (const [name, source] of [
      ['GameScene', gameSceneRaw],
      ['GrasslandWorld', grasslandRaw],
      ['WardenBoss', wardenRaw],
    ] as const) {
      expect(source, name).not.toContain('OutlinePass');
      expect(source, name).not.toContain('EffectComposer');
    }
    expect(contextOutlineRaw).toContain('BackSide');
    expect(contextOutlineRaw).not.toContain('OutlinePass');
  });

  it('uses the contextual outline only for the boss weak point', () => {
    expect(wardenRaw).toContain('ContextualOutline');
    expect(wardenRaw).toContain('bossWeakPointOutline');
    expect(gameSceneRaw).not.toContain('ContextualOutline');
    expect(grasslandRaw).not.toContain('ContextualOutline');
    expect(celSurfaceRaw).not.toContain('roughness?:');
    expect(celSurfaceRaw).not.toContain('metalness?:');
  });
});
