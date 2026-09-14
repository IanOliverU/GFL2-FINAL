import { describe, expect, it } from 'vitest';
import {
  ENEMY_DEFINITIONS,
  ENEMY_HEIGHTS,
  FIXED_DELTA,
  HURT_CAPSULE_FOOT,
  createGameSimulation,
  createInputIntent,
  resolveAimPoint,
  segmentCapsuleHit,
  type CameraMode,
  type EnemyRole,
  type GameSimulationContract,
  type InputIntent,
  type Vec3,
} from '../../src/game';

function direction(origin: Vec3, target: Vec3): Vec3 {
  const dx = target[0] - origin[0];
  const dy = target[1] - origin[1];
  const dz = target[2] - origin[2];
  const length = Math.hypot(dx, dy, dz) || 1;
  return [dx / length, dy / length, dz / length];
}

function intentFor(
  target: Vec3,
  options: { origin?: Vec3; ads?: boolean; switchCamera?: boolean } = {},
): InputIntent {
  const origin = options.origin ?? [4.1, 4.05, -6.6];
  return createInputIntent({
    ads: options.ads ?? false,
    switchCamera: options.switchCamera ?? false,
    aimRay: { origin, direction: direction(origin, target) },
  });
}

function step(sim: GameSimulationContract, intent: InputIntent, seconds = FIXED_DELTA): void {
  sim.advance(seconds, intent);
}

function settle(sim: GameSimulationContract, intent: InputIntent, seconds = 1): void {
  const steps = Math.ceil(seconds / FIXED_DELTA);
  for (let index = 0; index < steps; index += 1) step(sim, intent);
}

function fireOnce(sim: GameSimulationContract, intent: InputIntent, settleSeconds = 1): void {
  step(sim, { ...intent, fire: true });
  step(sim, { ...intent, fire: false });
  settle(sim, { ...intent, fire: false }, settleSeconds);
}

function combat(seed = 20260915): GameSimulationContract {
  const sim = createGameSimulation(seed);
  sim.setTestState('combat');
  return sim;
}

function health(sim: GameSimulationContract, id: number): number | null {
  return sim.getSnapshot().enemies.find((enemy) => enemy.id === id)?.health ?? null;
}

function assertOneShotHit(
  role: EnemyRole,
  position: Vec3,
  targetY: number,
  options: { origin?: Vec3; ads?: boolean; seed?: number } = {},
): void {
  const sim = combat(options.seed);
  const id = sim.debugSpawnEnemy(role, position);
  const before = health(sim, id);
  fireOnce(
    sim,
    intentFor([position[0], targetY, position[2]], {
      ...(options.origin === undefined ? {} : { origin: options.origin }),
      ...(options.ads === undefined ? {} : { ads: options.ads }),
    }),
  );
  expect(health(sim, id)).not.toBeNull();
  expect(health(sim, id)).toBeLessThan(before ?? 0);
  expect(sim.getSnapshot().diagnostics.projectileHits).toBe(1);
}

