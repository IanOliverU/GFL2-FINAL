import { useFrame } from '@react-three/fiber';
import { useRef } from 'react';
import * as THREE from 'three';
import type { RenderEnemyView, Vec3Tuple } from '../snapshot';

/**
 * Felagi · Lade procedural proxy (M2 vertical slice, explicitly provisional).
 *
 * No usable Lade 3D model exists in `assets-source` (Doll PMX packages and
 * WebP reference images only), so this composed hierarchy follows the
 * reference's broad visual language — gas mask with round lenses, helmet
 * with headlamp, neck scarf, layered olive coat, limb guards, backpack with
 * a carried blade, and a bulky rifle — without reproducing the official
 * model. Calibrated to a ~1.75 m human scale beside Tololo's 1.72 m.
 *
 * Presentation only: facing, locomotion, wind-up, strike, hit, and stagger
 * poses derive from the authoritative snapshot. The parent renders a short
 * death burst after authoritative removal; damage is never applied here.
 */
const OLIVE = '#5a5f43';
const OLIVE_DARK = '#474b36';
const GREY = '#6f6e6a';
const GREY_DARK = '#3a3b39';
const CHARCOAL = '#2b2d2c';
const BROWN = '#6e5738';
const SCARF = '#8d87a0';
const LENS = '#cfe3dd';
const RUST = '#7d4a2d';
const STEEL = '#9aa0a0';

function isLadeDebug(): boolean {
  return (
    typeof window !== 'undefined' &&
    new URLSearchParams(window.location.search).get('ladeDebug') === '1'
  );
}

function shortestAngle(angle: number): number {
  return Math.atan2(Math.sin(angle), Math.cos(angle));
}

