import { describe, expect, it } from 'vitest';

import {
  FIXED_DELTA,
  MAX_RESUME_DELTA,
  createGameSimulation,
  createInputIntent,
} from '../../src/game';

describe('fixed timestep and pause', () => {
  it('advances at 1/60 and clamps a resume delta to 0.1 seconds', () => {
    const simulation = createGameSimulation(11);
    simulation.setTestState('combat');

    expect(simulation.advance(1, createInputIntent())).toBe(6);
    const snapshot = simulation.getSnapshot();
    expect(snapshot.tick).toBe(6);
    expect(snapshot.time).toBeCloseTo(MAX_RESUME_DELTA, 10);
    expect(snapshot.diagnostics.fixedDelta).toBe(FIXED_DELTA);
    expect(snapshot.diagnostics.lastRealDelta).toBe(1);
    expect(snapshot.diagnostics.lastClampedDelta).toBe(MAX_RESUME_DELTA);
  });

  it('is deterministic across equivalent fixed-step advances', () => {
    const first = createGameSimulation(9821);
    const second = createGameSimulation(9821);
    first.setTestState('combat');
    second.setTestState('combat');
    const intent = createInputIntent({ move: [0.4, -0.8], sprint: true, aimYaw: 0.7 });

    first.advance(FIXED_DELTA * 6, intent);
    for (let frame = 0; frame < 6; frame += 1) second.advance(FIXED_DELTA, intent);

    expect(first.debugStateHash()).toBe(second.debugStateHash());
  });

  it('freezes every authoritative value while paused', () => {
    const simulation = createGameSimulation(22);
    simulation.setTestState('combat');
    simulation.advance(FIXED_DELTA, createInputIntent({ move: [1, 0], fire: true }));
    simulation.setPaused(true);
    const before = simulation.debugStateHash();

    expect(
      simulation.advance(8, createInputIntent({ move: [-1, 1], fire: true, switchCamera: true })),
    ).toBe(0);
    expect(simulation.debugStateHash()).toBe(before);
    expect(simulation.getSnapshot().pauseReason).toBe('manual');
  });
});
