import { describe, expect, it } from 'vitest';

import { createGameSimulation, generateAttachment } from '../../src/game';

describe('Sardis, attachment resolution, and restart', () => {
  it('supports equip, replacement, retain, and salvage for compatible slots', () => {
    const simulation = createGameSimulation(31);
    simulation.setTestState('combat');
    const first = generateAttachment(1, 'assaultRifle', 1, 'muzzle');
    const replacement = { ...generateAttachment(2, 'assaultRifle', 2, 'muzzle'), id: 2 };

    simulation.debugQueueAttachment(first);
    expect(simulation.resolveAttachment('equip')).toBe(true);
    expect(simulation.getSnapshot().equipped.muzzle?.id).toBe(first.id);

    simulation.debugQueueAttachment(replacement);
    expect(simulation.resolveAttachment('retain')).toBe(true);
    expect(simulation.getSnapshot().equipped.muzzle?.id).toBe(first.id);

    simulation.debugQueueAttachment(replacement);
    expect(simulation.resolveAttachment('salvage')).toBe(true);
    expect(simulation.getSnapshot().player.sardis).toBe(24);
  });

  it('handles post-boss purchases and insufficient funds without mutation', () => {
    const simulation = createGameSimulation(32);
    simulation.setTestState('postBoss');
    simulation.debugDamagePlayer(40);
    simulation.debugSetSardis(200);
    const reward = generateAttachment(9, 'assaultRifle', 2, 'sight', 'boss');
    simulation.debugQueueAttachment(reward);

    expect(simulation.purchaseSardis('healing').ok).toBe(true);
    expect(simulation.getSnapshot().player.health).toBe(100);
    expect(simulation.purchaseSardis('attachmentReroll').ok).toBe(true);
    expect(simulation.getSnapshot().pendingAttachment?.source).toBe('reroll');
    expect(simulation.purchaseSardis('rarityUpgrade').ok).toBe(true);
    expect(simulation.getSnapshot().pendingAttachment?.rarity).toBe(3);
    expect(simulation.purchaseSardis('levelRerollToken').ok).toBe(true);
    expect(simulation.getSnapshot().player.rerollTokens).toBe(2);

    simulation.debugSetSardis(0);
    const before = simulation.getSnapshot().pendingAttachment;
    expect(simulation.purchaseSardis('rarityUpgrade').reason).toBe('insufficientFunds');
    expect(simulation.getSnapshot().pendingAttachment).toEqual(before);
  });

  it('fully resets entities, pools, economy, equipment, and IDs', () => {
    const simulation = createGameSimulation(33);
    simulation.setTestState('combat');
    simulation.debugSpawnEnemy('elite', [3, 0, 3]);
    simulation.debugSetSardis(999);
    simulation.debugQueueAttachment(generateAttachment(4, 'assaultRifle', 4, 'foregrip'));
    simulation.resolveAttachment('equip');

    simulation.restart(44);
    const restarted = simulation.getSnapshot();
    expect(restarted.tick).toBe(0);
    expect(restarted.enemies).toEqual([]);
    expect(restarted.projectiles).toEqual([]);
    expect(restarted.damageNumbers).toEqual([]);
    expect(restarted.pickups).toEqual([]);
    expect(restarted.pendingAttachment).toBeNull();
    expect(restarted.equipped).toEqual({});
    expect(restarted.player.sardis).toBe(0);
    expect(restarted.player.ownedSkills).toEqual({ skill1: 0, skill2: 0, ultimate: 0 });
    expect(restarted.diagnostics.seed).toBe(44);
    expect(simulation.debugSpawnEnemy('melee')).toBe(1);
  });
});
