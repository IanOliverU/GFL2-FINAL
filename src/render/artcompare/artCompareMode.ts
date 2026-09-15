export type ArtCompareMode = 'cel3d' | 'pixel3d' | 'pixel2d';

export const ART_COMPARE_MODES: readonly ArtCompareMode[] = ['cel3d', 'pixel3d', 'pixel2d'];

export const ART_COMPARE_LABELS: Record<ArtCompareMode, string> = {
  cel3d: 'CEL-SHADED 3D',
  pixel3d: 'PIXEL-STYLED 3D',
  pixel2d: '2D/2.5D PIXEL',
};

export function requestedArtCompareMode(): ArtCompareMode | null {
  if (!import.meta.env.DEV || typeof window === 'undefined') return null;
  const value = new URLSearchParams(window.location.search).get('artCompare');
  return value === 'cel3d' || value === 'pixel3d' || value === 'pixel2d' ? value : null;
}

export function isArtCompareEnabled(): boolean {
  return requestedArtCompareMode() !== null;
}

export type ArtCompareView =
  | 'tololo-front'
  | 'tololo-three-quarter'
  | 'lade-front'
  | 'lade-side'
  | 'silhouette'
  | 'third'
  | 'ads'
  | 'top'
  | 'telegraph'
  | 'muzzle'
  | 'movement'
  | 'rotation';

export function requestedArtCompareView(): ArtCompareView {
  if (typeof window === 'undefined') return 'third';
  const value = new URLSearchParams(window.location.search).get('artView');
  const allowed: readonly ArtCompareView[] = [
    'tololo-front',
    'tololo-three-quarter',
    'lade-front',
    'lade-side',
    'silhouette',
    'third',
    'ads',
    'top',
    'telegraph',
    'muzzle',
    'movement',
    'rotation',
  ];
  return (allowed as readonly string[]).includes(value ?? '') ? (value as ArtCompareView) : 'third';
}

export function requestedArtCompareTime(): number {
  if (typeof window === 'undefined') return 1.5;
  const raw = Number(new URLSearchParams(window.location.search).get('artT'));
  return Number.isFinite(raw) ? Math.min(12, Math.max(0, raw)) : 1.5;
}

/**
 * Shared AD0 art-study layout. Every rendering treatment must use these exact
 * transforms, scales, lights, and timings so only the treatment changes.
 * Small bounded Grassland study: Tololo + one Lade, grass section, ruined
 * wall, rock, foliage, cover, distant landmark, overcast late-afternoon sun.
 */
export const ART_STUDY = {
  tololoPosition: [0, 0, 0] as const,
  tololoScale: 1 as const,
  tololoHeight: 1.72 as const,
  ladePosition: [1.8, 0, 6] as const,
  ladeScale: 1 as const,
  ladeHeight: 1.75 as const,
  groundSize: [30, 30] as const,
  wallPosition: [-6, 0, 4] as const,
  rockPosition: [7, 0, 3] as const,
  coverPosition: [3.5, 0, 4.2] as const,
  landmarkPosition: [-2, 0, 20] as const,
  thirdCamera: { position: [4.1, 4.05, -6.6] as const, fov: 56 },
  adsCamera: { position: [2.2, 2.6, -3.4] as const, fov: 48 },
  topCamera: { position: [0, 18.5, -13.5] as const, fov: 46 },
  sunDirection: [-0.45, 0.62, 0.34] as const,
  sunColor: '#ffe7c4' as const,
  skyColor: '#9db8c9' as const,
  telegraphPeriod: 2.4 as const,
  telegraphOnset: 1.2 as const,
  muzzlePeriod: 3.0 as const,
  muzzleFlashTime: 0.09 as const,
  impactTime: 0.22 as const,
  outputSize: [1280, 720] as const,
} as const;
