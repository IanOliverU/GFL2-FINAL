import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three-stdlib';
import { TololoPlayer } from '../actors/TololoPlayer';
import type { RenderPlayerView } from '../snapshot';
import { CelLights } from '../cel/CelLights';
import { CEL_BANDS, celGradientMap } from '../cel/celBands';
import fixture from './ladeCandidate.fixture.json';
import ad2a1NeutralFixture from './ladeAd2a1Neutral.fixture.json';
import ad2a1ReadyFixture from './ladeAd2a1Ready.fixture.json';
import {
  MODEL_REVIEW_GLB_URLS,
  requestedModelReviewFlag,
  requestedModelReviewLight,
  requestedModelReviewShade,
  requestedModelReviewVariant,
  requestedModelReviewView,
  type ModelReviewLight,
  type ModelReviewShade,
  type ModelReviewVariant,
  type ModelReviewView,
} from './modelReviewMode';
import { disposeLoadedScene } from './modelReviewState';

declare global {
  interface Window {
    __GFL2_MODEL_REVIEW__?: {
      ready: boolean;
      view: string;
      light: string;
      shade: string;
      variant: string;
      triangles: number;
      materials: number;
      sockets: number;
      drawCalls: number;
      renderedTriangles: number;
    };
  }
}

const VARIANT_FIXTURES: Record<ModelReviewVariant, { height?: number }> = {
  base: fixture as { height?: number },
  'ad2a1-neutral': ad2a1NeutralFixture as { height?: number },
  'ad2a1-ready': ad2a1ReadyFixture as { height?: number },
};

const VIEW_CAMERAS: Record<
  ModelReviewView,
  { position: [number, number, number]; target: [number, number, number] }
> = {
  front: { position: [0, 1.35, 4.4], target: [0, 1.0, 0] },
  side: { position: [4.4, 1.35, 0], target: [0, 1.0, 0] },
  'side-left': { position: [-4.4, 1.35, 0], target: [0, 1.0, 0] },
  rear: { position: [0, 1.35, -4.4], target: [0, 1.0, 0] },
  'three-quarter': { position: [3.1, 1.9, 3.1], target: [0, 1.0, 0] },
  'rear-three-quarter': { position: [3.1, 1.9, -3.1], target: [0, 1.0, 0] },
  top: { position: [0, 7.5, -5.5], target: [0, 0.6, 0] },
  third: { position: [0, 2.5, -5.4], target: [0, 1.15, 0.6] },
  ads: { position: [1.1, 1.9, -2.8], target: [0, 1.25, 0.4] },
};

function mockTololo(): RenderPlayerView {
  return {
    position: [-1.7, 0, 0],
    velocity: [0, 0, 0],
    muzzle: [-1.7, 1.25, 0.82],
    facing: 0,
    aimYaw: 0,
    aimPitch: 0,
    health: 100,
    maxHealth: 100,
    level: 1,
    exp: 0,
    nextExp: 60,
    sardis: 0,
    ammo: 30,
    magazine: 30,
    reloading: false,
    reloadProgress: 0,
    dodgeCooldown: 0,
    dodgeRemaining: 0,
    invulnerable: false,
    ads: false,
    sprinting: false,
    recoil: 0,
    skills: [],
    cooldowns: {},
  };
}

function ReviewCamera({ view }: { view: ModelReviewView }) {
  const camera = useThree((state) => state.camera);
  useEffect(() => {
    const spec = VIEW_CAMERAS[view];
    camera.position.set(spec.position[0], spec.position[1], spec.position[2]);
    camera.lookAt(spec.target[0], spec.target[1], spec.target[2]);
    camera.updateProjectionMatrix();
  }, [camera, view]);
  return null;
}

