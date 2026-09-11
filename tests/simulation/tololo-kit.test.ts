import { describe, expect, it } from 'vitest';

import {
  TOLOLO,
  createGameSimulation,
  createInputIntent,
  experienceForLevel,
} from '../../src/game';

type Simulation = ReturnType<typeof createGameSimulation>;

const AIM_AHEAD = { aimPoint: [0, 0.8, 6] } as const;

function advanceFrames(simulation: Simulation, frames: number): void {
  for (let frame = 0; frame < frames; frame += 1) {
    simulation.advance(1 / 60, createInputIntent());
  }
}

function grantNextLevel(simulation: Simulation): void {
  const player = simulation.getSnapshot().player;
  simulation.debugGrantExperience(experienceForLevel(player.level + 1) - player.exp);
}

function skillEdge(simulation: Simulation, skill: 'skill1' | 'skill2' | 'ultimate'): void {
  const edge =
    skill === 'skill1'
      ? { skill1: true }
      : skill === 'skill2'
        ? { skill2: true }
        : { ultimate: true };
  simulation.advance(1 / 60, createInputIntent(edge));
  simulation.advance(1 / 60, createInputIntent());
}

function unlockAllSkills(simulation: Simulation): void {
  for (const skill of ['skill1', 'skill2', 'ultimate'] as const) {
    grantNextLevel(simulation);
    expect(simulation.chooseUpgrade(skill)).toBe(true);
  }
}

function playerProjectiles(simulation: Simulation, source: string): number {
  return simulation
    .getSnapshot()
    .projectiles.filter(
      (projectile) => projectile.owner === 'player' && projectile.source === source,
    ).length;
}

describe('Tololo starting loadout', () => {
  it('begins with a full AK-Alfa, an armed passive counter, and three locked skills', () => {
    const simulation = createGameSimulation(40);
    simulation.setTestState('combat');
    const player = simulation.getSnapshot().player;
    expect(player.ammo).toBe(TOLOLO.weapon.magazineSize);
    expect(player.magazineSize).toBe(TOLOLO.weapon.magazineSize);
    expect(player.lightspikeHits).toBe(0);
    expect(player.ownedSkills).toEqual({ skill1: 0, skill2: 0, ultimate: 0 });
    expect(player.skillCooldowns).toEqual({ skill1: 0, skill2: 0, ultimate: 0 });
  });
});

describe('skill unlock progression', () => {
  it('offers Skill 1, Skill 2, and Ultimate as priority unlocks at Levels 2, 3, and 4', () => {
    const simulation = createGameSimulation(41);
    simulation.setTestState('combat');
    const expected: Array<{ level: number; skill: 'skill1' | 'skill2' | 'ultimate' }> = [
      { level: 2, skill: 'skill1' },
      { level: 3, skill: 'skill2' },
      { level: 4, skill: 'ultimate' },
    ];
    for (const { level, skill } of expected) {
      grantNextLevel(simulation);
      const snapshot = simulation.getSnapshot();
      expect(snapshot.player.level).toBe(level);
      expect(snapshot.levelUp.cards.some((card) => card.id === skill && card.guaranteed)).toBe(
        true,
      );
      expect(snapshot.levelUp.cards.some((card) => card.category === 'weapon')).toBe(true);
      expect(simulation.chooseUpgrade(skill)).toBe(true);
    }
    expect(simulation.getSnapshot().player.ownedSkills).toEqual({
      skill1: 1,
      skill2: 1,
      ultimate: 1,
    });
  });

  it('holds Skill 2 and Ultimate back when an earlier skill is skipped', () => {
    const simulation = createGameSimulation(42);
    simulation.setTestState('combat');
    grantNextLevel(simulation);
    expect(simulation.chooseUpgrade('weaponDamage')).toBe(true);
    grantNextLevel(simulation);
    const snapshot = simulation.getSnapshot();
    expect(snapshot.player.level).toBe(3);
    expect(snapshot.levelUp.cards.some((card) => card.id === 'skill1' && card.guaranteed)).toBe(
      true,
    );
    expect(snapshot.levelUp.cards.some((card) => card.id === 'skill2')).toBe(false);
  });

  it('never offers an owned skill as a fresh guaranteed unlock', () => {
    const simulation = createGameSimulation(43);
    simulation.setTestState('combat');
    unlockAllSkills(simulation);
    grantNextLevel(simulation);
    const cards = simulation.getSnapshot().levelUp.cards;
    for (const card of cards) {
      if (card.id === 'skill1' || card.id === 'skill2' || card.id === 'ultimate') {
        expect(card.guaranteed).toBe(false);
      }
    }
    expect(new Set(cards.map((card) => card.id)).size).toBe(cards.length);
  });
});

