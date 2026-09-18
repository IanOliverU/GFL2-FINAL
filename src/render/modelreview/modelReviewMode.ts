/**
 * AD2A isolated Lade-candidate review route. Development-only: the viewer
 * never renders in production builds and never touches normal gameplay.
 */

export type ModelReviewView =
  | 'front'
  | 'side'
  | 'side-left'
  | 'rear'
  | 'three-quarter'
  | 'rear-three-quarter'
  | 'top'
  | 'third'
  | 'ads';

export type ModelReviewLight = 'neutral' | 'grassland';
export type ModelReviewShade = 'material' | 'clay' | 'silhouette' | 'wireframe';

/** AD2A.1: isolated Lade construction-study variants. `base` is the
 * rejected AD2A primitive candidate (default, unchanged behavior). */
export type ModelReviewVariant = 'base' | 'ad2a1-neutral' | 'ad2a1-ready';

const VIEWS: readonly ModelReviewView[] = [
  'front',
  'side',
  'side-left',
  'rear',
  'three-quarter',
  'rear-three-quarter',
  'top',
  'third',
  'ads',
];

const VARIANTS: readonly ModelReviewVariant[] = ['base', 'ad2a1-neutral', 'ad2a1-ready'];

export const MODEL_REVIEW_GLB_URL = '/model-review/lade-candidate.glb';

export const MODEL_REVIEW_GLB_URLS: Record<ModelReviewVariant, string> = {
  base: MODEL_REVIEW_GLB_URL,
  'ad2a1-neutral': '/model-review/lade-ad2a1-neutral.glb',
  'ad2a1-ready': '/model-review/lade-ad2a1-ready.glb',
};

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
  const value = searchParams().get('shade');
  return value === 'clay' || value === 'silhouette' || value === 'wireframe' ? value : 'material';
}

export function requestedModelReviewVariant(): ModelReviewVariant {
  if (typeof window === 'undefined') return 'base';
  const value = searchParams().get('variant');
  return (VARIANTS as readonly string[]).includes(value ?? '')
    ? (value as ModelReviewVariant)
    : 'base';
}

export function requestedModelReviewFlag(name: 'turntable' | 'compare' | 'sockets'): boolean {
  return searchParams().get(name) === '1';
}