function CandidateModel({
  glbUrl,
  shade,
  turntable,
  showSockets,
  onLoaded,
  onMissing,
}: {
  glbUrl: string;
  shade: ModelReviewShade;
  turntable: boolean;
  showSockets: boolean;
  onLoaded: (info: { triangles: number; materials: number; sockets: number }) => void;
  onMissing: () => void;
}) {
  const group = useRef<THREE.Group>(null);
  const [scene, setScene] = useState<THREE.Group | null>(null);
  const originals = useRef(new Map<THREE.Mesh, THREE.Material | THREE.Material[]>());
  const override = useRef<THREE.Material | null>(null);
  const gl = useThree((state) => state.gl);

  useEffect(() => {
    let cancelled = false;
    const loader = new GLTFLoader();
    loader.load(
      glbUrl,
      (gltf) => {
        if (cancelled) {
          disposeLoadedScene(gltf.scene);
          return;
        }
        const root = gltf.scene;
        // Face the gameplay +Z convention (Blender +Y forward maps to -Z):
        // the candidate and the Tololo comparison then face the same way.
        root.rotation.y = Math.PI;
        let triangles = 0;
        const materials = new Set<string>();
        const markerGeometry = new THREE.OctahedronGeometry(0.035);
        const markerMaterial = new THREE.MeshBasicMaterial({
          color: '#55e6ff',
          depthTest: false,
          transparent: true,
          opacity: 0.9,
        });
        let sockets = 0;
        root.traverse((object) => {
          const mesh = object as THREE.Mesh;
          if (mesh.isMesh === true) {
            mesh.castShadow = true;
            const position = mesh.geometry.getAttribute('position');
            if (position !== undefined) {
              const index = mesh.geometry.getIndex();
              triangles += index !== null ? index.count / 3 : position.count / 3;
            }
            const material = mesh.material as
              THREE.Material | readonly THREE.Material[] | undefined;
            const list = Array.isArray(material)
              ? material
              : material !== undefined
                ? [material]
                : [];
            for (const entry of list) {
              if (typeof entry.name === 'string' && entry.name !== '') materials.add(entry.name);
            }
          }
          if (object.name.startsWith('Socket_')) {
            sockets += 1;
            if (showSockets) {
              const marker = new THREE.Mesh(markerGeometry, markerMaterial);
              marker.renderOrder = 999;
              object.add(marker);
            }
          }
        });
        const box = new THREE.Box3().setFromObject(root);
        const helper = new THREE.Box3Helper(box, '#d9a441');
        root.add(helper);
        setScene(root);
        onLoaded({ triangles: Math.round(triangles), materials: materials.size, sockets });
      },
      undefined,
      () => {
        if (!cancelled) onMissing();
      },
    );
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (scene === null) return;
    if (override.current === null) {
      override.current = new THREE.MeshToonMaterial({
        color: '#9a9c9e',
        gradientMap: celGradientMap(CEL_BANDS.FLAT),
      });
    }
    const pick = (): THREE.Material | null => {
      let active = override.current as THREE.Material;
      const replace = (next: THREE.Material) => {
        active.dispose();
        active = next;
      };
      if (shade === 'clay') {
        if (active instanceof THREE.MeshToonMaterial) {
          active.color.set('#9a9c9e');
        } else {
          replace(
            new THREE.MeshToonMaterial({
              color: '#9a9c9e',
              gradientMap: celGradientMap(CEL_BANDS.FLAT),
            }),
          );
        }
      } else if (shade === 'silhouette') {
        if (
          !(active instanceof THREE.MeshBasicMaterial) ||
          active.wireframe ||
          active.color.getHex() !== 0x101012
        ) {
          replace(new THREE.MeshBasicMaterial({ color: '#101012' }));
        }
      } else if (shade === 'wireframe') {
        if (!(active instanceof THREE.MeshBasicMaterial) || !active.wireframe) {
          replace(new THREE.MeshBasicMaterial({ color: '#cfe8ff', wireframe: true }));
        }
      } else {
        return null;
      }
      override.current = active;
      return active;
    };
    const material = pick();
    if (material !== null) {
      scene.traverse((object) => {
        const mesh = object as THREE.Mesh;
        if (mesh.isMesh !== true || mesh.material === material) return;
        if (!originals.current.has(mesh)) {
          originals.current.set(mesh, mesh.material as THREE.Material | THREE.Material[]);
        }
        mesh.material = material;
      });
    } else {
      for (const [mesh, material] of originals.current) mesh.material = material;
      originals.current.clear();
    }
  }, [scene, shade]);

  useEffect(
    () => () => {
      if (scene !== null) {
        for (const [mesh, material] of originals.current) mesh.material = material;
        originals.current.clear();
        disposeLoadedScene(scene);
      }
      if (override.current !== null) {
        override.current.dispose();
        override.current = null;
      }
    },
    [scene],
  );

  useFrame((_, delta) => {
    if (group.current === null) return;
    if (turntable) group.current.rotation.y += delta * 0.5;
    window.__GFL2_MODEL_REVIEW__ = {
      ...(window.__GFL2_MODEL_REVIEW__ ?? {
        ready: false,
        view: '',
        light: '',
        shade: '',
        variant: '',
        triangles: 0,
        materials: 0,
        sockets: 0,
      }),
      drawCalls: gl.info.render.calls,
      renderedTriangles: Math.round(gl.info.render.triangles),
    };
  });

  if (scene === null) return null;
  return (
    <group ref={group}>
      <primitive object={scene} />
    </group>
  );
}

