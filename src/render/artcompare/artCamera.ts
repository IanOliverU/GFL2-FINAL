import { ART_STUDY, type ArtCompareView } from './artCompareMode';

/**
 * Shared AD0 study cameras. Kept in a component-free module so
 * ArtStudyScene.tsx exports only components (react-refresh/only-export-components).
 */
export function artCameraForView(view: ArtCompareView): {
  position: [number, number, number];
  lookAt: [number, number, number];
  fov: number;
} {
  const tololo: [number, number, number] = [
    ART_STUDY.tololoPosition[0],
    1.1,
    ART_STUDY.tololoPosition[2],
  ];
  const lade: [number, number, number] = [
    ART_STUDY.ladePosition[0],
    1.1,
    ART_STUDY.ladePosition[2],
  ];
  const mid: [number, number, number] = [(tololo[0] + lade[0]) / 2, 1.0, (tololo[2] + lade[2]) / 2];
  switch (view) {
    case 'tololo-front':
      return { position: [0, 1.4, 4.2], lookAt: tololo, fov: 38 };
    case 'tololo-three-quarter':
      return { position: [3.1, 1.7, 3.1], lookAt: tololo, fov: 38 };
    case 'tololo-side':
      return { position: [4.4, 1.35, 0.2], lookAt: tololo, fov: 38 };
    case 'tololo-rear':
      return { position: [0, 1.5, -4.4], lookAt: tololo, fov: 38 };
    case 'lade-front':
      return { position: [1.8, 1.4, 10.2], lookAt: lade, fov: 38 };
    case 'lade-side':
      return { position: [6.2, 1.35, 6.2], lookAt: lade, fov: 38 };
    case 'lade-face':
      // Lade faces Tololo (-Z); the true face close-up sits between them.
      // (The legacy 'lade-front' preset views the proxy from +Z.)
      return { position: [1.8, 1.3, 2.0], lookAt: lade, fov: 38 };
    case 'silhouette':
      return { position: [7.5, 1.8, -3.5], lookAt: mid, fov: 42 };
    case 'ads':
      return { position: [2.2, 2.6, -3.4], lookAt: lade, fov: 48 };
    case 'top':
      return { position: [0, 18.5, -9.5], lookAt: [0, 0, 3], fov: 46 };
    case 'telegraph':
      return { position: [3.4, 3.2, 0.5], lookAt: lade, fov: 46 };
    case 'muzzle':
      return { position: [2.6, 1.8, -2.2], lookAt: mid, fov: 50 };
    case 'movement':
      return { position: [5.2, 3.4, -4.5], lookAt: mid, fov: 52 };
    case 'rotation':
      return { position: [-4.8, 3.0, -3.8], lookAt: mid, fov: 52 };
    case 'third':
    default:
      return { position: [4.1, 4.05, -6.6], lookAt: mid, fov: 56 };
  }
}