export function LadeEnemy({
  enemy,
  playerPosition,
  reducedMotion,
  detectionRadius = 30,
}: {
  enemy: RenderEnemyView;
  playerPosition: Vec3Tuple;
  reducedMotion: boolean;
  detectionRadius?: number;
}) {
  const root = useRef<THREE.Group>(null);
  const torso = useRef<THREE.Group>(null);
  const head = useRef<THREE.Group>(null);
  const leftLeg = useRef<THREE.Group>(null);
  const rightLeg = useRef<THREE.Group>(null);
  const leftArm = useRef<THREE.Group>(null);
  const rightArm = useRef<THREE.Group>(null);
  const rifle = useRef<THREE.Group>(null);
  const lensLeft = useRef<THREE.MeshStandardMaterial>(null);
  const lensRight = useRef<THREE.MeshStandardMaterial>(null);
  const previous = useRef({
    x: enemy.position[0],
    z: enemy.position[2],
    yaw: 0,
    phase: 0,
    health: enemy.health,
    telegraph: 0,
    strike: 0,
    hit: 0,
  });
  const debug = isLadeDebug();
  const motionScale = reducedMotion ? 0.4 : 1;

  useFrame((_, rawDelta) => {
    const state = previous.current;
    const delta = Math.min(rawDelta, 0.1);
    const dx = enemy.position[0] - state.x;
    const dz = enemy.position[2] - state.z;
    const speed = Math.hypot(dx, dz) / Math.max(delta, 1e-4);
    state.x = enemy.position[0];
    state.z = enemy.position[2];

    // Face the player (turntable override only under the debug flag).
    const faceYaw = Math.atan2(
      playerPosition[0] - enemy.position[0],
      playerPosition[2] - enemy.position[2],
    );
    const targetYaw = debug ? state.yaw + delta * 0.6 : faceYaw;
    state.yaw += shortestAngle(targetYaw - state.yaw) * Math.min(1, delta * 8);
    if (debug) state.yaw = targetYaw;

    // Locomotion phase from real displacement; idle breathes slowly.
    state.phase += delta * (speed > 0.25 ? 4.4 + speed * 0.9 : 1.1);
    const swing = Math.sin(state.phase) * Math.min(1, speed / 3.1) * 0.5 * motionScale;
    const bob = Math.abs(Math.cos(state.phase)) * Math.min(1, speed / 3.1) * 0.05 * motionScale;

    // Event edges drive one-shot poses; the simulation owns the transitions.
    if (enemy.health < state.health) state.hit = 0.18;
    state.health = enemy.health;
    if (state.telegraph > 0 && enemy.telegraphSeconds <= 0) state.strike = 0.24;
    state.telegraph = enemy.telegraphSeconds;
    state.strike = Math.max(0, state.strike - delta);
    state.hit = Math.max(0, state.hit - delta);

    const winding = enemy.telegraphSeconds > 0 ? 1 : 0;
    const striking = state.strike > 0 ? state.strike / 0.24 : 0;
    const hitBlend = state.hit > 0 ? state.hit / 0.18 : 0;
    const staggered = enemy.stagger > 0 ? 1 : 0;

    if (root.current) {
      root.current.rotation.y = state.yaw;
      // Wind-up crouch, strike lunge, hit flinch, stagger wobble, walk bob.
      root.current.position.y = -winding * 0.09 + striking * 0.02 - bob;
      root.current.rotation.x =
        winding * 0.1 - hitBlend * 0.14 + staggered * Math.sin(state.phase * 9) * 0.05;
      root.current.rotation.z = staggered * 0.1 * Math.sin(state.phase * 7);
    }
    if (torso.current) {
      torso.current.rotation.x = winding * 0.16 + striking * 0.22 - hitBlend * 0.2;
    }
    if (leftLeg.current) leftLeg.current.rotation.x = swing;
    if (rightLeg.current) rightLeg.current.rotation.x = -swing;
    if (leftArm.current) leftArm.current.rotation.x = -swing * 0.7 - winding * 0.3;
    if (rightArm.current) {
      rightArm.current.rotation.x = swing * 0.5 - winding * 0.55 - striking * 0.35;
    }
    if (rifle.current) {
      rifle.current.position.z = 0.62 + winding * 0.1 + striking * 0.22;
      rifle.current.rotation.x = -winding * 0.12 + striking * 0.08;
    }
    if (head.current) {
      head.current.rotation.x = winding * -0.08 + hitBlend * 0.16;
    }
    const lensGlow = 0.35 + winding * 1.4 + hitBlend * 0.8;
    if (lensLeft.current) lensLeft.current.emissiveIntensity = lensGlow;
    if (lensRight.current) lensRight.current.emissiveIntensity = lensGlow;
  });

  return (
    <group ref={root} name="lade-proxy">
      {/* Boots: tall lace-up boots with dark straps, feet grounded at y 0. */}
      {([-1, 1] as const).map((side) => (
        <group key={`leg-${side}`} position={[side * 0.14, 0, 0]}>
          <mesh castShadow position-y={0.27}>
            <cylinderGeometry args={[0.105, 0.125, 0.54, 8]} />
            <meshStandardMaterial color={GREY} roughness={0.8} />
          </mesh>
          <mesh position-y={0.06}>
            <boxGeometry args={[0.2, 0.12, 0.34]} />
            <meshStandardMaterial color={GREY_DARK} roughness={0.85} />
          </mesh>
          <mesh position-y={0.42}>
            <torusGeometry args={[0.115, 0.025, 6, 12]} />
            <meshStandardMaterial color={CHARCOAL} roughness={0.7} />
          </mesh>
          {/* Olive trouser leg, animated at the hip. */}
          <group ref={side < 0 ? leftLeg : rightLeg} position-y={0.54}>
            <mesh castShadow position-y={0.24}>
              <cylinderGeometry args={[0.115, 0.105, 0.48, 8]} />
              <meshStandardMaterial color={OLIVE_DARK} roughness={0.9} />
            </mesh>
          </group>
        </group>
      ))}
      {/* Coat skirt flaps. */}
      <mesh castShadow position-y={1.02}>
        <cylinderGeometry args={[0.3, 0.42, 0.34, 8]} />
        <meshStandardMaterial color={OLIVE} roughness={0.9} />
      </mesh>
      {/* Torso: layered coat with chest strap. */}
      <group ref={torso} position-y={1.19}>
        <mesh castShadow position-y={0.2}>
          <boxGeometry args={[0.46, 0.42, 0.3]} />
          <meshStandardMaterial color={OLIVE} roughness={0.88} />
        </mesh>
        <mesh position={[0, 0.28, 0.16]}>
          <boxGeometry args={[0.4, 0.1, 0.03]} />
          <meshStandardMaterial color={BROWN} roughness={0.8} />
        </mesh>
        {/* Shoulder plates. */}
        {([-1, 1] as const).map((side) => (
          <mesh key={`pauldron-${side}`} castShadow position={[side * 0.29, 0.36, 0]}>
            <sphereGeometry args={[0.13, 8, 6]} />
            <meshStandardMaterial color={GREY_DARK} roughness={0.6} metalness={0.3} />
          </mesh>
        ))}
      </group>
      {/* Arms with segmented guards; right arm aims the rifle forward. */}
      {([-1, 1] as const).map((side) => (
        <group
          key={`arm-${side}`}
          ref={side < 0 ? leftArm : rightArm}
          position={[side * 0.3, 1.5, 0.05]}
        >
          <mesh castShadow position-y={-0.16}>
            <cylinderGeometry args={[0.085, 0.075, 0.34, 7]} />
            <meshStandardMaterial color={GREY_DARK} roughness={0.75} />
          </mesh>
          <mesh position-y={-0.36}>
            <sphereGeometry args={[0.095, 7, 6]} />
            <meshStandardMaterial color={CHARCOAL} roughness={0.85} />
          </mesh>
        </group>
      ))}
      {/* Rifle held forward: body, wooden foregrip, barrel, underbarrel blade. */}
      <group ref={rifle} position={[0.12, 1.28, 0.62]}>
        <mesh castShadow>
          <boxGeometry args={[0.09, 0.13, 0.72]} />
          <meshStandardMaterial color={GREY_DARK} roughness={0.5} metalness={0.55} />
        </mesh>
        <mesh position={[0, -0.02, 0.18]}>
          <boxGeometry args={[0.08, 0.1, 0.26]} />
          <meshStandardMaterial color={BROWN} roughness={0.8} />
        </mesh>
        <mesh position-z={0.46}>
          <cylinderGeometry args={[0.028, 0.028, 0.24, 8]} />
          <meshStandardMaterial color={CHARCOAL} roughness={0.4} metalness={0.7} />
        </mesh>
        <mesh position={[0, -0.11, 0.3]} rotation-x={0.15}>
          <boxGeometry args={[0.03, 0.06, 0.3]} />
          <meshStandardMaterial color={STEEL} roughness={0.35} metalness={0.75} />
        </mesh>
      </group>
      {/* Scarf: neck wrap plus drape. */}
      <mesh position-y={1.56}>
        <torusGeometry args={[0.14, 0.07, 7, 14]} />
        <meshStandardMaterial color={SCARF} roughness={0.95} />
      </mesh>
      <mesh position={[0.1, 1.38, -0.14]} rotation-z={0.2}>
        <boxGeometry args={[0.16, 0.34, 0.05]} />
        <meshStandardMaterial color={SCARF} roughness={0.95} />
      </mesh>
      {/* Head: gas mask, round lenses, filter canister, helmet, lamp. */}
      <group ref={head} position-y={1.66}>
        <mesh castShadow>
          <sphereGeometry args={[0.14, 10, 8]} />
          <meshStandardMaterial color={GREY_DARK} roughness={0.65} />
        </mesh>
        {([-1, 1] as const).map((side) => (
          <group key={`lens-${side}`} position={[side * 0.062, 0.03, 0.115]}>
            <mesh rotation-x={Math.PI / 2}>
              <cylinderGeometry args={[0.052, 0.058, 0.05, 10]} />
              <meshStandardMaterial color={CHARCOAL} roughness={0.5} />
            </mesh>
            <mesh position-z={0.026}>
              <circleGeometry args={[0.042, 12]} />
              <meshStandardMaterial
                ref={side < 0 ? lensLeft : lensRight}
                color={LENS}
                emissive={LENS}
                emissiveIntensity={0.35}
                roughness={0.25}
              />
            </mesh>
          </group>
        ))}
        <mesh position={[0, -0.12, 0.1]}>
          <cylinderGeometry args={[0.05, 0.055, 0.16, 8]} />
          <meshStandardMaterial color={CHARCOAL} roughness={0.6} />
        </mesh>
        {/* Helmet with pale stripe and headlamp. */}
        <mesh castShadow position-y={0.09}>
          <sphereGeometry args={[0.165, 10, 6, 0, Math.PI * 2, 0, Math.PI * 0.55]} />
          <meshStandardMaterial color={OLIVE} roughness={0.8} />
        </mesh>
        <mesh position-y={0.16}>
          <boxGeometry args={[0.05, 0.03, 0.3]} />
          <meshStandardMaterial color="#d8d4c8" roughness={0.7} />
        </mesh>
        <mesh position={[0.09, 0.14, 0.1]} rotation-z={-0.4}>
          <cylinderGeometry args={[0.032, 0.038, 0.09, 8]} />
          <meshStandardMaterial color={CHARCOAL} roughness={0.5} metalness={0.4} />
        </mesh>
        <mesh position={[0.115, 0.1, 0.13]}>
          <circleGeometry args={[0.024, 10]} />
          <meshStandardMaterial
            color="#fff3cf"
            emissive="#ffdf9e"
            emissiveIntensity={1.2}
            roughness={0.3}
          />
        </mesh>
      </group>
      {/* Backpack with carried rusted blade. */}
      <mesh castShadow position={[0, 1.3, -0.24]}>
        <boxGeometry args={[0.34, 0.42, 0.2]} />
        <meshStandardMaterial color={OLIVE_DARK} roughness={0.9} />
      </mesh>
      <mesh position={[0.16, 1.62, -0.3]} rotation-z={-0.5}>
        <boxGeometry args={[0.09, 0.62, 0.04]} />
        <meshStandardMaterial color={RUST} roughness={0.7} metalness={0.35} />
      </mesh>
      {debug && (
        <group>
          {/* Collider silhouette ring. */}
          <mesh rotation-x={-Math.PI / 2} position-y={0.03}>
            <ringGeometry args={[enemy.radius - 0.04, enemy.radius, 28]} />
            <meshBasicMaterial color="#7fd4ff" transparent opacity={0.85} depthWrite={false} />
          </mesh>
          {/* Attack-range ring. */}
          <mesh rotation-x={-Math.PI / 2} position-y={0.03}>
            <ringGeometry args={[enemy.attackRange - 0.05, enemy.attackRange, 40]} />
            <meshBasicMaterial
              color="#ffb347"
              transparent
              opacity={0.5}
              depthWrite={false}
              side={THREE.DoubleSide}
            />
          </mesh>
          {/* Attack-origin marker at the rifle tip. */}
          <mesh position={[0.12, 1.28, 1.2]}>
            <sphereGeometry args={[0.07, 8, 6]} />
            <meshBasicMaterial color="#ff5d5d" depthWrite={false} />
          </mesh>
          {/* Detection radius (matches the top-down awareness cull). */}
          <mesh rotation-x={-Math.PI / 2} position-y={0.03}>
            <ringGeometry args={[detectionRadius - 0.15, detectionRadius, 72]} />
            <meshBasicMaterial
              color="#b48cff"
              transparent
              opacity={0.35}
              depthWrite={false}
              side={THREE.DoubleSide}
            />
          </mesh>
        </group>
      )}
    </group>
  );
}
