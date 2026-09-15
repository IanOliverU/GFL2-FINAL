import { describe, expect, it } from 'vitest';
import type { GameSnapshot } from '../../src/game';
import { mayAcquirePointerLock } from '../../src/platform/input/InputController';

function snapshot(overrides: Partial<GameSnapshot>): GameSnapshot {
  return {
    cameraMode: 'thirdPerson',
    paused: false,
    pauseReason: null,
    pendingAttachment: null,
    runState: 'active',
    ...overrides,
  } as GameSnapshot;
}

describe('pointer-lock acquisition gate', () => {
  it('allows the lock during active third-person gameplay', () => {
    expect(mayAcquirePointerLock(snapshot({}))).toBe(true);
    expect(mayAcquirePointerLock(snapshot({ runState: 'boss' }))).toBe(true);
  });

  it('refuses the lock while level-up owns the cursor', () => {
    expect(mayAcquirePointerLock(snapshot({ paused: true, pauseReason: 'levelUp' }))).toBe(false);
  });

  it('refuses the lock for every other modal state', () => {
    expect(mayAcquirePointerLock(snapshot({ paused: true, pauseReason: 'manual' }))).toBe(false);
    expect(mayAcquirePointerLock(snapshot({ paused: true, pauseReason: 'attachment' }))).toBe(
      false,
    );
    expect(mayAcquirePointerLock(snapshot({ paused: true, pauseReason: 'death' }))).toBe(false);
    expect(mayAcquirePointerLock(snapshot({ pendingAttachment: {} as never }))).toBe(false);
    expect(mayAcquirePointerLock(snapshot({ runState: 'reward' }))).toBe(false);
    expect(mayAcquirePointerLock(snapshot({ runState: 'dead' }))).toBe(false);
    expect(mayAcquirePointerLock(snapshot({ runState: 'complete' }))).toBe(false);
  });

  it('refuses the lock outside third-person gameplay', () => {
    expect(mayAcquirePointerLock(snapshot({ cameraMode: 'topDown' }))).toBe(false);
  });
});
