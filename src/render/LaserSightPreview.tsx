import { Line } from '@react-three/drei';
import { ENEMY_HEIGHTS, TOLOLO } from '../game/data/definitions';
import { coverVolumes, resolveAimPoint } from '../game/core/aiming';
import { ENEMY_DEFINITIONS } from '../game/data/definitions';
import { getPublishedCameraAimRay } from '../platform/input/aimRayState';
import type { GameRenderView } from './snapshot';

/**
 * Reserved Red Laser Sight presentation (AD0, visual preview only).
 *
 * Future attachment contract:
 * - Beam origin: authoritative firearm muzzle (view.player.muzzle).
 * - Beam endpoint: resolved authoritative aim point (closest enemy/boss/world
 *   collision or maximum range) via the shared resolveAimPoint contract.
 * - Presentation: thin red beam with a small red endpoint dot.
 * - Occlusion: stops at solid cover; depth-tested so walls occlude naturally.
 * - Cameras: third-person, ADS, and top-down (uses the finalized published ray).
 * - Gameplay effect: none. No damage, accuracy, spread, recoil, or collision change.
 *
 * This component is presentation-only and gameplay-neutral. It reads snapshot
 * positions plus the published camera ray and never mutates simulation state.
 * Gating lives in ./laserPreviewState (LASER_PREVIEW_LABEL, isLaserPreviewEnabled:
 * import.meta.env.DEV + ?laserPreview=1); GameScene/App import gating from there.
 */

const LASER_RED = '#ff2b2b';
const LASER_DOT = '#ff5a5a';

export function LaserSightPreview({ view }: { view: GameRenderView }) {
  const ray = getPublishedCameraAimRay(view.cameraMode);
  if (ray === null) return null;

  const muzzle = view.player.muzzle;
  const cameraToMuzzle = Math.hypot(
    ray.origin[0] - muzzle[0],
    ray.origin[1] - muzzle[1],
    ray.origin[2] - muzzle[2],
  );
  const targets = view.enemies.map((enemy, index) => {
    const role = (enemy.kind ?? 'melee') as keyof typeof ENEMY_HEIGHTS;
    const height = ENEMY_HEIGHTS[role] ?? 1.9;
    const radius =
      enemy.radius || ENEMY_DEFINITIONS[role as keyof typeof ENEMY_DEFINITIONS]?.radius || 0.55;
    return {
      id: index + 1,
      x: enemy.position[0],
      z: enemy.position[2],
      height,
      radius,
      alive: enemy.health > 0,
    };
  });
  const sphereTargets =
    view.boss === null
      ? []
      : [
          {
            id: 9001,
            center: [view.boss.position[0], 1.1, view.boss.position[2]] as const,
            radius: 1.65,
            alive: view.boss.health > 0,
          },
        ];
  const covers = coverVolumes(
    view.objective.pedestalPosition[0],
    view.objective.pedestalPosition[2],
  );
  const resolution = resolveAimPoint(
    ray.origin,
    ray.direction,
    TOLOLO.weapon.range + cameraToMuzzle,
    targets,
    covers,
    sphereTargets,
  );

  return (
    <group name="laser-sight-visual-preview" renderOrder={20}>
      <Line points={[muzzle, resolution.aimPoint]} color={LASER_RED} lineWidth={1.2} />
      <mesh position={resolution.aimPoint}>
        <sphereGeometry args={[0.07, 12, 10]} />
        <meshBasicMaterial color={LASER_DOT} transparent opacity={0.95} depthWrite={false} />
      </mesh>
      <mesh position={muzzle}>
        <sphereGeometry args={[0.035, 8, 6]} />
        <meshBasicMaterial color={LASER_RED} transparent opacity={0.9} depthWrite={false} />
      </mesh>
    </group>
  );
}