describe('Hydro Barrage (Skill 1)', () => {
  it('fires a five-projectile fan from the muzzle and starts its cooldown', () => {
    const simulation = createGameSimulation(44);
    simulation.setTestState('combat');
    unlockAllSkills(simulation);
    const muzzle = simulation.getSnapshot().player.muzzle;
    simulation.advance(1 / 60, createInputIntent({ skill1: true, ...AIM_AHEAD }));
    expect(playerProjectiles(simulation, 'hydroBarrage')).toBe(5);
    for (const projectile of simulation
      .getSnapshot()
      .projectiles.filter((candidate) => candidate.source === 'hydroBarrage')) {
      expect(projectile.previousPosition).toEqual(muzzle);
    }
    simulation.advance(1 / 60, createInputIntent());
    expect(simulation.getSnapshot().player.skillCooldowns.skill1).toBeGreaterThan(0);
    expect(
      simulation.getSnapshot().events.some((event) => event.type === 'skill' && event.value === 1),
    ).toBe(true);
  });

  it('marks targets so follow-up weapon hits deal amplified damage', () => {
    const simulation = createGameSimulation(45);
    simulation.setTestState('combat');
    const enemyId = simulation.debugSpawnEnemy('elite', [0, 0, 6]);
    unlockAllSkills(simulation);
    simulation.advance(1 / 60, createInputIntent({ skill1: true, ...AIM_AHEAD }));
    simulation.advance(1 / 60, createInputIntent());
    advanceFrames(simulation, 10);
    // The mark flag itself is simulation-internal; its observable proof is the
    // amplified follow-up hit below.
    simulation.advance(1 / 60, createInputIntent({ ...AIM_AHEAD, fire: true }));
    advanceFrames(simulation, 10);
    const hit = simulation
      .getSnapshot()
      .events.filter((event) => event.type === 'hit' && event.subjectId === enemyId)
      .at(-1);
    const critical = simulation
      .getSnapshot()
      .events.some((event) => event.type === 'critical' && event.subjectId === enemyId);
    expect(hit?.value).toBeCloseTo(18 * 1.2 * (1 - 0.18) * (critical ? 1.5 : 1), 5);
  });

  it('refuses locked and cooling-down activations without side effects', () => {
    const simulation = createGameSimulation(46);
    simulation.setTestState('combat');
    skillEdge(simulation, 'skill1');
    expect(playerProjectiles(simulation, 'hydroBarrage')).toBe(0);
    expect(simulation.getSnapshot().events.some((event) => event.type === 'skill')).toBe(false);

    unlockAllSkills(simulation);
    skillEdge(simulation, 'skill1');
    const cooldown = simulation.getSnapshot().player.skillCooldowns.skill1;
    expect(cooldown).toBeGreaterThan(0);
    const before = playerProjectiles(simulation, 'hydroBarrage');
    skillEdge(simulation, 'skill1');
    expect(playerProjectiles(simulation, 'hydroBarrage')).toBe(before);
    expect(simulation.getSnapshot().player.skillCooldowns.skill1).toBeLessThanOrEqual(cooldown);
  });
});

