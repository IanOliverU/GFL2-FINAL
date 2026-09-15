import { useThree } from '@react-three/fiber';
import { useEffect } from 'react';
import * as THREE from 'three';
import { CEL_BANDS } from './celBands';

declare global {
  interface Window {
    __GFL2_CEL_STYLE__?: {
      style: 'cel-shaded-3d';
      actorBands: number;
      envBands: number;
      globalOutlinePass: false;
      fog: { color: string; near: number; far: number } | null;
    };
  }
}

/**
 * AD1 style tag: publishes the active rendering-direction facts for browser
 * regression tests (selected style, band configuration, no global outline
 * pass, live fog parameters). Observational only; never affects rendering.
 */
export function CelStyleTag() {
  const scene = useThree((state) => state.scene);
  useEffect(() => {
    const fog = scene.fog;
    window.__GFL2_CEL_STYLE__ = {
      style: 'cel-shaded-3d',
      actorBands: CEL_BANDS.STANDARD,
      envBands: CEL_BANDS.FLAT,
      globalOutlinePass: false,
      fog:
        fog instanceof THREE.Fog
          ? { color: `#${fog.color.getHexString()}`, near: fog.near, far: fog.far }
          : null,
    };
  }, [scene]);
  return null;
}
