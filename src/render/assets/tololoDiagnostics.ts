import type { TololoAnimationPose } from '../animation/tololoAnimation';
import type { TololoBoneRole } from '../animation/tololoRig';
import type { TololoModelDiagnostics } from './tololoModel';

export interface TololoRuntimeDiagnostics {
  loadState: 'idle' | 'loading' | 'loaded' | 'error' | 'disposed';
  error: string | null;
  runtimeInstances: number;
  disposals: number;
  model: TololoModelDiagnostics | null;
  resolvedBones: Partial<Record<TololoBoneRole, string>>;
  missingBones: readonly TololoBoneRole[];
  animation: TololoAnimationPose | null;
  bounds: {
    min: readonly [number, number, number];
    max: readonly [number, number, number];
  } | null;
  groundingError: number | null;
  muzzleError: number | null;
  gripErrors: { left: number; right: number } | null;
  temporaryWeapon: true;
  redistributionVerified: false;
}

declare global {
  interface Window {
    __GFL2_TOLOLO_DIAGNOSTICS__?: TololoRuntimeDiagnostics;
  }
}

let runtimeInstances = 0;
let disposals = 0;

function initialDiagnostics(): TololoRuntimeDiagnostics {
  return {
    loadState: 'idle',
    error: null,
    runtimeInstances,
    disposals,
    model: null,
    resolvedBones: {},
    missingBones: [],
    animation: null,
    bounds: null,
    groundingError: null,
    muzzleError: null,
    gripErrors: null,
    temporaryWeapon: true,
    redistributionVerified: false,
  };
}

export function updateTololoDiagnostics(update: Partial<TololoRuntimeDiagnostics>): void {
  if (typeof window === 'undefined') return;
  window.__GFL2_TOLOLO_DIAGNOSTICS__ = {
    ...(window.__GFL2_TOLOLO_DIAGNOSTICS__ ?? initialDiagnostics()),
    ...update,
    runtimeInstances,
    disposals,
  };
}

export function beginTololoRuntimeInstance(): () => void {
  runtimeInstances += 1;
  updateTololoDiagnostics({ loadState: 'loading', error: null });
  return () => {
    runtimeInstances = Math.max(0, runtimeInstances - 1);
    updateTololoDiagnostics({ loadState: 'disposed' });
  };
}

export function recordTololoDisposal(): void {
  disposals += 1;
  updateTololoDiagnostics({});
}
