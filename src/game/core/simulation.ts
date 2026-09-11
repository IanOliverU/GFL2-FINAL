import { generateAttachmentWithRng } from '../data/attachments';
import {
  AFFIX_TYPES,
  ENEMY_DEFINITIONS,
  SARDIS_COSTS,
  TOLOLO,
  UPGRADE_DEFINITIONS,
  experienceForLevel,
  getUpgradeDefinition,
  isAttachmentCompatible,
} from '../data/definitions';
import type {
  AttachmentRarity,
  AttachmentResolution,
  AttachmentSlot,
  AttachmentSnapshot,
  BossSnapshot,
  CameraMode,
  DamageNumberSnapshot,
  EnemyRole,
  EnemySnapshot,
  GameSimulation,
  GameSnapshot,
  InputIntent,
  ObjectiveSnapshot,
  PauseReason,
  PickupSnapshot,
  PlayerSnapshot,
  ProjectileSnapshot,
  PurchaseResult,
  RunState,
  SardisPurchase,
  SimulationEvent,
  SkillId,
  UpgradeCardSnapshot,
  Vec3,
} from '../types';
import { normalizeSeed, SeededRng } from './rng';

export const FIXED_DELTA = 1 / 60;
export const MAX_RESUME_DELTA = 0.1;
export const CAMERA_BLEND_SECONDS = 0.25;
export const SIMULATION_UPDATE_ORDER = [
  'camera',
  'playerTimersAndMovement',
  'skillsAndWeapon',
  'projectilesAndCollision',
  'enemyDirectorAndAI',
  'boss',
  'pickupsAndInteraction',
  'progression',
  'cleanup',
] as const;

const ARENA_HALF_SIZE = 45;
const PEDESTAL_MIN_DISTANCE = 15;
const PEDESTAL_MAX_DISTANCE = 30;
const PEDESTAL_BOUND_MARGIN = 5;
const EXTRACTION_POSITION: Vec3 = [13, 0, -10];
const PROJECTILE_POOL_SIZE = 192;
const DAMAGE_NUMBER_POOL_SIZE = 96;
const EVENT_LIMIT = 40;
const EMPTY_SKILL_RANKS: Record<SkillId, number> = { skill1: 0, skill2: 0, ultimate: 0 };

interface MutablePlayer {
  x: number;
  y: number;
  z: number;
  vx: number;
  vz: number;
  facingYaw: number;
  aimPitch: number;
  health: number;
  maxHealth: number;
  invulnerability: number;
  dodgeCooldown: number;
  dodgeRemaining: number;
  ammo: number;
  reloadRemaining: number;
  fireCooldown: number;
  recoil: number;
  ads: boolean;
  sprinting: boolean;
  level: number;
  exp: number;
  sardis: number;
  rerollTokens: number;
  lightspikeHits: number;
  skillRanks: Record<SkillId, number>;
  skillCooldowns: Record<SkillId, number>;
  upgradeRanks: Record<string, number>;
  defenseBuff: number;
  movementBuff: number;
}

interface MutableEnemy {
  id: number;
  role: EnemyRole;
  x: number;
  z: number;
  health: number;
  maxHealth: number;
  cooldown: number;
  telegraph: number;
  attackKind: string | null;
  stagger: number;
  marked: number;
  alive: boolean;
}

interface MutableProjectile {
  active: boolean;
  id: number;
  owner: 'player' | 'enemy';
  x: number;
  y: number;
  z: number;
  previousX: number;
  previousY: number;
  previousZ: number;
  vx: number;
  vy: number;
  vz: number;
  damage: number;
  critical: boolean;
  remainingRange: number;
  source: 'weapon' | 'hydroBarrage' | 'enemy';
}

interface MutableDamageNumber {
  active: boolean;
  id: number;
  x: number;
  y: number;
  z: number;
  value: number;
  critical: boolean;
  weakPoint: boolean;
  life: number;
}

interface MutablePickup {
  id: number;
  type: 'sardis' | 'attachment';
  x: number;
  z: number;
  amount: number;
  attachment: AttachmentSnapshot | null;
  active: boolean;
}

interface MutableBoss {
  id: number;
  x: number;
  z: number;
  health: number;
  maxHealth: number;
  phase: 1 | 2 | 3;
  armor: number;
  armorBreakThreshold: number;
  coreHealth: number;
  coreMaxHealth: number;
  breakWindow: number;
  cooldown: number;
  telegraph: number;
  attackKind: 'ringSlam' | 'coreBeam' | 'grassCharge' | null;
  defeated: boolean;
}

interface InputEdges {
  dodge: boolean;
  reload: boolean;
  skill1: boolean;
  skill2: boolean;
  ultimate: boolean;
  interact: boolean;
  switchCamera: boolean;
}

function createPlayer(): MutablePlayer {
  return {
    x: 0,
    y: 0,
    z: 0,
    vx: 0,
    vz: 0,
    facingYaw: 0,
    aimPitch: 0,
    health: 100,
    maxHealth: 100,
    invulnerability: 0,
    dodgeCooldown: 0,
    dodgeRemaining: 0,
    ammo: TOLOLO.weapon.magazineSize,
    reloadRemaining: 0,
    fireCooldown: 0,
    recoil: 0,
    ads: false,
    sprinting: false,
    level: 1,
    exp: 0,
    sardis: 0,
    rerollTokens: 1,
    lightspikeHits: 0,
    skillRanks: { ...EMPTY_SKILL_RANKS },
    skillCooldowns: { ...EMPTY_SKILL_RANKS },
    upgradeRanks: {},
    defenseBuff: 0,
    movementBuff: 0,
  };
}

function createProjectilePool(): MutableProjectile[] {
  return Array.from({ length: PROJECTILE_POOL_SIZE }, () => ({
    active: false,
    id: 0,
    owner: 'player',
    x: 0,
    y: 0,
    z: 0,
    previousX: 0,
    previousY: 0,
    previousZ: 0,
    vx: 0,
    vy: 0,
    vz: 0,
    damage: 0,
    critical: false,
    remainingRange: 0,
    source: 'weapon',
  }));
}

function createDamageNumberPool(): MutableDamageNumber[] {
  return Array.from({ length: DAMAGE_NUMBER_POOL_SIZE }, () => ({
    active: false,
    id: 0,
    x: 0,
    y: 0,
    z: 0,
    value: 0,
    critical: false,
    weakPoint: false,
    life: 0,
  }));
}

export class DeterministicGameSimulation implements GameSimulation {
  private seed: number;
  private readonly rng: SeededRng;
  private tickValue = 0;
  private timeValue = 0;
  private accumulator = 0;
  private lastRealDelta = 0;
  private lastClampedDelta = 0;
  private runStateValue: RunState = 'active';
  private manualPaused = false;
  private internalPause: Exclude<PauseReason, 'manual'> = null;
  private cameraModeValue: CameraMode = 'thirdPerson';
  private cameraBlendValue = 1;
  private player: MutablePlayer = createPlayer();
  private enemies: MutableEnemy[] = [];
  private readonly projectiles = createProjectilePool();
  private readonly damageNumbers = createDamageNumberPool();
  private pickups: MutablePickup[] = [];
  private boss: MutableBoss | null = null;
  private pedestalX = 0;
  private pedestalZ = 0;
  private pedestalActive = false;
  private levelUpCards: UpgradeCardSnapshot[] = [];
  private levelUpRerolls = 0;
  private pendingAttachment: AttachmentSnapshot | null = null;
  private equipped: Partial<Record<AttachmentSlot, AttachmentSnapshot>> = {};
  private events: SimulationEvent[] = [];
  private nextEntityId = 1;
  private nextEventId = 1;
  private spawnTimer = 0.75;
  private spawnEnabled = true;
  private extractionTimer = 0;
  private previousInput: InputEdges = {
    dodge: false,
    reload: false,
    skill1: false,
    skill2: false,
    ultimate: false,
    interact: false,
    switchCamera: false,
  };

