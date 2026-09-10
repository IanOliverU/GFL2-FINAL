import type {
  AffixType,
  AttachmentRarity,
  AttachmentSlot,
  EnemyDefinition,
  EnemyRole,
  SardisPurchase,
  TololoDefinition,
  UpgradeDefinition,
  WeaponType,
} from '../types';

// All numeric gameplay coefficients in this one-shot table are TEMPORARY pending director balance review.
export const TOLOLO: TololoDefinition = {
  id: 'tololo',
  name: 'Tololo',
  modelStatus: 'asset-pipeline-not-validated',
  balanceStatus: 'TEMPORARY',
  weapon: {
    id: 'ak-alfa',
    name: 'AK-Alfa',
    type: 'assaultRifle',
    automatic: true,
    damage: 18,
    roundsPerSecond: 9,
    magazineSize: 30,
    reloadSeconds: 1.8,
    spreadRadians: 0.035,
    adsSpreadMultiplier: 0.42,
    recoilPerShot: 0.12,
    range: 38,
    projectileSpeed: 72,
  },
  passive: {
    id: 'lightspike',
    name: 'Lightspike',
    guaranteedCritEveryHits: 6,
  },
  skills: {
    skill1: {
      id: 'skill1',
      name: 'Hydro Barrage',
      cooldown: 7,
      description: 'Fire a Hydro burst that marks targets for amplified follow-up damage.',
    },
    skill2: {
      id: 'skill2',
      name: 'Tidal Step',
      cooldown: 11,
      description: 'Pulse defensive Hydro energy and gain movement speed and damage reduction.',
    },
    ultimate: {
      id: 'ultimate',
      name: 'Starfall Recursion',
      cooldown: 28,
      description: 'Call down starfall and immediately enable an extra-action follow-up.',
    },
  },
};

export const ENEMY_DEFINITIONS: Readonly<Record<EnemyRole, EnemyDefinition>> = {
  melee: {
    role: 'melee',
    health: 70,
    speed: 3.4,
    radius: 0.55,
    damage: 12,
    attackRange: 1.5,
    telegraphSeconds: 0.55,
    attackCooldown: 1.5,
    exp: 22,
    sardis: 3,
    armor: 0,
  },
  flanker: {
    role: 'flanker',
    health: 48,
    speed: 5.1,
    radius: 0.45,
    damage: 9,
    attackRange: 1.25,
    telegraphSeconds: 0.35,
    attackCooldown: 1.1,
    exp: 20,
    sardis: 3,
    armor: 0,
  },
  ranged: {
    role: 'ranged',
    health: 58,
    speed: 2.5,
    radius: 0.5,
    damage: 10,
    attackRange: 13,
    telegraphSeconds: 0.75,
    attackCooldown: 2.2,
    exp: 26,
    sardis: 4,
    armor: 0,
  },
  heavy: {
    role: 'heavy',
    health: 165,
    speed: 1.75,
    radius: 0.8,
    damage: 20,
    attackRange: 2,
    telegraphSeconds: 0.9,
    attackCooldown: 2.6,
    exp: 54,
    sardis: 8,
    armor: 0.28,
  },
  elite: {
    role: 'elite',
    health: 240,
    speed: 3,
    radius: 0.85,
    damage: 24,
    attackRange: 8,
    telegraphSeconds: 0.8,
    attackCooldown: 1.8,
    exp: 100,
    sardis: 18,
    armor: 0.18,
  },
};

export const UPGRADE_DEFINITIONS: readonly UpgradeDefinition[] = [
  {
    id: 'skill1',
    category: 'coreSkill',
    name: 'Hydro Barrage',
    maxRank: 5,
    description: 'Unlock or improve Skill 1.',
    skillId: 'skill1',
  },
  {
    id: 'skill2',
    category: 'coreSkill',
    name: 'Tidal Step',
    maxRank: 5,
    description: 'Unlock or improve Skill 2.',
    skillId: 'skill2',
  },
  {
    id: 'ultimate',
    category: 'coreSkill',
    name: 'Starfall Recursion',
    maxRank: 5,
    description: 'Unlock or improve the Ultimate.',
    skillId: 'ultimate',
  },
  {
    id: 'weaponDamage',
    category: 'weapon',
    name: 'AK-Alfa Calibration',
    maxRank: 5,
    description: 'Increase weapon damage.',
    skillId: null,
  },
  {
    id: 'weaponCadence',
    category: 'weapon',
    name: 'AK-Alfa Gas Tuning',
    maxRank: 5,
    description: 'Increase automatic fire cadence.',
    skillId: null,
  },
  {
    id: 'lightspike',
    category: 'passive',
    name: 'Lightspike Rhythm',
    maxRank: 5,
    description: 'Improve critical rhythm.',
    skillId: null,
  },
  {
    id: 'movement',
    category: 'movement',
    name: 'Mobile Frame',
    maxRank: 3,
    description: 'Increase movement speed.',
    skillId: null,
  },
  {
    id: 'defense',
    category: 'defense',
    name: 'Defensive Weave',
    maxRank: 3,
    description: 'Increase maximum health.',
    skillId: null,
  },
  {
    id: 'reload',
    category: 'reload',
    name: 'Fast Magazine',
    maxRank: 3,
    description: 'Reduce reload time.',
    skillId: null,
  },
  {
    id: 'cooldown',
    category: 'cooldown',
    name: 'Action Recursion',
    maxRank: 3,
    description: 'Reduce skill cooldowns.',
    skillId: null,
  },
] as const;

export const ATTACHMENT_SLOTS: Readonly<Record<WeaponType, readonly AttachmentSlot[]>> = {
  assaultRifle: ['muzzle', 'underbarrel', 'sight', 'foregrip'],
  machineGun: ['muzzle', 'underbarrel', 'sight', 'bipod'],
  rifle: ['muzzle', 'underbarrel', 'sight', 'bipod'],
  shotgun: ['muzzle', 'sight', 'latch', 'link'],
};

export const AFFIX_TYPES: readonly AffixType[] = [
  'flatAtk',
  'atkPercent',
  'critRate',
  'critDamage',
];

export const RARITY_NAMES: Readonly<Record<AttachmentRarity, string>> = {
  1: 'Common',
  2: 'Rare',
  3: 'Epic',
  4: 'Legendary',
};

export const SARDIS_COSTS: Readonly<Record<SardisPurchase, number>> = {
  healing: 20,
  attachmentReroll: 25,
  rarityUpgrade: 60,
  levelRerollToken: 35,
};

export function getCompatibleSlots(weaponType: WeaponType): readonly AttachmentSlot[] {
  return ATTACHMENT_SLOTS[weaponType];
}

export function isAttachmentCompatible(weaponType: WeaponType, slot: AttachmentSlot): boolean {
  return ATTACHMENT_SLOTS[weaponType].includes(slot);
}

export function getAffixCount(rarity: AttachmentRarity): number {
  return rarity;
}

export function experienceForLevel(level: number): number {
  if (level <= 1) return 0;
  const completed = level - 1;
  return 30 * completed * (completed + 1);
}

export function getUpgradeDefinition(id: string): UpgradeDefinition | undefined {
  return UPGRADE_DEFINITIONS.find((definition) => definition.id === id);
}