describe('Tidal Step (Skill 2)', () => {
  it('pulses defense, staggers nearby hostiles, and starts its cooldown', () => {
    const simulation = createGameSimulation(47);
    simulation.setTestState('combat');
    const enemyId = simulation.debugSpawnEnemy('melee', [1, 0, 1]);
    unlockAllSkills(simulation);
    skillEdge(simulation, 'skill2');
    const snapshot = simulation.getSnapshot();
    expect(snapshot.player.damageReduction).toBeGreaterThan(0);
    expect(snapshot.player.invulnerability).toBeGreaterThan(0);
    expect(snapshot.player.skillCooldowns.skill2).toBeGreaterThan(0);
    expect(snapshot.enemies.find((enemy) => enemy.id === enemyId)?.stagger).toBeGreaterThan(0);
    expect(snapshot.events.some((event) => event.type === 'skill' && event.value === 2)).toBe(true);
  });

  it('does nothing while locked', () => {
    const simulation = createGameSimulation(48);
    simulation.setTestState('combat');
    skillEdge(simulation, 'skill2');
    const player = simulation.getSnapshot().player;
    expect(player.damageReduction).toBe(0);
    expect(player.invulnerability).toBe(0);
    expect(simulation.getSnapshot().events.some((event) => event.type === 'skill')).toBe(false);
  });
});

describe('Starfall Recursion (Ultimate)', () => {
  it('strikes every hostile and resets Skill 1 for the extra action', () => {
    const simulation = createGameSimulation(49);
    simulation.setTestState('combat');
    const first = simulation.debugSpawnEnemy('melee', [3, 0, 6]);
    const second = simulation.debugSpawnEnemy('melee', [-3, 0, 6]);
    unlockAllSkills(simulation);
    skillEdge(simulation, 'skill1');
    expect(simulation.getSnapshot().player.skillCooldowns.skill1).toBeGreaterThan(0);
    skillEdge(simulation, 'ultimate');
    const snapshot = simulation.getSnapshot();
    expect(snapshot.enemies.find((enemy) => enemy.id === first)?.health).toBeLessThan(70);
    expect(snapshot.enemies.find((enemy) => enemy.id === second)?.health).toBeLessThan(70);
    expect(snapshot.player.skillCooldowns.skill1).toBe(0);
    expect(snapshot.events.some((event) => event.type === 'skill' && event.value === 3)).toBe(true);
  });

  it('does nothing while locked', () => {
    const simulation = createGameSimulation(50);
    simulation.setTestState('combat');
    const enemyId = simulation.debugSpawnEnemy('melee', [3, 0, 6]);
    skillEdge(simulation, 'ultimate');
    expect(snapshotHealth(simulation, enemyId)).toBe(70);
    expect(simulation.getSnapshot().events.some((event) => event.type === 'skill')).toBe(false);
  });
});

function snapshotHealth(simulation: Simulation, enemyId: number): number | undefined {
  return simulation.getSnapshot().enemies.find((enemy) => enemy.id === enemyId)?.health;
}

