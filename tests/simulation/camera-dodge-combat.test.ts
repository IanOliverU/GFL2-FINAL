import { describe, expect, it } from 'vitest';

import {
  CAMERA_BLEND_SECONDS,
  FIXED_DELTA,
  createGameSimulation,
  createInputIntent,
} from '../../src/game';
import { thirdPersonMove, topDownMove } from '../../src/platform/input/InputController';

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

  it('preserves aim, cooldowns, projectiles, enemies, and progression across a switch', () => {
    const simulation = createGameSimulation(9);
    simulation.setTestState('combat');
    const enemyId = simulation.debugSpawnEnemy('melee', [0, 0, 6]);
    simulation.debugGrantExperience(5);
    simulation.advance(
      FIXED_DELTA,
      createInputIntent({ fire: true, aimPoint: [0, 0.8, 6], skill1: true }),
    );
    const before = simulation.getSnapshot();
    expect(before.projectiles.length).toBeGreaterThan(0);

    simulation.advance(FIXED_DELTA, createInputIntent({ switchCamera: true }));
    const switched = simulation.getSnapshot();
    expect(switched.cameraMode).toBe('topDown');
    expect(switched.player.position).toEqual(before.player.position);
    expect(switched.player.facingYaw).toBe(before.player.facingYaw);
    expect(switched.player.skillCooldowns).toEqual(before.player.skillCooldowns);
    expect(switched.projectiles.length).toBe(before.projectiles.length);
    expect(switched.enemies.map((enemy) => enemy.id)).toContain(enemyId);
    expect(switched.player.exp).toBe(before.player.exp);

    // The same held key follows the new view basis immediately: D stays on
    // screen-right (-X) through third-person, top-down, and back with no
    // one-frame reversal or latched stop.
    const yaw = 0;
    const third = thirdPersonMove(0, 1, yaw);
    simulation.advance(FIXED_DELTA, createInputIntent({ move: [third[0], third[1]] }));
    const afterThird = simulation.getSnapshot().player.position[0];

    const top = topDownMove(0, 1);
    simulation.advance(FIXED_DELTA, createInputIntent({ move: [top[0], top[1]] }));
    const afterTop = simulation.getSnapshot().player.position[0];
    expect(afterTop).toBeLessThan(afterThird);

    simulation.advance(FIXED_DELTA, createInputIntent({ switchCamera: true }));
    expect(simulation.getSnapshot().cameraMode).toBe('thirdPerson');
    simulation.advance(FIXED_DELTA, createInputIntent({ move: [third[0], third[1]] }));
    expect(simulation.getSnapshot().player.position[0]).toBeLessThan(afterTop);
  });

  it('keeps movement speed identical at any camera pitch', () => {
    const displacements: Array<readonly [number, number]> = [];
    for (const aimPitch of [-0.65, 0, 0.55]) {
      const simulation = createGameSimulation(11);
      simulation.setTestState('combat');
      for (let frame = 0; frame < 30; frame += 1) {
        simulation.advance(
          FIXED_DELTA,
          createInputIntent({ move: [0.3, 0.9], aimYaw: 0.7, aimPitch }),
        );
      }
      const position = simulation.getSnapshot().player.position;
      displacements.push([position[0], position[2]]);
    }
    for (const displacement of displacements.slice(1)) {
      expect(displacement[0]).toBeCloseTo(displacements[0]?.[0] ?? 0, 9);
      expect(displacement[1]).toBeCloseTo(displacements[0]?.[1] ?? 0, 9);
    }
  });

  it('switches cleanly while still, diagonal, aiming, firing, or skilling', () => {
    const scenarios = [
      { move: [0, 0] as const, fire: false, skill1: false },
      { move: [0, 1] as const, fire: false, skill1: false },
      { move: [0.5, 0.5] as const, fire: true, skill1: false },
      { move: [0.5, 0.5] as const, fire: true, skill1: true },
    ];
    for (const scenario of scenarios) {
      const simulation = createGameSimulation(12);
      simulation.setTestState('combat');
      const enemyId = simulation.debugSpawnEnemy('melee', [6, 0, 6]);
      simulation.debugGrantExperience(5);
      simulation.advance(
        FIXED_DELTA,
        createInputIntent({
          move: [...scenario.move],
          aimYaw: 1.2,
          fire: scenario.fire,
          skill1: scenario.skill1,
        }),
      );
      const before = simulation.getSnapshot();
      simulation.advance(FIXED_DELTA, createInputIntent({ switchCamera: true, aimYaw: 1.2 }));
      const switched = simulation.getSnapshot();
      expect(switched.cameraMode).toBe('topDown');
      expect(switched.player.position).toEqual(before.player.position);
      expect(switched.player.facingYaw).toBe(before.player.facingYaw);
      expect(switched.player.ammo).toBe(before.player.ammo);
      expect(switched.projectiles.length).toBe(before.projectiles.length);
      expect(switched.enemies.map((enemy) => enemy.id)).toContain(enemyId);
      expect(switched.player.exp).toBe(before.player.exp);
      // No opposite-direction impulse: held D keeps a negative-X velocity
      // through the switch in both bases at yaw 0.
      simulation.advance(FIXED_DELTA, createInputIntent({ move: [-1, 0] }));
      expect(simulation.getSnapshot().player.velocity[0]).toBeLessThan(0);
    }
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
