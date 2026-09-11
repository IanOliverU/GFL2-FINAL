import { useFrame } from '@react-three/fiber';
import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import type { RenderEnemyView, Vec3Tuple } from '../snapshot';
import { worldPalette } from '../materials';
import { LadeEnemy } from './LadeEnemy';

function Telegraph({ kind, telegraph }: { kind: string; telegraph: string }) {
  const ranged = /range|sniper|shot|beam/i.test(kind + telegraph);
  return (
    <group position-y={0.035}>
      {ranged ? (
        <mesh rotation-x={-Math.PI / 2} position-z={-2.6}>
          <planeGeometry args={[0.42, 5.4]} />
          <meshBasicMaterial
            color={worldPalette.warning}
            transparent
            opacity={0.36}
            depthWrite={false}
          />
        </mesh>
      ) : (
        <mesh rotation-x={-Math.PI / 2}>
          <ringGeometry args={[1.35, /heavy|elite/i.test(kind) ? 3.3 : 2.35, 42]} />
          <meshBasicMaterial
            color={worldPalette.warning}
            transparent
            opacity={0.3}
            depthWrite={false}
            side={THREE.DoubleSide}
          />
        </mesh>
      )}
      <mesh rotation-x={-Math.PI / 2}>
        <ringGeometry args={[0.82, 0.96, 28]} />
        <meshBasicMaterial color="#ffe6c8" transparent opacity={0.82} depthWrite={false} />
      </mesh>
    </group>
  );
}

function EnemyHealth({
  health,
  maxHealth,
  elite,
}: Pick<RenderEnemyView, 'health' | 'maxHealth' | 'elite'>) {
  const ratio = Math.max(0, Math.min(1, health / maxHealth));
  return (
    <group position={[0, elite ? 2.7 : 2.15, 0]}>
      <mesh>
        <planeGeometry args={[1.2, 0.1]} />
        <meshBasicMaterial color="#2a2020" side={THREE.DoubleSide} />
      </mesh>
      <mesh position-x={-(1 - ratio) * 0.6 + 0.002} position-z={0.004} scale-x={ratio}>
        <planeGeometry args={[1.18, 0.065]} />
        <meshBasicMaterial
          color={elite ? worldPalette.gold : worldPalette.warning}
          side={THREE.DoubleSide}
        />
      </mesh>
    </group>
  );
}

function MeleeEnemy() {
  return (
    <group rotation-x={0.08}>
      <mesh castShadow position-y={1.05} scale={[0.76, 1, 0.7]}>
        <dodecahedronGeometry args={[0.58, 0]} />
        <meshStandardMaterial color="#5b5148" roughness={0.82} />
      </mesh>
      <mesh castShadow position-y={1.72}>
        <sphereGeometry args={[0.3, 8, 6]} />
        <meshStandardMaterial color="#242526" roughness={0.62} />
      </mesh>
      {([-1, 1] as const).map((side) => (
        <mesh key={side} castShadow position={[side * 0.58, 0.92, -0.22]} rotation-z={side * -0.48}>
          <coneGeometry args={[0.11, 1.25, 5]} />
          <meshStandardMaterial color="#bab3a6" metalness={0.68} roughness={0.35} />
        </mesh>
      ))}
    </group>
  );
}

function FastEnemy() {
  return (
    <group>
      <mesh castShadow position-y={1.26} scale={[0.58, 1.28, 0.56]}>
        <octahedronGeometry args={[0.52, 0]} />
        <meshStandardMaterial color="#484d45" roughness={0.65} />
      </mesh>
      {[-1, 0, 1].map((side) => (
        <mesh
          key={side}
          castShadow
          position={[side * 0.42, 0.53, side === 0 ? -0.27 : 0]}
          rotation-z={side * 0.3}
        >
          <capsuleGeometry args={[0.075, 0.88, 3, 6]} />
          <meshStandardMaterial color="#252929" roughness={0.78} />
        </mesh>
      ))}
      <mesh position={[0, 1.48, 0.43]}>
        <sphereGeometry args={[0.13, 8, 6]} />
        <meshStandardMaterial
          color={worldPalette.warning}
          emissive={worldPalette.warning}
          emissiveIntensity={1.5}
        />
      </mesh>
    </group>
  );
}

function RangedEnemy() {
  return (
    <group>
      <mesh castShadow position-y={1.12}>
        <cylinderGeometry args={[0.48, 0.62, 1.2, 8]} />
        <meshStandardMaterial color="#535b59" metalness={0.38} roughness={0.56} />
      </mesh>
      <mesh castShadow position={[0, 1.62, -0.25]} rotation-x={Math.PI / 2}>
        <cylinderGeometry args={[0.25, 0.32, 0.72, 8]} />
        <meshStandardMaterial color="#282c2d" metalness={0.62} roughness={0.4} />
      </mesh>
      <mesh castShadow position={[0, 1.35, 0.78]} rotation-x={Math.PI / 2}>
        <cylinderGeometry args={[0.09, 0.13, 1.28, 8]} />
        <meshStandardMaterial color="#1a1c1d" metalness={0.78} roughness={0.3} />
      </mesh>
      <mesh position={[0, 1.65, 0.15]}>
        <boxGeometry args={[0.55, 0.12, 0.08]} />
        <meshStandardMaterial
          color={worldPalette.warning}
          emissive={worldPalette.warning}
          emissiveIntensity={1.1}
        />
      </mesh>
    </group>
  );
}

