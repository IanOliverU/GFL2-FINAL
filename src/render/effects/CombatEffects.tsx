import { Billboard, Html } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { useRef } from 'react';
import * as THREE from 'three';
import { worldPalette } from '../materials';
import type {
  RenderDamageNumberView,
  RenderEventView,
  RenderPickupView,
  RenderPlayerView,
  RenderProjectileView,
} from '../snapshot';

function Projectile({ projectile }: { projectile: RenderProjectileView }) {
  const hydro = projectile.kind === 'hydro';
  const color = projectile.hostile ? worldPalette.warning : hydro ? worldPalette.cyan : '#ffe4a2';
  const horizontal = Math.hypot(projectile.velocity[0], projectile.velocity[2]);
  const yaw = Math.atan2(projectile.velocity[0], projectile.velocity[2]);
  const pitch = Math.atan2(projectile.velocity[1], horizontal);
  return (
    <group position={projectile.position}>
      <mesh rotation={[Math.PI / 2 - pitch, yaw, 0]}>
        <capsuleGeometry
          args={[projectile.hostile ? 0.085 : 0.045, projectile.hostile ? 0.55 : 0.82, 3, 6]}
        />
        <meshBasicMaterial color={color} />
      </mesh>
      <pointLight
        color={projectile.hostile ? worldPalette.warning : hydro ? worldPalette.cyan : '#ffbb63'}
        intensity={projectile.hostile ? 0.6 : 0.35}
        distance={2.8}
      />
    </group>
  );
}

function DamageNumber({ damage }: { damage: RenderDamageNumberView }) {
  return (
    <group position={damage.position}>
      <Html center distanceFactor={10} zIndexRange={[2, 0]}>
        <output className={`gfl-world-number${damage.critical ? ' is-critical' : ''}`}>
          {Math.round(damage.value)}
          {damage.critical ? ' CRIT' : ''}
        </output>
      </Html>
    </group>
  );
}

function Pickup({ pickup, reducedMotion }: { pickup: RenderPickupView; reducedMotion: boolean }) {
  const root = useRef<THREE.Group>(null);
  useFrame((state, delta) => {
    if (!root.current || reducedMotion) return;
    root.current.rotation.y += delta * 0.8;
    root.current.position.y =
      pickup.position[1] + 0.85 + Math.sin(state.clock.elapsedTime * 2.3) * 0.12;
  });
  const attachment = /attachment/i.test(pickup.kind);
  const color = attachment ? worldPalette.gold : worldPalette.orange;
  return (
    <group
      ref={root}
      position={[pickup.position[0], pickup.position[1] + 0.85, pickup.position[2]]}
    >
      <mesh>
        {attachment ? (
          <octahedronGeometry args={[0.34, 0]} />
        ) : (
          <cylinderGeometry args={[0.3, 0.3, 0.12, 10]} />
        )}
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={1.4}
          metalness={0.35}
          roughness={0.32}
        />
      </mesh>
      <mesh rotation-x={Math.PI / 2}>
        <torusGeometry args={[0.53, 0.035, 6, 24]} />
        <meshBasicMaterial color={color} transparent opacity={0.62} />
      </mesh>
      <Billboard position-y={0.72}>
        <mesh>
          <planeGeometry args={[0.52, 0.13]} />
          <meshBasicMaterial color={color} transparent opacity={0.76} depthWrite={false} />
        </mesh>
      </Billboard>
    </group>
  );
}

function DodgeTrail({ player }: { player: RenderPlayerView }) {
  const speed = Math.hypot(player.velocity[0], player.velocity[2]);
  if (!player.invulnerable || speed < 1) return null;
  const directionX = player.velocity[0] / speed;
  const directionZ = player.velocity[2] / speed;
  return (
    <group>
      {[1, 2, 3].map((index) => (
        <mesh
          key={index}
          position={[
            player.position[0] - directionX * index * 0.62,
            player.position[1] + 1.1,
            player.position[2] - directionZ * index * 0.62,
          ]}
          rotation-y={player.aimYaw}
          scale={[0.5, 1.05, 0.22]}
        >
          <capsuleGeometry args={[0.4, 0.9, 4, 7]} />
          <meshBasicMaterial
            color={worldPalette.cyan}
            transparent
            opacity={0.2 / index}
            depthWrite={false}
            wireframe={index > 1}
          />
        </mesh>
      ))}
    </group>
  );
}

