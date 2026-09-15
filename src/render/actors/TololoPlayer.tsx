import { useFrame, useThree } from '@react-three/fiber';
import { useEffect, useRef, useState, type RefObject } from 'react';
import * as THREE from 'three';
import { applyTololoAnimationPose, TololoAnimationController } from '../animation/tololoAnimation';
import {
  captureTololoRestPose,
  resolveTololoRig,
  solveTololoArmGrip,
  type TololoBoneMap,
  type TololoRestPose,
} from '../animation/tololoRig';
import {
  beginTololoRuntimeInstance,
  recordTololoDisposal,
  updateTololoDiagnostics,
} from '../assets/tololoDiagnostics';
import {
  disposeTololoModel,
  loadTololoModel,
  TOLOLO_GROUND_OFFSET,
  TOLOLO_SCALE,
} from '../assets/tololoModel';
import { CelSurface } from '../cel/CelSurface';
import { worldPalette } from '../materials';
import type { RenderEventView, RenderPlayerView } from '../snapshot';
import { PlaceholderPlayer } from './PlaceholderPlayer';

interface TololoPlayerProps {
  player: RenderPlayerView;
  events: readonly RenderEventView[];
  tick: number;
  runState: string;
  paused: boolean;
  cameraMode: 'thirdPerson' | 'topDown';
  reducedMotion?: boolean;
}

interface RigState {
  mesh: THREE.SkinnedMesh;
  bones: TololoBoneMap;
  rest: TololoRestPose;
  helper: THREE.SkeletonHelper | null;
}

const BOUNDS = new THREE.Box3();
const MUZZLE_WORLD = new THREE.Vector3();
const MUZZLE_TARGET = new THREE.Vector3();
const LEFT_GRIP_TARGET = new THREE.Vector3();
const RIGHT_GRIP_TARGET = new THREE.Vector3();
const LEFT_WRIST_WORLD = new THREE.Vector3();
const RIGHT_WRIST_WORLD = new THREE.Vector3();

/**
 * Restrained low-poly AK-Alfa proxy, explicitly temporary.
 * Convention: the muzzle tip sits at local z = 0 (the authoritative simulation
 * muzzle); the body extends toward -Z so the stock lands near the shoulder.
 * Overall length is ~0.78 m against the 1.72 m character. No external asset.
 */
function TemporaryAkAlfa({
  bodyRef,
  fired,
}: {
  bodyRef: RefObject<THREE.Group | null>;
  fired: boolean;
}) {
  return (
    <>
      <group
        ref={bodyRef}
        name="temporary-ak-alfa-presentation"
        userData={{ placeholderWeapon: true }}
      >
        <mesh castShadow position={[0, 0, -0.03]}>
          <cylinderGeometry args={[0.02, 0.023, 0.06, 8]} />
          <CelSurface family="weaponMetal" color="#141617" />
        </mesh>
        <mesh castShadow position={[0, 0, -0.19]} rotation-x={Math.PI / 2}>
          <cylinderGeometry args={[0.014, 0.017, 0.26, 8]} />
          <CelSurface family="weaponMetal" color="#1b1e20" />
        </mesh>
        <mesh castShadow position={[0, 0.03, -0.29]}>
          <boxGeometry args={[0.012, 0.03, 0.02]} />
          <CelSurface family="weaponMetal" color="#141617" />
        </mesh>
        <mesh castShadow position={[0, -0.005, -0.4]}>
          <boxGeometry args={[0.056, 0.064, 0.16]} />
          <CelSurface family="weaponMetal" color="#2b2b2e" />
        </mesh>
        <mesh castShadow position={[0, -0.005, -0.57]}>
          <boxGeometry args={[0.07, 0.092, 0.2]} />
          <CelSurface family="weaponMetal" color="#222527" />
        </mesh>
        <mesh castShadow position={[0, 0.055, -0.63]}>
          <boxGeometry args={[0.03, 0.025, 0.015]} />
          <CelSurface family="weaponMetal" color="#141617" />
        </mesh>
        <mesh castShadow position={[0, -0.1, -0.6]} rotation-x={-0.22}>
          <boxGeometry args={[0.042, 0.12, 0.055]} />
          <CelSurface family="weaponMetal" color="#33302c" />
        </mesh>
        <mesh castShadow position={[0, -0.105, -0.52]} rotation-x={0.3}>
          <boxGeometry args={[0.046, 0.11, 0.065]} />
          <CelSurface family="weaponMetal" color="#2b2b2e" />
        </mesh>
        <mesh castShadow position={[0, -0.175, -0.475]} rotation-x={0.45}>
          <boxGeometry args={[0.046, 0.09, 0.065]} />
          <CelSurface family="weaponMetal" color="#2b2b2e" />
        </mesh>
        <mesh castShadow position={[0, -0.01, -0.71]}>
          <boxGeometry args={[0.055, 0.08, 0.12]} />
          <CelSurface family="weaponMetal" color="#26292c" />
        </mesh>
        <mesh castShadow position={[0, -0.01, -0.775]}>
          <boxGeometry args={[0.06, 0.11, 0.025]} />
          <CelSurface family="weaponMetal" color="#1d1f21" />
        </mesh>
      </group>
      <mesh visible={fired} position={[0, 0, 0.06]} rotation-x={Math.PI / 2}>
        <coneGeometry args={[0.06, 0.22, 7]} />
        <meshBasicMaterial color="#ffd073" transparent opacity={0.92} depthWrite={false} />
      </mesh>
    </>
  );
}

