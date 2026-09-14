import type { EnemyPreviewMode } from '../../game';

export const ENEMY_PREVIEW_QUERY = 'enemyPreview';
export const ENEMY_PREVIEW_BANNER = 'LADE PREVIEW — NOT NORMAL PROGRESSION.';

/**
 * Development-only controlled encounter preview flag.
 *
 * Active only when `?enemyPreview=lade` is present AND the build is a local
 * development runtime: either a dev server (`import.meta.env.DEV`) or the
 * local e2e harness (`?e2e=1`, which already gates every other development
 * hook). A production build loaded without the harness always resolves to
 * null, so normal players and normal Grassland progression never see it.
 */
export function requestedEnemyPreviewMode(): EnemyPreviewMode {
  if (typeof window === 'undefined') return null;
  const params = new URLSearchParams(window.location.search);
  if (params.get(ENEMY_PREVIEW_QUERY) !== 'lade') return null;
  const isDevBuild = import.meta.env.DEV === true;
  const isHarness = params.get('e2e') === '1';
  if (!isDevBuild && !isHarness) return null;
  return 'lade';
}