function HeavyEnemy() {
  return (
    <group>
      <mesh castShadow position-y={1.18} scale={[1.18, 1.25, 0.88]}>
        <dodecahedronGeometry args={[0.78, 0]} />
        <meshStandardMaterial color="#353a38" metalness={0.25} roughness={0.72} />
      </mesh>
      <mesh castShadow position={[0, 1.5, 0.48]}>
        <boxGeometry args={[1.32, 0.72, 0.22]} />
        <meshStandardMaterial color="#89877f" metalness={0.48} roughness={0.5} />
      </mesh>
      {([-1, 1] as const).map((side) => (
        <mesh key={side} castShadow position={[side * 0.9, 1.12, 0]} rotation-z={side * 0.25}>
          <capsuleGeometry args={[0.21, 0.74, 4, 7]} />
          <meshStandardMaterial color="#292d2c" roughness={0.7} />
        </mesh>
      ))}
      <mesh position={[0, 1.75, 0.64]}>
        <boxGeometry args={[0.48, 0.11, 0.07]} />
        <meshStandardMaterial
          color={worldPalette.warning}
          emissive={worldPalette.warning}
          emissiveIntensity={1.4}
        />
      </mesh>
    </group>
  );
}

function EliteEnemy() {
  return (
    <group>
      <mesh castShadow position-y={1.35} scale={[1.05, 1.2, 0.92]}>
        <icosahedronGeometry args={[0.72, 1]} />
        <meshStandardMaterial color="#413f3a" metalness={0.52} roughness={0.42} />
      </mesh>
      <mesh castShadow position={[0, 1.52, 0.68]}>
        <boxGeometry args={[1.5, 0.22, 0.28]} />
        <meshStandardMaterial color="#9b927f" metalness={0.66} roughness={0.34} />
      </mesh>
      {([-1, 1] as const).map((side) => (
        <group key={side} position={[side * 0.78, 1.18, 0]} rotation-z={side * -0.28}>
          <mesh castShadow>
            <cylinderGeometry args={[0.18, 0.26, 1.4, 7]} />
            <meshStandardMaterial color="#252827" metalness={0.56} roughness={0.44} />
          </mesh>
          <mesh position={[0, -0.72, 0.1]}>
            <coneGeometry args={[0.18, 0.56, 6]} />
            <meshStandardMaterial color="#171918" metalness={0.72} roughness={0.3} />
          </mesh>
        </group>
      ))}
      <mesh position={[0, 1.72, 0.72]}>
        <octahedronGeometry args={[0.2, 0]} />
        <meshStandardMaterial
          color={worldPalette.gold}
          emissive={worldPalette.warning}
          emissiveIntensity={1.6}
        />
      </mesh>
    </group>
  );
}

function silhouetteFor(kind: string) {
  if (/elite/i.test(kind)) return <EliteEnemy />;
  if (/fast|runner|scout/i.test(kind)) return <FastEnemy />;
  if (/range|shooter|sniper/i.test(kind)) return <RangedEnemy />;
  if (/heavy|tank|brute/i.test(kind)) return <HeavyEnemy />;
  return <MeleeEnemy />;
}