  constructor(seed = 1) {
    this.seed = normalizeSeed(seed);
    this.rng = new SeededRng(this.seed);
    this.placePedestal();
  }

  advance(realDelta: number, intent: InputIntent): number {
    const safeDelta = Number.isFinite(realDelta) ? Math.max(0, realDelta) : 0;
    this.lastRealDelta = safeDelta;
    this.lastClampedDelta = Math.min(safeDelta, MAX_RESUME_DELTA);
    if (this.isPaused()) return 0;

    this.accumulator += this.lastClampedDelta;
    let steps = 0;
    while (this.accumulator + Number.EPSILON >= FIXED_DELTA) {
      this.step(intent);
      this.accumulator -= FIXED_DELTA;
      if (this.accumulator < 0) this.accumulator = 0;
      steps += 1;
      if (this.isPaused()) {
        this.accumulator = 0;
        break;
      }
    }
    return steps;
  }

  getSnapshot(): GameSnapshot {
    const enemies: EnemySnapshot[] = [];
    for (const enemy of this.enemies) {
      if (!enemy.alive) continue;
      const definition = ENEMY_DEFINITIONS[enemy.role];
      enemies.push({
        id: enemy.id,
        role: enemy.role,
        position: [enemy.x, 0, enemy.z],
        health: enemy.health,
        maxHealth: enemy.maxHealth,
        armor: definition.armor,
        telegraph: enemy.telegraph,
        attackKind: enemy.attackKind,
        stagger: enemy.stagger,
      });
    }

    const projectiles: ProjectileSnapshot[] = [];
    for (const projectile of this.projectiles) {
      if (!projectile.active) continue;
      projectiles.push({
        id: projectile.id,
        owner: projectile.owner,
        position: [projectile.x, projectile.y, projectile.z],
        previousPosition: [projectile.previousX, projectile.previousY, projectile.previousZ],
        velocity: [projectile.vx, projectile.vy, projectile.vz],
        damage: projectile.damage,
        critical: projectile.critical,
        remainingRange: projectile.remainingRange,
        source: projectile.source,
      });
    }

    const damageNumbers: DamageNumberSnapshot[] = [];
    for (const number of this.damageNumbers) {
      if (!number.active) continue;
      damageNumbers.push({
        id: number.id,
        position: [number.x, number.y, number.z],
        value: number.value,
        critical: number.critical,
        weakPoint: number.weakPoint,
        life: number.life,
      });
    }

    const pickups: PickupSnapshot[] = [];
    for (const pickup of this.pickups) {
      if (!pickup.active) continue;
      pickups.push({
        id: pickup.id,
        type: pickup.type,
        position: [pickup.x, 0, pickup.z],
        amount: pickup.amount,
        attachment: cloneAttachment(pickup.attachment),
      });
    }

    const player = this.playerSnapshot();
    const objective = this.objectiveSnapshot();
    let activeProjectiles = 0;
    let activeDamageNumbers = 0;
    for (const projectile of this.projectiles) if (projectile.active) activeProjectiles += 1;
    for (const number of this.damageNumbers) if (number.active) activeDamageNumbers += 1;

    return {
      tick: this.tickValue,
      time: this.timeValue,
      runState: this.runStateValue,
      paused: this.isPaused(),
      pauseReason: this.pauseReason(),
      cameraMode: this.cameraModeValue,
      cameraBlend: this.cameraBlendValue,
      player,
      enemies,
      projectiles,
      damageNumbers,
      pickups,
      objective,
      pedestal: {
        id: 1,
        position: [this.pedestalX, 0, this.pedestalZ],
        active: this.pedestalActive,
        interactionRange: 2.5,
        minSpawnDistance: PEDESTAL_MIN_DISTANCE,
        maxSpawnDistance: PEDESTAL_MAX_DISTANCE,
        boundMargin: PEDESTAL_BOUND_MARGIN,
      },
      boss: this.bossSnapshot(),
      levelUp: {
        active: this.internalPause === 'levelUp',
        cards: this.levelUpCards.map((card) => ({ ...card })),
        rerollsRemaining: this.levelUpRerolls,
      },
      pendingAttachment: cloneAttachment(this.pendingAttachment),
      equipped: cloneEquipment(this.equipped),
      diagnostics: {
        fixedDelta: FIXED_DELTA,
        maxResumeDelta: MAX_RESUME_DELTA,
        lastRealDelta: this.lastRealDelta,
        lastClampedDelta: this.lastClampedDelta,
        accumulator: this.accumulator,
        seed: this.seed,
        rngState: this.rng.state,
        activeEnemies: enemies.length,
        activeProjectiles,
        projectilePoolCapacity: this.projectiles.length,
        activeDamageNumbers,
        damageNumberPoolCapacity: this.damageNumbers.length,
        updateOrder: SIMULATION_UPDATE_ORDER,
      },
      events: this.events.map((event) => ({ ...event })),
    };
  }

  setPaused(paused: boolean): void {
    this.manualPaused = paused;
    this.accumulator = 0;
  }

  chooseUpgrade(id: string): boolean {
    if (this.internalPause !== 'levelUp') return false;
    const card = this.levelUpCards.find((candidate) => candidate.id === id);
    if (card === undefined) return false;
    const definition = getUpgradeDefinition(card.id);
    if (definition === undefined) return false;

    if (definition.skillId !== null) {
      this.player.skillRanks[definition.skillId] += 1;
    } else {
      const rank = this.player.upgradeRanks[definition.id] ?? 0;
      this.player.upgradeRanks[definition.id] = rank + 1;
      if (definition.id === 'defense') {
        const oldMaximum = this.player.maxHealth;
        this.player.maxHealth = 100 + (rank + 1) * 12;
        this.player.health += this.player.maxHealth - oldMaximum;
      }
    }
    this.levelUpCards = [];
    this.internalPause = null;
    return true;
  }

  rerollUpgrades(): boolean {
    if (this.internalPause !== 'levelUp' || this.levelUpRerolls <= 0) return false;
    this.levelUpRerolls -= 1;
    this.player.rerollTokens -= 1;
    this.levelUpCards = this.generateUpgradeCards();
    return true;
  }

  resolveAttachment(action: AttachmentResolution): boolean {
    const attachment = this.pendingAttachment;
    if (attachment === null) return false;
    if (!isAttachmentCompatible(TOLOLO.weapon.type, attachment.slot)) return false;

    if (action === 'equip') {
      this.equipped[attachment.slot] = {
        ...attachment,
        affixes: attachment.affixes.map((affix) => ({ ...affix })),
      };
    } else if (action === 'salvage') {
      this.player.sardis += attachment.rarity * 12;
    }
    this.emit('attachment', attachment.id, action === 'equip' ? 1 : action === 'salvage' ? 2 : 0);
    this.pendingAttachment = null;
    if (this.internalPause === 'attachment') this.internalPause = null;
    return true;
  }

  purchaseSardis(type: SardisPurchase): PurchaseResult {
    const cost = SARDIS_COSTS[type];
    if (this.runStateValue !== 'reward') return { ok: false, type, cost, reason: 'unavailable' };
    if (type === 'attachmentReroll' && this.pendingAttachment === null) {
      return { ok: false, type, cost, reason: 'unavailable' };
    }
    if (type === 'rarityUpgrade' && this.pendingAttachment === null) {
      return { ok: false, type, cost, reason: 'unavailable' };
    }
    if (type === 'rarityUpgrade' && this.pendingAttachment?.rarity === 4) {
      return { ok: false, type, cost, reason: 'maxRarity' };
    }
    if (this.player.sardis < cost) return { ok: false, type, cost, reason: 'insufficientFunds' };

    this.player.sardis -= cost;
    if (type === 'healing') {
      this.player.health = Math.min(this.player.maxHealth, this.player.health + 45);
    } else if (type === 'levelRerollToken') {
      this.player.rerollTokens += 1;
    } else if (type === 'attachmentReroll') {
      const current = this.pendingAttachment;
      if (current === null) return { ok: false, type, cost, reason: 'unavailable' };
      this.pendingAttachment = this.createAttachment(current.rarity, 'reroll', current.slot);
    } else {
      const current = this.pendingAttachment;
      if (current === null || current.rarity === 4)
        return { ok: false, type, cost, reason: 'unavailable' };
      this.pendingAttachment = this.createAttachment(
        (current.rarity + 1) as AttachmentRarity,
        'reroll',
        current.slot,
      );
    }
    this.emit('purchase', 0, cost);
    return { ok: true, type, cost, reason: 'purchased' };
  }

