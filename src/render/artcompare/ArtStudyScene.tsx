import { Billboard } from '@react-three/drei';
import { useFrame, useThree } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { LadeEnemy } from '../actors/LadeEnemy';
import { TololoPlayer } from '../actors/TololoPlayer';
import type { RenderEnemyView, RenderEventView, RenderPlayerView } from '../snapshot';
import { ART_STUDY, type ArtCompareMode, type ArtCompareView } from './artCompareMode';
import { pixelSpriteTexture, quantizePixelDir } from './pixelSprites';

function mockPlayer(time: number, view: ArtCompareView): RenderPlayerView {
  const yaw = Math.atan2(
    ART_STUDY.ladePosition[0] - ART_STUDY.tololoPosition[0],
    ART_STUDY.ladePosition[2] - ART_STUDY.tololoPosition[2],
  );
  return {
    position: [
      ART_STUDY.tololoPosition[0],
      ART_STUDY.tololoPosition[1],
      ART_STUDY.tololoPosition[2],
    ],
    velocity: view === 'movement' ? [2.2, 0, 0] : [0, 0, 0],
    muzzle: [ART_STUDY.tololoPosition[0], 1.25, ART_STUDY.tololoPosition[2] + 0.82],
    facing: yaw,
    aimYaw: yaw,
    aimPitch: 0,
    health: 100,
    maxHealth: 100,
    level: 1,
    exp: 0,
    nextExp: 60,
    sardis: 0,
    ammo: 29,
    magazine: 30,
    reloading: false,
    reloadProgress: 0,
    dodgeCooldown: 0,
    dodgeRemaining: 0,
    invulnerable: false,
    ads: view === 'ads',
    sprinting: view === 'movement',
    recoil: view === 'muzzle' ? 0.4 : 0,
    skills: [],
    cooldowns: {},
  };
}

function mockLade(time: number): RenderEnemyView {
  const phase = time % ART_STUDY.telegraphPeriod;
  const telegraph = phase > ART_STUDY.telegraphOnset ? 'ladeSlash' : null;
  const muzzlePhase = time % ART_STUDY.muzzlePeriod;
  const hit = muzzlePhase > ART_STUDY.impactTime && muzzlePhase < ART_STUDY.impactTime + 0.4;
  return {
    id: 'lade-study',
    kind: 'lade',
    position: [ART_STUDY.ladePosition[0], ART_STUDY.ladePosition[1], ART_STUDY.ladePosition[2]],
    health: hit ? 82 : 100,
    maxHealth: 100,
    elite: false,
    radius: 0.55,
    attackRange: 2.2,
    telegraph,
    telegraphSeconds: telegraph ? 0.55 : 0,
    stagger: 0,
  };
}

function mockEvents(time: number): readonly RenderEventView[] {
  const muzzlePhase = time % ART_STUDY.muzzlePeriod;
  const events: RenderEventView[] = [];
  if (muzzlePhase < 0.12) {
    events.push({
      id: 'study-shot',
      type: 'shot',
      position: [0, 1.25, 0.82],
      age: muzzlePhase,
      value: 18,
    });
  }
  const impactAge = muzzlePhase - ART_STUDY.impactTime;
  if (impactAge >= 0 && impactAge < 0.5) {
    events.push({
      id: 'study-hit',
      type: 'hit',
      position: [ART_STUDY.ladePosition[0], 1.1, ART_STUDY.ladePosition[2]],
      age: impactAge,
      value: 18,
    });
  }
  return events;
}

