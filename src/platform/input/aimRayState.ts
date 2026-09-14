import type { AimRay, CameraMode } from '../../game';

let pointerNdcX = 0;
let pointerNdcY = 0;
let publishedMode: CameraMode | null = null;
let publishedRay: AimRay | null = null;
let publishedPointerX = 0;
let publishedPointerY = 0;

/** Render/input bridge for camera geometry only; it never resolves targets. */
export function setAimPointerNdc(x: number, y: number): void {
  pointerNdcX = Number.isFinite(x) ? Math.max(-1, Math.min(1, x)) : 0;
  pointerNdcY = Number.isFinite(y) ? Math.max(-1, Math.min(1, y)) : 0;
}

export function getAimPointerNdc(mode: CameraMode): readonly [number, number] {
  return mode === 'thirdPerson' ? [0, 0] : [pointerNdcX, pointerNdcY];
}

/** Called after CameraRig has finalized the real camera transform this frame. */
export function publishCameraAimRay(mode: CameraMode, ray: AimRay): void {
  publishedMode = mode;
  const pointer = getAimPointerNdc(mode);
  publishedPointerX = pointer[0];
  publishedPointerY = pointer[1];
  publishedRay = {
    origin: [ray.origin[0], ray.origin[1], ray.origin[2]],
    direction: [ray.direction[0], ray.direction[1], ray.direction[2]],
  };
}

/** Null prevents carrying a stale ray across a camera-mode switch. */
export function getPublishedCameraAimRay(mode: CameraMode): AimRay | null {
  if (publishedMode !== mode || publishedRay === null) return null;
  const pointer = getAimPointerNdc(mode);
  if (
    Math.abs(pointer[0] - publishedPointerX) > 1e-6 ||
    Math.abs(pointer[1] - publishedPointerY) > 1e-6
  ) {
    return null;
  }
  return {
    origin: [...publishedRay.origin],
    direction: [...publishedRay.direction],
  };
}

export function resetPublishedCameraAimRay(): void {
  publishedMode = null;
  publishedRay = null;
}