  beginExtraction(): boolean {
    if (this.runStateValue !== 'reward' || this.pendingAttachment !== null) return false;
    this.runStateValue = 'extraction';
    this.extractionTimer = 0.75;
    return true;
  }

  restart(seed = this.seed): void {
    this.seed = normalizeSeed(seed);
    this.rng.reset(this.seed);
    this.tickValue = 0;
    this.timeValue = 0;
    this.accumulator = 0;
    this.lastRealDelta = 0;
    this.lastClampedDelta = 0;
    this.runStateValue = 'active';
    this.manualPaused = false;
    this.internalPause = null;
    this.cameraModeValue = 'thirdPerson';
    this.cameraBlendValue = 1;
    this.player = createPlayer();
    this.enemies = [];
    this.pickups = [];
    this.boss = null;
    this.pedestalActive = false;
    this.levelUpCards = [];
    this.levelUpRerolls = 0;
    this.pendingAttachment = null;
    this.equipped = {};
    this.events = [];
    this.nextEntityId = 1;
    this.nextEventId = 1;
    this.spawnTimer = 0.75;
    this.spawnEnabled = true;
    this.extractionTimer = 0;
    this.previousInput = {
      dodge: false,
      reload: false,
      skill1: false,
      skill2: false,
      ultimate: false,
      interact: false,
      switchCamera: false,
    };
    for (const projectile of this.projectiles) {
      projectile.active = false;
      projectile.id = 0;
    }
    for (const number of this.damageNumbers) {
      number.active = false;
      number.id = 0;
    }
    this.placePedestal();
  }

  setTestState(name: 'combat' | 'levelUp' | 'bossReady' | 'bossFight' | 'postBoss'): void {
    this.spawnEnabled = false;
    this.manualPaused = false;
    this.internalPause = null;
    if (name === 'combat') {
      this.runStateValue = 'active';
      this.enemies = [];
      this.boss = null;
      return;
    }
    if (name === 'levelUp') {
      this.runStateValue = 'active';
      this.debugGrantExperience(experienceForLevel(this.player.level + 1) - this.player.exp);
      return;
    }
    if (name === 'bossReady') {
      this.runStateValue = 'active';
      this.player.x = this.pedestalX;
      this.player.z = this.pedestalZ;
      return;
    }
    if (name === 'bossFight') {
      this.startBoss();
      return;
    }
    this.startBoss();
    if (this.boss !== null) this.defeatBoss();
    this.internalPause = null;
    this.pendingAttachment = null;
  }

  debugGrantExperience(amount: number): void {
    if (amount <= 0 || !Number.isFinite(amount)) return;
    this.player.exp += amount;
    this.checkLevelUp();
  }

  debugSetSardis(amount: number): void {
    this.player.sardis = Math.max(0, Math.floor(amount));
  }

  debugSpawnEnemy(role: EnemyRole, position: Vec3 = [0, 0, -8]): number {
    return this.spawnEnemy(role, position[0], position[2]);
  }

  debugSetPlayerPosition(position: Vec3): void {
    this.player.x = clamp(position[0], -ARENA_HALF_SIZE, ARENA_HALF_SIZE);
    this.player.y = position[1];
    this.player.z = clamp(position[2], -ARENA_HALF_SIZE, ARENA_HALF_SIZE);
  }

  debugDamagePlayer(amount: number): boolean {
    return this.damagePlayer(amount);
  }

  debugDamageBoss(amount: number, target: 'body' | 'core' = 'body'): boolean {
    if (this.boss === null || this.boss.defeated || amount <= 0) return false;
    this.damageBoss(amount, target === 'core');
    return true;
  }

  debugGenerateAttachment(
    rarity: AttachmentRarity,
    source: AttachmentSnapshot['source'] = 'ordinary',
  ): AttachmentSnapshot {
    return this.createAttachment(rarity, source, null);
  }

  debugQueueAttachment(attachment: AttachmentSnapshot): void {
    if (!isAttachmentCompatible(TOLOLO.weapon.type, attachment.slot)) {
      throw new Error(
        `Attachment slot ${attachment.slot} is not compatible with ${TOLOLO.weapon.type}.`,
      );
    }
    this.pendingAttachment = cloneAttachment(attachment);
    this.internalPause = 'attachment';
  }

  debugStateHash(): string {
    const snapshot = this.getSnapshot();
    const state = JSON.stringify({
      tick: snapshot.tick,
      time: snapshot.time,
      runState: snapshot.runState,
      cameraMode: snapshot.cameraMode,
      player: snapshot.player,
      enemies: snapshot.enemies,
      projectiles: snapshot.projectiles,
      boss: snapshot.boss,
      rngState: snapshot.diagnostics.rngState,
    });
    let hash = 0x811c9dc5;
    for (let index = 0; index < state.length; index += 1) {
      hash ^= state.charCodeAt(index);
      hash = Math.imul(hash, 0x01000193);
    }
    return (hash >>> 0).toString(16).padStart(8, '0');
  }

  private step(intent: InputIntent): void {
    this.tickValue += 1;
    this.timeValue += FIXED_DELTA;
    const edges = this.readEdges(intent);
    this.updateCamera(edges);
    this.updatePlayer(intent, edges);
    this.updateSkillsAndWeapon(intent, edges);
    this.updateProjectiles();
    this.updateEnemies();
    this.updateBoss();
    this.updatePickupsAndInteraction(edges);
    this.checkLevelUp();
    this.cleanup();
    this.previousInput = {
      dodge: intent.dodge,
      reload: intent.reload,
      skill1: intent.skill1,
      skill2: intent.skill2,
      ultimate: intent.ultimate,
      interact: intent.interact,
      switchCamera: intent.switchCamera,
    };
  }

  private readEdges(intent: InputIntent): InputEdges {
    return {
      dodge: intent.dodge && !this.previousInput.dodge,
      reload: intent.reload && !this.previousInput.reload,
      skill1: intent.skill1 && !this.previousInput.skill1,
      skill2: intent.skill2 && !this.previousInput.skill2,
      ultimate: intent.ultimate && !this.previousInput.ultimate,
      interact: intent.interact && !this.previousInput.interact,
      switchCamera: intent.switchCamera && !this.previousInput.switchCamera,
    };
  }

  private updateCamera(edges: InputEdges): void {
    if (this.cameraBlendValue < 1) {
      this.cameraBlendValue = Math.min(
        1,
        this.cameraBlendValue + FIXED_DELTA / CAMERA_BLEND_SECONDS,
      );
      if (this.cameraBlendValue > 1 - 1e-9) this.cameraBlendValue = 1;
    }
    if (!edges.switchCamera || (this.runStateValue !== 'active' && this.runStateValue !== 'boss'))
      return;
    this.cameraModeValue = this.cameraModeValue === 'thirdPerson' ? 'topDown' : 'thirdPerson';
    this.cameraBlendValue = 0;
    this.emit('cameraChanged', 0, this.cameraModeValue === 'topDown' ? 1 : 0);
  }