function StudyEnvironment({ cel }: { cel: boolean }) {
  const foliage = useMemo(() => {
    const items: { position: [number, number, number]; scale: number }[] = [];
    for (let i = 0; i < 36; i += 1) {
      const x = -13 + ((i * 7.3) % 26);
      const z = -10 + ((i * 4.7) % 22);
      if (Math.hypot(x, z - 3) < 3.4) continue;
      items.push({ position: [x, 0, z], scale: 0.7 + ((i * 13) % 10) / 14 });
    }
    return items;
  }, []);
  const groundColor = cel ? '#6f8a52' : '#627e47';
  const wallColor = cel ? '#8b8d86' : '#7a7c74';
  return (
    <group>
      <mesh rotation-x={-Math.PI / 2} receiveShadow>
        <planeGeometry args={[ART_STUDY.groundSize[0], ART_STUDY.groundSize[1]]} />
        {cel ? (
          <meshToonMaterial color={groundColor} />
        ) : (
          <meshStandardMaterial color={groundColor} roughness={0.95} metalness={0} />
        )}
      </mesh>
      <group position={[ART_STUDY.wallPosition[0], 0, ART_STUDY.wallPosition[2]]}>
        <mesh position={[0, 1.1, 0]} castShadow>
          <boxGeometry args={[4.4, 2.2, 0.5]} />
          {cel ? (
            <meshToonMaterial color={wallColor} />
          ) : (
            <meshStandardMaterial color={wallColor} roughness={0.9} />
          )}
        </mesh>
        <mesh position={[1.2, 2.5, 0]} castShadow>
          <boxGeometry args={[1.8, 0.5, 0.5]} />
          {cel ? (
            <meshToonMaterial color="#6f7169" />
          ) : (
            <meshStandardMaterial color="#62645c" roughness={0.9} />
          )}
        </mesh>
        {cel && (
          <lineSegments>
            <edgesGeometry args={[new THREE.BoxGeometry(4.4, 2.2, 0.5)]} />
            <lineBasicMaterial color="#1d1f1e" />
          </lineSegments>
        )}
      </group>
      <group position={[ART_STUDY.rockPosition[0], 0.5, ART_STUDY.rockPosition[2]]}>
        <mesh castShadow>
          <dodecahedronGeometry args={[1.1, 0]} />
          {cel ? (
            <meshToonMaterial color="#7d7f78" />
          ) : (
            <meshStandardMaterial color="#6b6d66" roughness={1} flatShading />
          )}
        </mesh>
        {cel && (
          <lineSegments>
            <edgesGeometry args={[new THREE.DodecahedronGeometry(1.1, 0)]} />
            <lineBasicMaterial color="#22241f" transparent opacity={0.7} />
          </lineSegments>
        )}
      </group>
      <group position={[ART_STUDY.coverPosition[0], 0.45, ART_STUDY.coverPosition[2]]}>
        <mesh castShadow>
          <boxGeometry args={[1.6, 0.9, 0.9]} />
          {cel ? (
            <meshToonMaterial color="#556052" />
          ) : (
            <meshStandardMaterial color="#4c584a" roughness={0.9} />
          )}
        </mesh>
      </group>
      {foliage.map((item, index) => (
        <mesh key={index} position={item.position} scale={item.scale}>
          <coneGeometry args={[0.28, 0.9, 6]} />
          {cel ? (
            <meshToonMaterial color="#4d6b3f" />
          ) : (
            <meshStandardMaterial color="#425f43" roughness={1} />
          )}
        </mesh>
      ))}
      <mesh position={[ART_STUDY.landmarkPosition[0], 7, ART_STUDY.landmarkPosition[2]]}>
        <boxGeometry args={[12, 14, 2]} />
        <meshBasicMaterial color="#5c6a72" transparent opacity={0.85} fog />
      </mesh>
      <mesh position={[2.2, 0.02, 5.4]} rotation-x={-Math.PI / 2}>
        <circleGeometry args={[1.1, 24]} />
        <meshBasicMaterial color="#2c2a26" transparent opacity={0.55} depthWrite={false} />
      </mesh>
      <mesh position={[2.9, 0.12, 5.9]}>
        <boxGeometry args={[0.5, 0.24, 0.3]} />
        <meshStandardMaterial color="#3a3b39" roughness={1} />
      </mesh>
    </group>
  );
}

function StudyLights({ mode }: { mode: ArtCompareMode }) {
  const sun = new THREE.Vector3(...ART_STUDY.sunDirection).normalize();
  return (
    <>
      <hemisphereLight args={[ART_STUDY.skyColor, '#4c584a', mode === 'cel3d' ? 0.95 : 0.75]} />
      <directionalLight
        position={[sun.x * 20, sun.y * 20, sun.z * 20]}
        color={ART_STUDY.sunColor}
        intensity={mode === 'cel3d' ? 2.0 : 1.6}
        castShadow={mode !== 'pixel2d'}
        shadow-mapSize={[1024, 1024]}
      />
      {mode === 'cel3d' && (
        <directionalLight position={[6, 3, -8]} color="#bcd4ff" intensity={0.65} />
      )}
      <ambientLight intensity={mode === 'pixel2d' ? 0.7 : 0.25} />
    </>
  );
}

function PixelActorSprite({
  actor,
  position,
  yaw,
  time,
  scale = 1,
}: {
  actor: 'tololo' | 'lade';
  position: readonly [number, number, number];
  yaw: number;
  time: number;
  scale?: number;
}) {
  const dir = quantizePixelDir(yaw);
  const frame = Math.floor(time * 4) % 2;
  const texture = pixelSpriteTexture(actor, dir, frame);
  const height = (actor === 'tololo' ? ART_STUDY.tololoHeight : ART_STUDY.ladeHeight) * scale;
  return (
    <Billboard position={[position[0], height / 2, position[2]]}>
      <mesh>
        <planeGeometry args={[height * 0.75, height]} />
        <meshBasicMaterial map={texture} transparent alphaTest={0.4} />
      </mesh>
    </Billboard>
  );
}

