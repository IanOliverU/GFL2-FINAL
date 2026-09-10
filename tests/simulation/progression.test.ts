import { describe, expect, it } from 'vitest';

import { createGameSimulation, experienceForLevel } from '../../src/game';

function grantNextLevel(simulation: ReturnType<typeof createGameSimulation>): void {
  const player = simulation.getSnapshot().player;
  simulation.debugGrantExperience(experienceForLevel(player.level + 1) - player.exp);
}

describe('experience and three-card progression', () => {
  it('uses cumulative deterministic thresholds', () => {
    expect(experienceForLevel(1)).toBe(0);
    expect(experienceForLevel(2)).toBe(60);
    expect(experienceForLevel(3)).toBe(180);
    expect(experienceForLevel(4)).toBe(360);
  });

  it('guarantees Skill 1, then Skill 2, then Ultimate at levels 2/3/4', () => {
    const simulation = createGameSimulation(12);
    simulation.setTestState('combat');

    grantNextLevel(simulation);
    let snapshot = simulation.getSnapshot();
    expect(snapshot.paused).toBe(true);
    expect(snapshot.levelUp.cards).toHaveLength(3);
    expect(snapshot.levelUp.cards.some((card) => card.id === 'skill1' && card.guaranteed)).toBe(
      true,
    );
    expect(snapshot.levelUp.cards.some((card) => card.category === 'weapon')).toBe(true);
    expect(simulation.chooseUpgrade('skill1')).toBe(true);

    grantNextLevel(simulation);
    snapshot = simulation.getSnapshot();
    expect(snapshot.levelUp.cards.some((card) => card.id === 'skill2' && card.guaranteed)).toBe(
      true,
    );
    expect(simulation.chooseUpgrade('skill2')).toBe(true);

    grantNextLevel(simulation);
    snapshot = simulation.getSnapshot();
    expect(snapshot.levelUp.cards.some((card) => card.id === 'ultimate' && card.guaranteed)).toBe(
      true,
    );
    expect(simulation.chooseUpgrade('ultimate')).toBe(true);
    expect(simulation.getSnapshot().player.ownedSkills).toEqual({
      skill1: 1,
      skill2: 1,
      ultimate: 1,
    });
  });

  it('keeps a skipped core skill guaranteed, enforces caps, and preserves a weapon alternative', () => {
    const simulation = createGameSimulation(19);
    simulation.setTestState('combat');

    for (let rank = 0; rank < 5; rank += 1) {
      grantNextLevel(simulation);
      const cards = simulation.getSnapshot().levelUp.cards;
      expect(cards.some((card) => card.id === 'skill1' && card.guaranteed)).toBe(true);
      expect(cards.some((card) => card.id === 'weaponDamage')).toBe(true);
      expect(simulation.chooseUpgrade('weaponDamage')).toBe(true);
    }

    grantNextLevel(simulation);
    const cards = simulation.getSnapshot().levelUp.cards;
    expect(cards.some((card) => card.id === 'weaponDamage')).toBe(false);
    expect(cards.some((card) => card.category === 'weapon')).toBe(true);
    expect(new Set(cards.map((card) => card.id)).size).toBe(3);
  });

  it('spends limited reroll tokens without removing mandatory choices', () => {
    const simulation = createGameSimulation(21);
    simulation.setTestState('levelUp');

    expect(simulation.rerollUpgrades()).toBe(true);
    const snapshot = simulation.getSnapshot();
    expect(snapshot.player.rerollTokens).toBe(0);
    expect(snapshot.levelUp.rerollsRemaining).toBe(0);
    expect(snapshot.levelUp.cards.some((card) => card.id === 'skill1' && card.guaranteed)).toBe(
      true,
    );
    expect(snapshot.levelUp.cards.some((card) => card.category === 'weapon')).toBe(true);
    expect(simulation.rerollUpgrades()).toBe(false);
  });
});
