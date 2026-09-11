import { describe, expect, it } from 'vitest';

import {
  applyMouseDelta,
  flattenForward,
  resolveMoveVector,
  thirdPersonBasis,
  thirdPersonMove,
  topDownAim,
  topDownBasis,
  topDownMove,
} from '../../src/platform/input/InputController';

function dot(a: readonly [number, number], b: readonly [number, number]): number {
  return a[0] * b[0] + a[1] * b[1];
}

function norm(v: readonly [number, number]): readonly [number, number] {
  const length = Math.hypot(v[0], v[1]) || 1;
  return [v[0] / length, v[1] / length];
}

describe('third-person camera-relative movement basis', () => {
  const yaws = [0, Math.PI / 2, Math.PI];

  for (const yaw of yaws) {
    it(`maps WASD to the camera basis at yaw ${yaw.toFixed(3)}`, () => {
      const { forward, right } = thirdPersonBasis(yaw);
      expect(Math.hypot(...forward)).toBeCloseTo(1, 6);
      expect(Math.hypot(...right)).toBeCloseTo(1, 6);
      expect(dot(forward, right)).toBeCloseTo(0, 6);

      const w = norm(thirdPersonMove(1, 0, yaw));
      const s = norm(thirdPersonMove(-1, 0, yaw));
      const d = norm(thirdPersonMove(0, 1, yaw));
      const a = norm(thirdPersonMove(0, -1, yaw));

      expect(dot(w, forward)).toBeGreaterThan(0.99);
      expect(dot(s, forward)).toBeLessThan(-0.99);
      expect(dot(d, right)).toBeGreaterThan(0.99);
      expect(dot(a, right)).toBeLessThan(-0.99);
      expect(Math.abs(dot(w, right))).toBeLessThan(0.01);
      expect(Math.abs(dot(d, forward))).toBeLessThan(0.01);
    });
  }

  it('keeps diagonals on the bisectors', () => {
    const { forward, right } = thirdPersonBasis(Math.PI / 2);
    const diagonal = norm(thirdPersonMove(1, 1, Math.PI / 2));
    expect(dot(diagonal, forward)).toBeGreaterThan(0.7);
    expect(dot(diagonal, right)).toBeGreaterThan(0.7);
    expect(Math.hypot(...thirdPersonMove(1, 1, 0))).toBeCloseTo(Math.SQRT2, 6);
  });
});

describe('compass orientations share one convention', () => {
  // World compass: north -Z, south +Z, east +X, west -X. A camera facing yaw
  // has ground forward (sin yaw, cos yaw), so north is yaw PI, south is 0,
  // east is PI/2, west is -PI/2, and north-east is 3PI/4.
  const orientations = [
    { name: 'north', yaw: Math.PI },
    { name: 'south', yaw: 0 },
    { name: 'east', yaw: Math.PI / 2 },
    { name: 'west', yaw: -Math.PI / 2 },
    { name: 'north-east', yaw: (3 * Math.PI) / 4 },
  ] as const;

  for (const { name, yaw } of orientations) {
    it(`W/S/A/D follow the visible basis facing ${name}`, () => {
      const { forward, right } = thirdPersonBasis(yaw);
      const w = norm(thirdPersonMove(1, 0, yaw));
      const s = norm(thirdPersonMove(-1, 0, yaw));
      const d = norm(thirdPersonMove(0, 1, yaw));
      const a = norm(thirdPersonMove(0, -1, yaw));
      expect(dot(w, forward)).toBeGreaterThan(0.99);
      expect(dot(s, forward)).toBeLessThan(-0.99);
      expect(dot(d, right)).toBeGreaterThan(0.99);
      expect(dot(a, right)).toBeLessThan(-0.99);
    });
  }

  it('faces north toward -Z and east toward +X', () => {
    expect(thirdPersonBasis(Math.PI).forward[1]).toBeCloseTo(-1, 6);
    expect(thirdPersonBasis(Math.PI / 2).forward[0]).toBeCloseTo(1, 6);
  });
});

