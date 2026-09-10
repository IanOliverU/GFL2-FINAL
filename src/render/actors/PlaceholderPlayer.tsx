import { useFrame } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import type { RenderPlayerView, RenderEventView } from '../snapshot';
import { worldPalette } from '../materials';

interface PlaceholderPlayerProps {
  player: RenderPlayerView;
  events: readonly RenderEventView[];
  reducedMotion?: boolean;
}

function Limb({
  side,
  leg = false,
  jointRef,
}: {
  side: -1 | 1;
  leg?: boolean;
  jointRef?: React.RefObject<THREE.Group | null>;
}) {
  const x = side * (leg ? 0.24 : 0.48);
  const y = leg ? 0.84 : 1.55;
  return (
    <group {...(jointRef ? { ref: jointRef } : {})} position={[x, y, 0]}>
      <mesh castShadow position-y={-0.27}>
        <capsuleGeometry args={[leg ? 0.14 : 0.12, leg ? 0.46 : 0.34, 4, 7]} />
        <meshStandardMaterial color={leg ? '#353a39' : '#c5bdaf'} roughness={0.74} />
      </mesh>
      <mesh castShadow position-y={leg ? -0.78 : -0.66} rotation-x={leg ? -0.04 : -0.36 * side}>
        <capsuleGeometry args={[leg ? 0.13 : 0.1, leg ? 0.48 : 0.37, 4, 7]} />
        <meshStandardMaterial color="#242829" roughness={0.78} />
      </mesh>
      {leg && (
        <mesh castShadow position={[0, -1.08, 0.08]}>
          <boxGeometry args={[0.29, 0.18, 0.52]} />
          <meshStandardMaterial color="#191b1c" roughness={0.65} />
        </mesh>
      )}
    </group>
  );
}

function Rifle({ reloading, fired }: { reloading: boolean; fired: boolean }) {
  const rifle = useRef<THREE.Group>(null);
  useFrame((state) => {
    if (!rifle.current) return;
    const reloadTilt = reloading ? Math.sin(state.clock.elapsedTime * 5) * 0.32 - 0.32 : 0;
    rifle.current.rotation.x = THREE.MathUtils.lerp(rifle.current.rotation.x, reloadTilt, 0.18);
    rifle.current.position.z = THREE.MathUtils.lerp(rifle.current.position.z, fired ? 0.1 : 0, 0.3);
  });

  return (
    <group
      ref={rifle}
      name="placeholder-ak-rifle"
      position={[0.25, 1.38, 0.35]}
      rotation-y={Math.PI / 2}
    >
      <mesh castShadow position-x={0.42}>
        <boxGeometry args={[1.25, 0.2, 0.18]} />
        <meshStandardMaterial color="#202323" metalness={0.72} roughness={0.36} />
      </mesh>
      <mesh castShadow position={[-0.25, -0.02, 0]}>
        <boxGeometry args={[0.62, 0.28, 0.2]} />
        <meshStandardMaterial color="#3f3228" roughness={0.62} />
      </mesh>
      <mesh castShadow position={[0.18, -0.27, 0]} rotation-z={-0.14}>
        <boxGeometry args={[0.22, 0.43, 0.15]} />
        <meshStandardMaterial color="#252728" metalness={0.55} roughness={0.42} />
      </mesh>
      <mesh castShadow position-x={1.31} rotation-z={Math.PI / 2}>
        <cylinderGeometry args={[0.055, 0.065, 0.68, 8]} />
        <meshStandardMaterial color="#161819" metalness={0.82} roughness={0.3} />
      </mesh>
      <group name="placeholder-rifle-muzzle-socket" position-x={1.68}>
        <mesh rotation-z={Math.PI / 2}>
          <cylinderGeometry args={[0.085, 0.085, 0.12, 8]} />
          <meshStandardMaterial color="#111212" metalness={0.8} roughness={0.28} />
        </mesh>
        <mesh visible={fired} position-x={0.16} rotation-z={Math.PI / 2}>
          <coneGeometry args={[0.16, 0.42, 7]} />
          <meshBasicMaterial color="#ffd073" transparent opacity={0.92} depthWrite={false} />
        </mesh>
      </group>
    </group>
  );
}

