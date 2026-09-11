import { describe, expect, it } from 'vitest';

import {
  FIXED_DELTA,
  createGameSimulation,
  createInputIntent,
  experienceForLevel,
} from '../../src/game';

type Simulation = ReturnType<typeof createGameSimulation>;

const IDLE = () => createInputIntent();
const LADE_DAMAGE = 13;
const LADE_TELEGRAPH = 0.7;

function ladeOf(simulation: Simulation, id: number) {
  const enemy = simulation.getSnapshot().enemies.find((candidate) => candidate.id === id);
  if (!enemy) throw new Error(`Lade ${id} is missing from the snapshot.`);
  return enemy;
}

/** Advance until the Lade starts its telegraph (spawn cooldowns are seeded). */
function awaitTelegraph(simulation: Simulation, id: number, maxSteps = 120): void {
  for (let step = 0; step < maxSteps; step += 1) {
    if (ladeOf(simulation, id).telegraph > 0) return;
    simulation.advance(FIXED_DELTA, IDLE());
  }
  throw new Error('Lade never started its telegraph.');
}

function advance(simulation: Simulation, frames: number): void {
  for (let frame = 0; frame < frames; frame += 1) simulation.advance(FIXED_DELTA, IDLE());
}

function grantLevels(simulation: Simulation, count: number): void {
  for (let level = 0; level < count; level += 1) {
    const player = simulation.getSnapshot().player;
    simulation.debugGrantExperience(experienceForLevel(player.level + 1) - player.exp);
  }
}

/** Level-ups pause for card picks, so each grant must be followed by its pick. */
function grantAndChoose(simulation: Simulation, skill: 'skill1' | 'skill2' | 'ultimate'): void {
  grantLevels(simulation, 1);
  expect(simulation.chooseUpgrade(skill)).toBe(true);
}

function fireAt(simulation: Simulation, target: readonly [number, number, number]): void {
  simulation.advance(FIXED_DELTA, createInputIntent({ fire: true, aimPoint: target, ads: true }));
}

function killLade(simulation: Simulation, id: number): void {
  for (let frame = 0; frame < 900; frame += 1) {
    const target = simulation.getSnapshot().enemies.find((enemy) => enemy.id === id);
    if (!target) return;
    fireAt(simulation, [target.position[0], 0.8, target.position[2]]);
  }
  throw new Error('Lade survived 900 frames of aimed fire.');
}

describe('Felagi · Lade spawn and pursuit', () => {
  it('clamps debug spawns to the arena and keeps directed spawns off the player', () => {
    const simulation = createGameSimulation(21);
    simulation.setTestState('combat');
    const id = simulation.debugSpawnEnemy('lade', [100, 0, -100]);
    const spawned = ladeOf(simulation, id);
    expect(Math.abs(spawned.position[0])).toBeLessThanOrEqual(45);
    expect(Math.abs(spawned.position[2])).toBeLessThanOrEqual(45);

    const directed = createGameSimulation(22);
    advance(directed, 60);
    const first = directed.getSnapshot().enemies[0];
    expect(first).toBeDefined();
    const distance = Math.hypot(first?.position[0] ?? 0, first?.position[2] ?? 0);
    expect(distance).toBeGreaterThanOrEqual(11);
    expect(distance).toBeLessThanOrEqual(19);
  });

  it('acquires the player and pursues without jitter', () => {
    const simulation = createGameSimulation(23);
    simulation.setTestState('combat');
    const id = simulation.debugSpawnEnemy('lade', [10, 0, 0]);
    const start = ladeOf(simulation, id);
    const startDistance = Math.hypot(start.position[0], start.position[2]);
    advance(simulation, 30);
    const moved = ladeOf(simulation, id);
    const movedDistance = Math.hypot(moved.position[0], moved.position[2]);
    expect(movedDistance).toBeLessThan(startDistance - 1);
    const direction = [
      moved.position[0] - start.position[0],
      moved.position[2] - start.position[2],
    ];
    const length = Math.hypot(direction[0] ?? 0, direction[1] ?? 0) || 1;
    expect(((direction[0] ?? 0) / length) * -1).toBeGreaterThan(0.9);
  });

  it('stays inside the arena bounds', () => {
    const simulation = createGameSimulation(24);
    simulation.setTestState('combat');
    simulation.debugSetPlayerPosition([44, 0, 44]);
    simulation.debugSpawnEnemy('lade', [40, 0, 40]);
    advance(simulation, 240);
    for (const enemy of simulation.getSnapshot().enemies) {
      expect(Math.abs(enemy.position[0])).toBeLessThanOrEqual(45);
      expect(Math.abs(enemy.position[2])).toBeLessThanOrEqual(45);
    }
  });

  it('separates nearby enemies instead of stacking onto one target', () => {
    const simulation = createGameSimulation(25);
    simulation.setTestState('combat');
    simulation.debugSpawnEnemy('lade', [8, 0, 0]);
    simulation.debugSpawnEnemy('lade', [8.5, 0, 0.3]);
    const before = simulation.getSnapshot().enemies;
    const startGap = Math.hypot(
      (before[0]?.position[0] ?? 0) - (before[1]?.position[0] ?? 0),
      (before[0]?.position[2] ?? 0) - (before[1]?.position[2] ?? 0),
    );
    advance(simulation, 60);
    const [first, second] = simulation.getSnapshot().enemies;
    const gap = Math.hypot(
      (first?.position[0] ?? 0) - (second?.position[0] ?? 0),
      (first?.position[2] ?? 0) - (second?.position[2] ?? 0),
    );
    expect(gap).toBeGreaterThan(0.2);
    expect(gap).toBeGreaterThanOrEqual(startGap * 0.5);
  });
});