export function EnemyPlaceholder({
  enemy,
  playerPosition,
  reducedMotion,
}: {
  enemy: RenderEnemyView;
  playerPosition: Vec3Tuple;
  reducedMotion: boolean;
}) {
  const root = useRef<THREE.Group>(null);
  const spawnRing = useRef<THREE.MeshBasicMaterial>(null);
  const spawnAge = useRef(reducedMotion ? 1 : 0);
  useFrame((_, delta) => {
    if (spawnAge.current >= 1) return;
    spawnAge.current = Math.min(1, spawnAge.current + delta / 0.42);
    const eased = 1 - Math.pow(1 - spawnAge.current, 3);
    root.current?.scale.setScalar(Math.max(0.08, eased));
    if (spawnRing.current) spawnRing.current.opacity = (1 - spawnAge.current) * 0.65;
  });

  return (
    <group
      ref={root}
      name={`temporary-enemy-placeholder-${enemy.kind}`}
      position={enemy.position}
      userData={{ placeholder: true }}
    >
      <mesh rotation-x={-Math.PI / 2} position-y={0.045} scale={1.8}>
        <ringGeometry args={[0.7, 0.82, 26]} />
        <meshBasicMaterial
          ref={spawnRing}
          color={worldPalette.orange}
          transparent
          opacity={0}
          depthWrite={false}
        />
      </mesh>
      <mesh receiveShadow rotation-x={-Math.PI / 2} position-y={0.02}>
        <circleGeometry args={[enemy.elite ? 1.05 : 0.72, 20]} />
        <meshBasicMaterial color="#261c18" transparent opacity={0.3} depthWrite={false} />
      </mesh>
      {enemy.kind === 'lade' ? (
        <LadeEnemy enemy={enemy} playerPosition={playerPosition} reducedMotion={reducedMotion} />
      ) : (
        silhouetteFor(enemy.kind)
      )}
      {enemy.elite && (
        <group>
          <mesh position-y={2.28} rotation-x={Math.PI / 2}>
            <torusGeometry args={[0.64, 0.07, 7, 28]} />
            <meshStandardMaterial
              color={worldPalette.gold}
              emissive={worldPalette.gold}
              emissiveIntensity={1.1}
            />
          </mesh>
          {[0, 1, 2, 3].map((index) => (
            <mesh
              key={index}
              position={[
                Math.cos(index * Math.PI * 0.5) * 0.64,
                2.4,
                Math.sin(index * Math.PI * 0.5) * 0.64,
              ]}
            >
              <coneGeometry args={[0.08, 0.35, 5]} />
              <meshStandardMaterial color={worldPalette.gold} metalness={0.55} roughness={0.38} />
            </mesh>
          ))}
        </group>
      )}
      {enemy.telegraph && <Telegraph kind={enemy.kind} telegraph={enemy.telegraph} />}
      {enemy.stagger > 0 && (
        <mesh position-y={1.15}>
          <torusGeometry args={[0.92, 0.045, 7, 30]} />
          <meshBasicMaterial color="#fff0b8" transparent opacity={0.8} />
        </mesh>
      )}
      <EnemyHealth health={enemy.health} maxHealth={enemy.maxHealth} elite={enemy.elite} />
    </group>
  );
}

function DeathBurst({ position, reducedMotion }: { position: Vec3Tuple; reducedMotion: boolean }) {
  const root = useRef<THREE.Group>(null);
  const age = useRef(0);
  useFrame((_, delta) => {
    if (!root.current || reducedMotion) return;
    age.current = Math.min(1, age.current + delta / 0.65);
    root.current.scale.setScalar(0.5 + age.current * 2.8);
    root.current.rotation.y += delta * 2;
  });
  return (
    <group ref={root} position={position}>
      <mesh rotation-x={-Math.PI / 2}>
        <ringGeometry args={[0.35, 0.5, 24]} />
        <meshBasicMaterial
          color={worldPalette.orange}
          transparent
          opacity={0.62}
          depthWrite={false}
        />
      </mesh>
      {[0, 1, 2, 3, 4].map((index) => (
        <mesh
          key={index}
          position={[
            Math.cos(index * 1.257) * 0.46,
            0.35 + (index % 2) * 0.2,
            Math.sin(index * 1.257) * 0.46,
          ]}
        >
          <tetrahedronGeometry args={[0.12, 0]} />
          <meshBasicMaterial
            color={index % 2 ? worldPalette.orange : '#fff0bd'}
            transparent
            opacity={0.72}
          />
        </mesh>
      ))}
    </group>
  );
}

export function Enemies({
  enemies,
  playerPosition,
  topDown,
  awarenessRadius = 30,
  reducedMotion = false,
}: {
  enemies: readonly RenderEnemyView[];
  playerPosition: Vec3Tuple;
  topDown: boolean;
  awarenessRadius?: number;
  reducedMotion?: boolean;
}) {
  const previous = useRef(new Map<string, Vec3Tuple>());
  const timers = useRef(new Set<number>());
  const nextBurstId = useRef(1);
  const [bursts, setBursts] = useState<readonly { id: number; position: Vec3Tuple }[]>([]);

  useEffect(() => {
    const next = new Map(enemies.map((enemy) => [enemy.id, enemy.position]));
    const removed = Array.from(previous.current.entries()).filter(([id]) => !next.has(id));
    previous.current = next;
    if (removed.length === 0) return;

    const created = removed.map(([, position]) => ({ id: nextBurstId.current++, position }));
    setBursts((current) => [...current, ...created].slice(-18));
    for (const burst of created) {
      const timer = window.setTimeout(() => {
        setBursts((current) => current.filter((item) => item.id !== burst.id));
        timers.current.delete(timer);
      }, 700);
      timers.current.add(timer);
    }
  }, [enemies]);

  useEffect(
    () => () => {
      for (const timer of timers.current) window.clearTimeout(timer);
      timers.current.clear();
    },
    [],
  );

  return (
    <>
      {enemies.map((enemy) => {
        if (topDown) {
          const distance = Math.hypot(
            enemy.position[0] - playerPosition[0],
            enemy.position[2] - playerPosition[2],
          );
          if (distance > awarenessRadius) return null;
        }
        return (
          <EnemyPlaceholder
            key={enemy.id}
            enemy={enemy}
            playerPosition={playerPosition}
            reducedMotion={reducedMotion}
          />
        );
      })}
      {bursts.map((burst) => (
        <DeathBurst key={burst.id} position={burst.position} reducedMotion={reducedMotion} />
      ))}
    </>
  );
}
