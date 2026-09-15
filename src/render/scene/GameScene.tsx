import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { CuboidCollider, Physics, RigidBody } from '@react-three/rapier';
import { Suspense, useEffect, useRef } from 'react';
import * as THREE from 'three';
import type { GameSnapshot } from '../../game';
import { getAimPointerNdc, publishCameraAimRay } from '../../platform/input/aimRayState';
import { Enemies } from '../actors/Enemies';
import { TololoPlayer } from '../actors/TololoPlayer';
import { WardenBoss } from '../actors/WardenBoss';
import { AimDiagnostics } from '../AimDiagnostics';
import { DiagnosticsPublisher } from '../Diagnostics';
import { CombatEffects } from '../effects/CombatEffects';
import { LaserSightPreview } from '../LaserSightPreview';
import { isLaserPreviewEnabled } from '../laserPreviewState';
import { toGameRenderView, type GameRenderView } from '../snapshot';
import type { RendererDiagnosticsCallback } from '../types';
import { GrasslandWorld } from '../world/GrasslandWorld';

export interface GameSceneProps {
  snapshot: GameSnapshot;
  reducedMotion?: boolean;
  quality?: 'low' | 'medium' | 'high';
  className?: string;
  onDiagnostics?: RendererDiagnosticsCallback;
  onCanvasError?: (error: Error) => void;
}

const CAMERA_TARGET = new THREE.Vector3();
const THIRD_OFFSET = new THREE.Vector3(4.1, 2.8, -6.6);
const PORTRAIT_OFFSET = new THREE.Vector3(0.9, 2.1, -4.6);
const MODEL_INSPECT_OFFSET = new THREE.Vector3(0, 1.4, 4.2);
const MODEL_INSPECT_SIDE = new THREE.Vector3(4.4, 1.35, 0.2);
const TOP_OFFSET = new THREE.Vector3(0, 18.5, -13.5);
const DESIRED_POSITION = new THREE.Vector3();
const SAFE_POSITION = new THREE.Vector3();
const RAY_DIRECTION = new THREE.Vector3();
const LOOK_TARGET = new THREE.Vector3();
const WORK_OFFSET = new THREE.Vector3();
const SCREEN_POINT = new THREE.Vector3();
const AIM_RAYCASTER = new THREE.Raycaster();
const AIM_NDC = new THREE.Vector2();

declare global {
  interface Window {
    __GFL2_PLAYER_SCREEN__?: { x: number; y: number; behind: boolean };
    __GFL2_ENEMY_SCREEN__?: Record<string, { x: number; y: number; behind: boolean }>;
    __GFL2_SCENE_DEBUG_COUNT__?: number;
    __GFL2_AIM_GUIDE_COUNT__?: number;
    __GFL2_LASER_PREVIEW_COUNT__?: number;
  }
}