describe('Felagi · Lade telegraphed attack', () => {
  it('winds up for the provisional duration with a ladeSlash label', () => {
    const simulation = createGameSimulation(26);
    simulation.setTestState('combat');
    const id = simulation.debugSpawnEnemy('lade', [0, 0, 1]);
    awaitTelegraph(simulation, id);
    const winding = ladeOf(simulation, id);
    expect(winding.attackKind).toBe('ladeSlash');
    expect(winding.telegraph).toBeGreaterThan(0);
    expect(winding.telegraph).toBeLessThanOrEqual(LADE_TELEGRAPH);
  });

  it('deals no damage before the telegraphed damage frame', () => {
    const simulation = createGameSimulation(27);
    simulation.setTestState('combat');
    const id = simulation.debugSpawnEnemy('lade', [0, 0, 1]);
    awaitTelegraph(simulation, id);
    advance(simulation, 20);
    expect(simulation.getSnapshot().player.health).toBe(100);
    expect(
      simulation.getSnapshot().events.filter((event) => event.type === 'playerDamaged'),
    ).toHaveLength(0);
  });

  it('applies the deterministic damage exactly once, then recovers', () => {
    const simulation = createGameSimulation(28);
    simulation.setTestState('combat');
    const id = simulation.debugSpawnEnemy('lade', [0, 0, 1]);
    awaitTelegraph(simulation, id);
    advance(simulation, 60);
    expect(simulation.getSnapshot().player.health).toBe(100 - LADE_DAMAGE);
    expect(
      simulation.getSnapshot().events.filter((event) => event.type === 'playerDamaged'),
    ).toHaveLength(1);
    const decisions = simulation.getSnapshot().diagnostics;
    expect(decisions.activeEnemies).toBe(1);
  });

  it('holds a recovery window before it can threaten again', () => {
    const simulation = createGameSimulation(29);
    simulation.setTestState('combat');
    const id = simulation.debugSpawnEnemy('lade', [0, 0, 1]);
    awaitTelegraph(simulation, id);
    advance(simulation, 60);
    const recovering = ladeOf(simulation, id);
    expect(recovering.telegraph).toBeCloseTo(0, 9);
    advance(simulation, 60);
    expect(
      simulation.getSnapshot().events.filter((event) => event.type === 'playerDamaged'),
    ).toHaveLength(1);
  });

  it('stagger freezes anticipation and blocks the attack while it lasts', () => {
    const simulation = createGameSimulation(30);
    simulation.setTestState('combat');
    grantAndChoose(simulation, 'skill1');
    grantAndChoose(simulation, 'skill2');
    const id = simulation.debugSpawnEnemy('lade', [0, 0, 1]);
    awaitTelegraph(simulation, id);
    simulation.advance(FIXED_DELTA, createInputIntent({ skill2: true }));
    const staggered = ladeOf(simulation, id);
    expect(staggered.stagger).toBeGreaterThan(0);
    const frozenTelegraph = staggered.telegraph;
    advance(simulation, 10);
    expect(ladeOf(simulation, id).telegraph).toBe(frozenTelegraph);
    expect(
      simulation.getSnapshot().events.filter((event) => event.type === 'playerDamaged'),
    ).toHaveLength(0);
  });
});

