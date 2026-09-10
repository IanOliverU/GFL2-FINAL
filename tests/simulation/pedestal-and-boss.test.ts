import { describe, expect, it } from 'vitest';

import { FIXED_DELTA, createGameSimulation, createInputIntent } from '../../src/game';

describe('Grassland objective and authored boss flow', () => {
  it('places the pedestal deterministically within distance and bound constraints', () => {
    for (let seed = 1; seed <= 20; seed += 1) {
      const first = createGameSimulation(seed).getSnapshot().pedestal;
      const second = createGameSimulation(seed).getSnapshot().pedestal;
      const distance = Math.hypot(first.position[0], first.position[2]);
      expect(first.position).toEqual(second.position);
      expect(distance).toBeGreaterThanOrEqual(first.minSpawnDistance);
      expect(distance).toBeLessThanOrEqual(first.maxSpawnDistance);
      expect(Math.abs(first.position[0])).toBeLessThanOrEqual(45 - first.boundMargin);
      expect(Math.abs(first.position[2])).toBeLessThanOrEqual(45 - first.boundMargin);
    }
  });

  it('requires interaction and starts the named Grassland Warden encounter', () => {
    const simulation = createGameSimulation(50);
    simulation.setTestState('bossReady');
    simulation.advance(FIXED_DELTA, createInputIntent({ interact: true }));
    const snapshot = simulation.getSnapshot();

    expect(snapshot.runState).toBe('boss');
    expect(snapshot.pedestal.active).toBe(true);
    expect(snapshot.boss?.name).toBe('Grassland Warden');
    expect(snapshot.boss?.phase).toBe(1);
  });

  it('changes authored patterns, exposes the weak core, breaks armor, and grants bonus vulnerability', () => {
    const simulation = createGameSimulation(51);
    simulation.setTestState('bossFight');
    simulation.debugDamageBoss(1_000, 'body');
    expect(simulation.getSnapshot().boss?.phase).toBe(2);

    simulation.debugDamageBoss(120, 'core');
    const broken = simulation.getSnapshot().boss;
    expect(broken?.armor).toBe(0);
    expect(broken?.coreExposed).toBe(true);
    expect(broken?.breakWindow).toBeGreaterThan(0);
    expect(broken?.vulnerabilityMultiplier).toBe(1.75);
    expect(simulation.getSnapshot().events.some((event) => event.type === 'bossBreak')).toBe(true);

    const before = broken?.health ?? 0;
    simulation.debugDamageBoss(130, 'body');
    const after = simulation.getSnapshot().boss?.health ?? 0;
    expect(before - after).toBe(227.5);
    expect(simulation.getSnapshot().boss?.phase).toBe(3);
  });

  it('transitions boss death through guaranteed reward, shop, extraction, and results', () => {
    const simulation = createGameSimulation(52);
    simulation.setTestState('bossReady');
    simulation.advance(FIXED_DELTA, createInputIntent({ interact: true }));
    simulation.debugDamageBoss(10_000, 'core');
    let snapshot = simulation.getSnapshot();

    expect(snapshot.runState).toBe('reward');
    expect(snapshot.boss?.defeated).toBe(true);
    expect(snapshot.pendingAttachment?.source).toBe('boss');
    expect(snapshot.pendingAttachment?.rarity).toBeGreaterThanOrEqual(2);
    expect(snapshot.paused).toBe(true);
    expect(simulation.resolveAttachment('equip')).toBe(true);

    simulation.debugSetPlayerPosition([13, 0, -10]);
    simulation.advance(FIXED_DELTA, createInputIntent());
    simulation.advance(FIXED_DELTA, createInputIntent({ interact: true }));
    expect(simulation.getSnapshot().runState).toBe('extraction');
    for (let frame = 0; frame < 50; frame += 1) {
      simulation.advance(FIXED_DELTA, createInputIntent());
    }
    snapshot = simulation.getSnapshot();
    expect(snapshot.runState).toBe('complete');
    expect(snapshot.objective.kind).toBe('complete');
    expect(snapshot.events.some((event) => event.type === 'extractionComplete')).toBe(true);
  });
});
