import { TOLOLO, type GameSnapshot, type SkillId } from '../game';
import { toGameRenderView, type GameRenderView } from '../render/snapshot';

export interface PlayerSettings {
  uiScale: number;
  reducedMotion: boolean;
  masterVolume: number;
  graphicsQuality: 'low' | 'medium' | 'high';
}

export interface DollOption {
  id: string;
  name: string;
  weapon: string;
  passive: string;
  available: boolean;
  placeholder?: boolean;
}

export interface SkillView {
  id: string;
  name: string;
  slot: string;
  cooldown: number;
  baseCooldown: number;
  ready: boolean;
  unlocked: boolean;
  rank: number;
  level: number;
}

export interface UpgradeChoiceView {
  id: string;
  name: string;
  description: string;
  level: number;
  maxLevel: number;
  category: string;
  guaranteed: boolean;
}

export interface AttachmentView {
  id: string;
  name: string;
  slot: string;
  rarity: string;
  affixes: readonly { label: string; value: string }[];
  salvageValue: number;
}

export interface LevelUpView {
  choices: readonly UpgradeChoiceView[];
  rerolls: number;
  rerollCost: number;
}

export interface PassiveView {
  name: string;
  hits: number;
  hitsToCrit: number;
}

export interface GameUiView extends GameRenderView {
  skills: readonly SkillView[];
  passive: PassiveView;
  levelUp: LevelUpView | null;
  pendingAttachment: AttachmentView | null;
  equipped: readonly AttachmentView[];
}

type UnknownRecord = Record<string, unknown>;

function record(value: unknown): UnknownRecord {
  return typeof value === 'object' && value !== null ? (value as UnknownRecord) : {};
}

function text(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value : fallback;
}

function identifier(value: unknown, fallback: string): string {
  return typeof value === 'string' || typeof value === 'number' ? String(value) : fallback;
}

function titleCase(value: string): string {
  return value.replace(/([a-z])([A-Z])/g, '$1 $2').replace(/^./, (letter) => letter.toUpperCase());
}

function number(value: unknown, fallback = 0): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function boolean(value: unknown): boolean {
  return value === true;
}

function list(value: unknown): readonly unknown[] {
  return Array.isArray(value) ? value : [];
}

function attachment(value: unknown, fallbackId: string): AttachmentView | null {
  if (value === undefined || value === null) return null;
  const source = record(value);
  const affixes = list(source.affixes).map((rawAffix) => {
    const affix = record(rawAffix);
    return {
      label: titleCase(text(affix.label ?? affix.name ?? affix.kind ?? affix.type, 'Stat')),
      value: text(affix.displayValue, String(affix.value ?? '')),
    };
  });
  const slot = text(source.slot, 'Unknown slot');
  return {
    id: identifier(source.id, fallbackId),
    name: text(source.name, `${titleCase(slot)} attachment`),
    slot,
    rarity: text(source.rarity, `Tier ${number(source.rarity, 1)}`),
    affixes,
    salvageValue: number(source.salvageValue ?? source.sardisValue, number(source.rarity, 1) * 12),
  };
}

function upgrade(value: unknown, index: number): UpgradeChoiceView {
  const source = record(value);
  return {
    id: identifier(source.id, `upgrade-${index}`),
    name: text(source.name, 'Unidentified upgrade'),
    description: text(
      source.description,
      `${titleCase(text(source.category, 'General'))} adaptation ready to install.`,
    ),
    level: number(source.level ?? source.currentLevel ?? source.currentRank),
    maxLevel: Math.max(1, number(source.maxLevel ?? source.maxRank, 5)),
    category: text(source.category ?? source.kind, 'General'),
    guaranteed: boolean(source.guaranteed),
  };
}

const SKILL_SLOTS: Readonly<Record<string, string>> = {
  skill1: 'Q',
  skill2: 'E',
  ultimate: 'F',
};

function skill(
  value: unknown,
  index: number,
  cooldowns: Readonly<Record<string, number>>,
): SkillView {
  const source = record(value);
  const id = text(source.id, `skill-${index + 1}`);
  const rank = Math.max(0, number(source.level ?? source.rank));
  const unlocked = rank > 0;
  const cooldown = number(source.cooldown ?? cooldowns[id]);
  const definition = TOLOLO.skills[id as SkillId];
  return {
    id,
    name: text(source.name, definition?.name ?? titleCase(id)),
    slot: text(source.slot ?? source.key, SKILL_SLOTS[id] ?? ['Q', 'E', 'F'][index] ?? '?'),
    cooldown,
    baseCooldown: definition?.cooldown ?? 0,
    ready: unlocked && (source.ready === undefined ? cooldown <= 0 : boolean(source.ready)),
    unlocked,
    rank,
    level: Math.max(1, rank),
  };
}

/** UI-facing shape adapter. All uncertain simulation fields are intentionally isolated here. */
export function toGameUiView(snapshot: GameSnapshot): GameUiView {
  const render = toGameRenderView(snapshot);
  const source = snapshot as unknown as UnknownRecord;
  const player = record(source.player);
  const rawLevelUp = source.levelUp === undefined ? null : record(source.levelUp);
  const ownedSkills = record(player.ownedSkills);
  const rawSkills = Array.isArray(player.skills)
    ? player.skills
    : Object.entries(ownedSkills).map(([id, level]) => ({
        id,
        level,
        cooldown: record(player.skillCooldowns)[id],
        slot: id === 'skill1' ? 'Q' : id === 'skill2' ? 'E' : 'F',
      }));
  // All three Tololo slots are always projected so the HUD can render
  // Locked, Ready, and Cooldown states; rank 0 means locked.
  const orderedSkills = [...rawSkills].sort((left, right) => {
    const order = (id: string): number =>
      id === 'skill1' ? 0 : id === 'skill2' ? 1 : id === 'ultimate' ? 2 : 3;
    return order(text(record(left).id)) - order(text(record(right).id));
  });
  const rawEquipped = Array.isArray(source.equipped)
    ? source.equipped
    : Array.isArray(player.equipped)
      ? player.equipped
      : Object.values(record(source.equipped ?? player.equipped));

  const upgradeRanks = record(player.upgradeRanks);
  const lightspikeRank = number(upgradeRanks.lightspike);
  const hitsToCrit = Math.max(3, TOLOLO.passive.guaranteedCritEveryHits - lightspikeRank);

  return {
    ...render,
    skills: orderedSkills.map((value, index) => skill(value, index, render.player.cooldowns)),
    passive: {
      name: TOLOLO.passive.name,
      hits: number(player.lightspikeHits),
      hitsToCrit,
    },
    levelUp:
      rawLevelUp === null || rawLevelUp.active === false
        ? null
        : {
            choices: list(rawLevelUp.choices ?? rawLevelUp.cards).map(upgrade),
            rerolls: number(rawLevelUp.rerolls ?? rawLevelUp.rerollsRemaining),
            rerollCost: number(rawLevelUp.rerollCost),
          },
    pendingAttachment: attachment(source.pendingAttachment, 'pending-attachment'),
    equipped: rawEquipped
      .map((value, index) => attachment(value, `equipped-${index}`))
      .filter((value): value is AttachmentView => value !== null),
  };
}