describe('Felagi · Lade death, rewards, and lifecycle', () => {
  it('locks death, grants XP and Sardis exactly once, and disposes', () => {
    const simulation = createGameSimulation(31);
    simulation.setTestState('combat');
    const before = simulation.getSnapshot();
    const id = simulation.debugSpawnEnemy('lade', [0, 0, 6]);
    killLade(simulation, id);
    const after = simulation.getSnapshot();
    expect(after.enemies.find((enemy) => enemy.id === id)).toBeUndefined();
    expect(after.player.exp).toBe(before.player.exp + 30);
    // Sardis drops as a pickup at the death position and may already be
    // collected if Lade died close; either way it must total exactly 5.
    const drops = after.pickups.filter((pickup) => pickup.type === 'sardis');
    expect(drops.length).toBeLessThanOrEqual(1);
    const droppedSum = drops.reduce((sum, pickup) => sum + pickup.amount, 0);
    expect(after.player.sardis - before.player.sardis + droppedSum).toBe(5);
    if (drops[0] !== undefined) {
      simulation.debugSetPlayerPosition([drops[0].position[0], 0, drops[0].position[2]]);
      advance(simulation, 5);
    }
    expect(simulation.getSnapshot().player.sardis).toBe(before.player.sardis + 5);
    expect(
      simulation.getSnapshot().pickups.filter((pickup) => pickup.type === 'sardis'),
    ).toHaveLength(0);
    expect(after.diagnostics.enemiesDefeated).toBe(1);
    expect(after.diagnostics.enemiesDisposed).toBe(1);
    advance(simulation, 120);
    const settled = simulation.getSnapshot();
    expect(settled.player.exp).toBe(after.player.exp);
    expect(settled.player.sardis).toBe(before.player.sardis + 5);
    expect(settled.diagnostics.enemiesDefeated).toBe(1);
  });

  it('stops attacking after death', () => {
    const simulation = createGameSimulation(32);
    simulation.setTestState('combat');
    const id = simulation.debugSpawnEnemy('lade', [0, 0, 1]);
    awaitTelegraph(simulation, id);
    advance(simulation, 60);
    const hits = simulation
      .getSnapshot()
      .events.filter((event) => event.type === 'playerDamaged').length;
    expect(hits).toBe(1);
    killLade(simulation, id);
    advance(simulation, 180);
    expect(
      simulation.getSnapshot().events.filter((event) => event.type === 'playerDamaged').length,
    ).toBe(hits);
  });

  it('freezes under pause and level-up, and resets on retry', () => {
    const simulation = createGameSimulation(33);
    simulation.setTestState('combat');
    const id = simulation.debugSpawnEnemy('lade', [0, 0, 1]);
    awaitTelegraph(simulation, id);
    const winding = ladeOf(simulation, id).telegraph;
    expect(winding).toBeGreaterThan(0);
    simulation.setPaused(true);
    advance(simulation, 30);
    expect(ladeOf(simulation, id).telegraph).toBe(winding);
    simulation.setPaused(false);
    simulation.debugGrantExperience(
      experienceForLevel(simulation.getSnapshot().player.level + 1) -
        simulation.getSnapshot().player.exp,
    );
    advance(simulation, 30);
    expect(ladeOf(simulation, id).telegraph).toBe(winding);
    simulation.restart(33);
    const reset = simulation.getSnapshot();
    expect(reset.enemies).toHaveLength(0);
    expect(reset.diagnostics.enemiesSpawned).toBe(0);
    expect(reset.diagnostics.enemiesDefeated).toBe(0);
    expect(reset.diagnostics.enemiesDisposed).toBe(0);
  });

  it('reaches identical outcomes in both camera modes', () => {
    const third = createGameSimulation(34);
    const top = createGameSimulation(34);
    for (const simulation of [third, top]) simulation.setTestState('combat');
    const first = third.debugSpawnEnemy('lade', [0, 0, 4]);
    const second = top.debugSpawnEnemy('lade', [0, 0, 4]);
    expect(first).toBe(second);
    top.advance(FIXED_DELTA, createInputIntent({ switchCamera: true }));
    expect(top.getSnapshot().cameraMode).toBe('topDown');
    for (let frame = 0; frame < 90; frame += 1) {
      const intent = createInputIntent({ fire: frame % 3 === 0, aimPoint: [0, 0.8, 4] });
      third.advance(FIXED_DELTA, intent);
      top.advance(FIXED_DELTA, intent);
    }
    const thirdEnemies = third.getSnapshot().enemies;
    const topEnemies = top.getSnapshot().enemies;
    expect(topEnemies).toEqual(thirdEnemies);
    expect(top.getSnapshot().player.health).toBe(third.getSnapshot().player.health);
  });

  it('repeats identically under the same seed', () => {
    const first = createGameSimulation(35);
    const second = createGameSimulation(35);
    for (const simulation of [first, second]) {
      simulation.setTestState('combat');
      simulation.debugSpawnEnemy('lade', [5, 0, -3]);
      advance(simulation, 120);
    }
    expect(second.getSnapshot().enemies).toEqual(first.getSnapshot().enemies);
  });
});