  private updatePlayer(intent: InputIntent, edges: InputEdges): void {
    const player = this.player;
    player.invulnerability = Math.max(0, player.invulnerability - FIXED_DELTA);
    player.dodgeCooldown = Math.max(0, player.dodgeCooldown - FIXED_DELTA);
    player.fireCooldown = Math.max(0, player.fireCooldown - FIXED_DELTA);
    player.recoil = Math.max(0, player.recoil - FIXED_DELTA * 1.4);
    player.defenseBuff = Math.max(0, player.defenseBuff - FIXED_DELTA);
    player.movementBuff = Math.max(0, player.movementBuff - FIXED_DELTA);
    for (const skill of ['skill1', 'skill2', 'ultimate'] as const) {
      player.skillCooldowns[skill] = Math.max(0, player.skillCooldowns[skill] - FIXED_DELTA);
    }

    if (player.reloadRemaining > 0) {
      player.reloadRemaining -= FIXED_DELTA;
      if (player.reloadRemaining <= 0) {
        player.reloadRemaining = 0;
        player.ammo = TOLOLO.weapon.magazineSize;
      }
    } else if (edges.reload && player.ammo < TOLOLO.weapon.magazineSize) {
      player.reloadRemaining = this.reloadDuration();
    }

    if (intent.aimPoint !== null) {
      const aimX = intent.aimPoint[0] - player.x;
      const aimZ = intent.aimPoint[2] - player.z;
      if (aimX * aimX + aimZ * aimZ > 0.0001) player.facingYaw = Math.atan2(aimX, aimZ);
    } else if (Number.isFinite(intent.aimYaw)) {
      player.facingYaw = intent.aimYaw;
    }
    if (Number.isFinite(intent.aimPitch)) {
      player.aimPitch = clamp(intent.aimPitch, -0.65, 0.55);
    }
    player.ads = intent.ads;

    let moveX = clamp(intent.move[0], -1, 1);
    let moveZ = clamp(intent.move[1], -1, 1);
    const moveLength = Math.hypot(moveX, moveZ);
    if (moveLength > 1) {
      moveX /= moveLength;
      moveZ /= moveLength;
    }

    if (edges.dodge && player.dodgeCooldown <= 0) {
      if (moveLength < 0.01) {
        moveX = Math.sin(player.facingYaw);
        moveZ = Math.cos(player.facingYaw);
      }
      player.vx = moveX * 12;
      player.vz = moveZ * 12;
      player.dodgeRemaining = 0.22;
      player.dodgeCooldown = 1.2;
      player.invulnerability = Math.max(player.invulnerability, 0.28);
    }

    if (player.dodgeRemaining > 0) {
      player.sprinting = false;
      player.dodgeRemaining = Math.max(0, player.dodgeRemaining - FIXED_DELTA);
    } else {
      const movementRank = player.upgradeRanks.movement ?? 0;
      const buffMultiplier = player.movementBuff > 0 ? 1.3 : 1;
      const speed = 4.6 * (1 + movementRank * 0.08) * (intent.sprint ? 1.45 : 1) * buffMultiplier;
      player.sprinting = intent.sprint && moveLength >= 0.01;
      player.vx = moveX * speed;
      player.vz = moveZ * speed;
    }
    player.x = clamp(player.x + player.vx * FIXED_DELTA, -ARENA_HALF_SIZE, ARENA_HALF_SIZE);
    player.z = clamp(player.z + player.vz * FIXED_DELTA, -ARENA_HALF_SIZE, ARENA_HALF_SIZE);

    if (this.runStateValue === 'extraction') {
      this.extractionTimer -= FIXED_DELTA;
      if (this.extractionTimer <= 0) {
        this.runStateValue = 'complete';
        this.emit('extractionComplete', 0, this.player.sardis);
      }
    }
  }

  private updateSkillsAndWeapon(intent: InputIntent, edges: InputEdges): void {
    if (this.runStateValue !== 'active' && this.runStateValue !== 'boss') return;
    if (edges.skill1) this.useSkill('skill1', intent);
    if (edges.skill2) this.useSkill('skill2', intent);
    if (edges.ultimate) this.useSkill('ultimate', intent);

    if (!intent.fire || this.player.reloadRemaining > 0 || this.player.fireCooldown > 0) return;
    if (this.player.ammo <= 0) {
      this.player.reloadRemaining = this.reloadDuration();
      return;
    }
    this.player.ammo -= 1;
    const cadenceRank = this.player.upgradeRanks.weaponCadence ?? 0;
    this.player.fireCooldown = 1 / (TOLOLO.weapon.roundsPerSecond * (1 + cadenceRank * 0.08));
    this.player.recoil = Math.min(1, this.player.recoil + TOLOLO.weapon.recoilPerShot);
    const spread =
      TOLOLO.weapon.spreadRadians * (intent.ads ? TOLOLO.weapon.adsSpreadMultiplier : 1);
    this.spawnPlayerProjectile(intent, this.weaponDamage(), spread, 'weapon');
  }

  private useSkill(skill: SkillId, intent: InputIntent): void {
    const rank = this.player.skillRanks[skill];
    if (rank <= 0 || this.player.skillCooldowns[skill] > 0) return;
    const cooldownRank = this.player.upgradeRanks.cooldown ?? 0;
    this.player.skillCooldowns[skill] = TOLOLO.skills[skill].cooldown * (1 - cooldownRank * 0.08);
    this.emit('skill', 0, skill === 'skill1' ? 1 : skill === 'skill2' ? 2 : 3);

    if (skill === 'skill1') {
      for (let index = -2; index <= 2; index += 1) {
        this.spawnPlayerProjectile(intent, 10 + rank * 3, index * 0.025, 'hydroBarrage');
      }
    } else if (skill === 'skill2') {
      this.player.movementBuff = 3 + rank * 0.3;
      this.player.defenseBuff = 3 + rank * 0.3;
      this.player.invulnerability = Math.max(this.player.invulnerability, 0.12);
      for (const enemy of this.enemies) {
        if (!enemy.alive) continue;
        const distance = Math.hypot(enemy.x - this.player.x, enemy.z - this.player.z);
        if (distance <= 5) enemy.stagger = Math.max(enemy.stagger, 0.45);
      }
    } else {
      const starfallDamage = 42 + rank * 12;
      for (const enemy of this.enemies) {
        if (enemy.alive) this.damageEnemy(enemy, starfallDamage, true, false);
      }
      if (this.boss !== null && !this.boss.defeated) this.damageBoss(starfallDamage, true);
      this.player.skillCooldowns.skill1 = 0;
      this.player.fireCooldown = 0;
    }
  }

  private spawnPlayerProjectile(
    intent: InputIntent,
    damage: number,
    spread: number,
    source: 'weapon' | 'hydroBarrage',
  ): void {
    const muzzle = this.muzzlePosition();
    let dx: number;
    let dy: number;
    let dz: number;
    if (intent.aimPoint !== null) {
      dx = intent.aimPoint[0] - muzzle[0];
      dy = intent.aimPoint[1] - muzzle[1];
      dz = intent.aimPoint[2] - muzzle[2];
    } else {
      const planar = Math.cos(this.player.aimPitch);
      dx = Math.sin(this.player.facingYaw) * planar;
      dy = Math.sin(this.player.aimPitch);
      dz = Math.cos(this.player.facingYaw) * planar;
    }
    const length = Math.hypot(dx, dy, dz) || 1;
    dx /= length;
    dy /= length;
    dz /= length;
    const randomizedSpread = source === 'weapon' ? this.rng.range(-spread, spread) : spread;
    const cosine = Math.cos(randomizedSpread);
    const sine = Math.sin(randomizedSpread);
    const rotatedX = dx * cosine + dz * sine;
    const rotatedZ = dz * cosine - dx * sine;
    const critical = this.rng.next() < this.criticalRate();
    const multiplier = critical ? this.criticalMultiplier() : 1;
    this.activateProjectile(
      'player',
      muzzle[0],
      muzzle[1],
      muzzle[2],
      rotatedX * TOLOLO.weapon.projectileSpeed,
      dy * TOLOLO.weapon.projectileSpeed,
      rotatedZ * TOLOLO.weapon.projectileSpeed,
      damage * multiplier,
      critical,
      TOLOLO.weapon.range,
      source,
    );
    this.emit('shot', 0, damage);
  }

