import { describe, expect, it } from 'vitest';
import {
  ART_COMPARE_MODES,
  ART_STUDY,
  requestedArtCompareView,
} from '../../src/render/artcompare/artCompareMode';
import { artCameraForView } from '../../src/render/artcompare/artCamera';

describe('AD0 comparison scene contract', () => {
  it('exposes exactly three comparison modes', () => {
    expect([...ART_COMPARE_MODES]).toEqual(['cel3d', 'pixel3d', 'pixel2d']);
  });

  it('shares actor transforms across all modes', () => {
    expect(ART_STUDY.tololoPosition).toEqual([0, 0, 0]);
    expect(ART_STUDY.ladePosition).toEqual([1.8, 0, 6]);
    expect(ART_STUDY.tololoHeight).toBe(1.72);
    expect(ART_STUDY.ladeHeight).toBe(1.75);
    expect(ART_STUDY.groundSize).toEqual([30, 30]);
  });

  it('shares camera conditions via one preset function', () => {
    const third = artCameraForView('third');
    const ads = artCameraForView('ads');
    const top = artCameraForView('top');
    expect(third.fov).toBe(56);
    expect(ads.fov).toBe(48);
    expect(top.fov).toBe(46);
    expect(artCameraForView('third')).toEqual(third);
    expect(artCameraForView('silhouette').lookAt).toEqual([0.9, 1.0, 3]);
  });

  it('shares animation and telegraph timing', () => {
    expect(ART_STUDY.telegraphPeriod).toBe(2.4);
    expect(ART_STUDY.telegraphOnset).toBe(1.2);
    expect(ART_STUDY.muzzlePeriod).toBe(3.0);
    expect(ART_STUDY.muzzleFlashTime).toBe(0.09);
    expect(ART_STUDY.impactTime).toBe(0.22);
  });

  it('falls back to third-person view for unknown artView values', () => {
    expect(requestedArtCompareView()).toBe('third');
  });

  it('keeps output resolution fixed for comparable evidence', () => {
    expect(ART_STUDY.outputSize).toEqual([1280, 720]);
  });
});