/**
 * Restrained code-authored ability feedback. Skill events carry the skill index
 * in `value` (1/2/3) and are anchored at Tololo by the render projection.
 * Geometry is flat ground rings plus a small tetra burst for the Ultimate only.
 */
function SkillEffect({ event, reducedMotion }: { event: RenderEventView; reducedMotion: boolean }) {
  if (!event.position || event.age > 0.9) return null;
  const progress = Math.max(0, Math.min(1, event.age / 0.9));
  const ultimate = event.value === 3;
  const color = ultimate ? worldPalette.gold : worldPalette.cyan;
  const scale = reducedMotion ? 1 : 0.4 + progress * (ultimate ? 4.2 : 2.2);
  return (
    <group position={event.position}>
      <mesh rotation-x={-Math.PI / 2} position-y={0.05} scale={scale}>
        <ringGeometry args={[0.42, 0.54, 28]} />
        <meshBasicMaterial
          color={color}
          transparent
          opacity={Math.max(0, 0.85 - progress)}
          depthWrite={false}
        />
      </mesh>
      {ultimate &&
        [0, 1, 2, 3, 4, 5].map((index) => (
          <mesh
            key={index}
            position={[
              Math.cos((index / 6) * Math.PI * 2) * progress * 1.6,
              0.5 + progress * (0.6 + (index % 2) * 0.5),
              Math.sin((index / 6) * Math.PI * 2) * progress * 1.6,
            ]}
            rotation-z={index}
          >
            <tetrahedronGeometry args={[0.11, 0]} />
            <meshBasicMaterial color={color} transparent opacity={1 - progress} />
          </mesh>
        ))}
    </group>
  );
}

function EventEffect({ event, reducedMotion }: { event: RenderEventView; reducedMotion: boolean }) {
  if (!event.position || event.age > 0.75) return null;
  if (/skill/i.test(event.type)) return null;
  const death = /death|destroy|defeat/i.test(event.type);
  const spawn = /spawn|arrive/i.test(event.type);
  const impact = /impact|hit/i.test(event.type);
  if (!death && !spawn && !impact) return null;
  const progress = Math.max(0, Math.min(1, event.age / 0.75));
  const scale = reducedMotion ? 1 : 0.35 + progress * (death ? 2.8 : 1.8);
  const color = death ? worldPalette.orange : spawn ? worldPalette.warning : '#ffe0a3';
  return (
    <group position={event.position}>
      <mesh rotation-x={-Math.PI / 2} scale={scale}>
        <ringGeometry args={[0.42, 0.54, 24]} />
        <meshBasicMaterial
          color={color}
          transparent
          opacity={Math.max(0, 0.8 - progress)}
          depthWrite={false}
        />
      </mesh>
      {death &&
        [0, 1, 2, 3, 4, 5].map((index) => (
          <mesh
            key={index}
            position={[
              Math.cos((index / 6) * Math.PI * 2) * progress * 1.3,
              0.4 + progress * (0.4 + (index % 2) * 0.4),
              Math.sin((index / 6) * Math.PI * 2) * progress * 1.3,
            ]}
            rotation-z={index}
          >
            <tetrahedronGeometry args={[0.1, 0]} />
            <meshBasicMaterial color={color} transparent opacity={1 - progress} />
          </mesh>
        ))}
    </group>
  );
}

export function CombatEffects({
  projectiles,
  damageNumbers,
  pickups,
  events,
  player,
  reducedMotion = false,
}: {
  projectiles: readonly RenderProjectileView[];
  damageNumbers: readonly RenderDamageNumberView[];
  pickups: readonly RenderPickupView[];
  events: readonly RenderEventView[];
  player: RenderPlayerView;
  reducedMotion?: boolean;
}) {
  return (
    <>
      {projectiles.map((projectile) => (
        <Projectile key={projectile.id} projectile={projectile} />
      ))}
      {damageNumbers.map((damage) => (
        <DamageNumber key={damage.id} damage={damage} />
      ))}
      {pickups.map((pickup) => (
        <Pickup key={pickup.id} pickup={pickup} reducedMotion={reducedMotion} />
      ))}
      {events.map((event) =>
        /skill/i.test(event.type) ? (
          <SkillEffect key={event.id} event={event} reducedMotion={reducedMotion} />
        ) : (
          <EventEffect key={event.id} event={event} reducedMotion={reducedMotion} />
        ),
      )}
      <DodgeTrail player={player} />
    </>
  );
}
