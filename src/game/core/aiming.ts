import type { AimRay, Vec3 } from '../types';

/**
 * Authoritative aiming contract (pure, deterministic, RNG-free).
 *
 * One consistent shot contract:
 * 1. The crosshair defines a camera ray into the world (render-owned geometry).
 * 2. That ray determines an authoritative aim point: the closest valid enemy
 *    capsule intersection, the closest world obstruction, or a safe fallback
 *    at weapon range. The simulation performs this resolution; rendering and
 *    input never select targets.
 * 3. The projectile begins at the firearm's authoritative muzzle origin.
 * 4. The projectile travels from the muzzle toward the resolved aim point,
 *    which absorbs normal third-person muzzle-to-crosshair parallax instead
 *    of firing parallel to the camera ray.
 * 5. Each simulation step uses swept collision (previous -> next position).
 * 6. Collision chooses the closest valid intersection along the segment.
 * 7. Cover blocks the projectile when it is closer than the enemy.
 * 8. An unobstructed enemy inside the crosshair's valid target area takes
 *    damage exactly once per projectile.
 *
 * Camera constants below mirror the render CameraRig (GameScene) so the
 * analytic crosshair ray matches the presented crosshair: the centered
 * behind-character offset (THIRD_OFFSET / portrait variant), the target
 * height, and the 12 m look target built from aim yaw/pitch. Camera-collision
 * pull-in moves the camera along this same ray and ADS only changes field of
 * view, so neither alters the ray direction. Render-side camera easing can
 * lag one frame behind; the steady-state direction is what the simulation
 * resolves.
 */

export interface HurtTarget {
  id: number;
  x: number;
  z: number;
  height: number;
  radius: number;
  alive: boolean;
}

export interface SphereTarget {
  id: number;
  center: Vec3;
  radius: number;
  alive: boolean;
}

export interface CoverVolume {
  x: number;
  z: number;
  radius: number;
  height: number;
}

export interface AimResolution {
  aimPoint: Vec3;
  distance: number;
  enemyId: number | null;
  blocked: boolean;
  fallback: boolean;
}

export interface SegmentHit {
  t: number;
  point: Vec3;
}

export const THIRD_PERSON_OFFSET: Vec3 = [0, 2.8, -6.6];
export const PORTRAIT_OFFSET: Vec3 = [0, 2.1, -4.6];
export const TOP_DOWN_OFFSET: Vec3 = [0, 18.5, -13.5];
/** Look-target distance used by the render camera rig. */
export const CROSSHAIR_FORWARD_DISTANCE = 12;
/** Foot of the grounded hurt capsule (feet stay planted at y = 0). */
export const HURT_CAPSULE_FOOT = 0.12;
/** Authoritative extraction-device anchor (matches GrasslandWorld default). */
export const EXTRACTION_ANCHOR: Vec3 = [13, 0, -10];

function vec(x: number, y: number, z: number): Vec3 {
  return [x, y, z];
}

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.max(minimum, Math.min(maximum, value));
}

function normalize(x: number, y: number, z: number): Vec3 {
  const length = Math.hypot(x, y, z);
  if (!Number.isFinite(length) || length < 1e-9) return vec(0, 0, 1);
  return vec(x / length, y / length, z / length);
}

/** Portrait framing weight; mirrors the CameraRig aspect blend. */
export function portraitWeight(aspect: number): number {
  if (!Number.isFinite(aspect)) return 0;
  return clamp((0.9 - aspect) / 0.4, 0, 1);
}

/**
 * Analytic third-person crosshair ray: camera position from the yaw-rotated
 * shoulder offset toward the player target, aimed at the yaw/pitch look
 * target. Steady-state equivalent of the presented screen-center ray.
 */
