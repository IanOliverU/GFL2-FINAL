import * as THREE from 'three';
import type { ReactNode } from 'react';
import type { OutlineRequest } from './outlinePolicy';

/**
 * AD1 contextual outline: a single BackSide hull mesh around one flagged
 * actor, rendered only while its policy gate returns a request. No scene
 * pass, no postprocessing, no per-frame allocation — one extra draw call
 * for one actor in one readable threat state. Hull thickness is a fixed
 * local scale: thin by construction, never a heavy outline look.
 */
export function ContextualOutline({
  request,
  scale = 1.035,
  position = [0, 0, 0],
  children,
}: {
  request: OutlineRequest | null;
  scale?: number;
  position?: readonly [number, number, number];
  children: ReactNode;
}) {
  if (request === null) return null;
  return (
    <mesh scale={scale} position={[position[0], position[1], position[2]]}>
      <meshBasicMaterial
        color={request.color}
        side={THREE.BackSide}
        transparent
        opacity={request.opacity}
        depthWrite={false}
        fog={false}
      />
      {children}
    </mesh>
  );
}