describe('unified movement command', () => {
  it('normalizes diagonals so combined keys grant no extra speed', () => {
    for (const [f, r] of [
      [1, 1],
      [1, -1],
      [-1, 1],
      [-1, -1],
    ] as const) {
      expect(Math.hypot(...resolveMoveVector('thirdPerson', f, r, Math.PI / 4))).toBeCloseTo(1, 9);
      expect(Math.hypot(...resolveMoveVector('topDown', f, r, 0))).toBeCloseTo(1, 9);
    }
    expect(Math.hypot(...resolveMoveVector('thirdPerson', 1, 0, 0))).toBeCloseTo(1, 9);
  });

  it('keeps zero input at zero', () => {
    expect(resolveMoveVector('thirdPerson', 0, 0, 1.2)).toEqual([0, 0]);
    expect(resolveMoveVector('topDown', 0, 0, 1.2)).toEqual([0, 0]);
  });

  it('replaces the basis immediately on camera switch, never stale', () => {
    // At yaw PI/2 the two bases disagree on D, so a stale basis is visible.
    const before = resolveMoveVector('thirdPerson', 0, 1, Math.PI / 2);
    const after = resolveMoveVector('topDown', 0, 1, Math.PI / 2);
    expect(before[0]).toBeCloseTo(0, 9);
    expect(before[1]).toBeCloseTo(1, 9);
    expect(after[0]).toBeCloseTo(-1, 9);
    expect(after[1]).toBeCloseTo(0, 9);
  });

  it('falls back safely on a zero-length flattened forward', () => {
    expect(flattenForward(0, 0)).toEqual([0, 1]);
    expect(flattenForward(1e-9, -1e-9)).toEqual([0, 1]);
    const unit = flattenForward(3, 4);
    expect(unit[0]).toBeCloseTo(0.6, 9);
    expect(unit[1]).toBeCloseTo(0.8, 9);
  });
});

describe('top-down screen-relative movement and aiming', () => {
  it('maps WASD to screen axes derived from the fixed elevated camera', () => {
    const { forward, right } = topDownBasis();
    // Fixed camera sits behind -Z and looks toward +Z, so screen-up is +Z
    // and screen-right is -X (never an assumed -Z).
    expect(forward[0]).toBeCloseTo(0, 6);
    expect(forward[1]).toBeCloseTo(1, 6);
    expect(right[0]).toBeCloseTo(-1, 6);
    expect(right[1]).toBeCloseTo(0, 6);

    const ahead = topDownMove(1, 0);
    expect(ahead[0]).toBeCloseTo(0, 9);
    expect(ahead[1]).toBeCloseTo(1, 9);
    const back = topDownMove(-1, 0);
    expect(back[0]).toBeCloseTo(0, 9);
    expect(back[1]).toBeCloseTo(-1, 9);
    const strafeRight = topDownMove(0, 1);
    expect(strafeRight[0]).toBeCloseTo(-1, 9);
    expect(strafeRight[1]).toBeCloseTo(0, 9);
    const strafeLeft = topDownMove(0, -1);
    expect(strafeLeft[0]).toBeCloseTo(1, 9);
    expect(strafeLeft[1]).toBeCloseTo(0, 9);
  });

  it('aims toward the cursor quadrant on the ground plane', () => {
    const width = 1280;
    const height = 720;
    const focus = 22;
    const playerX = 10;
    const playerZ = 20;

    const right = topDownAim(playerX, playerZ, 960, 360, width, height, focus);
    const left = topDownAim(playerX, playerZ, 320, 360, width, height, focus);
    const above = topDownAim(playerX, playerZ, 640, 180, width, height, focus);
    const below = topDownAim(playerX, playerZ, 640, 540, width, height, focus);

    expect(right[0]).toBeLessThan(playerX);
    expect(left[0]).toBeGreaterThan(playerX);
    expect(above[2]).toBeGreaterThan(playerZ);
    expect(below[2]).toBeLessThan(playerZ);
  });
});

describe('mouse camera direction', () => {
  it('turns right on mouse-right and looks up on mouse-up', () => {
    const right = applyMouseDelta(0, 0, 120, 0);
    expect(right.yaw).toBeLessThan(0);
    expect(right.pitch).toBeCloseTo(0, 6);

    const left = applyMouseDelta(0, 0, -120, 0);
    expect(left.yaw).toBeGreaterThan(0);

    const up = applyMouseDelta(0, 0, 0, -120);
    expect(up.pitch).toBeGreaterThan(0);

    const down = applyMouseDelta(0, 0, 0, 120);
    expect(down.pitch).toBeLessThan(0);
  });

  it('clamps pitch to the documented limits', () => {
    expect(applyMouseDelta(0, 0.5, 0, -10_000).pitch).toBeLessThanOrEqual(0.55);
    expect(applyMouseDelta(0, -0.6, 0, 10_000).pitch).toBeGreaterThanOrEqual(-0.65);
  });

  it('decouples axes: vertical motion never yaws, horizontal never pitches', () => {
    // No Invert Y setting exists; the default must keep this decoupling so a
    // future pitch-only invert could never leak into yaw or movement.
    const vertical = applyMouseDelta(0.3, 0.1, 0, -200);
    expect(vertical.yaw).toBeCloseTo(0.3, 9);
    expect(vertical.pitch).toBeGreaterThan(0.1);
    const horizontal = applyMouseDelta(0.3, 0.1, 200, 0);
    expect(horizontal.pitch).toBeCloseTo(0.1, 9);
    expect(horizontal.yaw).toBeLessThan(0.3);
  });
});
