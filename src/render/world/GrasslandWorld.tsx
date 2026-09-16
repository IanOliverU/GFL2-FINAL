import { useFrame } from '@react-three/fiber';
import { useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { CelLights } from '../cel/CelLights';
import { CelSurface } from '../cel/CelSurface';
import { celGradientMap, CEL_BANDS } from '../cel/celBands';
import { celLighting } from '../cel/celLighting';
import { celPalette } from '../cel/celPalette';
import { createTerrainTexture } from '../materials';

interface GrasslandWorldProps {
  reducedMotion?: boolean;
  preview?: boolean;
  objectivePosition?: readonly [number, number, number];
  objectiveState?: string;
}

const HILLS = [
  [-43, -2, -52, 24, 8, 12],
  [-12, -3, -61, 31, 9, 13],
  [25, -2, -57, 29, 7, 14],
  [51, -3, -40, 23, 10, 12],
  [-58, -2, 19, 24, 8, 16],
  [58, -3, 22, 27, 9, 15],
] as const;

const CLOUDS = [
  [-22, 18, -28, 6],
  [19, 22, -38, 8],
  [37, 16, -13, 5],
  [-41, 14, 4, 4.5],
] as const;

function seeded(index: number, salt: number): number {
  const value = Math.sin(index * 91.17 + salt * 37.11) * 43758.5453;
  return value - Math.floor(value);
}

function GradientSky() {
  const uniforms = useMemo(
    () => ({
      uTop: { value: new THREE.Color(celPalette.skyTop) },
      uHorizon: { value: new THREE.Color(celPalette.skyHorizon) },
      uSun: { value: new THREE.Color(celPalette.sunDisc) },
      uSunDirection: {
        value: new THREE.Vector3(
          celLighting.sun.position[0],
          celLighting.sun.position[1],
          celLighting.sun.position[2],
        ).normalize(),
      },
    }),
    [],
  );

  return (
    <mesh frustumCulled={false} renderOrder={-10}>
      <sphereGeometry args={[130, 32, 16]} />
      <shaderMaterial
        side={THREE.BackSide}
        depthWrite={false}
        uniforms={uniforms}
        vertexShader={`varying vec3 vDirection;
          void main() {
            vDirection = normalize(position);
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          }`}
        fragmentShader={`varying vec3 vDirection;
          uniform vec3 uTop;
          uniform vec3 uHorizon;
          uniform vec3 uSun;
          uniform vec3 uSunDirection;
          void main() {
            float heightMix = pow(clamp(vDirection.y * .5 + .5, 0.0, 1.0), .72);
            vec3 color = mix(uHorizon, uTop, heightMix);
            float sunDot = clamp(dot(normalize(vDirection), uSunDirection), 0.0, 1.0);
            color += uSun * (pow(sunDot, 520.0) + pow(sunDot, 10.0) * .12);
            gl_FragColor = vec4(color, 1.0);
          }`}
      />
    </mesh>
  );
}

function CloudBank({ reducedMotion }: { reducedMotion: boolean }) {
  const root = useRef<THREE.Group>(null);
  useFrame((state) => {
    if (reducedMotion || !root.current) return;
    root.current.position.x = Math.sin(state.clock.elapsedTime * 0.025) * 2.5;
  });

  return (
    <group ref={root}>
      {CLOUDS.map(([x, y, z, scale], cloudIndex) => (
        <group key={`${x}-${z}`} position={[x, y, z]} scale={scale}>
          {Array.from({ length: 7 }, (_, index) => (
            <mesh
              key={index}
              position={[
                (seeded(index, cloudIndex) - 0.5) * 2.8,
                seeded(index, cloudIndex + 9) * 0.55,
                (seeded(index, cloudIndex + 17) - 0.5) * 0.9,
              ]}
              scale={[0.85 + seeded(index, 4) * 0.7, 0.52 + seeded(index, 6) * 0.42, 0.62]}
            >
              <sphereGeometry args={[1, 10, 7]} />
              <meshLambertMaterial
                color={celPalette.cloud}
                transparent
                opacity={0.82}
                depthWrite={false}
              />
            </mesh>
          ))}
        </group>
      ))}
    </group>
  );
}

function HorizonTrees({ count = 110 }: { count?: number }) {
  const trunks = useRef<THREE.InstancedMesh>(null);
  const crowns = useRef<THREE.InstancedMesh>(null);

  useLayoutEffect(() => {
    if (!trunks.current || !crowns.current) return;
    const matrix = new THREE.Matrix4();
    for (let index = 0; index < count; index += 1) {
      const angle = (index / count) * Math.PI * 2;
      const radius = 63 + seeded(index, 7) * 10;
      const height = 2.7 + seeded(index, 8) * 4.5;
      const x = Math.cos(angle) * radius;
      const z = Math.sin(angle) * radius;
      matrix.compose(
        new THREE.Vector3(x, height * 0.25 - 0.3, z),
        new THREE.Quaternion(),
        new THREE.Vector3(0.35, height * 0.5, 0.35),
      );
      trunks.current.setMatrixAt(index, matrix);
      matrix.compose(
        new THREE.Vector3(x, height * 0.72, z),
        new THREE.Quaternion(),
        new THREE.Vector3(1.3 + height * 0.13, height * 0.52, 1.3 + height * 0.13),
      );
      crowns.current.setMatrixAt(index, matrix);
    }
    trunks.current.instanceMatrix.needsUpdate = true;
    crowns.current.instanceMatrix.needsUpdate = true;
    trunks.current.computeBoundingSphere();
    crowns.current.computeBoundingSphere();
  }, [count]);

  return (
    <group>
      <instancedMesh ref={trunks} args={[undefined, undefined, count]} receiveShadow>
        <cylinderGeometry args={[0.5, 0.8, 2, 5]} />
        <CelSurface family="foliage" color={celPalette.trunk} />
      </instancedMesh>
      <instancedMesh ref={crowns} args={[undefined, undefined, count]}>
        <coneGeometry args={[1, 2.4, 6]} />
        <CelSurface family="foliage" color={celPalette.crown} />
      </instancedMesh>
    </group>
  );
}

function WindGrass({ reducedMotion, count }: { reducedMotion: boolean; count: number }) {
  const mesh = useRef<THREE.InstancedMesh>(null);
  const material = useRef<THREE.MeshBasicMaterial>(null);

  useLayoutEffect(() => {
    if (!mesh.current) return;
    const matrix = new THREE.Matrix4();
    const quaternion = new THREE.Quaternion();
    const color = new THREE.Color();
    for (let index = 0; index < count; index += 1) {
      const radius = 5 + seeded(index, 12) * 43;
      const angle = seeded(index, 13) * Math.PI * 2;
      const height = 0.36 + seeded(index, 14) * 0.55;
      quaternion.setFromEuler(new THREE.Euler(0, seeded(index, 15) * Math.PI, 0));
      matrix.compose(
        new THREE.Vector3(Math.cos(angle) * radius, height * 0.5, Math.sin(angle) * radius),
        quaternion,
        new THREE.Vector3(0.22, height, 1),
      );
      mesh.current.setMatrixAt(index, matrix);
      color.set(index % 5 === 0 ? celPalette.grassBladeLight : celPalette.grassBladeDark);
      mesh.current.setColorAt(index, color);
    }
    mesh.current.instanceMatrix.needsUpdate = true;
    if (mesh.current.instanceColor) mesh.current.instanceColor.needsUpdate = true;
    mesh.current.computeBoundingSphere();
  }, [count]);

  useFrame((state) => {
    const shader = material.current?.userData.shader as
      { uniforms: { uTime?: { value: number }; uMotion?: { value: number } } } | undefined;
    if (shader?.uniforms.uTime) shader.uniforms.uTime.value = state.clock.elapsedTime;
    if (shader?.uniforms.uMotion) shader.uniforms.uMotion.value = reducedMotion ? 0 : 1;
  });

  return (
    <instancedMesh ref={mesh} args={[undefined, undefined, count]}>
      <planeGeometry args={[1, 1, 1, 2]} />
      <meshBasicMaterial
        ref={material}
        color="#ffffff"
        side={THREE.DoubleSide}
        // AD1.1: vertexColors must stay off. The plane has no color
        // attribute, so an enabled vertex-color path multiplies every blade
        // to black and hides the olive instance colors set above.
        customProgramCacheKey={() => 'gfl-grass-wind'}
        onBeforeCompile={(shader) => {
          shader.uniforms.uTime = { value: 0 };
          shader.uniforms.uMotion = { value: reducedMotion ? 0 : 1 };
          if (material.current) material.current.userData.shader = shader;
          shader.vertexShader = `uniform float uTime;
            uniform float uMotion;
            ${shader.vertexShader}`.replace(
            '#include <begin_vertex>',
            `#include <begin_vertex>
             #ifdef USE_INSTANCING
               float phase = instanceMatrix[3].x + instanceMatrix[3].z;
             #else
               float phase = 0.0;
             #endif
             float h = max(position.y, 0.0);
             transformed.x += sin(uTime * 1.35 + phase) * 0.08 * h * uMotion;
             transformed.z += cos(uTime * 0.9 + phase) * 0.035 * h * uMotion;`,
          );
        }}
      />
    </instancedMesh>
  );
}

export function Pedestal({
  position,
  active = false,
  reducedMotion = false,
}: {
  position: readonly [number, number, number];
  active?: boolean;
  reducedMotion?: boolean;
}) {
  const scanner = useRef<THREE.Group>(null);
  useFrame((_, delta) => {
    if (!reducedMotion && scanner.current) scanner.current.rotation.y += delta * 0.6;
  });

  return (
    <group position={position} userData={{ cameraObstacle: true }}>
      <mesh receiveShadow castShadow position-y={0.18}>
        <cylinderGeometry args={[1.25, 1.55, 0.36, 8]} />
        <CelSurface family="envConcrete" color={celPalette.concreteDark} />
      </mesh>
      <mesh castShadow position-y={0.65}>
        <cylinderGeometry args={[0.64, 0.92, 0.78, 8]} />
        <CelSurface family="envConcrete" color={celPalette.concrete} />
      </mesh>
      <group ref={scanner} position-y={1.08}>
        <mesh rotation-x={Math.PI / 2}>
          <torusGeometry args={[0.74, 0.055, 8, 32]} />
          <CelSurface
            family="interactive"
            color={celPalette.interactOrange}
            emissive={celPalette.interactOrange}
            emissiveIntensity={active ? 3 : 1.3}
          />
        </mesh>
        <mesh rotation-y={Math.PI / 2}>
          <boxGeometry args={[0.08, 0.35, 1.7]} />
          <meshBasicMaterial color={celPalette.interactOrange} transparent opacity={0.5} />
        </mesh>
      </group>
      <mesh position-y={10}>
        <cylinderGeometry args={[0.09, 0.42, 18, 12, 1, true]} />
        <meshBasicMaterial
          color={celPalette.interactOrange}
          transparent
          opacity={active ? 0.24 : 0.11}
          depthWrite={false}
          side={THREE.DoubleSide}
        />
      </mesh>
    </group>
  );
}

export function ExtractionDevice({
  position = [13, 0, -10],
  active = false,
  reducedMotion = false,
}: {
  position?: readonly [number, number, number];
  active?: boolean;
  reducedMotion?: boolean;
}) {
  const energy = useRef<THREE.Group>(null);
  useFrame((_, delta) => {
    if (!reducedMotion && energy.current)
      energy.current.rotation.y -= delta * (active ? 1.1 : 0.18);
  });
  return (
    <group position={position} userData={{ cameraObstacle: true }}>
      <mesh castShadow position-y={0.45}>
        <cylinderGeometry args={[1.7, 2.15, 0.9, 10]} />
        <CelSurface family="envConcrete" color={celPalette.concreteDark} />
      </mesh>
      {[0, 1, 2].map((index) => (
        <mesh
          key={index}
          castShadow
          position={[
            Math.cos((index / 3) * Math.PI * 2) * 1.35,
            2.05,
            Math.sin((index / 3) * Math.PI * 2) * 1.35,
          ]}
          rotation-z={index % 2 === 0 ? -0.16 : 0.16}
        >
          <boxGeometry args={[0.34, 3.1, 0.52]} />
          <CelSurface family="weaponMetal" color={celPalette.concrete} />
        </mesh>
      ))}
      <group ref={energy} position-y={2.25}>
        <mesh rotation-x={Math.PI / 2}>
          <torusGeometry args={[1.08, 0.09, 10, 42]} />
          <CelSurface
            family="interactive"
            color={active ? celPalette.skillCyan : '#4e5750'}
            emissive={active ? celPalette.skillCyan : '#000000'}
            emissiveIntensity={active ? 2.4 : 1}
          />
        </mesh>
        {active && (
          <mesh position-y={1.6}>
            <coneGeometry args={[1.05, 3.2, 18, 1, true]} />
            <meshBasicMaterial
              color={celPalette.skillCyan}
              transparent
              opacity={0.14}
              depthWrite={false}
            />
          </mesh>
        )}
      </group>
    </group>
  );
}

export function GrasslandWorld({
  reducedMotion = false,
  preview = false,
  objectivePosition = [-9, 0, -7],
  objectiveState = 'searching',
}: GrasslandWorldProps) {
  const terrainTexture = useMemo(() => createTerrainTexture(preview ? 128 : 256), [preview]);
  useEffect(() => () => terrainTexture.dispose(), [terrainTexture]);

  return (
    <>
      <GradientSky />
      <CloudBank reducedMotion={reducedMotion} />
      <CelLights preview={preview} />

      <mesh
        receiveShadow
        rotation-x={-Math.PI / 2}
        position-y={-0.035}
        userData={{ cameraObstacle: true }}
      >
        <planeGeometry args={[118, 118, 32, 32]} />
        <meshToonMaterial
          map={terrainTexture}
          bumpMap={terrainTexture}
          bumpScale={0.1}
          color={celPalette.grassGround}
          gradientMap={celGradientMap(CEL_BANDS.FLAT)}
        />
      </mesh>

      <WindGrass reducedMotion={reducedMotion} count={preview ? 330 : 720} />
      <HorizonTrees count={preview ? 72 : 110} />

      {HILLS.map(([x, y, z, sx, sy, sz], index) => (
        <mesh key={`${x}-${z}`} position={[x, y, z]} scale={[sx, sy, sz]}>
          <sphereGeometry args={[1, 10, 6]} />
          <CelSurface
            family="foliage"
            color={index % 2 === 0 ? celPalette.hillFar : celPalette.hillNear}
          />
        </mesh>
      ))}

      <Pedestal
        position={objectivePosition}
        active={
          objectiveState === 'active' ||
          objectiveState === 'boss' ||
          objectiveState === 'defeatBoss' ||
          objectiveState === 'survive'
        }
        reducedMotion={reducedMotion}
      />
      <ExtractionDevice
        active={
          objectiveState === 'extraction' ||
          objectiveState === 'extract' ||
          objectiveState === 'complete'
        }
        reducedMotion={reducedMotion}
      />

      <group aria-label="Grassland traversal boundary markers">
        {Array.from({ length: 16 }, (_, index) => {
          const angle = (index / 16) * Math.PI * 2;
          return (
            <mesh
              key={index}
              position={[Math.cos(angle) * 48, 0.55, Math.sin(angle) * 48]}
              rotation-y={-angle}
            >
              <boxGeometry args={[0.08, 1.1, 1.6]} />
              <CelSurface family="envConcrete" color={celPalette.boundary} />
            </mesh>
          );
        })}
      </group>
    </>
  );
}