describe('Lightspike passive', () => {
  function landWeaponHit(simulation: Simulation, enemyId: number): void {
    simulation.advance(1 / 60, createInputIntent({ ...AIM_AHEAD, fire: true }));
    advanceFrames(simulation, 10);
    expect(
      simulation
        .getSnapshot()
        .events.some((event) => event.type === 'hit' && event.subjectId === enemyId),
    ).toBe(true);
  }

  it('counts hits, forces a critical on the rhythm hit, and caps below the rhythm', () => {
    const simulation = createGameSimulation(51);
    simulation.setTestState('combat');
    // One elite outlives all six hits (6 x 27 max < 240) so every projectile
    // lands on the same target and the counter sequence is exact.
    const enemyId = simulation.debugSpawnEnemy('elite', [0, 0, 6]);
    const expected = [1, 2, 3, 4, 5, 0];
    for (let shot = 0; shot < 6; shot += 1) {
      landWeaponHit(simulation, enemyId);
      expect(simulation.getSnapshot().player.lightspikeHits).toBe(expected[shot]);
    }
    expect(
      simulation
        .getSnapshot()
        .events.some((event) => event.type === 'critical' && event.subjectId === enemyId),
    ).toBe(true);
  });

  it('persists the rhythm counter without expiry and freezes it while paused', () => {
    const simulation = createGameSimulation(52);
    simulation.setTestState('combat');
    const enemyId = simulation.debugSpawnEnemy('melee', [0, 0, 6]);
    landWeaponHit(simulation, enemyId);
    expect(simulation.getSnapshot().player.lightspikeHits).toBe(1);
    advanceFrames(simulation, 300);
    expect(simulation.getSnapshot().player.lightspikeHits).toBe(1);
    simulation.setPaused(true);
    advanceFrames(simulation, 120);
    expect(simulation.getSnapshot().player.lightspikeHits).toBe(1);
    simulation.setPaused(false);
  });

  it('resets exactly once on retry', () => {
    const simulation = createGameSimulation(53);
    simulation.setTestState('combat');
    const enemyId = simulation.debugSpawnEnemy('melee', [0, 0, 6]);
    landWeaponHit(simulation, enemyId);
    expect(simulation.getSnapshot().player.lightspikeHits).toBe(1);
    simulation.restart(53);
    simulation.setTestState('combat');
    expect(simulation.getSnapshot().player.lightspikeHits).toBe(0);
    expect(simulation.getSnapshot().player.ownedSkills).toEqual({
      skill1: 0,
      skill2: 0,
      ultimate: 0,
    });
  });
});

describe('weapon, attachment, and critical math', () => {
  function fireSingleHit(simulation: Simulation, enemyId: number) {
    simulation.advance(1 / 60, createInputIntent({ ...AIM_AHEAD, fire: true }));
    advanceFrames(simulation, 10);
    const snapshot = simulation.getSnapshot();
    const hit = snapshot.events
      .filter((event) => event.type === 'hit' && event.subjectId === enemyId)
      .at(-1);
    const critical = snapshot.events.some(
      (event) => event.type === 'critical' && event.subjectId === enemyId,
    );
    return { hit, critical };
  }

  function equipAttachment(
    simulation: Simulation,
    slot: 'muzzle' | 'underbarrel' | 'sight' | 'foregrip',
    type: 'flatAtk' | 'atkPercent' | 'critDamage',
    value: number,
  ): void {
    simulation.debugQueueAttachment({
      id: 9000 + value,
      weaponType: 'assaultRifle',
      slot,
      rarity: 1,
      affixes: [{ type, value }],
      source: 'ordinary',
    });
    expect(simulation.resolveAttachment('equip')).toBe(true);
  }

  it('deals base damage with a consistent critical relation', () => {
    const simulation = createGameSimulation(54);
    simulation.setTestState('combat');
    const enemyId = simulation.debugSpawnEnemy('melee', [0, 0, 6]);
    const { hit, critical } = fireSingleHit(simulation, enemyId);
    expect(hit?.value).toBeCloseTo(TOLOLO.weapon.damage * (critical ? 1.5 : 1), 5);
  });

  it('applies Flat ATK and ATK% attachments to weapon hits', () => {
    const flat = createGameSimulation(55);
    flat.setTestState('combat');
    equipAttachment(flat, 'muzzle', 'flatAtk', 5);
    const flatId = flat.debugSpawnEnemy('melee', [0, 0, 6]);
    const flatHit = fireSingleHit(flat, flatId);
    expect(flatHit.hit?.value).toBeCloseTo(
      (TOLOLO.weapon.damage + 5) * (flatHit.critical ? 1.5 : 1),
      5,
    );

    const percent = createGameSimulation(56);
    percent.setTestState('combat');
    equipAttachment(percent, 'underbarrel', 'atkPercent', 0.25);
    const percentId = percent.debugSpawnEnemy('melee', [0, 0, 6]);
    const percentHit = fireSingleHit(percent, percentId);
    expect(percentHit.hit?.value).toBeCloseTo(
      TOLOLO.weapon.damage * 1.25 * (percentHit.critical ? 1.5 : 1),
      5,
    );
  });

  it('raises the critical multiplier through Crit Damage attachments on rhythm hits', () => {
    const simulation = createGameSimulation(57);
    simulation.setTestState('combat');
    equipAttachment(simulation, 'sight', 'critDamage', 0.5);
    // Five non-rhythm hits can never kill the elite (5 x 46 < 240), so the
    // sixth hit always lands and the rhythm crit is observable.
    const enemyId = simulation.debugSpawnEnemy('elite', [0, 0, 6]);
    for (let shot = 0; shot < 6; shot += 1) {
      simulation.advance(1 / 60, createInputIntent({ ...AIM_AHEAD, fire: true }));
      advanceFrames(simulation, 10);
    }
    const snapshot = simulation.getSnapshot();
    expect(snapshot.player.lightspikeHits).toBe(0);
    const hit = snapshot.events
      .filter((event) => event.type === 'hit' && event.subjectId === enemyId)
      .at(-1);
    expect(
      snapshot.events.some((event) => event.type === 'critical' && event.subjectId === enemyId),
    ).toBe(true);
    expect(hit?.value).toBeCloseTo(TOLOLO.weapon.damage * 2.0 * (1 - 0.18), 5);
  });
});