function CameraRig({ view, reducedMotion }: { view: GameRenderView; reducedMotion: boolean }) {
  const { scene } = useThree();
  const blend = useRef(view.cameraMode === 'topDown' ? 1 : 0);
  const inspectParam =
    typeof window !== 'undefined'
      ? new URLSearchParams(window.location.search).get('modelInspect')
      : null;
  const inspectFront = useRef(inspectParam === 'front' || inspectParam === 'side');
  const inspectSide = useRef(inspectParam === 'side');
  const obstacles = useRef<THREE.Object3D[]>([]);
  const raycaster = useRef(new THREE.Raycaster());
  const e2eElapsed = useRef(0);
  const e2e =
    typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('e2e') === '1';

  useEffect(() => {
    const next: THREE.Object3D[] = [];
    scene.traverse((object) => {
      if (object.userData.cameraObstacle === true) next.push(object);
    });
    obstacles.current = next;
  }, [scene]);

  useFrame(({ camera }, delta) => {
    const targetBlend = view.cameraMode === 'topDown' ? 1 : 0;
    const suppliedBlend = view.cameraBlend;
    if (suppliedBlend !== null) {
      blend.current = suppliedBlend;
    } else if (reducedMotion) {
      blend.current = targetBlend;
    } else {
      const step = delta / 0.25;
      blend.current = THREE.MathUtils.clamp(
        blend.current +
          Math.sign(targetBlend - blend.current) *
            Math.min(step, Math.abs(targetBlend - blend.current)),
        0,
        1,
      );
    }

    // Narrow portrait screens lose the player with the wide desktop shoulder
    // offset, so blend toward a tighter framing. Desktop aspects are untouched,
    // and the blend fades out as the camera transitions to top-down.
    const aspect = camera instanceof THREE.PerspectiveCamera ? camera.aspect : 16 / 9;
    const portraitWeight =
      (inspectFront.current ? 0 : THREE.MathUtils.clamp((0.9 - aspect) / 0.4, 0, 1)) *
      (1 - blend.current);
    const baseOffset = inspectSide.current
      ? MODEL_INSPECT_SIDE
      : inspectFront.current
        ? MODEL_INSPECT_OFFSET
        : THIRD_OFFSET;
    WORK_OFFSET.lerpVectors(baseOffset, PORTRAIT_OFFSET, portraitWeight);
    const thirdOffset = WORK_OFFSET;
    CAMERA_TARGET.set(
      view.player.position[0],
      view.player.position[1] + THREE.MathUtils.lerp(1.25, 1.0, portraitWeight),
      view.player.position[2],
    );
    const yaw = view.player.aimYaw;
    const thirdX = Math.cos(yaw) * thirdOffset.x + Math.sin(yaw) * thirdOffset.z;
    const thirdZ = -Math.sin(yaw) * thirdOffset.x + Math.cos(yaw) * thirdOffset.z;
    DESIRED_POSITION.set(
      CAMERA_TARGET.x + THREE.MathUtils.lerp(thirdX, TOP_OFFSET.x, blend.current),
      CAMERA_TARGET.y + THREE.MathUtils.lerp(thirdOffset.y, TOP_OFFSET.y, blend.current),
      CAMERA_TARGET.z + THREE.MathUtils.lerp(thirdZ, TOP_OFFSET.z, blend.current),
    );

    RAY_DIRECTION.copy(DESIRED_POSITION).sub(CAMERA_TARGET);
    const desiredDistance = RAY_DIRECTION.length();
    RAY_DIRECTION.normalize();
    raycaster.current.set(CAMERA_TARGET, RAY_DIRECTION);
    raycaster.current.far = desiredDistance;
    const hit = raycaster.current.intersectObjects(obstacles.current, true)[0];
    if (hit && hit.distance > 0.35) {
      SAFE_POSITION.copy(CAMERA_TARGET).addScaledVector(
        RAY_DIRECTION,
        Math.max(0.6, hit.distance - 0.35),
      );
    } else {
      SAFE_POSITION.copy(DESIRED_POSITION);
    }

    const cameraEase = reducedMotion ? 1 : 1 - Math.exp(-delta * 12);
    camera.position.lerp(SAFE_POSITION, cameraEase);
    LOOK_TARGET.set(
      CAMERA_TARGET.x + Math.sin(yaw) * 12,
      CAMERA_TARGET.y + Math.sin(view.player.aimPitch) * 12,
      CAMERA_TARGET.z + Math.cos(yaw) * 12,
    );
    camera.lookAt(
      view.cameraMode === 'topDown' || inspectFront.current ? CAMERA_TARGET : LOOK_TARGET,
    );
    if (camera instanceof THREE.PerspectiveCamera) {
      const baseFov = THREE.MathUtils.lerp(inspectFront.current ? 38 : 56, 46, blend.current);
      const portraitFov = THREE.MathUtils.lerp(baseFov, 60, portraitWeight);
      const targetFov = view.player.ads ? portraitFov - 8 : portraitFov;
      if (Math.abs(camera.fov - targetFov) > 0.05) {
        camera.fov = THREE.MathUtils.lerp(camera.fov, targetFov, cameraEase);
        camera.updateProjectionMatrix();
      }
    }

    // Publish only finalized camera geometry. Input forwards this ray and the
    // simulation authoritatively resolves enemies/cover; rendering never
    // selects a target or applies damage.
    camera.updateMatrixWorld();
    const aimNdc = getAimPointerNdc(view.cameraMode);
    AIM_NDC.set(aimNdc[0], aimNdc[1]);
    AIM_RAYCASTER.setFromCamera(AIM_NDC, camera);
    publishCameraAimRay(view.cameraMode, {
      origin: [AIM_RAYCASTER.ray.origin.x, AIM_RAYCASTER.ray.origin.y, AIM_RAYCASTER.ray.origin.z],
      direction: [
        AIM_RAYCASTER.ray.direction.x,
        AIM_RAYCASTER.ray.direction.y,
        AIM_RAYCASTER.ray.direction.z,
      ],
    });

    // E2E-only publishers for framing and debug-helper regression tests.
    // They never affect rendering and are absent outside ?e2e=1 sessions.
    if (e2e) {
      e2eElapsed.current += delta;
      if (e2eElapsed.current >= 0.05) {
        e2eElapsed.current = 0;
        SCREEN_POINT.set(
          view.player.position[0],
          view.player.position[1] + 1.0,
          view.player.position[2],
        ).project(camera);
        window.__GFL2_PLAYER_SCREEN__ = {
          x: SCREEN_POINT.x,
          y: SCREEN_POINT.y,
          behind: SCREEN_POINT.z > 1,
        };
        const enemyScreens: Record<string, { x: number; y: number; behind: boolean }> = {};
        for (const enemy of view.enemies) {
          SCREEN_POINT.set(enemy.position[0], enemy.position[1] + 1.05, enemy.position[2]).project(
            camera,
          );
          enemyScreens[enemy.id] = {
            x: SCREEN_POINT.x,
            y: SCREEN_POINT.y,
            behind: SCREEN_POINT.z > 1,
          };
        }
        window.__GFL2_ENEMY_SCREEN__ = enemyScreens;
        let debugCount = 0;
        let laserCount = 0;
        scene.traverse((object) => {
          if (
            object.userData.debugHelper === true ||
            (object as { isSkeletonHelper?: boolean }).isSkeletonHelper === true
          ) {
            debugCount += 1;
          }
          if (object.name === 'laser-sight-visual-preview') laserCount += 1;
        });
        window.__GFL2_SCENE_DEBUG_COUNT__ = debugCount;
        window.__GFL2_LASER_PREVIEW_COUNT__ = laserCount;
        window.__GFL2_AIM_GUIDE_COUNT__ = 0;
      }
    }
  });
  return null;
}