export function thirdPersonCrosshairRay(
  player: Vec3,
  yaw: number,
  pitch: number,
  aspect = 16 / 9,
): AimRay {
  const weight = portraitWeight(aspect);
  const offsetX = THIRD_PERSON_OFFSET[0] + (PORTRAIT_OFFSET[0] - THIRD_PERSON_OFFSET[0]) * weight;
  const offsetY = THIRD_PERSON_OFFSET[1] + (PORTRAIT_OFFSET[1] - THIRD_PERSON_OFFSET[1]) * weight;
  const offsetZ = THIRD_PERSON_OFFSET[2] + (PORTRAIT_OFFSET[2] - THIRD_PERSON_OFFSET[2]) * weight;
  const targetX = player[0];
  const targetY = player[1] + 1.25 + (1.0 - 1.25) * weight;
  const targetZ = player[2];
  const rotatedX = Math.cos(yaw) * offsetX + Math.sin(yaw) * offsetZ;
  const rotatedZ = -Math.sin(yaw) * offsetX + Math.cos(yaw) * offsetZ;
  const origin = vec(targetX + rotatedX, targetY + offsetY, targetZ + rotatedZ);
  const look = vec(
    targetX + Math.sin(yaw) * CROSSHAIR_FORWARD_DISTANCE,
    targetY + Math.sin(pitch) * CROSSHAIR_FORWARD_DISTANCE,
    targetZ + Math.cos(yaw) * CROSSHAIR_FORWARD_DISTANCE,
  );
  return {
    origin,
    direction: normalize(look[0] - origin[0], look[1] - origin[1], look[2] - origin[2]),
  };
}

/**
 * Top-down cursor ray for the fixed elevated camera: unprojects the cursor
 * NDC position through a perspective frustum at the given field of view.
 * Screen-right is -X, screen-up is +Z, matching the top-down basis.
 */
export function topDownCursorRay(
  player: Vec3,
  pointerX: number,
  pointerY: number,
  viewportWidth: number,
  viewportHeight: number,
  fovDegrees = 46,
): AimRay {
  const safeWidth = Math.max(1, viewportWidth);
  const safeHeight = Math.max(1, viewportHeight);
  const ndcX = (pointerX / safeWidth) * 2 - 1;
  const ndcY = 1 - (pointerY / safeHeight) * 2;
  const target = vec(player[0], player[1] + 1.25, player[2]);
  const origin = vec(
    target[0] + TOP_DOWN_OFFSET[0],
    target[1] + TOP_DOWN_OFFSET[1],
    target[2] + TOP_DOWN_OFFSET[2],
  );
  const forward = normalize(target[0] - origin[0], target[1] - origin[1], target[2] - origin[2]);
  // right = forward x up (screen-right for this camera is -X).
  let right = vec(
    forward[1] * 0 - forward[2] * 1,
    forward[2] * 0 - forward[0] * 0,
    forward[0] * 1 - forward[1] * 0,
  );
  right = normalize(right[0], right[1], right[2]);
  const up = vec(
    right[1] * forward[2] - right[2] * forward[1],
    right[2] * forward[0] - right[0] * forward[2],
    right[0] * forward[1] - right[1] * forward[0],
  );
  const halfTan = Math.tan(((Number.isFinite(fovDegrees) ? fovDegrees : 46) * Math.PI) / 360);
  const aspect = safeWidth / safeHeight;
  return {
    origin,
    direction: normalize(
      forward[0] + right[0] * ndcX * halfTan * aspect + up[0] * ndcY * halfTan,
      forward[1] + right[1] * ndcX * halfTan * aspect + up[1] * ndcY * halfTan,
      forward[2] + right[2] * ndcX * halfTan * aspect + up[2] * ndcY * halfTan,
    ),
  };
}

interface ClosestPoints {
  s: number;
  t: number;
  distanceSquared: number;
  first: Vec3;
}

