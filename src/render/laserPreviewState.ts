/**
 * Laser-sight preview gating state (AD0, development-only).
 * Kept in a component-free module so LaserSightPreview.tsx exports only
 * the presentation component (react-refresh/only-export-components).
 */
export const LASER_PREVIEW_LABEL = 'LASER-SIGHT VISUAL PREVIEW — NOT AN EQUIPPED ATTACHMENT.';

export function isLaserPreviewEnabled(): boolean {
  return (
    import.meta.env.DEV &&
    typeof window !== 'undefined' &&
    new URLSearchParams(window.location.search).get('laserPreview') === '1'
  );
}