function ArtRendererStats() {
  const gl = useThree((state) => state.gl);
  const elapsed = useRef(0);
  useFrame((_, delta) => {
    elapsed.current += delta;
    if (elapsed.current < 0.5) return;
    elapsed.current = 0;
    window.__GFL2_ART_RENDERER__ = {
      calls: gl.info.render.calls,
      triangles: gl.info.render.triangles,
      geometries: gl.info.memory.geometries,
      textures: gl.info.memory.textures,
    };
  });
  return null;
}

export function ArtStudyInner({
  mode,
  view,
  time,
}: {
  mode: ArtCompareMode;
  view: ArtCompareView;
  time: number;
}) {
  const player = mockPlayer(time, view);
  const lade = mockLade(time);
  const events = mockEvents(time);
  const cameraYaw = Math.atan2(
    ART_STUDY.ladePosition[0] - ART_STUDY.tololoPosition[0],
    ART_STUDY.ladePosition[2] - ART_STUDY.tololoPosition[2],
  );

  if (mode === 'pixel2d') {
    return (
      <>
        <color attach="background" args={['#9db8c9']} />
        <ArtRendererStats />
        <StudyLights mode={mode} />
        <StudyEnvironment cel={false} />
        <PixelActorSprite
          actor="tololo"
          position={ART_STUDY.tololoPosition}
          yaw={cameraYaw}
          time={time}
        />
        <PixelActorSprite
          actor="lade"
          position={ART_STUDY.ladePosition}
          yaw={cameraYaw + Math.PI}
          time={time}
        />
        {lade.telegraph && (
          <mesh
            position={[ART_STUDY.ladePosition[0], 0.05, ART_STUDY.ladePosition[2]]}
            rotation-x={-Math.PI / 2}
          >
            <ringGeometry args={[1.9, 2.2, 40]} />
            <meshBasicMaterial color="#ff3b30" transparent opacity={0.9} depthWrite={false} />
          </mesh>
        )}
        {events.some((e) => e.type === 'hit') && (
          <Billboard position={[ART_STUDY.ladePosition[0], 1.2, ART_STUDY.ladePosition[2]]}>
            <mesh>
              <planeGeometry args={[0.9, 0.9]} />
              <meshBasicMaterial color="#ffffff" transparent opacity={0.9} depthWrite={false} />
            </mesh>
          </Billboard>
        )}
        {events.some((e) => e.type === 'shot') && (
          <mesh position={[0, 1.25, 0.82]}>
            <sphereGeometry args={[0.16, 8, 6]} />
            <meshBasicMaterial color="#ffd75e" depthWrite={false} />
          </mesh>
        )}
      </>
    );
  }

  return (
    <>
      <color attach="background" args={['#9db8c9']} />
      <ArtRendererStats />
      <StudyLights mode={mode} />
      <StudyEnvironment cel={mode === 'cel3d'} />
      <TololoPlayer
        player={player}
        events={events}
        tick={Math.floor(time * 60)}
        runState="active"
        paused={false}
        cameraMode="thirdPerson"
        reducedMotion
      />
      <group
        position={[ART_STUDY.ladePosition[0], ART_STUDY.ladePosition[1], ART_STUDY.ladePosition[2]]}
      >
        <LadeEnemy enemy={lade} playerPosition={player.position} reducedMotion />
      </group>
      {lade.telegraph !== null && (
        <mesh
          position={[ART_STUDY.ladePosition[0], 0.05, ART_STUDY.ladePosition[2]]}
          rotation-x={-Math.PI / 2}
        >
          <ringGeometry args={[1.9, 2.2, 40]} />
          <meshBasicMaterial color="#ff3b30" transparent opacity={0.9} depthWrite={false} />
        </mesh>
      )}
      {events
        .filter((e) => e.type === 'hit' && e.position)
        .map((e) => (
          <mesh key={e.id} position={e.position ?? [0, 1, 6]}>
            <sphereGeometry args={[0.22, 12, 10]} />
            <meshBasicMaterial
              color={mode === 'cel3d' ? '#fff4d4' : '#ffe0a3'}
              transparent
              opacity={0.9}
              depthWrite={false}
            />
          </mesh>
        ))}
      {events
        .filter((e) => e.type === 'shot')
        .map((e) => (
          <mesh key={e.id} position={[0, 1.25, 0.82]}>
            <sphereGeometry args={[0.14, 10, 8]} />
            <meshBasicMaterial color="#ffd75e" depthWrite={false} />
          </mesh>
        ))}
    </>
  );
}