  private updateProjectiles(): void {
    for (const projectile of this.projectiles) {
      if (!projectile.active) continue;
      projectile.previousX = projectile.x;
      projectile.previousY = projectile.y;
      projectile.previousZ = projectile.z;
      const dx = projectile.vx * FIXED_DELTA;
      const dy = projectile.vy * FIXED_DELTA;
      const dz = projectile.vz * FIXED_DELTA;
      projectile.x += dx;
      projectile.y += dy;
      projectile.z += dz;
      projectile.remainingRange -= Math.hypot(dx, dy, dz);
      if (projectile.remainingRange <= 0) {
        projectile.active = false;
        continue;
      }

      if (projectile.owner === 'enemy') {
        if (this.runStateValue === 'dead') {
          projectile.active = false;
          continue;
        }
        if (segmentSphereHit(projectile, this.player.x, 0.9, this.player.z, 0.55)) {
          this.damagePlayer(projectile.damage);
          projectile.active = false;
        }
        continue;
      }

      let hit = false;
      for (const enemy of this.enemies) {
        if (!enemy.alive) continue;
        const definition = ENEMY_DEFINITIONS[enemy.role];
        if (!segmentSphereHit(projectile, enemy.x, 0.8, enemy.z, definition.radius)) continue;
        this.player.lightspikeHits += 1;
        let critical = projectile.critical;
        const rhythm = Math.max(
          3,
          TOLOLO.passive.guaranteedCritEveryHits - (this.player.upgradeRanks.lightspike ?? 0),
        );
        if (this.player.lightspikeHits >= rhythm) {
          this.player.lightspikeHits = 0;
          critical = true;
        }
        let damage = projectile.damage;
        if (critical && !projectile.critical) damage *= this.criticalMultiplier();
        if (projectile.source === 'hydroBarrage') enemy.marked = 4;
        if (enemy.marked > 0 && projectile.source === 'weapon') damage *= 1.2;
        this.damageEnemy(enemy, damage, critical, false);
        projectile.active = false;
        hit = true;
        break;
      }
      if (hit) continue;

      const boss = this.boss;
      if (
        boss !== null &&
        !boss.defeated &&
        segmentSphereHit(projectile, boss.x, 1.1, boss.z, 1.65)
      ) {
        const coreHit = segmentSphereHit(projectile, boss.x, 1.45, boss.z, 0.48);
        this.damageBoss(projectile.damage, coreHit);
        projectile.active = false;
      }
    }
  }

  private updateEnemies(): void {
    if (this.runStateValue !== 'active' && this.runStateValue !== 'boss') return;
    if (this.spawnEnabled && this.runStateValue === 'active') {
      this.spawnTimer -= FIXED_DELTA;
      const cap = Math.min(24, 8 + Math.floor(this.timeValue / 30));
      if (this.spawnTimer <= 0 && this.liveEnemyCount() < cap) {
        this.spawnDirectedEnemy();
        this.spawnTimer = Math.max(0.45, 1.35 - this.timeValue * 0.004);
      }
    }

    for (let first = 0; first < this.enemies.length; first += 1) {
      const enemy = this.enemies[first];
      if (enemy === undefined || !enemy.alive) continue;
      enemy.cooldown = Math.max(0, enemy.cooldown - FIXED_DELTA);
      enemy.stagger = Math.max(0, enemy.stagger - FIXED_DELTA);
      enemy.marked = Math.max(0, enemy.marked - FIXED_DELTA);
      if (enemy.stagger > 0) continue;
      const definition = ENEMY_DEFINITIONS[enemy.role];
      const dx = this.player.x - enemy.x;
      const dz = this.player.z - enemy.z;
      const distance = Math.hypot(dx, dz) || 0.0001;

      if (enemy.telegraph > 0) {
        enemy.telegraph -= FIXED_DELTA;
        if (enemy.telegraph <= 0) {
          this.executeEnemyAttack(enemy, distance, dx / distance, dz / distance);
          enemy.attackKind = null;
          enemy.cooldown = definition.attackCooldown;
          if (this.player.health <= 0) break;
        }
        continue;
      }

      if (enemy.cooldown <= 0 && distance <= definition.attackRange) {
        enemy.telegraph = definition.telegraphSeconds;
        enemy.attackKind =
          enemy.role === 'ranged' || enemy.role === 'elite' ? 'rangedShot' : 'meleeStrike';
        continue;
      }

      let direction = 1;
      if (
        (enemy.role === 'ranged' || enemy.role === 'elite') &&
        distance < definition.attackRange * 0.6
      )
        direction = -0.65;
      if (
        (enemy.role === 'ranged' || enemy.role === 'elite') &&
        distance <= definition.attackRange * 0.85 &&
        distance >= definition.attackRange * 0.6
      )
        direction = 0;
      enemy.x += (dx / distance) * definition.speed * direction * FIXED_DELTA;
      enemy.z += (dz / distance) * definition.speed * direction * FIXED_DELTA;

      for (let second = 0; second < first; second += 1) {
        const other = this.enemies[second];
        if (other === undefined || !other.alive) continue;
        const separationX = enemy.x - other.x;
        const separationZ = enemy.z - other.z;
        const separationDistance = Math.hypot(separationX, separationZ);
        const minimum = definition.radius + ENEMY_DEFINITIONS[other.role].radius;
        if (separationDistance > 0.001 && separationDistance < minimum) {
          const correction = (minimum - separationDistance) * 0.5;
          enemy.x += (separationX / separationDistance) * correction;
          enemy.z += (separationZ / separationDistance) * correction;
        }
      }
      enemy.x = clamp(enemy.x, -ARENA_HALF_SIZE, ARENA_HALF_SIZE);
      enemy.z = clamp(enemy.z, -ARENA_HALF_SIZE, ARENA_HALF_SIZE);
    }
  }

  private executeEnemyAttack(enemy: MutableEnemy, distance: number, nx: number, nz: number): void {
    if (!enemy.alive || this.runStateValue === 'dead') return;
    const definition = ENEMY_DEFINITIONS[enemy.role];
    if (enemy.role === 'ranged' || enemy.role === 'elite') {
      this.activateProjectile(
        'enemy',
        enemy.x,
        1,
        enemy.z,
        nx * 18,
        -0.1,
        nz * 18,
        definition.damage,
        false,
        definition.attackRange + 4,
        'enemy',
      );
    } else if (distance <= definition.attackRange + 0.45) {
      this.damagePlayer(definition.damage);
    }
  }

  private updateBoss(): void {
    const boss = this.boss;
    if (boss === null || boss.defeated || this.runStateValue !== 'boss') return;
    boss.breakWindow = Math.max(0, boss.breakWindow - FIXED_DELTA);
    boss.cooldown = Math.max(0, boss.cooldown - FIXED_DELTA);
    const dx = this.player.x - boss.x;
    const dz = this.player.z - boss.z;
    const distance = Math.hypot(dx, dz) || 0.0001;

    if (boss.breakWindow > 0) return;
    if (boss.telegraph > 0) {
      boss.telegraph -= FIXED_DELTA;
      if (boss.telegraph <= 0) {
        this.executeBossAttack(boss, distance, dx / distance, dz / distance);
        boss.attackKind = null;
        boss.cooldown = boss.phase === 3 ? 0.8 : boss.phase === 2 ? 1.25 : 1.75;
      }
      return;
    }
    if (boss.cooldown > 0) return;

    if (boss.phase === 1) boss.attackKind = 'ringSlam';
    else if (boss.phase === 2) boss.attackKind = this.tickValue % 2 === 0 ? 'coreBeam' : 'ringSlam';
    else boss.attackKind = this.tickValue % 3 === 0 ? 'coreBeam' : 'grassCharge';
    boss.telegraph = boss.phase === 3 ? 0.45 : boss.phase === 2 ? 0.65 : 0.9;
  }

  private executeBossAttack(boss: MutableBoss, distance: number, nx: number, nz: number): void {
    if (boss.attackKind === 'ringSlam') {
      if (distance >= 2.5 && distance <= 7) this.damagePlayer(20 + boss.phase * 3);
      return;
    }
    if (boss.attackKind === 'coreBeam') {
      this.activateProjectile(
        'enemy',
        boss.x,
        1.45,
        boss.z,
        nx * 24,
        0,
        nz * 24,
        16 + boss.phase * 4,
        false,
        36,
        'enemy',
      );
      return;
    }
    if (boss.attackKind === 'grassCharge') {
      boss.x += nx * Math.min(5, distance * 0.6);
      boss.z += nz * Math.min(5, distance * 0.6);
      if (distance <= 7) this.damagePlayer(30);
    }
  }