describe('cooldown, pause, death, and retry lifecycle', () => {
  it('freezes skill cooldowns and reload while the level-up screen is open', () => {
    const simulation = createGameSimulation(58);
    simulation.setTestState('combat');
    unlockAllSkills(simulation);
    skillEdge(simulation, 'skill1');
    const cooldown = simulation.getSnapshot().player.skillCooldowns.skill1;
    expect(cooldown).toBeGreaterThan(0);
    grantNextLevel(simulation);
    expect(simulation.getSnapshot().paused).toBe(true);
    advanceFrames(simulation, 120);
    expect(simulation.getSnapshot().player.skillCooldowns.skill1).toBe(cooldown);
    expect(simulation.chooseUpgrade('weaponDamage')).toBe(true);
    advanceFrames(simulation, 60);
    expect(simulation.getSnapshot().player.skillCooldowns.skill1).toBeLessThan(cooldown);
  });

  it('completes cooldowns, locks abilities on death, and resets weapon state on retry', () => {
    const simulation = createGameSimulation(59);
    simulation.setTestState('combat');
    unlockAllSkills(simulation);
    skillEdge(simulation, 'skill1');
    advanceFrames(simulation, Math.ceil(7 * 60) + 5);
    expect(simulation.getSnapshot().player.skillCooldowns.skill1).toBe(0);

    simulation.debugDamagePlayer(9999);
    expect(simulation.getSnapshot().runState).toBe('dead');
    const ammo = simulation.getSnapshot().player.ammo;
    const skillEvents = simulation.getSnapshot().events.filter((event) => event.type === 'skill');
    skillEdge(simulation, 'skill2');
    simulation.advance(1 / 60, createInputIntent({ ...AIM_AHEAD, fire: true }));
    expect(simulation.getSnapshot().events.filter((event) => event.type === 'skill')).toEqual(
      skillEvents,
    );
    expect(simulation.getSnapshot().player.ammo).toBe(ammo);

    simulation.restart(59);
    const player = simulation.getSnapshot().player;
    expect(player.ammo).toBe(TOLOLO.weapon.magazineSize);
    expect(player.ownedSkills).toEqual({ skill1: 0, skill2: 0, ultimate: 0 });
    expect(player.skillCooldowns).toEqual({ skill1: 0, skill2: 0, ultimate: 0 });
    expect(player.lightspikeHits).toBe(0);
    expect(player.level).toBe(1);
  });

  it('reloads exactly to magazine size without duplicating ammunition', () => {
    const simulation = createGameSimulation(60);
    simulation.setTestState('combat');
    simulation.advance(1 / 60, createInputIntent({ ...AIM_AHEAD, fire: true }));
    advanceFrames(simulation, 10);
    expect(simulation.getSnapshot().player.ammo).toBe(TOLOLO.weapon.magazineSize - 1);
    simulation.advance(1 / 60, createInputIntent({ reload: true }));
    simulation.advance(1 / 60, createInputIntent());
    expect(simulation.getSnapshot().player.reloading).toBeGreaterThan(0);
    advanceFrames(simulation, Math.ceil(TOLOLO.weapon.reloadSeconds * 60) + 10);
    const player = simulation.getSnapshot().player;
    expect(player.ammo).toBe(TOLOLO.weapon.magazineSize);
    expect(player.reloading).toBe(0);
  });
});