/**
 * AD0 aiming-presentation correction: the former grey AimRead line plus white
 * endpoint circle duplicated the HUD crosshair and is removed from normal play.
 * Authoritative aim-ray calculation, resolved aim point, muzzle convergence,
 * spread, recoil, collision, and damage are unchanged. Enemy ground circles,
 * selection indicators, telegraphs, ability radii, and extraction indicators
 * live in their actor/effect modules and are untouched. A thin red laser beam
 * is reserved as a future attachment and exposed only through the
 * development-only LaserSightPreview below; ?aimDebug=1 helpers are unchanged.
 */

function AwarenessVeil({ view }: { view: GameRenderView }) {
  if (view.cameraMode !== 'topDown') return null;
  return (
    <group position={[view.player.position[0], 0.06, view.player.position[2]]}>
      <mesh rotation-x={-Math.PI / 2} renderOrder={8}>
        <ringGeometry args={[29.5, 54, 64]} />
        <meshBasicMaterial
          color="#17201b"
          transparent
          opacity={0.42}
          depthWrite={false}
          side={THREE.DoubleSide}
        />
      </mesh>
      <mesh rotation-x={-Math.PI / 2}>
        <ringGeometry args={[29.2, 29.5, 64]} />
        <meshBasicMaterial color="#d8cdbd" transparent opacity={0.2} depthWrite={false} />
      </mesh>
    </group>
  );
}

