import { SeededRng } from '../core/rng';
import type {
  AffixSnapshot,
  AffixType,
  AttachmentRarity,
  AttachmentSlot,
  AttachmentSnapshot,
  WeaponType,
} from '../types';
import { AFFIX_TYPES, ATTACHMENT_SLOTS } from './definitions';

const AFFIX_RANGES: Readonly<Record<AffixType, readonly [number, number]>> = {
  flatAtk: [2, 8],
  atkPercent: [0.03, 0.12],
  critRate: [0.015, 0.07],
  critDamage: [0.05, 0.2],
};

export function generateAttachmentWithRng(
  rng: SeededRng,
  id: number,
  weaponType: WeaponType,
  rarity: AttachmentRarity,
  source: AttachmentSnapshot['source'],
  forcedSlot: AttachmentSlot | null = null,
): AttachmentSnapshot {
  const slots = ATTACHMENT_SLOTS[weaponType];
  const slot =
    forcedSlot !== null && slots.includes(forcedSlot) ? forcedSlot : slots[rng.int(slots.length)];
  if (slot === undefined) throw new Error(`Weapon type ${weaponType} has no attachment slots.`);

  const available: AffixType[] = [...AFFIX_TYPES];
  const affixes: AffixSnapshot[] = [];
  for (let index = 0; index < rarity; index += 1) {
    const pick = rng.int(available.length);
    const type = available[pick];
    if (type === undefined) throw new Error('Attachment affix generation exhausted its pool.');
    available.splice(pick, 1);
    const range = AFFIX_RANGES[type];
    const rarityScale = 1 + (rarity - 1) * 0.2;
    affixes.push({ type, value: round4(rng.range(range[0], range[1]) * rarityScale) });
  }

  return { id, weaponType, slot, rarity, affixes, source };
}

export function generateAttachment(
  seed: number,
  weaponType: WeaponType,
  rarity: AttachmentRarity,
  slot: AttachmentSlot | null = null,
  source: AttachmentSnapshot['source'] = 'ordinary',
): AttachmentSnapshot {
  return generateAttachmentWithRng(new SeededRng(seed), 1, weaponType, rarity, source, slot);
}

function round4(value: number): number {
  return Math.round(value * 10_000) / 10_000;
}