/** Closest points between segments p1->q1 and p2->q2 (Ericson 5.1.9). */
function segmentSegmentClosest(p1: Vec3, q1: Vec3, p2: Vec3, q2: Vec3): ClosestPoints {
  const d1x = q1[0] - p1[0];
  const d1y = q1[1] - p1[1];
  const d1z = q1[2] - p1[2];
  const d2x = q2[0] - p2[0];
  const d2y = q2[1] - p2[1];
  const d2z = q2[2] - p2[2];
  const rx = p1[0] - p2[0];
  const ry = p1[1] - p2[1];
  const rz = p1[2] - p2[2];
  const a = d1x * d1x + d1y * d1y + d1z * d1z;
  const e = d2x * d2x + d2y * d2y + d2z * d2z;
  const f = d2x * rx + d2y * ry + d2z * rz;
  const epsilon = 1e-12;
  let s = 0;
  let t = 0;
  if (a <= epsilon && e <= epsilon) {
    s = 0;
    t = 0;
  } else if (a <= epsilon) {
    s = 0;
    t = clamp(f / e, 0, 1);
  } else {
    const c = d1x * rx + d1y * ry + d1z * rz;
    if (e <= epsilon) {
      t = 0;
      s = clamp(-c / a, 0, 1);
    } else {
      const b = d1x * d2x + d1y * d2y + d1z * d2z;
      const denominator = a * e - b * b;
      s = denominator > epsilon ? clamp((b * f - c * e) / denominator, 0, 1) : 0;
      t = (b * s + f) / e;
      if (t < 0) {
        t = 0;
        s = clamp(-c / a, 0, 1);
      } else if (t > 1) {
        t = 1;
        s = clamp((b - c) / a, 0, 1);
      }
    }
  }
  const first = vec(p1[0] + d1x * s, p1[1] + d1y * s, p1[2] + d1z * s);
  const second = vec(p2[0] + d2x * t, p2[1] + d2y * t, p2[2] + d2z * t);
  const dx = first[0] - second[0];
  const dy = first[1] - second[1];
  const dz = first[2] - second[2];
  return { s, t, distanceSquared: dx * dx + dy * dy + dz * dz, first };
}

/**
 * Swept test of segment prev->cur against a grounded vertical capsule
 * (outer foot->top bounds at x/z, radius). Returns the entry fraction along the
 * projectile segment so callers can pick the closest intersection.
 */
export function segmentCapsuleHit(
  previous: Vec3,
  current: Vec3,
  x: number,
  z: number,
  footY: number,
  topY: number,
  radius: number,
): SegmentHit | null {
  if (!(radius > 0)) return null;
  const safeTop = Math.max(topY, footY);
  const available = safeTop - footY;
  const effectiveRadius = Math.min(radius, available * 0.5);
  const axisBottom = vec(x, footY + effectiveRadius, z);
  const axisTop = vec(x, safeTop - effectiveRadius, z);
  const segmentX = current[0] - previous[0];
  const segmentY = current[1] - previous[1];
  const segmentZ = current[2] - previous[2];
  const segmentLength = Math.hypot(segmentX, segmentY, segmentZ);
  if (segmentLength < 1e-9) {
    const dx = previous[0] - x;
    const dz = previous[2] - z;
    const vertical = clamp(previous[1], axisBottom[1], axisTop[1]) - previous[1];
    if (dx * dx + dz * dz + vertical * vertical <= effectiveRadius * effectiveRadius) {
      return { t: 0, point: vec(previous[0], previous[1], previous[2]) };
    }
    return null;
  }
  const closest = segmentSegmentClosest(previous, current, axisBottom, axisTop);
  if (closest.distanceSquared > effectiveRadius * effectiveRadius) return null;
  const backoff =
    Math.sqrt(Math.max(0, effectiveRadius * effectiveRadius - closest.distanceSquared)) /
    segmentLength;
  const entry = clamp(closest.s - backoff, 0, 1);
  return {
    t: entry,
    point: vec(
      previous[0] + segmentX * entry,
      previous[1] + segmentY * entry,
      previous[2] + segmentZ * entry,
    ),
  };
}