  private updatePickupsAndInteraction(edges: InputEdges): void {
    for (const pickup of this.pickups) {
      if (!pickup.active) continue;
      const distance = Math.hypot(pickup.x - this.player.x, pickup.z - this.player.z);
      if (pickup.type === 'sardis' && distance <= 1.5) {
        this.player.sardis += pickup.amount;
        pickup.active = false;
      } else if (
        pickup.type === 'attachment' &&
        edges.interact &&
        distance <= 2.2 &&
        pickup.attachment !== null
      ) {
        this.pendingAttachment = cloneAttachment(pickup.attachment);
        this.internalPause = 'attachment';
        pickup.active = false;
      }
    }
    if (!edges.interact) return;
    const pedestalDistance = Math.hypot(
      this.pedestalX - this.player.x,
      this.pedestalZ - this.player.z,
    );
    if (this.runStateValue === 'active' && !this.pedestalActive && pedestalDistance <= 2.5) {
      this.startBoss();
    } else if (this.runStateValue === 'reward' && this.pendingAttachment === null) {
      const extractionDistance = Math.hypot(
        EXTRACTION_POSITION[0] - this.player.x,
        EXTRACTION_POSITION[2] - this.player.z,
      );
      if (extractionDistance <= 3.5) this.beginExtraction();
    }
  }

  private checkLevelUp(): void {
    if (
      this.internalPause !== null ||
      this.runStateValue === 'dead' ||
      this.runStateValue === 'complete'
    )
      return;
    if (this.player.exp < experienceForLevel(this.player.level + 1)) return;
    this.player.level += 1;
    this.levelUpRerolls = this.player.rerollTokens;
    this.levelUpCards = this.generateUpgradeCards();
    this.internalPause = 'levelUp';
    this.emit('levelUp', 0, this.player.level);
  }

  private generateUpgradeCards(): UpgradeCardSnapshot[] {
    const guaranteedId = this.guaranteedSkillId();
    const cards: UpgradeCardSnapshot[] = [];
    if (guaranteedId !== null && this.isUpgradeEligible(guaranteedId)) {
      cards.push(this.upgradeCard(guaranteedId, true));
    }
    const weaponAlternative = UPGRADE_DEFINITIONS.find(
      (definition) => definition.category === 'weapon' && this.isUpgradeEligible(definition.id),
    );
    if (weaponAlternative !== undefined) {
      cards.push(this.upgradeCard(weaponAlternative.id, false));
    }

    const eligible: string[] = [];
    for (const definition of UPGRADE_DEFINITIONS) {
      if (cards.some((card) => card.id === definition.id)) continue;
      if (this.isUpgradeEligible(definition.id)) eligible.push(definition.id);
    }
    while (cards.length < 3 && eligible.length > 0) {
      const pickedIndex = this.rng.int(eligible.length);
      const picked = eligible.splice(pickedIndex, 1)[0];
      if (picked !== undefined) cards.push(this.upgradeCard(picked, false));
    }
    return cards;
  }

  private guaranteedSkillId(): SkillId | null {
    if (this.player.skillRanks.skill1 === 0) return 'skill1';
    if (this.player.level >= 3 && this.player.skillRanks.skill2 === 0) return 'skill2';
    if (this.player.level >= 4 && this.player.skillRanks.ultimate === 0) return 'ultimate';
    return null;
  }

  private isUpgradeEligible(id: string): boolean {
    const definition = getUpgradeDefinition(id);
    if (definition === undefined) return false;
    const rank =
      definition.skillId === null
        ? (this.player.upgradeRanks[id] ?? 0)
        : this.player.skillRanks[definition.skillId];
    if (rank >= definition.maxRank) return false;
    if (definition.skillId === 'skill2' && this.player.skillRanks.skill1 === 0) return false;
    if (
      definition.skillId === 'ultimate' &&
      (this.player.skillRanks.skill1 === 0 || this.player.skillRanks.skill2 === 0)
    )
      return false;
    const kitComplete =
      this.player.skillRanks.skill1 > 0 &&
      this.player.skillRanks.skill2 > 0 &&
      this.player.skillRanks.ultimate > 0;
    if (
      !kitComplete &&
      (definition.category === 'movement' ||
        definition.category === 'defense' ||
        definition.category === 'reload' ||
        definition.category === 'cooldown')
    )
      return false;
    return true;
  }

  private upgradeCard(id: string, guaranteed: boolean): UpgradeCardSnapshot {
    const definition = getUpgradeDefinition(id);
    if (definition === undefined) throw new Error(`Unknown upgrade ${id}.`);
    const currentRank =
      definition.skillId === null
        ? (this.player.upgradeRanks[id] ?? 0)
        : this.player.skillRanks[definition.skillId];
    return {
      id,
      name: definition.name,
      category: definition.category,
      currentRank,
      maxRank: definition.maxRank,
      guaranteed,
    };
  }

  private cleanup(): void {
    this.enemies = this.enemies.filter((enemy) => enemy.alive);
    this.pickups = this.pickups.filter((pickup) => pickup.active);
    for (const number of this.damageNumbers) {
      if (!number.active) continue;
      number.life -= FIXED_DELTA;
      number.y += FIXED_DELTA * 0.7;
      if (number.life <= 0) number.active = false;
    }
  }

  private spawnDirectedEnemy(): void {
    const roll = this.rng.next();
    let role: EnemyRole = 'melee';
    if (this.timeValue > 90 && roll > 0.94) role = 'elite';
    else if (this.timeValue > 45 && roll > 0.78) role = 'heavy';
    else if (roll > 0.58) role = 'ranged';
    else if (roll > 0.3) role = 'flanker';
    const bound = ARENA_HALF_SIZE - 2;
    for (let attempt = 0; attempt < 12; attempt += 1) {
      const angle = this.rng.range(0, Math.PI * 2);
      const radius = this.rng.range(11, 19);
      const x = this.player.x + Math.sin(angle) * radius;
      const z = this.player.z + Math.cos(angle) * radius;
      if (Math.abs(x) <= bound && Math.abs(z) <= bound) {
        this.spawnEnemy(role, x, z);
        return;
      }
    }

    const inwardLength = Math.hypot(this.player.x, this.player.z);
    const inwardX = inwardLength > 0.01 ? -this.player.x / inwardLength : 1;
    const inwardZ = inwardLength > 0.01 ? -this.player.z / inwardLength : 0;
    this.spawnEnemy(role, this.player.x + inwardX * 12, this.player.z + inwardZ * 12);
  }

  private spawnEnemy(role: EnemyRole, x: number, z: number): number {
    const definition = ENEMY_DEFINITIONS[role];
    const id = this.allocateId();
    const pressureScale = 1 + Math.min(0.75, this.timeValue / 360);
    this.enemies.push({
      id,
      role,
      x: clamp(x, -ARENA_HALF_SIZE, ARENA_HALF_SIZE),
      z: clamp(z, -ARENA_HALF_SIZE, ARENA_HALF_SIZE),
      health: definition.health * pressureScale,
      maxHealth: definition.health * pressureScale,
      cooldown: this.rng.range(0.25, 0.8),
      telegraph: 0,
      attackKind: null,
      stagger: 0,
      marked: 0,
      alive: true,
    });
    return id;
  }

