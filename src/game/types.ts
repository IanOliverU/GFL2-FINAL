export type Vec2 = readonly [x: number, z: number];
export type Vec3 = readonly [x: number, y: number, z: number];

export type CameraMode = 'thirdPerson' | 'topDown';
export type RunState = 'active' | 'boss' | 'reward' | 'extraction' | 'complete' | 'dead';
export type PauseReason = 'manual' | 'levelUp' | 'attachment' | 'death' | null;
export type SkillId = 'skill1' | 'skill2' | 'ultimate';
export type EnemyRole = 'melee' | 'flanker' | 'ranged' | 'heavy' | 'elite' | 'lade';
export type WeaponType = 'assaultRifle' | 'machineGun' | 'rifle' | 'shotgun';
export type AttachmentSlot =
  'muzzle' | 'underbarrel' | 'sight' | 'foregrip' | 'bipod' | 'latch' | 'link';
export type AttachmentRarity = 1 | 2 | 3 | 4;
export type AffixType = 'flatAtk' | 'atkPercent' | 'critRate' | 'critDamage';
export type SardisPurchase = 'healing' | 'attachmentReroll' | 'rarityUpgrade' | 'levelRerollToken';

export interface InputIntent {
  move: Vec2;
  sprint: boolean;
  dodge: boolean;
  fire: boolean;
  ads: boolean;
  reload: boolean;
  skill1: boolean;
  skill2: boolean;
  ultimate: boolean;
  interact: boolean;
  switchCamera: boolean;
  aimYaw: number;
  aimPitch: number;
  aimPoint: Vec3 | null;
}

export interface WeaponDefinition {
  id: 'ak-alfa';
  name: 'AK-Alfa';
  type: 'assaultRifle';
  automatic: true;
  damage: number;
  roundsPerSecond: number;
  magazineSize: number;
  reloadSeconds: number;
  spreadRadians: number;
  adsSpreadMultiplier: number;
  recoilPerShot: number;
  range: number;
  projectileSpeed: number;
}

export interface SkillDefinition {
  id: SkillId;
  name: string;
  cooldown: number;
  description: string;
}

export interface TololoDefinition {
  id: 'tololo';
  name: 'Tololo';
  modelStatus: 'asset-pipeline-not-validated';
  balanceStatus: 'TEMPORARY';
  weapon: WeaponDefinition;
  passive: {
    id: 'lightspike';
    name: 'Lightspike';
    guaranteedCritEveryHits: number;
  };
  skills: Readonly<Record<SkillId, SkillDefinition>>;
}

export interface EnemyDefinition {
  role: EnemyRole;
  health: number;
  speed: number;
  radius: number;
  damage: number;
  attackRange: number;
  telegraphSeconds: number;
  attackCooldown: number;
  exp: number;
  sardis: number;
  armor: number;
}

export interface UpgradeDefinition {
  id: string;
  category: 'coreSkill' | 'weapon' | 'passive' | 'movement' | 'defense' | 'reload' | 'cooldown';
  name: string;
  maxRank: number;
  description: string;
  skillId: SkillId | null;
}

export interface UpgradeCardSnapshot {
  id: string;
  name: string;
  category: UpgradeDefinition['category'];
  currentRank: number;
  maxRank: number;
  guaranteed: boolean;
}

export interface AffixSnapshot {
  type: AffixType;
  value: number;
}

export interface AttachmentSnapshot {
  id: number;
  weaponType: WeaponType;
  slot: AttachmentSlot;
  rarity: AttachmentRarity;
  affixes: readonly AffixSnapshot[];
  source: 'ordinary' | 'boss' | 'reroll';
}

export interface PlayerSnapshot {
  position: Vec3;
  velocity: Vec3;
  facingYaw: number;
  aimPitch: number;
  muzzle: Vec3;
  health: number;
  maxHealth: number;
  invulnerability: number;
  damageReduction: number;
  dodgeCooldown: number;
  dodgeRemaining: number;
  ammo: number;
  magazineSize: number;
  reloading: number;
  reloadProgress: number;
  ads: boolean;
  sprinting: boolean;
  recoil: number;
  level: number;
  exp: number;
  expToNext: number;
  sardis: number;
  ownedSkills: Readonly<Record<SkillId, number>>;
  skillCooldowns: Readonly<Record<SkillId, number>>;
  upgradeRanks: Readonly<Record<string, number>>;
  rerollTokens: number;
  lightspikeHits: number;
}

export interface EnemySnapshot {
  id: number;
  role: EnemyRole;
  position: Vec3;
  health: number;
  maxHealth: number;
  armor: number;
  radius: number;
  attackRange: number;
  telegraph: number;
  attackKind: string | null;
  stagger: number;
}

export interface ProjectileSnapshot {
  id: number;
  owner: 'player' | 'enemy';
  position: Vec3;
  previousPosition: Vec3;
  velocity: Vec3;
  damage: number;
  critical: boolean;
  remainingRange: number;
  source: 'weapon' | 'hydroBarrage' | 'enemy';
}