function DebugGeometry() {
  return (
    <>
      <mesh position-y={0.86} userData={{ debugHelper: true }}>
        <capsuleGeometry args={[0.3, 1.12, 8, 16]} />
        <meshBasicMaterial color="#55e6ff" wireframe transparent opacity={0.45} />
      </mesh>
      <mesh rotation-x={-Math.PI / 2} position-y={0.008} userData={{ debugHelper: true }}>
        <ringGeometry args={[0.46, 0.49, 32]} />
        <meshBasicMaterial color="#ffcb72" depthWrite={false} />
      </mesh>
    </>
  );
}

/**
 * Restrained dodge-invulnerability feedback: a flat ground ring that reads as
 * game state, never as a wireframe collider helper.
 */
function DodgeFeedback() {
  return (
    <mesh
      name="tololo-dodge-feedback"
      rotation-x={-Math.PI / 2}
      position-y={0.02}
      userData={{ gameplayFeedback: true }}
    >
      <ringGeometry args={[0.52, 0.62, 40]} />
      <meshBasicMaterial color={worldPalette.cyan} transparent opacity={0.5} depthWrite={false} />
    </mesh>
  );
}

function disposeHelper(helper: THREE.SkeletonHelper | null): void {
  if (helper === null) return;
  helper.geometry.dispose();
  const materials = Array.isArray(helper.material) ? helper.material : [helper.material];
  for (const material of materials) material.dispose();
}

