import { describe, expect, it } from 'vitest';

import {
  AFFIX_TYPES,
  ATTACHMENT_SLOTS,
  TOLOLO,
  generateAttachment,
  getAffixCount,
  isAttachmentCompatible,
} from '../../src/game';

describe('data-driven representative content', () => {
  it('labels Tololo coefficients and the unvalidated model pipeline honestly', () => {
    expect(TOLOLO.balanceStatus).toBe('TEMPORARY');
    expect(TOLOLO.modelStatus).toBe('asset-pipeline-not-validated');
    expect(TOLOLO.weapon.name).toBe('AK-Alfa');
    expect(TOLOLO.weapon.automatic).toBe(true);
  });

  it('defines the exact attachment compatibility matrix', () => {
    expect(ATTACHMENT_SLOTS.assaultRifle).toEqual(['muzzle', 'underbarrel', 'sight', 'foregrip']);
    expect(ATTACHMENT_SLOTS.machineGun).toEqual(['muzzle', 'underbarrel', 'sight', 'bipod']);
    expect(ATTACHMENT_SLOTS.rifle).toEqual(['muzzle', 'underbarrel', 'sight', 'bipod']);
    expect(ATTACHMENT_SLOTS.shotgun).toEqual(['muzzle', 'sight', 'latch', 'link']);
    expect(isAttachmentCompatible('assaultRifle', 'foregrip')).toBe(true);
    expect(isAttachmentCompatible('assaultRifle', 'latch')).toBe(false);
  });

  it('rolls exactly one through four unique approved affixes by rarity', () => {
    for (const rarity of [1, 2, 3, 4] as const) {
      const attachment = generateAttachment(100 + rarity, 'assaultRifle', rarity);
      const types = attachment.affixes.map((affix) => affix.type);
      expect(attachment.affixes).toHaveLength(getAffixCount(rarity));
      expect(new Set(types).size).toBe(rarity);
      expect(types.every((type) => AFFIX_TYPES.includes(type))).toBe(true);
    }
  });

  it('produces the same attachment from the same seed', () => {
    expect(generateAttachment(77, 'shotgun', 4)).toEqual(generateAttachment(77, 'shotgun', 4));
  });
});