describe('camera-independent kit behavior', () => {
  it('preserves unlocks, cooldowns, aim, and combat state across camera switches', () => {
    const simulation = createGameSimulation(61);
    simulation.setTestState('combat');
    const enemyId = simulation.debugSpawnEnemy('melee', [0, 0, 8]);
    unlockAllSkills(simulation);
    simulation.advance(1 / 60, createInputIntent({ skill1: true, aimPoint: [0, 0.8, 8] }));
    simulation.advance(1 / 60, createInputIntent());
    const before = simulation.getSnapshot();
    simulation.advance(1 / 60, createInputIntent({ switchCamera: true }));
    const after = simulation.getSnapshot();
    expect(after.cameraMode).toBe('topDown');
    expect(after.player.ownedSkills).toEqual(before.player.ownedSkills);
    // The switch step itself ticks once, so cooldowns advance by exactly one
    // fixed step instead of resetting: parity means no jump beyond that tick.
    expect(after.player.skillCooldowns.skill1).toBeCloseTo(
      before.player.skillCooldowns.skill1 - 1 / 60,
      9,
    );
    expect(after.player.skillCooldowns.skill2).toBe(before.player.skillCooldowns.skill2);
    expect(after.player.skillCooldowns.ultimate).toBe(before.player.skillCooldowns.ultimate);
    expect(after.player.position).toEqual(before.player.position);
    expect(after.player.facingYaw).toBe(before.player.facingYaw);
    expect(after.player.aimPitch).toBe(before.player.aimPitch);
    expect(after.enemies.find((enemy) => enemy.id === enemyId)?.health).toBe(
      before.enemies.find((enemy) => enemy.id === enemyId)?.health,
    );
    expect(after.projectiles.length).toBe(before.projectiles.length);
  });

  it('lets dodge and skill edges fire together for the extra-action rhythm', () => {
    const simulation = createGameSimulation(62);
    simulation.setTestState('combat');
    simulation.debugSpawnEnemy('melee', [0, 0, 6]);
    unlockAllSkills(simulation);
    simulation.advance(1 / 60, createInputIntent({ move: [1, 0], dodge: true, skill2: true }));
    simulation.advance(1 / 60, createInputIntent());
    const snapshot = simulation.getSnapshot();
    expect(snapshot.player.dodgeRemaining).toBeGreaterThan(0);
    expect(snapshot.events.some((event) => event.type === 'skill' && event.value === 2)).toBe(true);
  });

  it('replays identically under a fixed seed', () => {
    const script = (simulation: Simulation): string => {
      simulation.setTestState('combat');
      simulation.debugSpawnEnemy('melee', [0, 0, 6]);
      unlockAllSkills(simulation);
      simulation.advance(1 / 60, createInputIntent({ skill1: true, ...AIM_AHEAD }));
      simulation.advance(1 / 60, createInputIntent());
      advanceFrames(simulation, 30);
      simulation.advance(1 / 60, createInputIntent({ switchCamera: true }));
      advanceFrames(simulation, 30);
      return simulation.debugStateHash();
    };
    const first = createGameSimulation(63);
    const second = createGameSimulation(63);
    expect(script(first)).toBe(script(second));
    expect(JSON.stringify(first.getSnapshot())).toBe(JSON.stringify(second.getSnapshot()));
  });
});