export function TololoPlayer({
  player,
  events,
  tick,
  runState,
  paused,
  cameraMode,
  reducedMotion = false,
}: TololoPlayerProps) {
  const { gl } = useThree();
  const [rigState, setRigState] = useState<RigState | null>(null);
  const [loadFailed, setLoadFailed] = useState(false);
  const actorRoot = useRef<THREE.Group>(null);
  const modelRoot = useRef<THREE.Group>(null);
  const muzzleRoot = useRef<THREE.Group>(null);
  const weaponBody = useRef<THREE.Group>(null);
  const leftGripTarget = useRef<THREE.Group>(null);
  const rightGripTarget = useRef<THREE.Group>(null);
  const controller = useRef(new TololoAnimationController());
  const loadedMesh = useRef<THREE.SkinnedMesh | null>(null);
  const loadedHelper = useRef<THREE.SkeletonHelper | null>(null);
  const previousTick = useRef(tick);
  const previousRunState = useRef(runState);
  const diagnosticsElapsed = useRef(0);
  const debug =
    typeof window !== 'undefined' &&
    new URLSearchParams(window.location.search).get('modelDebug') === '1';
  const fired = events.some((event) => /fire|shot|muzzle/i.test(event.type) && event.age < 0.1);
  const hitEventId =
    events.find((event) => event.type === 'playerDamaged' && event.age < 0.5)?.id ?? null;

  useEffect(() => {
    const endInstance = beginTololoRuntimeInstance();
    let cancelled = false;
    void loadTololoModel()
      .then(({ mesh, diagnostics }) => {
        if (cancelled) {
          disposeTololoModel(mesh);
          recordTololoDisposal();
          return;
        }
        const maximumAnisotropy = Math.min(8, gl.capabilities.getMaxAnisotropy());
        const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
        for (const material of materials) {
          for (const value of Object.values(material)) {
            if (value instanceof THREE.Texture) value.anisotropy = maximumAnisotropy;
          }
        }
        const resolution = resolveTololoRig(mesh.skeleton.bones);
        const helper = debug ? new THREE.SkeletonHelper(mesh) : null;
        if (helper !== null) helper.userData.debugHelper = true;
        loadedMesh.current = mesh;
        loadedHelper.current = helper;
        setRigState({
          mesh,
          bones: resolution.bones,
          rest: captureTololoRestPose(resolution.bones),
          helper,
        });
        updateTololoDiagnostics({
          loadState: 'loaded',
          model: diagnostics,
          resolvedBones: resolution.resolvedNames,
          missingBones: resolution.missing,
        });
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        const message = error instanceof Error ? error.message : String(error);
        setLoadFailed(true);
        updateTololoDiagnostics({ loadState: 'error', error: message });
      });

    return () => {
      cancelled = true;
      const helper = loadedHelper.current;
      const mesh = loadedMesh.current;
      loadedHelper.current = null;
      loadedMesh.current = null;
      disposeHelper(helper);
      if (mesh !== null) {
        disposeTololoModel(mesh);
        recordTololoDisposal();
      }
      endInstance();
    };
  }, [debug, gl]);

  useFrame((_, delta) => {
    if (rigState === null || actorRoot.current === null || modelRoot.current === null) return;
    if (
      tick < previousTick.current ||
      (previousRunState.current === 'dead' && runState !== 'dead')
    ) {
      controller.current.reset();
    }
    previousTick.current = tick;
    previousRunState.current = runState;

    const pose = controller.current.update(
      {
        velocity: player.velocity,
        aimYaw: player.aimYaw,
        aimPitch: player.aimPitch,
        sprinting: player.sprinting,
        dodgeRemaining: player.dodgeRemaining,
        reloading: player.reloading,
        reloadProgress: player.reloadProgress,
        recoil: player.recoil,
        hitEventId,
        dead: runState === 'dead' || player.health <= 0,
        paused,
        reducedMotion,
        cameraMode,
      },
      delta,
    );
    modelRoot.current.rotation.y = pose.bodyYaw;
    if (weaponBody.current !== null) {
      weaponBody.current.position.z = -pose.recoilBlend * 0.035;
      weaponBody.current.rotation.x = -pose.aimPitch;
      weaponBody.current.rotation.z = pose.reloadBlend * 0.45;
    }
    if (muzzleRoot.current !== null) muzzleRoot.current.rotation.y = player.aimYaw;
    applyTololoAnimationPose(rigState.bones, rigState.rest, pose);
    actorRoot.current.updateMatrixWorld(true);
    muzzleRoot.current?.updateMatrixWorld(true);
    rigState.mesh.updateMatrixWorld(true);
    if (pose.deathBlend < 0.25) {
      leftGripTarget.current?.getWorldPosition(LEFT_GRIP_TARGET);
      rightGripTarget.current?.getWorldPosition(RIGHT_GRIP_TARGET);
      if (leftGripTarget.current !== null) {
        solveTololoArmGrip(rigState.bones, 'left', LEFT_GRIP_TARGET);
      }
      if (rightGripTarget.current !== null) {
        solveTololoArmGrip(rigState.bones, 'right', RIGHT_GRIP_TARGET);
      }
      rigState.mesh.updateMatrixWorld(true);
    }

    diagnosticsElapsed.current += delta;
    if (diagnosticsElapsed.current < 0.1) return;
    diagnosticsElapsed.current = 0;
    BOUNDS.setFromObject(rigState.mesh);
    muzzleRoot.current?.updateMatrixWorld(true);
    muzzleRoot.current?.getWorldPosition(MUZZLE_WORLD);
    MUZZLE_TARGET.set(player.muzzle[0], player.muzzle[1], player.muzzle[2]);
    rigState.bones.leftWrist?.getWorldPosition(LEFT_WRIST_WORLD);
    rigState.bones.rightWrist?.getWorldPosition(RIGHT_WRIST_WORLD);
    updateTololoDiagnostics({
      animation: { ...pose },
      bounds: {
        min: [BOUNDS.min.x, BOUNDS.min.y, BOUNDS.min.z],
        max: [BOUNDS.max.x, BOUNDS.max.y, BOUNDS.max.z],
      },
      groundingError: BOUNDS.min.y - player.position[1],
      muzzleError: muzzleRoot.current === null ? null : MUZZLE_WORLD.distanceTo(MUZZLE_TARGET),
      gripErrors:
        rigState.bones.leftWrist === undefined || rigState.bones.rightWrist === undefined
          ? null
          : {
              left: LEFT_WRIST_WORLD.distanceTo(LEFT_GRIP_TARGET),
              right: RIGHT_WRIST_WORLD.distanceTo(RIGHT_GRIP_TARGET),
            },
    });
  });

  if (rigState === null) {
    return (
      <>
        <group
          name={loadFailed ? 'tololo-load-error-fallback' : 'tololo-loading-fallback'}
          userData={{ tololoLoadFailed: loadFailed }}
        />
        <PlaceholderPlayer
          player={player}
          events={events}
          reducedMotion={reducedMotion || loadFailed}
        />
      </>
    );
  }

  return (
    <>
      <group
        ref={actorRoot}
        name="tololo-runtime-actor"
        position={player.position}
        userData={{ assetIdentity: 'tololo-default-pmx', cameraIgnore: true }}
      >
        <group ref={modelRoot} name="tololo-skeletal-root">
          <primitive
            object={rigState.mesh}
            position-y={TOLOLO_GROUND_OFFSET}
            scale={TOLOLO_SCALE}
          />
        </group>
        {player.invulnerable && <DodgeFeedback />}
        {debug && <DebugGeometry />}
      </group>
      {rigState.helper !== null && <primitive object={rigState.helper} />}
      <group
        ref={muzzleRoot}
        name="authoritative-tololo-muzzle"
        position={player.muzzle}
        rotation-y={player.aimYaw}
        userData={{ authoritativeVisualOrigin: true }}
      >
        <TemporaryAkAlfa bodyRef={weaponBody} fired={fired} />
        <group ref={leftGripTarget} position={[0.012, -0.05, -0.42]} />
        <group ref={rightGripTarget} position={[-0.005, -0.085, -0.6]} />
        {debug && (
          <mesh userData={{ debugHelper: true }}>
            <sphereGeometry args={[0.055, 8, 6]} />
            <meshBasicMaterial color="#ffcb72" />
          </mesh>
        )}
      </group>
    </>
  );
}