/** Swept entry fraction of segment prev->cur against a sphere, or null. */
export function segmentSphereT(
  previous: Vec3,
  current: Vec3,
  centerX: number,
  centerY: number,
  centerZ: number,
  radius: number,
): SegmentHit | null {
  if (!(radius > 0)) return null;
  const dx = current[0] - previous[0];
  const dy = current[1] - previous[1];
  const dz = current[2] - previous[2];
  const fx = previous[0] - centerX;
  const fy = previous[1] - centerY;
  const fz = previous[2] - centerZ;
  const a = dx * dx + dy * dy + dz * dz;
  if (a < 1e-12) {
    if (fx * fx + fy * fy + fz * fz <= radius * radius) {
      return { t: 0, point: vec(previous[0], previous[1], previous[2]) };
    }
    return null;
  }
  const b = 2 * (fx * dx + fy * dy + fz * dz);
  const c = fx * fx + fy * fy + fz * fz - radius * radius;
  if (c <= 0) return { t: 0, point: vec(previous[0], previous[1], previous[2]) };
  const discriminant = b * b - 4 * a * c;
  if (discriminant < 0) return null;
  const entry = (-b - Math.sqrt(discriminant)) / (2 * a);
  if (entry < 0 || entry > 1) return null;
  return {
    t: entry,
    point: vec(previous[0] + dx * entry, previous[1] + dy * entry, previous[2] + dz * entry),
  };
}

/**
 * Swept entry of segment prev->cur against a solid vertical cylinder
 * (radius around x/z, spanning y 0..height), including a top-cap entry for
 * plunging fire. Returns the entry fraction or null.
 */
export function segmentCylinderT(
  previous: Vec3,
  current: Vec3,
  x: number,
  z: number,
  radius: number,
  height: number,
): SegmentHit | null {
  if (!(radius > 0) || !(height > 0)) return null;
  const dx = current[0] - previous[0];
  const dz = current[2] - previous[2];
  const ox = previous[0] - x;
  const oz = previous[2] - z;
  const insideXZ = ox * ox + oz * oz <= radius * radius;
  const previousY = previous[1];
  const currentY = current[1];
  if (insideXZ && previousY >= 0 && previousY <= height) {
    return { t: 0, point: vec(previous[0], previousY, previous[2]) };
  }
  let best: SegmentHit | null = null;
  const a = dx * dx + dz * dz;
  if (a > 1e-12) {
    const b = 2 * (ox * dx + oz * dz);
    const c = ox * ox + oz * oz - radius * radius;
    const discriminant = b * b - 4 * a * c;
    if (discriminant >= 0) {
      const root = Math.sqrt(discriminant);
      for (const entry of [(-b - root) / (2 * a), (-b + root) / (2 * a)]) {
        if (entry < 0 || entry > 1) continue;
        const y = previousY + (currentY - previousY) * entry;
        if (y < 0 || y > height) continue;
        const candidate: SegmentHit = {
          t: entry,
          point: vec(
            previous[0] + (current[0] - previous[0]) * entry,
            y,
            previous[2] + (current[2] - previous[2]) * entry,
          ),
        };
        if (best === null || candidate.t < best.t) best = candidate;
      }
    }
  }
  // Top-cap entry for steep plunging shots landing on the volume.
  if (previousY > height && currentY <= height) {
    const span = previousY - currentY;
    if (span > 1e-12) {
      const entry = (previousY - height) / span;
      if (entry >= 0 && entry <= 1) {
        const hx = previous[0] + (current[0] - previous[0]) * entry - x;
        const hz = previous[2] + (current[2] - previous[2]) * entry - z;
        if (hx * hx + hz * hz <= radius * radius) {
          const candidate: SegmentHit = {
            t: entry,
            point: vec(
              previous[0] + (current[0] - previous[0]) * entry,
              height,
              previous[2] + (current[2] - previous[2]) * entry,
            ),
          };
          if (best === null || candidate.t < best.t) best = candidate;
        }
      }
    }
  }
  return best;
}

/** Swept entry of segment prev->cur against the y = groundY plane. */
export function segmentGroundT(previous: Vec3, current: Vec3, groundY = 0.02): SegmentHit | null {
  if (previous[1] > groundY && current[1] <= groundY) {
    const span = previous[1] - current[1];
    if (span < 1e-12) return null;
    const entry = (previous[1] - groundY) / span;
    if (entry < 0 || entry > 1) return null;
    return {
      t: entry,
      point: vec(
        previous[0] + (current[0] - previous[0]) * entry,
        groundY,
        previous[2] + (current[2] - previous[2]) * entry,
      ),
    };
  }
  return null;
}

