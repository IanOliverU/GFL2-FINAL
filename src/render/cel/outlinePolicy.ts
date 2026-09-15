import { celPalette } from './celPalette';

/**
 * AD1 outline policy (pure gating). There is no global outline pass anywhere
 * in the game; outlines exist only as short, gated emphasis:
 * - Boss weak-point/core highlight while the boss is vulnerable (break
 *   window) or actively telegraphing — an important threat state.
 * Everything else (characters, enemies, environment, interactables at rest)
 * must render with zero outline meshes. Targeted-enemy, occluded-enemy, and
 * accessibility outlines are policy-allowed future gates, not code yet.
 */
export interface OutlineRequest {
  color: string;
  opacity: number;
}

export function bossWeakPointOutline({
  vulnerable,
  telegraph,
}: {
  vulnerable: boolean;
  telegraph: string | null;
}): OutlineRequest | null {
  if (vulnerable) return { color: celPalette.ultimateGold, opacity: 0.55 };
  if (telegraph !== null) return { color: celPalette.telegraphRed, opacity: 0.3 };
  return null;
}