describe('authoritative aiming and projectile contract', () => {
  it('resolves the exact close shoulder-camera ray observed by the browser', () => {
    const origin: Vec3 = [-12.37974827453618, 4.05, -6.517156787299503];
    const rayDirection: Vec3 = [-0.8147919310793236, -0.3201069193303719, 0.4833690818048313];
    const resolution = resolveAimPoint(
      origin,
      rayDirection,
      48,
      [{ id: 1, x: -20, z: -2, height: ENEMY_HEIGHTS.ranged, radius: 0.5, alive: true }],
      [],
    );
    expect(resolution.enemyId).toBe(1);

    const sim = combat(42);
    sim.setAimDebugEnabled(true);
    sim.debugSetPlayerPosition([-20, 0, -5]);
    const id = sim.debugSpawnEnemy('ranged', [-20, 0, -2], true);
    const before = health(sim, id);
    fireOnce(sim, createInputIntent({ aimRay: { origin, direction: rayDirection } }));
    expect(health(sim, id), JSON.stringify(sim.getSnapshot().aimDebug)).toBeLessThan(before ?? 0);
  });

  it('1. damages a stationary enemy centered under the crosshair', () => {
    assertOneShotHit('ranged', [0, 0, 10], 1.05);
  });

  it('2. damages a moving enemy crossing the shot', () => {
    assertOneShotHit('flanker', [3.5, 0, 12], 1.0, { origin: [6.5, 4, -5] });
  });

  it('3. damages an enemy approaching the player', () => {
    assertOneShotHit('melee', [0, 0, 12], 1.0);
  });

  it('4. converges muzzle to camera aim at close third-person range', () => {
    assertOneShotHit('ranged', [0, 0, 3], 1.0, { origin: [4.1, 4.05, -6.6] });
  });

  it('5. resolves a medium-range third-person shot', () => {
    assertOneShotHit('melee', [0, 0, 16], 1.15, { origin: [4.1, 4.05, -6.6] });
  });

  it('6. resolves a long-range third-person shot within muzzle range', () => {
    assertOneShotHit('heavy', [0, 0, 34], 1.25, {
      origin: [4.1, 4.05, -6.6],
      seed: 31,
    });
  });

  it('7. resolves an ADS shot without changing damage authority', () => {
    assertOneShotHit('melee', [0, 0, 18], 1.2, { ads: true });
  });

  it('8. resolves a top-down cursor ray shot', () => {
    assertOneShotHit('ranged', [0, 0, 10], 1.0, { origin: [0, 19.75, -13.5] });
  });

  it('9. keeps enemy damage equal across camera states', () => {
    const run = (mode: CameraMode) => {
      const sim = combat(81);
      const id = sim.debugSpawnEnemy('heavy', [0, 0, 12]);
      if (mode === 'topDown') {
        step(sim, createInputIntent({ switchCamera: true }));
        step(sim, createInputIntent({ switchCamera: false }));
      }
      const shot =
        mode === 'topDown'
          ? intentFor([0, 1.1, 12], { origin: [0, 19.75, -13.5] })
          : intentFor([0, 1.1, 12]);
      fireOnce(sim, shot);
      return health(sim, id);
    };
    expect(run('topDown')).toBe(run('thirdPerson'));
  });

  it.each([
    ['head', 1.72],
    ['torso', 1.05],
    ['lower body', 0.22],
  ] as const)('10. covers the readable %s silhouette', (_part, y) => {
    const hit = segmentCapsuleHit(
      [-1, y, 5],
      [1, y, 5],
      0,
      5,
      HURT_CAPSULE_FOOT,
      ENEMY_HEIGHTS.lade,
      ENEMY_DEFINITIONS.lade.radius,
    );
    expect(hit).not.toBeNull();
  });

  it('11. rejects a shot immediately outside the hurt volume', () => {
    const radius = ENEMY_DEFINITIONS.melee.radius;
    expect(
      segmentCapsuleHit(
        [radius + 0.011, 1, 0],
        [radius + 0.011, 1, 8],
        0,
        4,
        HURT_CAPSULE_FOOT,
        ENEMY_HEIGHTS.melee,
        radius,
      ),
    ).toBeNull();
  });

  it('12. blocks damage when world cover is closer than the enemy', () => {
    const sim = combat(12);
    const [coverX, , coverZ] = sim.getSnapshot().pedestal.position;
    sim.debugSetPlayerPosition([coverX, 0, coverZ - 6]);
    const id = sim.debugSpawnEnemy('heavy', [coverX, 0, coverZ + 5]);
    const before = health(sim, id);
    fireOnce(sim, intentFor([coverX, 1, coverZ + 5], { origin: [coverX, 2.5, coverZ - 8] }));
    expect(health(sim, id)).toBe(before);
    expect(sim.getSnapshot().diagnostics.projectilesBlocked).toBe(1);
  });

  it('13. damages the enemy when it is closer than background geometry', () => {
    const sim = combat(13);
    const [coverX, , coverZ] = sim.getSnapshot().pedestal.position;
    sim.debugSetPlayerPosition([coverX, 0, coverZ - 7]);
    const id = sim.debugSpawnEnemy('heavy', [coverX, 0, coverZ - 3.5]);
    const before = health(sim, id);
    fireOnce(sim, intentFor([coverX, 1, coverZ - 3.5], { origin: [coverX, 2.5, coverZ - 9] }));
    expect(health(sim, id)).toBeLessThan(before ?? 0);
    expect(sim.getSnapshot().diagnostics.projectilesBlocked).toBe(0);
  });

  it('14. detects a capsule through a large swept displacement', () => {
    const hit = segmentCapsuleHit(
      [0, 1, -20],
      [0, 1, 20],
      0,
      0,
      HURT_CAPSULE_FOOT,
      ENEMY_HEIGHTS.melee,
      ENEMY_DEFINITIONS.melee.radius,
    );
    expect(hit?.t).toBeCloseTo((20 - ENEMY_DEFINITIONS.melee.radius) / 40, 3);
  });

  it('15. repeats the same outcome under low and uneven frame deltas', () => {
    const run = (deltas: readonly number[]) => {
      const sim = combat(15);
      const id = sim.debugSpawnEnemy('heavy', [0, 0, 20]);
      const shot = intentFor([0, 1.1, 20]);
      step(sim, { ...shot, fire: true });
      for (const delta of deltas) step(sim, { ...shot, fire: false }, delta);
      settle(sim, shot, 1);
      return { health: health(sim, id), hits: sim.getSnapshot().diagnostics.projectileHits };
    };
    expect(run([0.1, 0.037, 0.008])).toEqual(
      run([FIXED_DELTA, FIXED_DELTA, FIXED_DELTA, FIXED_DELTA, FIXED_DELTA, FIXED_DELTA]),
    );
  });

  it('16. applies damage exactly once per projectile', () => {
    const sim = combat(16);
    const id = sim.debugSpawnEnemy('heavy', [0, 0, 10]);
    const before = health(sim, id) ?? 0;
    fireOnce(sim, intentFor([0, 1, 10]), 0.5);
    const after = health(sim, id);
    settle(sim, intentFor([0, 1, 10]), 2);
    expect(health(sim, id)).toBe(after);
    expect(before - (after ?? before)).toBeGreaterThan(0);
    expect(sim.getSnapshot().events.filter((event) => event.type === 'hit')).toHaveLength(1);
  });

  it('17. locks dead enemies against damage and duplicate rewards', () => {
    const sim = combat(17);
    const id = sim.debugSpawnEnemy('melee', [0, 0, 7]);
    for (let index = 0; index < 6 && health(sim, id) !== null; index += 1) {
      const position = sim.getSnapshot().enemies.find((enemy) => enemy.id === id)?.position;
      if (position === undefined) break;
      fireOnce(sim, intentFor([position[0], 1, position[2]]), 0.16);
    }
    expect(health(sim, id)).toBeNull();
    const before = sim.getSnapshot();
    fireOnce(sim, intentFor([0, 1, 7]));
    const after = sim.getSnapshot();
    expect(after.diagnostics.enemiesDefeated).toBe(before.diagnostics.enemiesDefeated);
    expect(after.player.exp).toBe(before.player.exp);
  });

  it('18. cleans up a missed projectile at range', () => {
    const sim = combat(18);
    const shot = createInputIntent({
      aimRay: { origin: [4, 4, -6], direction: direction([4, 4, -6], [0, 8, 35]) },
    });
    fireOnce(sim, shot, 1.2);
    expect(sim.getSnapshot().diagnostics.activeProjectiles).toBe(0);
    expect(sim.getSnapshot().diagnostics.projectilesExpired).toBe(1);
  });

  it('19. freezes projectile and enemy simulation while paused', () => {
    const sim = combat(19);
    sim.debugSpawnEnemy('heavy', [0, 0, 20]);
    const shot = intentFor([0, 1, 20]);
    step(sim, { ...shot, fire: true });
    const before = sim.getSnapshot();
    sim.setPaused(true);
    expect(sim.advance(1, shot)).toBe(0);
    expect(sim.getSnapshot().projectiles).toEqual(before.projectiles);
    expect(sim.getSnapshot().enemies).toEqual(before.enemies);
  });

  it('20. clears projectile and collision state on retry', () => {
    const sim = combat(20);
    sim.setAimDebugEnabled(true);
    sim.debugSpawnEnemy('heavy', [0, 0, 20]);
    step(sim, { ...intentFor([0, 1, 20]), fire: true });
    expect(sim.getSnapshot().diagnostics.activeProjectiles).toBeGreaterThan(0);
    sim.restart(20);
    const snapshot = sim.getSnapshot();
    expect(snapshot.diagnostics.activeProjectiles).toBe(0);
    expect(snapshot.diagnostics.projectileHits).toBe(0);
    expect(snapshot.aimDebug?.selectedCollision).toBeNull();
    expect(snapshot.aimDebug?.projectileSegment).toBeNull();
  });

  it('21. covers Felagi Lade collision', () => {
    assertOneShotHit('lade', [0, 0, 10], 1.72);
  });

  it.each(['melee', 'ranged', 'heavy', 'elite'] as const)(
    '22. covers the %s placeholder-enemy collision',
    (role) => {
      assertOneShotHit(role, [0, 0, role === 'ranged' ? 10 : 8], 1.0);
    },
  );

  it('23. produces seeded-repeatable aim, collision, damage, and cleanup', () => {
    const run = () => {
      const sim = combat(23);
      const id = sim.debugSpawnEnemy('lade', [0, 0, 14]);
      fireOnce(sim, intentFor([0, 1.2, 14], { ads: true }));
      return {
        hash: sim.debugStateHash(),
        health: health(sim, id),
        diagnostics: sim.getSnapshot().diagnostics,
      };
    };
    expect(run()).toEqual(run());
  });

  it.each([
    ['body', 0.45, false],
    ['core', 1.45, true],
  ] as const)('24. converges third-person fire onto the boss %s', (_part, targetY, core) => {
    const sim = createGameSimulation(24);
    sim.setTestState('bossFight');
    const boss = sim.getSnapshot().boss;
    expect(boss).not.toBeNull();
    if (boss === null) return;
    sim.debugSetPlayerPosition([boss.position[0], 0, boss.position[2] - 12]);
    const before = sim.getSnapshot().boss;
    const target: Vec3 = [boss.position[0], targetY, boss.position[2]];
    fireOnce(
      sim,
      intentFor(target, {
        origin: [boss.position[0] + 4.1, 4.05, boss.position[2] - 18.6],
      }),
    );
    const after = sim.getSnapshot().boss;
    expect(after).not.toBeNull();
    if (before === null || after === null) return;
    expect(after.health).toBeLessThan(before.health);
    if (core) expect(after.coreHealth).toBeLessThan(before.coreHealth);
    else expect(after.coreHealth).toBe(before.coreHealth);
  });
});
