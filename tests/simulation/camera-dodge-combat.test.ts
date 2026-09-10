import { describe, expect, it } from 'vitest';

import {
  CAMERA_BLEND_SECONDS,
  FIXED_DELTA,
  createGameSimulation,
  createInputIntent,
} from '../../src/game';

function advanceFrames(simulation: ReturnType<typeof createGameSimulation>, frames: number): void {
  for (let frame = 0; frame < frames; frame += 1)
    simulation.advance(FIXED_DELTA, createInputIntent());
}

describe('camera, movement, and combat agreement', () => {
  it('switches presentation over 0.25s without replacing world state', () => {
    const simulation = createGameSimulation(3);
    simulation.setTestState('combat');
    const enemyId = simulation.debugSpawnEnemy('heavy', [4, 0, 5]);
    const before = simulation.getSnapshot();

    simulation.advance(FIXED_DELTA, createInputIntent({ switchCamera: true }));
    const switched = simulation.getSnapshot();
    expect(switched.cameraMode).toBe('topDown');
    expect(switched.cameraBlend).toBe(0);
    expect(switched.player.position).toEqual(before.player.position);
    expect(switched.player.health).toBe(before.player.health);
    expect(switched.enemies.map((enemy) => enemy.id)).toContain(enemyId);

    advanceFrames(simulation, Math.ceil(CAMERA_BLEND_SECONDS / FIXED_DELTA));
    expect(simulation.getSnapshot().cameraBlend).toBe(1);

    simulation.setPaused(true);
    simulation.advance(FIXED_DELTA, createInputIntent({ switchCamera: true }));
    expect(simulation.getSnapshot().cameraMode).toBe('topDown');
  });

  it('runs dodge invulnerability and cooldown through their full lifecycle', () => {
    const simulation = createGameSimulation(4);
    simulation.setTestState('combat');
    simulation.advance(FIXED_DELTA, createInputIntent({ move: [1, 0], dodge: true }));
    const dodging = simulation.getSnapshot().player;

    expect(dodging.dodgeRemaining).toBeGreaterThan(0);
    expect(dodging.dodgeCooldown).toBeGreaterThan(1);
    expect(dodging.invulnerability).toBeGreaterThan(0);
    expect(simulation.debugDamagePlayer(50)).toBe(false);

    advanceFrames(simulation, 18);
    expect(simulation.getSnapshot().player.dodgeRemaining).toBe(0);
    expect(simulation.getSnapshot().player.invulnerability).toBe(0);
    expect(simulation.debugDamagePlayer(10)).toBe(true);
    advanceFrames(simulation, 75);
    expect(simulation.getSnapshot().player.dodgeCooldown).toBe(0);
  });

  it('spawns from the authoritative muzzle and swept collision damages the aimed target', () => {
    const simulation = createGameSimulation(8);
    simulation.setTestState('combat');
    const enemyId = simulation.debugSpawnEnemy('melee', [0, 0, 6]);
    const fire = createInputIntent({ fire: true, aimPoint: [0, 0.8, 6], ads: true });

    simulation.advance(FIXED_DELTA, fire);
    const fired = simulation.getSnapshot();
    const projectile = fired.projectiles.find((candidate) => candidate.owner === 'player');
    expect(projectile).toBeDefined();
    expect(projectile?.previousPosition).toEqual(fired.player.muzzle);

    advanceFrames(simulation, 8);
    const target = simulation.getSnapshot().enemies.find((enemy) => enemy.id === enemyId);
    expect(target?.health).toBeLessThan(target?.maxHealth ?? 0);
    expect(
      simulation
        .getSnapshot()
        .events.some((event) => event.type === 'hit' && event.subjectId === enemyId),
    ).toBe(true);
  });
});
