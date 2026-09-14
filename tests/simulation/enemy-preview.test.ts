import { describe, expect, it } from 'vitest';

import { FIXED_DELTA, createGameSimulation, createInputIntent } from '../../src/game';

type Simulation = ReturnType<typeof createGameSimulation>;

const IDLE = () => createInputIntent();

function advance(simulation: Simulation, frames: number): void {
  for (let frame = 0; frame < frames; frame += 1) simulation.advance(FIXED_DELTA, IDLE());
}

function liveLades(simulation: Simulation): number {
  return simulation.getSnapshot().enemies.filter((enemy) => enemy.role === 'lade').length;
}

function ladeIds(simulation: Simulation): number[] {
  return simulation
    .getSnapshot()
    .enemies.filter((enemy) => enemy.role === 'lade')
    .map((enemy) => enemy.id);
}

function fireAt(simulation: Simulation, target: readonly [number, number, number]): void {
  simulation.advance(FIXED_DELTA, createInputIntent({ fire: true, aimPoint: target, ads: true }));
}

/**
 * Advance while sprint-circling faster than any pursuer, so long observation
 * windows never end in an idle death.
 */
function advanceKiting(simulation: Simulation, frames: number): void {
  let angle = 0;
  for (let frame = 0; frame < frames; frame += 1) {
    angle += 0.008;
    simulation.advance(
      FIXED_DELTA,
      createInputIntent({ move: [Math.sin(angle), Math.cos(angle)], sprint: true }),
    );
  }
}

/** Kill every live Lade through the real weapon pipeline. */
function killAllLades(simulation: Simulation): void {
  for (let frame = 0; frame < 1200; frame += 1) {
    const target = simulation.getSnapshot().enemies.find((enemy) => enemy.role === 'lade');
    if (!target) return;
    fireAt(simulation, [target.position[0], 0.8, target.position[2]]);
  }
  throw new Error('Lades survived 1200 frames of aimed fire.');
}

describe('Lade preview mode (development-only)', () => {
  it('stays off by default and never spawns Lades through the normal roster', () => {
    const simulation = createGameSimulation(501);
    expect(simulation.getSnapshot().enemyPreview).toBeNull();
    advance(simulation, 1800);
    expect(simulation.getSnapshot().enemyPreview).toBeNull();
    expect(simulation.getSnapshot().enemies.some((enemy) => enemy.role === 'lade')).toBe(false);
  });

  it('guarantees a Lade within the first 10 seconds once armed', () => {
    const simulation = createGameSimulation(502);
    simulation.setEnemyPreviewMode('lade');
    expect(simulation.getSnapshot().enemyPreview).toBe('lade');
    advance(simulation, 600);
    expect(liveLades(simulation)).toBeGreaterThan(0);
  });

  it('keeps the normal roster spawning alongside preview Lades', () => {
    const simulation = createGameSimulation(503);
    simulation.setEnemyPreviewMode('lade');
    advance(simulation, 300);
    const roles = new Set(simulation.getSnapshot().enemies.map((enemy) => enemy.role));
    expect(roles.has('lade')).toBe(true);
    expect(
      (['melee', 'flanker', 'ranged', 'heavy', 'elite'] as const).some((role) => roles.has(role)),
    ).toBe(true);
  });

  it('continues spawning controlled Lade encounters after kills', () => {
    const simulation = createGameSimulation(504);
    simulation.setEnemyPreviewMode('lade');
    advance(simulation, 600);
    const first = ladeIds(simulation);
    expect(first.length).toBeGreaterThan(0);
    killAllLades(simulation);
    expect(liveLades(simulation)).toBe(0);
    advanceKiting(simulation, 780);
    const later = ladeIds(simulation);
    expect(simulation.getSnapshot().runState).toBe('active');
    expect(later.length).toBeGreaterThan(0);
    expect(later.some((id) => !first.includes(id))).toBe(true);
  });

  it('stops further preview spawns once cleared', () => {
    const simulation = createGameSimulation(505);
    simulation.setEnemyPreviewMode('lade');
    advance(simulation, 600);
    expect(liveLades(simulation)).toBeGreaterThan(0);
    simulation.setEnemyPreviewMode(null);
    expect(simulation.getSnapshot().enemyPreview).toBeNull();
    killAllLades(simulation);
    advance(simulation, 900);
    expect(liveLades(simulation)).toBe(0);
  });

  it('resets to normal progression on retry', () => {
    const simulation = createGameSimulation(506);
    simulation.setEnemyPreviewMode('lade');
    advance(simulation, 600);
    expect(liveLades(simulation)).toBeGreaterThan(0);
    simulation.restart(506);
    expect(simulation.getSnapshot().enemyPreview).toBeNull();
    expect(simulation.getSnapshot().enemies).toHaveLength(0);
    advance(simulation, 1800);
    expect(simulation.getSnapshot().enemies.some((enemy) => enemy.role === 'lade')).toBe(false);
  });
});