export function PlaceholderPlayer({
  player,
  events,
  reducedMotion = false,
}: PlaceholderPlayerProps) {
  const root = useRef<THREE.Group>(null);
  const leftLeg = useRef<THREE.Group>(null);
  const rightLeg = useRef<THREE.Group>(null);
  const coat = useRef<THREE.Mesh>(null);
  const speed = Math.hypot(player.velocity[0], player.velocity[2]);
  const fired = useMemo(
    () => events.some((event) => /fire|shot|muzzle/i.test(event.type) && event.age < 0.1),
    [events],
  );

  useFrame((state) => {
    if (!root.current) return;
    root.current.rotation.y = player.aimYaw;
    if (reducedMotion) return;
    const gait =
      Math.sin(state.clock.elapsedTime * (7 + speed * 1.8)) * Math.min(0.65, speed * 0.11);
    if (leftLeg.current) leftLeg.current.rotation.x = gait;
    if (rightLeg.current) rightLeg.current.rotation.x = -gait;
    if (coat.current) coat.current.rotation.x = -0.08 - Math.min(speed * 0.025, 0.14);
  });

  return (
    <>
      <group
        ref={root}
        name="temporary-local-placeholder-player"
        position={player.position}
        userData={{ placeholder: true, cameraIgnore: true }}
      >
        <mesh receiveShadow rotation-x={-Math.PI / 2} position-y={0.015}>
          <circleGeometry args={[0.62, 24]} />
          <meshBasicMaterial color="#172019" transparent opacity={0.28} depthWrite={false} />
        </mesh>

        <Limb side={-1} leg jointRef={leftLeg} />
        <Limb side={1} leg jointRef={rightLeg} />
        <Limb side={-1} />
        <Limb side={1} />

        <mesh castShadow position-y={1.62}>
          <capsuleGeometry args={[0.38, 0.58, 5, 8]} />
          <meshPhysicalMaterial
            color="#353a3c"
            roughness={0.88}
            sheen={0.45}
            sheenColor="#8b918d"
          />
        </mesh>
        <mesh castShadow position={[0, 1.7, -0.22]} scale={[0.82, 1, 0.4]}>
          <boxGeometry args={[0.9, 0.66, 0.32]} />
          <meshStandardMaterial color="#d2c8b8" roughness={0.56} metalness={0.12} />
        </mesh>
        <mesh ref={coat} castShadow position={[0, 1.08, -0.28]} rotation-x={-0.08}>
          <coneGeometry args={[0.52, 1.24, 5, 1, true]} />
          <meshPhysicalMaterial
            color="#242b2d"
            roughness={0.93}
            side={THREE.DoubleSide}
            sheen={0.5}
          />
        </mesh>
        <mesh castShadow position-y={2.35}>
          <sphereGeometry args={[0.28, 12, 9]} />
          <meshStandardMaterial color="#d0ab91" roughness={0.72} />
        </mesh>
        <mesh castShadow position={[0, 2.42, -0.08]} scale={[1.08, 0.88, 1.06]}>
          <sphereGeometry args={[0.31, 10, 7, 0, Math.PI * 2, 0, Math.PI * 0.72]} />
          <meshStandardMaterial color="#171a1c" roughness={0.48} />
        </mesh>
        <mesh castShadow position={[0.17, 2.46, -0.27]} rotation-z={-0.35}>
          <coneGeometry args={[0.12, 0.68, 7]} />
          <meshStandardMaterial color="#171a1c" roughness={0.5} />
        </mesh>
        <mesh position={[0, 2.35, 0.255]}>
          <boxGeometry args={[0.33, 0.08, 0.035]} />
          <meshStandardMaterial
            color={worldPalette.cyan}
            emissive={worldPalette.cyan}
            emissiveIntensity={0.65}
            roughness={0.22}
          />
        </mesh>
        <Rifle reloading={player.reloading} fired={fired} />

        {player.invulnerable && (
          <mesh position-y={1.2}>
            <capsuleGeometry args={[0.72, 1.45, 8, 16]} />
            <meshBasicMaterial
              color={worldPalette.cyan}
              wireframe
              transparent
              opacity={0.28}
              depthWrite={false}
            />
          </mesh>
        )}
      </group>
      <mesh name="authoritative-muzzle-marker" position={player.muzzle} visible={fired}>
        <sphereGeometry args={[0.11, 8, 6]} />
        <meshBasicMaterial color="#ffe1a0" />
      </mesh>
    </>
  );
}