  private damageEnemy(
    enemy: MutableEnemy,
    rawDamage: number,
    critical: boolean,
    weakPoint: boolean,
  ): void {
    if (!enemy.alive) return;
    const definition = ENEMY_DEFINITIONS[enemy.role];
    const damage = rawDamage * (1 - definition.armor);
    enemy.health -= damage;
    if (damage >= 30) enemy.stagger = Math.max(enemy.stagger, definition.armor > 0 ? 0.18 : 0.35);
    this.spawnDamageNumber(enemy.x, 1.3, enemy.z, damage, critical, weakPoint);
    this.emit('hit', enemy.id, damage);
    if (critical) this.emit('critical', enemy.id, damage);
    if (enemy.health > 0) return;
    enemy.health = 0;
    enemy.alive = false;
    this.player.exp += definition.exp;
    this.pickups.push({
      id: this.allocateId(),
      type: 'sardis',
      x: enemy.x,
      z: enemy.z,
      amount: definition.sardis,
      attachment: null,
      active: true,
    });
    const dropChance = enemy.role === 'elite' ? 0.65 : 0.1;
    if (this.rng.next() < dropChance) {
      const rarity: AttachmentRarity = enemy.role === 'elite' && this.rng.next() > 0.5 ? 2 : 1;
      this.pickups.push({
        id: this.allocateId(),
        type: 'attachment',
        x: enemy.x + 0.5,
        z: enemy.z,
        amount: 0,
        attachment: this.createAttachment(rarity, 'ordinary', null),
        active: true,
      });
    }
    this.emit('enemyDefeated', enemy.id, definition.exp);
  }

  private damagePlayer(rawDamage: number): boolean {
    if (this.runStateValue === 'dead' || this.player.health <= 0 || this.player.invulnerability > 0)
      return false;
    const permanentReduction = (this.player.upgradeRanks.defense ?? 0) * 0.05;
    const temporaryReduction = this.player.defenseBuff > 0 ? 0.35 : 0;
    const damage = rawDamage * (1 - Math.min(0.7, permanentReduction + temporaryReduction));
    this.player.health = Math.max(0, this.player.health - damage);
    this.player.invulnerability = 0.35;
    this.emit('playerDamaged', 0, damage);
    if (this.player.health <= 0) {
      this.runStateValue = 'dead';
      this.internalPause = 'death';
      this.accumulator = 0;
      for (const projectile of this.projectiles) {
        if (projectile.owner === 'enemy') projectile.active = false;
      }
    }
    return true;
  }

  private damageBoss(rawDamage: number, coreHit: boolean): void {
    const boss = this.boss;
    if (boss === null || boss.defeated) return;
    let damage = rawDamage;
    if (boss.breakWindow > 0) damage *= 1.75;
    if (coreHit) {
      if (boss.armor > 0) {
        boss.coreHealth = Math.max(0, boss.coreHealth - rawDamage);
        boss.armor = boss.coreHealth;
        damage *= 0.5;
        if (boss.coreHealth <= 0) {
          boss.breakWindow = 4;
          boss.armor = 0;
          this.emit('bossBreak', boss.id, 4);
        }
      } else {
        damage *= 1.35;
      }
    } else if (boss.armor > 0) {
      damage *= 0.35;
    }
    boss.health = Math.max(0, boss.health - damage);
    this.spawnDamageNumber(boss.x, coreHit ? 1.6 : 1.1, boss.z, damage, false, coreHit);
    this.emit('hit', boss.id, damage);
    this.updateBossPhase();
    if (boss.health <= 0) this.defeatBoss();
  }

  private updateBossPhase(): void {
    const boss = this.boss;
    if (boss === null || boss.defeated) return;
    const ratio = boss.health / boss.maxHealth;
    const nextPhase: 1 | 2 | 3 = ratio <= 0.3 ? 3 : ratio <= 0.65 ? 2 : 1;
    if (nextPhase === boss.phase) return;
    boss.phase = nextPhase;
    boss.cooldown = 0.35;
    boss.telegraph = 0;
    boss.attackKind = null;
    this.emit('bossPhase', boss.id, nextPhase);
  }

  private startBoss(): void {
    this.runStateValue = 'boss';
    this.pedestalActive = true;
    this.spawnEnabled = false;
    this.enemies = [];
    const armor = 120;
    this.boss = {
      id: this.allocateId(),
      x: clamp(this.pedestalX + 8, -ARENA_HALF_SIZE + 3, ARENA_HALF_SIZE - 3),
      z: this.pedestalZ,
      health: 900,
      maxHealth: 900,
      phase: 1,
      armor,
      armorBreakThreshold: armor,
      coreHealth: armor,
      coreMaxHealth: armor,
      breakWindow: 0,
      cooldown: 1,
      telegraph: 0,
      attackKind: null,
      defeated: false,
    };
  }

  private defeatBoss(): void {
    const boss = this.boss;
    if (boss === null || boss.defeated) return;
    boss.health = 0;
    boss.defeated = true;
    boss.telegraph = 0;
    boss.attackKind = null;
    this.runStateValue = 'reward';
    this.player.sardis += 80;
    this.pendingAttachment = this.createAttachment(this.rng.next() > 0.75 ? 3 : 2, 'boss', null);
    this.internalPause = 'attachment';
    this.emit('bossDefeated', boss.id, 80);
  }

  private activateProjectile(
    owner: 'player' | 'enemy',
    x: number,
    y: number,
    z: number,
    vx: number,
    vy: number,
    vz: number,
    damage: number,
    critical: boolean,
    range: number,
    source: 'weapon' | 'hydroBarrage' | 'enemy',
  ): void {
    const projectile = this.projectiles.find((candidate) => !candidate.active);
    if (projectile === undefined) return;
    projectile.active = true;
    projectile.id = this.allocateId();
    projectile.owner = owner;
    projectile.x = x;
    projectile.y = y;
    projectile.z = z;
    projectile.previousX = x;
    projectile.previousY = y;
    projectile.previousZ = z;
    projectile.vx = vx;
    projectile.vy = vy;
    projectile.vz = vz;
    projectile.damage = damage;
    projectile.critical = critical;
    projectile.remainingRange = range;
    projectile.source = source;
  }

  private spawnDamageNumber(
    x: number,
    y: number,
    z: number,
    value: number,
    critical: boolean,
    weakPoint: boolean,
  ): void {
    const number = this.damageNumbers.find((candidate) => !candidate.active);
    if (number === undefined) return;
    number.active = true;
    number.id = this.allocateId();
    number.x = x;
    number.y = y;
    number.z = z;
    number.value = Math.round(value * 10) / 10;
    number.critical = critical;
    number.weakPoint = weakPoint;
    number.life = 0.75;
  }

  private createAttachment(
    rarity: AttachmentRarity,
    source: AttachmentSnapshot['source'],
    forcedSlot: AttachmentSlot | null,
  ): AttachmentSnapshot {
    return generateAttachmentWithRng(
      this.rng,
      this.allocateId(),
      TOLOLO.weapon.type,
      rarity,
      source,
      forcedSlot,
    );
  }

  private placePedestal(): void {
    const angle = this.rng.range(0, Math.PI * 2);
    const radius = this.rng.range(PEDESTAL_MIN_DISTANCE, PEDESTAL_MAX_DISTANCE);
    const bound = ARENA_HALF_SIZE - PEDESTAL_BOUND_MARGIN;
    this.pedestalX = clamp(Math.sin(angle) * radius, -bound, bound);
    this.pedestalZ = clamp(Math.cos(angle) * radius, -bound, bound);
  }

  private playerSnapshot(): PlayerSnapshot {
    const player = this.player;
    const damageReduction = Math.min(
      0.7,
      (player.upgradeRanks.defense ?? 0) * 0.05 + (player.defenseBuff > 0 ? 0.35 : 0),
    );
    return {
      position: [player.x, player.y, player.z],
      velocity: [player.vx, 0, player.vz],
      facingYaw: player.facingYaw,
      aimPitch: player.aimPitch,
      muzzle: this.muzzlePosition(),
      health: player.health,
      maxHealth: player.maxHealth,
      invulnerability: player.invulnerability,
      damageReduction,
      dodgeCooldown: player.dodgeCooldown,
      dodgeRemaining: player.dodgeRemaining,
      ammo: player.ammo,
      magazineSize: TOLOLO.weapon.magazineSize,
      reloading: player.reloadRemaining,
      reloadProgress:
        player.reloadRemaining > 0
          ? 1 - clamp(player.reloadRemaining / this.reloadDuration(), 0, 1)
          : 0,
      ads: player.ads,
      sprinting: player.sprinting,
      recoil: player.recoil,
      level: player.level,
      exp: player.exp,
      expToNext: experienceForLevel(player.level + 1),
      sardis: player.sardis,
      ownedSkills: { ...player.skillRanks },
      skillCooldowns: { ...player.skillCooldowns },
      upgradeRanks: { ...player.upgradeRanks },
      rerollTokens: player.rerollTokens,
      lightspikeHits: player.lightspikeHits,
    };
  }