describe('Felagi · Lade against the Tololo kit', () => {
  it('takes AK-Alfa fire with Lightspike rhythm and Hydro marks', () => {
    const simulation = createGameSimulation(36);
    simulation.setTestState('combat');
    grantLevels(simulation, 1);
    expect(simulation.chooseUpgrade('skill1')).toBe(true);
    const id = simulation.debugSpawnEnemy('lade', [0, 0, 6]);
    const maxHealth = ladeOf(simulation, id).maxHealth;
    fireAt(simulation, [0, 0.8, 6]);
    advance(simulation, 10);
    expect(ladeOf(simulation, id).health).toBeLessThan(maxHealth);
    expect(simulation.getSnapshot().events.some((event) => event.type === 'hit')).toBe(true);
    simulation.advance(FIXED_DELTA, createInputIntent({ skill1: true }));
    const hydro = simulation
      .getSnapshot()
      .projectiles.filter(
        (projectile) => projectile.owner === 'player' && projectile.source === 'hydroBarrage',
      );
    expect(hydro).toHaveLength(5);
  });

  it('honors Tidal Step stagger, damage reduction, and invulnerability', () => {
    const simulation = createGameSimulation(37);
    simulation.setTestState('combat');
    grantAndChoose(simulation, 'skill1');
    grantAndChoose(simulation, 'skill2');
    simulation.debugSpawnEnemy('lade', [0, 0, 1]);
    simulation.advance(FIXED_DELTA, createInputIntent({ skill2: true }));
    const buffed = simulation.getSnapshot();
    expect(buffed.player.skillCooldowns.skill2).toBeGreaterThan(0);
    expect(simulation.debugDamagePlayer(20)).toBe(false);
    simulation.advance(FIXED_DELTA, IDLE());
    for (let frame = 0; frame < 20; frame += 1) simulation.advance(FIXED_DELTA, IDLE());
    expect(simulation.debugDamagePlayer(20)).toBe(true);
    expect(simulation.getSnapshot().player.health).toBe(100 - 20 * (1 - Math.min(0.7, 0.35)));
  });

  it('takes Starfall Recursion damage', () => {
    const simulation = createGameSimulation(38);
    simulation.setTestState('combat');
    grantAndChoose(simulation, 'skill1');
    grantAndChoose(simulation, 'skill2');
    grantAndChoose(simulation, 'ultimate');
    const id = simulation.debugSpawnEnemy('lade', [0, 0, 6]);
    const maxHealth = ladeOf(simulation, id).maxHealth;
    simulation.advance(FIXED_DELTA, createInputIntent({ ultimate: true }));
    expect(ladeOf(simulation, id).health).toBeLessThan(maxHealth);
  });

  it('interacts with equipped attachments and dodge invulnerability', () => {
    const simulation = createGameSimulation(39);
    simulation.setTestState('combat');
    const attachment = simulation.debugGenerateAttachment(2, 'boss');
    simulation.debugQueueAttachment(attachment);
    expect(simulation.resolveAttachment('equip')).toBe(true);
    simulation.debugSpawnEnemy('lade', [0, 0, 6]);
    fireAt(simulation, [0, 0.8, 6]);
    advance(simulation, 10);
    expect(simulation.getSnapshot().events.some((event) => event.type === 'hit')).toBe(true);
    const dodging = createGameSimulation(40);
    dodging.setTestState('combat');
    const dodgingId = dodging.debugSpawnEnemy('lade', [0, 0, 1]);
    for (let step = 0; step < 120; step += 1) {
      const telegraph = ladeOf(dodging, dodgingId).telegraph;
      if (telegraph > 0 && telegraph <= 0.1) break;
      dodging.advance(FIXED_DELTA, IDLE());
    }
    expect(ladeOf(dodging, dodgingId).telegraph).toBeGreaterThan(0);
    dodging.advance(FIXED_DELTA, createInputIntent({ move: [0, 1], dodge: true }));
    advance(dodging, 10);
    expect(dodging.getSnapshot().player.health).toBe(100);
  });
});
