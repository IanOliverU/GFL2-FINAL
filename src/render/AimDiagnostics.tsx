import { Line } from '@react-three/drei';
import type { AimDebugSnapshot, Vec3 } from '../game';

const RAY_COLOR = '#39d9ff';
const AIM_COLOR = '#fff073';
const MUZZLE_COLOR = '#ff9f43';
const SEGMENT_COLOR = '#ff54d8';
const HURT_COLOR = '#65ff8f';
const SELECTED_COLOR = '#ff5252';
const WORLD_COLOR = '#b78cff';
const DAMAGE_COLOR = '#ffffff';

function endpoint(origin: Vec3, direction: Vec3, distance: number): Vec3 {
  return [
    origin[0] + direction[0] * distance,
    origin[1] + direction[1] * distance,
    origin[2] + direction[2] * distance,
  ];
}

function Marker({
  position,
  color,
  radius = 0.11,
}: {
  position: Vec3;
  color: string;
  radius?: number;
}) {
  return (
    <mesh position={position} userData={{ debugHelper: true }}>
      <sphereGeometry args={[radius, 10, 8]} />
      <meshBasicMaterial color={color} depthTest={false} />
    </mesh>
  );
}

/** Observational geometry only; all values were produced by the simulation. */
export function AimDiagnostics({ debug }: { debug: AimDebugSnapshot }) {
  const rayEnd =
    debug.cameraRay === null
      ? null
      : (debug.aimPoint ?? endpoint(debug.cameraRay.origin, debug.cameraRay.direction, 38));
  return (
    <group name="development-aim-diagnostics" renderOrder={50}>
      {debug.cameraRay !== null && rayEnd !== null && (
        <Line
          points={[debug.cameraRay.origin, rayEnd]}
          color={RAY_COLOR}
          lineWidth={1.5}
          depthTest={false}
        />
      )}
      {debug.aimPoint !== null && (
        <Marker position={debug.aimPoint} color={AIM_COLOR} radius={0.14} />
      )}
      {debug.muzzleOrigin !== null && (
        <Marker position={debug.muzzleOrigin} color={MUZZLE_COLOR} radius={0.1} />
      )}
      {debug.muzzleOrigin !== null && debug.aimPoint !== null && (
        <Line
          points={[debug.muzzleOrigin, debug.aimPoint]}
          color={MUZZLE_COLOR}
          lineWidth={2}
          depthTest={false}
        />
      )}
      {debug.projectileSegment !== null && (
        <Line
          points={[debug.projectileSegment.previous, debug.projectileSegment.next]}
          color={SEGMENT_COLOR}
          lineWidth={3}
          depthTest={false}
        />
      )}
      {debug.hurtVolumes.map((volume) => {
        const foot = 0.12;
        const totalHeight = Math.max(volume.radius * 2, volume.height - foot);
        const cylinderLength = Math.max(0.001, totalHeight - volume.radius * 2);
        return (
          <mesh
            key={volume.enemyId}
            position={[volume.position[0], foot + totalHeight * 0.5, volume.position[2]]}
            userData={{ debugHelper: true }}
          >
            <capsuleGeometry args={[volume.radius, cylinderLength, 4, 12]} />
            <meshBasicMaterial
              color={HURT_COLOR}
              transparent
              opacity={0.22}
              wireframe
              depthTest={false}
            />
          </mesh>
        );
      })}
      {debug.selectedCollision !== null && (
        <Marker position={debug.selectedCollision.point} color={SELECTED_COLOR} radius={0.16} />
      )}
      {debug.worldObstruction !== null && (
        <Marker position={debug.worldObstruction.point} color={WORLD_COLOR} radius={0.2} />
      )}
      {debug.confirmedDamage !== null && (
        <Marker position={debug.confirmedDamage.point} color={DAMAGE_COLOR} radius={0.08} />
      )}
    </group>
  );
}