function StaticPhysics() {
  return (
    <Physics gravity={[0, -20, 0]} timeStep="vary" paused>
      <RigidBody type="fixed" colliders={false}>
        <CuboidCollider args={[52, 0.25, 52]} position={[0, -0.3, 0]} />
        <CuboidCollider args={[0.3, 2, 52]} position={[51.5, 1.7, 0]} />
        <CuboidCollider args={[0.3, 2, 52]} position={[-51.5, 1.7, 0]} />
        <CuboidCollider args={[52, 2, 0.3]} position={[0, 1.7, 51.5]} />
        <CuboidCollider args={[52, 2, 0.3]} position={[0, 1.7, -51.5]} />
      </RigidBody>
    </Physics>
  );
}

function GameWorld({
  view,
  snapshot,
  reducedMotion,
}: {
  view: GameRenderView;
  snapshot: GameSnapshot;
  reducedMotion: boolean;
}) {
  return (
    <>
      <GrasslandWorld
        reducedMotion={reducedMotion}
        objectivePosition={view.objective.pedestalPosition}
        objectiveState={view.objective.state}
      />
      <Suspense fallback={null}>
        <StaticPhysics />
      </Suspense>
      <TololoPlayer
        player={view.player}
        events={view.events}
        tick={view.tick}
        runState={view.runState}
        paused={view.paused}
        cameraMode={view.cameraMode}
        reducedMotion={reducedMotion}
      />
      <Enemies
        enemies={view.enemies}
        playerPosition={view.player.position}
        topDown={view.cameraMode === 'topDown'}
        reducedMotion={reducedMotion}
      />
      {view.boss && <WardenBoss boss={view.boss} reducedMotion={reducedMotion} />}
      <CombatEffects
        projectiles={view.projectiles}
        damageNumbers={view.damageNumbers}
        pickups={view.pickups}
        events={view.events}
        player={view.player}
        reducedMotion={reducedMotion}
      />
      {isLaserPreviewEnabled() && <LaserSightPreview view={view} />}
      <AwarenessVeil view={view} />
      {snapshot.aimDebug !== null && <AimDiagnostics debug={snapshot.aimDebug} />}
      <CameraRig view={view} reducedMotion={reducedMotion} />
    </>
  );
}

export function GameScene({
  snapshot,
  reducedMotion = false,
  quality = 'high',
  className,
  onDiagnostics,
  onCanvasError,
}: GameSceneProps) {
  const view = toGameRenderView(snapshot);
  const dpr: [number, number] =
    quality === 'low' ? [1, 1] : quality === 'medium' ? [1, 1.4] : [1, 1.75];

  return (
    <div className={['gfl-game-scene', className].filter(Boolean).join(' ')}>
      <Canvas
        dpr={dpr}
        shadows={quality !== 'low'}
        camera={{ position: [5, 4, 7], fov: 56, near: 0.08, far: 180 }}
        gl={{ antialias: quality !== 'low', alpha: false, powerPreference: 'high-performance' }}
        onCreated={({ gl }) => {
          try {
            gl.outputColorSpace = THREE.SRGBColorSpace;
            gl.toneMapping = THREE.ACESFilmicToneMapping;
            gl.toneMappingExposure = 1.08;
          } catch (error) {
            onCanvasError?.(error instanceof Error ? error : new Error(String(error)));
          }
        }}
      >
        <GameWorld view={view} snapshot={snapshot} reducedMotion={reducedMotion} />
        <DiagnosticsPublisher onDiagnostics={onDiagnostics} />
      </Canvas>
    </div>
  );
}