/** Authoritative world obstructions: pedestal column, extraction device, ground. */
export function coverVolumes(pedestalX: number, pedestalZ: number): CoverVolume[] {
  return [
    { x: pedestalX, z: pedestalZ, radius: 1.55, height: 1.15 },
    { x: EXTRACTION_ANCHOR[0], z: EXTRACTION_ANCHOR[2], radius: 2.0, height: 3.0 },
  ];
}

/**
 * Resolve the authoritative aim point for a camera ray: closest live enemy
 * capsule wins; a cover volume or the ground plane closer than the enemy
 * blocks (blocked = true); otherwise the ray falls back to weapon range.
 */
export function resolveAimPoint(
  origin: Vec3,
  direction: Vec3,
  range: number,
  targets: readonly HurtTarget[],
  covers: readonly CoverVolume[],
  sphereTargets: readonly SphereTarget[] = [],
): AimResolution {
  const safeRange = Number.isFinite(range) && range > 0 ? range : 38;
  const far = vec(
    origin[0] + direction[0] * safeRange,
    origin[1] + direction[1] * safeRange,
    origin[2] + direction[2] * safeRange,
  );
  let enemyT = Number.POSITIVE_INFINITY;
  let enemyPoint: Vec3 | null = null;
  let enemyId: number | null = null;
  for (const target of targets) {
    if (!target.alive) continue;
    const hit = segmentCapsuleHit(
      origin,
      far,
      target.x,
      target.z,
      HURT_CAPSULE_FOOT,
      target.height,
      target.radius,
    );
    if (hit !== null && hit.t < enemyT) {
      enemyT = hit.t;
      // The closest entry selects and orders the target. Converge one radius
      // inside the volume so the preserved weapon spread remains symmetric;
      // aiming at the tangent entry surface would make every outward spread
      // sample miss, even with the crosshair centered at close range.
      const interiorDistance = Math.min(safeRange, hit.t * safeRange + target.radius);
      enemyPoint = vec(
        origin[0] + direction[0] * interiorDistance,
        origin[1] + direction[1] * interiorDistance,
        origin[2] + direction[2] * interiorDistance,
      );
      enemyId = target.id;
    }
  }
  for (const target of sphereTargets) {
    if (!target.alive) continue;
    const hit = segmentSphereT(
      origin,
      far,
      target.center[0],
      target.center[1],
      target.center[2],
      target.radius,
    );
    if (hit !== null && hit.t < enemyT) {
      enemyT = hit.t;
      const interiorDistance = Math.min(safeRange, hit.t * safeRange + target.radius);
      enemyPoint = vec(
        origin[0] + direction[0] * interiorDistance,
        origin[1] + direction[1] * interiorDistance,
        origin[2] + direction[2] * interiorDistance,
      );
      enemyId = target.id;
    }
  }
  let coverT = Number.POSITIVE_INFINITY;
  let coverPoint: Vec3 | null = null;
  for (const cover of covers) {
    const hit = segmentCylinderT(origin, far, cover.x, cover.z, cover.radius, cover.height);
    if (hit !== null && hit.t < coverT) {
      coverT = hit.t;
      coverPoint = hit.point;
    }
  }
  const ground = segmentGroundT(origin, far);
  if (ground !== null && ground.t < coverT) {
    coverT = ground.t;
    coverPoint = ground.point;
  }
  if (enemyPoint !== null && enemyT < coverT - 1e-9) {
    return {
      aimPoint: enemyPoint,
      distance: enemyT * safeRange,
      enemyId,
      blocked: false,
      fallback: false,
    };
  }
  if (coverPoint !== null) {
    return {
      aimPoint: coverPoint,
      distance: coverT * safeRange,
      enemyId: null,
      blocked: true,
      fallback: false,
    };
  }
  return { aimPoint: far, distance: safeRange, enemyId: null, blocked: false, fallback: true };
}