  private muzzlePosition(): Vec3 {
    return [
      this.player.x + Math.sin(this.player.facingYaw) * 0.82,
      1.25,
      this.player.z + Math.cos(this.player.facingYaw) * 0.82,
    ];
  }

  private bossSnapshot(): BossSnapshot | null {
    const boss = this.boss;
    if (boss === null) return null;
    return {
      id: boss.id,
      name: 'Grassland Warden',
      position: [boss.x, 0, boss.z],
      health: boss.health,
      maxHealth: boss.maxHealth,
      phase: boss.phase,
      armor: boss.armor,
      armorBreakThreshold: boss.armorBreakThreshold,
      coreHealth: boss.coreHealth,
      coreMaxHealth: boss.coreMaxHealth,
      coreExposed: boss.breakWindow > 0,
      breakWindow: boss.breakWindow,
      vulnerabilityMultiplier: boss.breakWindow > 0 ? 1.75 : 1,
      telegraph: boss.telegraph,
      attackKind: boss.attackKind,
      defeated: boss.defeated,
    };
  }

  private objectiveSnapshot(): ObjectiveSnapshot {
    if (this.runStateValue === 'active') {
      return {
        kind: 'findPedestal',
        label: 'Locate and activate the Grassland pedestal',
        targetPosition: [this.pedestalX, 0, this.pedestalZ],
      };
    }
    if (this.runStateValue === 'boss') {
      const target: Vec3 | null = this.boss === null ? null : [this.boss.x, 0, this.boss.z];
      return { kind: 'defeatBoss', label: 'Defeat the Grassland Warden', targetPosition: target };
    }
    if (this.runStateValue === 'reward' && this.pendingAttachment !== null) {
      return {
        kind: 'claimReward',
        label: 'Resolve the Warden attachment reward',
        targetPosition: [this.pedestalX, 0, this.pedestalZ],
      };
    }
    if (this.runStateValue === 'reward' || this.runStateValue === 'extraction') {
      return {
        kind: 'extract',
        label: 'Use the extraction pod when ready',
        targetPosition: EXTRACTION_POSITION,
      };
    }
    if (this.runStateValue === 'complete') {
      return {
        kind: 'complete',
        label: 'Flat Grassland extraction complete',
        targetPosition: null,
      };
    }
    return { kind: 'survive', label: 'Run ended', targetPosition: null };
  }

  private weaponDamage(): number {
    let flat = 0;
    let percent = 0;
    for (const attachment of Object.values(this.equipped)) {
      if (attachment === undefined) continue;
      for (const affix of attachment.affixes) {
        if (affix.type === 'flatAtk') flat += affix.value;
        else if (affix.type === 'atkPercent') percent += affix.value;
      }
    }
    const rank = this.player.upgradeRanks.weaponDamage ?? 0;
    return (TOLOLO.weapon.damage + flat) * (1 + percent + rank * 0.12);
  }

  private criticalRate(): number {
    let rate = 0.08;
    for (const attachment of Object.values(this.equipped)) {
      if (attachment === undefined) continue;
      for (const affix of attachment.affixes) if (affix.type === 'critRate') rate += affix.value;
    }
    return Math.min(0.8, rate);
  }

  private criticalMultiplier(): number {
    let multiplier = 1.5;
    for (const attachment of Object.values(this.equipped)) {
      if (attachment === undefined) continue;
      for (const affix of attachment.affixes)
        if (affix.type === 'critDamage') multiplier += affix.value;
    }
    return multiplier;
  }

  private reloadDuration(): number {
    return TOLOLO.weapon.reloadSeconds * (1 - (this.player.upgradeRanks.reload ?? 0) * 0.12);
  }

  private liveEnemyCount(): number {
    let count = 0;
    for (const enemy of this.enemies) if (enemy.alive) count += 1;
    return count;
  }

  private allocateId(): number {
    const id = this.nextEntityId;
    this.nextEntityId += 1;
    return id;
  }

  private emit(type: SimulationEvent['type'], subjectId: number, value: number): void {
    this.events.push({ id: this.nextEventId, tick: this.tickValue, type, subjectId, value });
    this.nextEventId += 1;
    if (this.events.length > EVENT_LIMIT) this.events.shift();
  }

  private isPaused(): boolean {
    return this.manualPaused || this.internalPause !== null;
  }

  private pauseReason(): PauseReason {
    if (this.internalPause !== null) return this.internalPause;
    return this.manualPaused ? 'manual' : null;
  }
}

function segmentSphereHit(
  projectile: MutableProjectile,
  centerX: number,
  centerY: number,
  centerZ: number,
  radius: number,
): boolean {
  const segmentX = projectile.x - projectile.previousX;
  const segmentY = projectile.y - projectile.previousY;
  const segmentZ = projectile.z - projectile.previousZ;
  const lengthSquared = segmentX * segmentX + segmentY * segmentY + segmentZ * segmentZ;
  let interpolation = 0;
  if (lengthSquared > 0) {
    interpolation =
      ((centerX - projectile.previousX) * segmentX +
        (centerY - projectile.previousY) * segmentY +
        (centerZ - projectile.previousZ) * segmentZ) /
      lengthSquared;
    interpolation = clamp(interpolation, 0, 1);
  }
  const closestX = projectile.previousX + segmentX * interpolation;
  const closestY = projectile.previousY + segmentY * interpolation;
  const closestZ = projectile.previousZ + segmentZ * interpolation;
  const dx = closestX - centerX;
  const dy = closestY - centerY;
  const dz = closestZ - centerZ;
  return dx * dx + dy * dy + dz * dz <= radius * radius;
}

function cloneAttachment(attachment: AttachmentSnapshot | null): AttachmentSnapshot | null {
  if (attachment === null) return null;
  return {
    ...attachment,
    affixes: attachment.affixes.map((affix) => ({ ...affix })),
  };
}

function cloneEquipment(
  equipment: Partial<Record<AttachmentSlot, AttachmentSnapshot>>,
): Partial<Record<AttachmentSlot, AttachmentSnapshot>> {
  const clone: Partial<Record<AttachmentSlot, AttachmentSnapshot>> = {};
  for (const slot of [
    'muzzle',
    'underbarrel',
    'sight',
    'foregrip',
    'bipod',
    'latch',
    'link',
  ] as const) {
    const attachment = equipment[slot];
    if (attachment !== undefined) {
      const copied = cloneAttachment(attachment);
      if (copied !== null) clone[slot] = copied;
    }
  }
  return clone;
}

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.max(minimum, Math.min(maximum, value));
}

export function createGameSimulation(seed = 1): GameSimulation {
  return new DeterministicGameSimulation(seed);
}

export function createInputIntent(overrides: Partial<InputIntent> = {}): InputIntent {
  return {
    move: overrides.move ?? [0, 0],
    sprint: overrides.sprint ?? false,
    dodge: overrides.dodge ?? false,
    fire: overrides.fire ?? false,
    ads: overrides.ads ?? false,
    reload: overrides.reload ?? false,
    skill1: overrides.skill1 ?? false,
    skill2: overrides.skill2 ?? false,
    ultimate: overrides.ultimate ?? false,
    interact: overrides.interact ?? false,
    switchCamera: overrides.switchCamera ?? false,
    aimYaw: overrides.aimYaw ?? 0,
    aimPitch: overrides.aimPitch ?? 0,
    aimPoint: overrides.aimPoint ?? null,
  };
}

export { AFFIX_TYPES };
