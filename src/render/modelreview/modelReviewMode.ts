/**
 * AD2A isolated Lade-candidate review route. Development-only: the viewer
 * never renders in production builds and never touches normal gameplay.
 */

export type ModelReviewView =
  'front' | 'side' | 'rear' | 'three-quarter' | 'rear-three-quarter' | 'top' | 'third' | 'ads';

export type ModelReviewLight = 'neutral' | 'grassland';
export type ModelReviewShade = 'material' | 'clay';

const VIEWS: readonly ModelReviewView[] = [
  'front',
  'side',
  'rear',
  'three-quarter',
  'rear-three-quarter',
  'top',
  'third',
  'ads',
];

export const MODEL_REVIEW_GLB_URL = '/model-review/lade-candidate.glb';

export function requestedModelReview(): 'lade' | null {
  if (!import.meta.env.DEV || typeof window === 'undefined') return null;
  return new URLSearchParams(window.location.search).get('modelReview') === 'lade' ? 'lade' : null;
}

export function isModelReviewEnabled(): boolean {
  return requestedModelReview() !== null;
}

function searchParams(): URLSearchParams {
  return new URLSearchParams(window.location.search);
}

export function requestedModelReviewView(): ModelReviewView {
  const value = searchParams().get('view');
  return (VIEWS as readonly string[]).includes(value ?? '')
    ? (value as ModelReviewView)
    : 'three-quarter';
}

export function requestedModelReviewLight(): ModelReviewLight {
  return searchParams().get('light') === 'grassland' ? 'grassland' : 'neutral';
}

export function requestedModelReviewShade(): ModelReviewShade {
  return searchParams().get('shade') === 'clay' ? 'clay' : 'material';
}

export function requestedModelReviewFlag(name: 'turntable' | 'compare'): boolean {
  return searchParams().get(name) === '1';
}
