import { Canvas } from '@react-three/fiber';
import { useEffect } from 'react';
import * as THREE from 'three';
import {
  ART_COMPARE_LABELS,
  ART_STUDY,
  requestedArtCompareLight,
  requestedArtCompareTime,
  requestedArtCompareView,
  type ArtCompareLight,
  type ArtCompareMode,
} from './artCompareMode';
import { ArtStudyInner } from './ArtStudyScene';
import { artCameraForView } from './artCamera';

declare global {
  interface Window {
    __GFL2_ART_COMPARE__?: {
      mode: ArtCompareMode;
      view: string;
      light: ArtCompareLight;
      time: number;
      ready: boolean;
      disposals: number;
    };
    __GFL2_ART_RENDERER__?: {
      calls: number;
      triangles: number;
      geometries: number;
      textures: number;
    } | null;
  }
}

export function ArtCompareApp({ mode }: { mode: ArtCompareMode }) {
  const view = requestedArtCompareView();
  const time = requestedArtCompareTime();
  const light = requestedArtCompareLight();
  const camera = artCameraForView(view);
  const pixelated = mode === 'pixel3d';

  useEffect(() => {
    window.__GFL2_ART_COMPARE__ = { mode, view, light, time, ready: true, disposals: 0 };
    return () => {
      if (window.__GFL2_ART_COMPARE__) window.__GFL2_ART_COMPARE__.disposals += 1;
      THREE.Cache.clear();
    };
  }, [mode, view, light, time]);

  return (
    <div
      className="gfl-art-compare"
      data-art-mode={mode}
      data-art-view={view}
      style={{ position: 'absolute', inset: 0, background: '#0e1113' }}
    >
      <Canvas
        dpr={mode === 'pixel3d' ? [0.5, 0.5] : [1, 1.5]}
        shadows={mode !== 'pixel2d'}
        camera={{ position: camera.position, fov: camera.fov, near: 0.08, far: 180 }}
        gl={{ antialias: mode === 'cel3d', alpha: false, powerPreference: 'high-performance' }}
        style={pixelated ? { imageRendering: 'pixelated' } : undefined}
        onCreated={({ camera: active, scene, gl }) => {
          active.lookAt(new THREE.Vector3(...camera.lookAt));
          scene.fog = new THREE.Fog('#9db8c9', 30, 90);
          try {
            active.updateProjectionMatrix();
          } catch {
            /* noop for evidence harness */
          }
          const info = gl.info;
          window.__GFL2_ART_RENDERER__ = {
            calls: info.render.calls,
            triangles: info.render.triangles,
            geometries: info.memory.geometries,
            textures: info.memory.textures,
          };
        }}
      >
        <ArtStudyInner mode={mode} view={view} time={time} light={light} />
      </Canvas>
      <div className="gfl-art-compare__label" data-testid="art-compare-label">
        <strong>{ART_COMPARE_LABELS[mode]}</strong>
        <span>
          {view} · {light} light · t={time.toFixed(2)}s · study {ART_STUDY.groundSize[0]}x
          {ART_STUDY.groundSize[1]}m
        </span>
      </div>
      {mode === 'pixel2d' && (
        <div className="gfl-art-compare__note" data-testid="pixel2d-note">
          2.5D billboard prototype — 4 directions × 2 frames per actor. Rotation popping is
          expected.
        </div>
      )}
      <div className="gfl-crosshair" aria-hidden="true">
        <i />
        <i />
        <i />
        <i />
      </div>
    </div>
  );
}