function ReviewLights({ light }: { light: ModelReviewLight }) {
  if (light === 'grassland') return <CelLights />;
  return (
    <>
      <hemisphereLight args={['#ffffff', '#8a8f8a', 1.35]} />
      <directionalLight position={[4, 8, 2]} color="#ffffff" intensity={1.15} />
      <ambientLight intensity={0.55} />
    </>
  );
}

const PANEL: React.CSSProperties = {
  position: 'absolute',
  font: '12px/1.5 system-ui, sans-serif',
  color: '#f2eee6',
  background: 'rgba(17,16,15,0.88)',
  border: '1px solid #3b3731',
  borderRadius: 6,
  padding: '8px 10px',
};

export function ModelReviewApp() {
  const [view, setView] = useState<ModelReviewView>(() => requestedModelReviewView());
  const [light, setLight] = useState<ModelReviewLight>(() => requestedModelReviewLight());
  const [shade, setShade] = useState<ModelReviewShade>(() => requestedModelReviewShade());
  const [variant, setVariant] = useState<ModelReviewVariant>(() => requestedModelReviewVariant());
  const [turntable, setTurntable] = useState(() => requestedModelReviewFlag('turntable'));
  const [compare, setCompare] = useState(() => requestedModelReviewFlag('compare'));
  const [showSockets, setShowSockets] = useState(() => requestedModelReviewFlag('sockets'));
  const [missing, setMissing] = useState(false);
  const [live, setLive] = useState({ triangles: 0, materials: 0, sockets: 0 });
  const tololo = useMemo(() => mockTololo(), []);
  const activeFixture = VARIANT_FIXTURES[variant] ?? VARIANT_FIXTURES.base;

  const selectVariant = (name: ModelReviewVariant) => {
    setVariant(name);
    setMissing(false);
    setLive({ triangles: 0, materials: 0, sockets: 0 });
  };

  useEffect(() => {
    window.__GFL2_MODEL_REVIEW__ = {
      ...(window.__GFL2_MODEL_REVIEW__ ?? { drawCalls: 0, renderedTriangles: 0 }),
      ready: !missing && live.triangles > 0,
      view,
      light,
      shade,
      variant,
      triangles: live.triangles,
      materials: live.materials,
      sockets: live.sockets,
    };
  }, [missing, live, view, light, shade, variant]);

  const views: readonly ModelReviewView[] = [
    'front',
    'side',
    'side-left',
    'rear',
    'three-quarter',
    'rear-three-quarter',
    'top',
    'third',
    'ads',
  ];

  const variants: readonly ModelReviewVariant[] = ['base', 'ad2a1-neutral', 'ad2a1-ready'];

  return (
    <div
      className="gfl-model-review"
      data-testid="model-review-root"
      style={{ position: 'absolute', inset: 0 }}
    >
      <Canvas
        dpr={[1, 1.5]}
        shadows
        camera={{ position: [3.1, 1.9, 3.1], fov: 40, near: 0.05, far: 120 }}
        gl={{ antialias: true, alpha: false, powerPreference: 'high-performance' }}
        onCreated={({ gl }) => {
          gl.outputColorSpace = THREE.SRGBColorSpace;
          gl.toneMapping = THREE.ACESFilmicToneMapping;
          gl.toneMappingExposure = 1.05;
        }}
      >
        <color attach="background" args={[shade === 'silhouette' ? '#e8e8e6' : '#23262b']} />
        <ReviewCamera view={view} />
        <ReviewLights light={light} />
        <mesh rotation-x={-Math.PI / 2} position-y={-0.005} receiveShadow>
          <circleGeometry args={[7, 48]} />
          <meshStandardMaterial color="#6f7072" roughness={0.95} metalness={0} />
        </mesh>
        {!missing && (
          <CandidateModel
            key={variant}
            glbUrl={MODEL_REVIEW_GLB_URLS[variant]}
            shade={shade}
            turntable={turntable}
            showSockets={showSockets}
            onLoaded={(info) => setLive(info)}
            onMissing={() => setMissing(true)}
          />
        )}
        {compare && !missing && (
          <TololoPlayer
            player={tololo}
            events={[]}
            tick={0}
            runState="active"
            paused={false}
            cameraMode="thirdPerson"
            reducedMotion
          />
        )}
      </Canvas>
      <div style={{ ...PANEL, left: 12, top: 12, maxWidth: 300 }}>
        <strong>LADE CANDIDATE REVIEW (dev-only)</strong>
        <div style={{ marginTop: 6, display: 'flex', flexWrap: 'wrap', gap: 4 }}>
          {variants.map((name) => (
            <button
              key={name}
              type="button"
              data-variant={name}
              onClick={() => selectVariant(name)}
            >
              {name}
            </button>
          ))}
        </div>
        <div style={{ marginTop: 6, display: 'flex', flexWrap: 'wrap', gap: 4 }}>
          {views.map((name) => (
            <button key={name} type="button" data-view={name} onClick={() => setView(name)}>
              {name}
            </button>
          ))}
        </div>
        <div style={{ marginTop: 6, display: 'flex', gap: 4 }}>
          <button type="button" data-light="neutral" onClick={() => setLight('neutral')}>
            neutral
          </button>
          <button type="button" data-light="grassland" onClick={() => setLight('grassland')}>
            grassland
          </button>
          <button type="button" data-shade="material" onClick={() => setShade('material')}>
            material
          </button>
          <button type="button" data-shade="clay" onClick={() => setShade('clay')}>
            clay
          </button>
          <button type="button" data-shade="silhouette" onClick={() => setShade('silhouette')}>
            silhouette
          </button>
          <button type="button" data-shade="wireframe" onClick={() => setShade('wireframe')}>
            wireframe
          </button>
        </div>
        <div style={{ marginTop: 6, display: 'flex', gap: 4 }}>
          <button
            type="button"
            data-flag="turntable"
            onClick={() => setTurntable((value) => !value)}
          >
            turntable {turntable ? 'on' : 'off'}
          </button>
          <button type="button" data-flag="compare" onClick={() => setCompare((value) => !value)}>
            tololo {compare ? 'on' : 'off'}
          </button>
          <button
            type="button"
            data-flag="sockets"
            onClick={() => setShowSockets((value) => !value)}
          >
            sockets {showSockets ? 'on' : 'off'}
          </button>
        </div>
        <div data-testid="model-review-stats" style={{ marginTop: 6 }}>
          {variant} · height {activeFixture.height ?? '?'} m · tris {live.triangles} · mats{' '}
          {live.materials} · sockets {live.sockets}
        </div>
        {missing && (
          <div data-testid="model-review-fallback" style={{ marginTop: 6, color: '#ffb347' }}>
            Candidate GLB not found. Run tools/lade to generate it locally; it is never committed.
          </div>
        )}
      </div>
    </div>
  );
}
