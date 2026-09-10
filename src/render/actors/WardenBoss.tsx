import { useFrame } from '@react-three/fiber';
import { useRef } from 'react';
import * as THREE from 'three';
import { worldPalette } from '../materials';
import type { RenderBossView } from '../snapshot';

function ArmorPlate({
  position,
  rotation = [0, 0, 0],
}: {
  position: [number, number, number];
  rotation?: [number, number, number];
}) {
  return (
    <mesh castShadow position={position} rotation={rotation}>
      <boxGeometry args={[1.4, 0.22, 1.05]} />
      <meshStandardMaterial color="#777a72" metalness={0.58} roughness={0.46} />
    </mesh>
  );
}

export function WardenBoss({
  boss,
  reducedMotion = false,
}: {
  boss: RenderBossView;
  reducedMotion?: boolean;
}) {
  const harvester = useRef<THREE.Group>(null);
  const core = useRef<THREE.Mesh>(null);
  useFrame((state, delta) => {
    if (harvester.current && !reducedMotion)
      harvester.current.rotation.z += delta * (boss.phase >= 2 ? 1.2 : 0.55);
    if (core.current) {
      const pulse = reducedMotion ? 1 : 1 + Math.sin(state.clock.elapsedTime * 4.2) * 0.08;
      core.current.scale.setScalar(pulse);
    }
  });

  const weakRatio = Math.max(0, Math.min(1, boss.weakPointHealth / boss.weakPointMaxHealth));
  return (
    <group
      name="grassland-warden-boss-placeholder"
      position={boss.position}
      userData={{ placeholder: true }}
    >
      <mesh receiveShadow rotation-x={-Math.PI / 2} position-y={0.025}>
        <circleGeometry args={[3.7, 30]} />
        <meshBasicMaterial color="#1e1c18" transparent opacity={0.38} depthWrite={false} />
      </mesh>

      <group position-y={1.65}>
        <mesh castShadow scale={[1.8, 0.88, 2.25]}>
          <dodecahedronGeometry args={[1, 1]} />
          <meshStandardMaterial color="#2d3331" metalness={0.36} roughness={0.58} />
        </mesh>
        <ArmorPlate position={[-1.25, 0.55, 0.2]} rotation={[0, 0, -0.22]} />
        <ArmorPlate position={[1.25, 0.55, 0.2]} rotation={[0, 0, 0.22]} />
        <ArmorPlate position={[0, 0.65, -1.3]} rotation={[0.16, 0, 0]} />

        <mesh castShadow position={[0, 0.18, 2.05]} scale={[1.3, 0.72, 1.2]}>
          <coneGeometry args={[0.9, 1.7, 6]} />
          <meshStandardMaterial color="#555b56" metalness={0.45} roughness={0.48} />
        </mesh>
        <mesh position={[0, 0.25, 2.72]}>
          <boxGeometry args={[0.72, 0.2, 0.08]} />
          <meshStandardMaterial
            color={worldPalette.warning}
            emissive={worldPalette.warning}
            emissiveIntensity={1.8}
          />
        </mesh>

        {([-1, 1] as const).flatMap((side) =>
          ([-1, 1] as const).map((front) => (
            <group
              key={`${side}-${front}`}
              position={[side * 1.45, -0.35, front * 1.35]}
              rotation-z={side * 0.14}
            >
              <mesh castShadow position-y={-0.62}>
                <capsuleGeometry args={[0.26, 0.9, 5, 8]} />
                <meshStandardMaterial color="#252a29" metalness={0.4} roughness={0.54} />
              </mesh>
              <mesh
                castShadow
                position={[side * 0.18, -1.32, front * 0.1]}
                rotation-z={side * 0.32}
              >
                <capsuleGeometry args={[0.19, 0.78, 5, 8]} />
                <meshStandardMaterial color="#474c48" metalness={0.54} roughness={0.44} />
              </mesh>
              <mesh
                castShadow
                position={[side * 0.34, -1.82, front * 0.18]}
                rotation-z={side * -0.45}
              >
                <coneGeometry args={[0.18, 0.78, 5]} />
                <meshStandardMaterial color="#171a19" metalness={0.7} roughness={0.34} />
              </mesh>
            </group>
          )),
        )}

        <group ref={harvester} position={[0, 0.1, -2.32]} rotation-x={Math.PI / 2}>
          <mesh castShadow>
            <cylinderGeometry args={[0.42, 0.42, 3.5, 12]} />
            <meshStandardMaterial color="#292c2b" metalness={0.7} roughness={0.32} />
          </mesh>
          {[0, 1, 2, 3, 4, 5].map((index) => (
            <mesh
              key={index}
              position={[
                Math.cos((index / 6) * Math.PI * 2) * 1.25,
                0,
                Math.sin((index / 6) * Math.PI * 2) * 1.25,
              ]}
              rotation-y={(index / 6) * Math.PI * 2}
            >
              <boxGeometry args={[1.42, 0.12, 0.32]} />
              <meshStandardMaterial color="#8a8375" metalness={0.66} roughness={0.35} />
            </mesh>
          ))}
        </group>

        <mesh ref={core} position={[0, 0.12, 1.1]}>
          <icosahedronGeometry args={[0.62, 1]} />
          <meshStandardMaterial
            color={boss.vulnerable ? '#fff1b7' : '#421d16'}
            emissive={boss.vulnerable ? worldPalette.orange : worldPalette.warning}
            emissiveIntensity={boss.vulnerable ? 3.4 : 0.75}
            roughness={0.28}
          />
        </mesh>
        <mesh position={[0, 0.12, 1.14]} scale={1.18}>
          <icosahedronGeometry args={[0.62, 1]} />
          <meshBasicMaterial
            color={worldPalette.orange}
            wireframe
            transparent
            opacity={0.18 + (1 - weakRatio) * 0.45}
          />
        </mesh>
      </group>

      {boss.telegraph && (
        <group position-y={0.045}>
          <mesh rotation-x={-Math.PI / 2}>
            <ringGeometry args={[2.5, boss.phase >= 2 ? 7.5 : 5.4, 54]} />
            <meshBasicMaterial
              color={worldPalette.warning}
              transparent
              opacity={0.28}
              depthWrite={false}
              side={THREE.DoubleSide}
            />
          </mesh>
          <mesh rotation-x={-Math.PI / 2} position-z={-5}>
            <planeGeometry args={[1.6, 10]} />
            <meshBasicMaterial
              color={worldPalette.warning}
              transparent
              opacity={0.22}
              depthWrite={false}
            />
          </mesh>
        </group>
      )}

      {boss.breakProgress >= 1 && (
        <mesh position-y={2.8} rotation-x={Math.PI / 2}>
          <torusGeometry args={[2.4, 0.1, 8, 42]} />
          <meshStandardMaterial
            color="#fff0bd"
            emissive={worldPalette.gold}
            emissiveIntensity={2}
          />
        </mesh>
      )}
    </group>
  );
}
