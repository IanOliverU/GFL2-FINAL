import { DEFAULT_SETTINGS } from '../../app/store';
import type { PlayerSettings } from '../../ui';

const STORAGE_KEY = 'gfl2-grassland-settings-v1';

function validQuality(value: unknown): value is PlayerSettings['graphicsQuality'] {
  return value === 'low' || value === 'medium' || value === 'high';
}

export function loadSettings(): PlayerSettings {
  if (typeof window === 'undefined') return DEFAULT_SETTINGS;
  try {
    const stored = JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? '{}') as Record<
      string,
      unknown
    >;
    return {
      uiScale:
        typeof stored.uiScale === 'number'
          ? Math.min(1.3, Math.max(0.8, stored.uiScale))
          : DEFAULT_SETTINGS.uiScale,
      reducedMotion:
        typeof stored.reducedMotion === 'boolean'
          ? stored.reducedMotion
          : window.matchMedia('(prefers-reduced-motion: reduce)').matches,
      masterVolume:
        typeof stored.masterVolume === 'number'
          ? Math.min(1, Math.max(0, stored.masterVolume))
          : DEFAULT_SETTINGS.masterVolume,
      graphicsQuality: validQuality(stored.graphicsQuality)
        ? stored.graphicsQuality
        : DEFAULT_SETTINGS.graphicsQuality,
    };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export function saveSettings(settings: PlayerSettings): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch {
    // Storage can be unavailable in privacy modes; settings still apply for the session.
  }
}