export interface DamageNumberSnapshot {
  id: number;
  position: Vec3;
  value: number;
  critical: boolean;
  weakPoint: boolean;
  life: number;
}

export interface PickupSnapshot {
  id: number;
  type: 'sardis' | 'attachment';
  position: Vec3;
  amount: number;
  attachment: AttachmentSnapshot | null;
}

export interface PedestalSnapshot {
  id: number;
  position: Vec3;
  active: boolean;
  interactionRange: number;
  minSpawnDistance: number;
  maxSpawnDistance: number;
  boundMargin: number;
}

export interface BossSnapshot {
  id: number;
  name: 'Grassland Warden';
  position: Vec3;
  health: number;
  maxHealth: number;
  phase: 1 | 2 | 3;
  armor: number;
  armorBreakThreshold: number;
  coreHealth: number;
  coreMaxHealth: number;
  coreExposed: boolean;
  breakWindow: number;
  vulnerabilityMultiplier: number;
  telegraph: number;
  attackKind: 'ringSlam' | 'coreBeam' | 'grassCharge' | null;
  defeated: boolean;
}

export interface LevelUpSnapshot {
  active: boolean;
  cards: readonly UpgradeCardSnapshot[];
  rerollsRemaining: number;
}

export interface ObjectiveSnapshot {
  kind: 'findPedestal' | 'defeatBoss' | 'claimReward' | 'extract' | 'complete' | 'survive';
  label: string;
  targetPosition: Vec3 | null;
}

export interface SimulationEvent {
  id: number;
  tick: number;
  type:
    | 'shot'
    | 'hit'
    | 'critical'
    | 'playerDamaged'
    | 'enemyDefeated'
    | 'levelUp'
    | 'cameraChanged'
    | 'skill'
    | 'attachment'
    | 'purchase'
    | 'bossPhase'
    | 'bossBreak'
    | 'bossDefeated'
    | 'extractionComplete';
  subjectId: number;
  value: number;
}

export interface DiagnosticsSnapshot {
  fixedDelta: number;
  maxResumeDelta: number;
  lastRealDelta: number;
  lastClampedDelta: number;
  accumulator: number;
  seed: number;
  rngState: number;
  activeEnemies: number;
  activeProjectiles: number;
  projectilePoolCapacity: number;
  activeDamageNumbers: number;
  damageNumberPoolCapacity: number;
  enemiesSpawned: number;
  enemiesDefeated: number;
  enemiesDisposed: number;
  updateOrder: readonly string[];
}

export interface GameSnapshot {
  tick: number;
  time: number;
  runState: RunState;
  paused: boolean;
  pauseReason: PauseReason;
  cameraMode: CameraMode;
  cameraBlend: number;
  player: PlayerSnapshot;
  enemies: readonly EnemySnapshot[];
  projectiles: readonly ProjectileSnapshot[];
  damageNumbers: readonly DamageNumberSnapshot[];
  pickups: readonly PickupSnapshot[];
  objective: ObjectiveSnapshot;
  pedestal: PedestalSnapshot;
  boss: BossSnapshot | null;
  levelUp: LevelUpSnapshot;
  pendingAttachment: AttachmentSnapshot | null;
  equipped: Readonly<Partial<Record<AttachmentSlot, AttachmentSnapshot>>>;
  diagnostics: DiagnosticsSnapshot;
  events: readonly SimulationEvent[];
}

export type AttachmentResolution = 'equip' | 'retain' | 'salvage';

export interface PurchaseResult {
  ok: boolean;
  type: SardisPurchase;
  cost: number;
  reason: 'purchased' | 'insufficientFunds' | 'unavailable' | 'maxRarity';
}

export interface GameSimulation {
  advance(realDelta: number, intent: InputIntent): number;
  getSnapshot(): GameSnapshot;
  setPaused(paused: boolean): void;
  chooseUpgrade(id: string): boolean;
  rerollUpgrades(): boolean;
  resolveAttachment(action: AttachmentResolution): boolean;
  purchaseSardis(type: SardisPurchase): PurchaseResult;
  beginExtraction(): boolean;
  restart(seed?: number): void;
  setTestState(name: 'combat' | 'levelUp' | 'bossReady' | 'bossFight' | 'postBoss'): void;
  debugGrantExperience(amount: number): void;
  debugSetSardis(amount: number): void;
  debugSpawnEnemy(role: EnemyRole, position?: Vec3): number;
  debugSetPlayerPosition(position: Vec3): void;
  debugDamagePlayer(amount: number): boolean;
  debugDamageBoss(amount: number, target?: 'body' | 'core'): boolean;
  debugGenerateAttachment(
    rarity: AttachmentRarity,
    source?: AttachmentSnapshot['source'],
  ): AttachmentSnapshot;
  debugQueueAttachment(attachment: AttachmentSnapshot): void;
  debugStateHash(): string;
}
