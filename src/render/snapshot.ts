import type { GameSnapshot } from '../game';

export type Vec3Tuple = readonly [number, number, number];

export interface RenderPlayerView {
  position: Vec3Tuple;
  velocity: Vec3Tuple;
  muzzle: Vec3Tuple;
  facing: number;
  aimYaw: number;
  aimPitch: number;
  health: number;
  maxHealth: number;
  level: number;
  exp: number;
  nextExp: number;
  sardis: number;
  ammo: number;
  magazine: number;
  reloading: boolean;
  reloadProgress: number;
  dodgeCooldown: number;
  dodgeRemaining: number;
  invulnerable: boolean;
  ads: boolean;
  sprinting: boolean;
  recoil: number;
  skills: readonly unknown[];
  cooldowns: Readonly<Record<string, number>>;
}

export interface RenderEnemyView {
  id: string;
  kind: string;
  position: Vec3Tuple;
  health: number;
  maxHealth: number;
  elite: boolean;
  radius: number;
  attackRange: number;
  telegraph: string | null;
  telegraphSeconds: number;
  stagger: number;
}

export interface RenderProjectileView {
  id: string;
  position: Vec3Tuple;
  hostile: boolean;
  kind: 'weapon' | 'hydro' | 'enemy';
}

export interface RenderDamageNumberView {
  id: string;
  position: Vec3Tuple;
  value: number;
  critical: boolean;
}

export interface RenderPickupView {
  id: string;
  position: Vec3Tuple;
  kind: string;
  rarity: string;
}

export interface RenderObjectiveView {
  state: string;
  label: string;
  pedestalPosition: Vec3Tuple;
  distance: number;
}

export interface RenderBossView {
  position: Vec3Tuple;
  health: number;
  maxHealth: number;
  phase: number;
  weakPointHealth: number;
  weakPointMaxHealth: number;
  vulnerable: boolean;
  telegraph: string | null;
  breakProgress: number;
}

export interface RenderEventView {
  id: string;
  type: string;
  position: Vec3Tuple | null;
  age: number;
  value: number;
}

export interface GameRenderView {
  tick: number;
  runState: string;
  paused: boolean;
  pauseReason: string | null;
  cameraMode: 'thirdPerson' | 'topDown';
  cameraBlend: number | null;
  player: RenderPlayerView;
  enemies: readonly RenderEnemyView[];
  projectiles: readonly RenderProjectileView[];
  damageNumbers: readonly RenderDamageNumberView[];
  pickups: readonly RenderPickupView[];
  objective: RenderObjectiveView;
  boss: RenderBossView | null;
  elapsed: number;
  events: readonly RenderEventView[];
}

type UnknownRecord = Record<string, unknown>;

const ZERO: Vec3Tuple = [0, 0, 0];

function record(value: unknown): UnknownRecord {
  return typeof value === 'object' && value !== null ? (value as UnknownRecord) : {};
}

function number(value: unknown, fallback = 0): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function boolean(value: unknown): boolean {
  return value === true;
}

function string(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value : fallback;
}

function identifier(value: unknown, fallback: string): string {
  return typeof value === 'string' || typeof value === 'number' ? String(value) : fallback;
}

function optionalString(value: unknown): string | null {
  return typeof value === 'string' && value.length > 0 ? value : null;
}

function array(value: unknown): readonly unknown[] {
  return Array.isArray(value) ? value : [];
}

function vec3(value: unknown): Vec3Tuple {
  if (Array.isArray(value)) {
    return [number(value[0]), number(value[1]), number(value[2])];
  }

  const source = record(value);
  if ('x' in source || 'y' in source || 'z' in source) {
    return [number(source.x), number(source.y), number(source.z)];
  }
  return ZERO;
}

function normalizeEnemy(value: unknown, index: number): RenderEnemyView {
  const enemy = record(value);
  return {
    id: identifier(enemy.id, `enemy-${index}`),
    kind: string(enemy.kind ?? enemy.role, 'melee'),
    position: vec3(enemy.position),
    health: number(enemy.health, 1),
    maxHealth: Math.max(1, number(enemy.maxHealth, 1)),
    elite: boolean(enemy.elite) || enemy.role === 'elite',
    radius: number(record(enemy).radius, 0.55),
    attackRange: number(record(enemy).attackRange, 1.9),
    telegraphSeconds: number(enemy.telegraph, 0),
    telegraph:
      optionalString(enemy.telegraph ?? enemy.attackKind) ??
      (number(enemy.telegraph) > 0 ? 'attack' : null),
    stagger: number(enemy.stagger),
  };
}

function normalizeProjectile(value: unknown, index: number): RenderProjectileView {
  const projectile = record(value);
  const source = string(projectile.source, 'weapon');
  return {
    id: identifier(projectile.id, `projectile-${index}`),
    position: vec3(projectile.position),
    hostile: boolean(projectile.hostile) || projectile.owner === 'enemy',
    kind: source === 'hydroBarrage' ? 'hydro' : source === 'enemy' ? 'enemy' : 'weapon',
  };
}

function normalizeDamageNumber(value: unknown, index: number): RenderDamageNumberView {
  const damage = record(value);
  return {
    id: identifier(damage.id, `damage-${index}`),
    position: vec3(damage.position),
    value: number(damage.value ?? damage.amount),
    critical: boolean(damage.critical),
  };
}

function normalizePickup(value: unknown, index: number): RenderPickupView {
  const pickup = record(value);
  return {
    id: identifier(pickup.id, `pickup-${index}`),
    position: vec3(pickup.position),
    kind: string(pickup.kind ?? pickup.type, 'sardis'),
    rarity: string(pickup.rarity ?? record(pickup.attachment).rarity, 'common'),
  };
}

function normalizeBoss(value: unknown): RenderBossView | null {
  if (value === null || value === undefined) return null;
  const boss = record(value);
  return {
    position: vec3(boss.position),
    health: number(boss.health, 1),
    maxHealth: Math.max(1, number(boss.maxHealth, 1)),
    phase: Math.max(1, number(boss.phase, 1)),
    weakPointHealth: number(boss.weakPointHealth ?? boss.coreHealth, 1),
    weakPointMaxHealth: Math.max(1, number(boss.weakPointMaxHealth ?? boss.coreMaxHealth, 1)),
    vulnerable: boolean(boss.vulnerable) || boolean(boss.coreExposed),
    telegraph:
      optionalString(boss.telegraph ?? boss.attackKind) ??
      (number(boss.telegraph) > 0 ? 'attack' : null),
    breakProgress: number(boss.breakProgress ?? boss.breakWindow),
  };
}

function normalizeEvent(value: unknown, index: number): RenderEventView {
  const event = record(value);
  return {
    id: identifier(event.id, `event-${index}-${string(event.type, 'unknown')}`),
    type: string(event.type, 'unknown'),
    position: event.position === undefined ? null : vec3(event.position),
    age: number(event.age ?? event.elapsed),
    value: number(event.value),
  };
}

/**
 * This is the only render-side boundary that knows the simulation snapshot shape.
 * The cast keeps a parallel game API change localized without weakening scene props.
 */
export function toGameRenderView(snapshot: GameSnapshot): GameRenderView {
  const source = snapshot as unknown as UnknownRecord;
  const player = record(source.player);
  const objective = record(source.objective);
  const pedestal = record(source.pedestal);
  const rawCooldowns = record(player.cooldowns ?? player.skillCooldowns);
  const cooldowns: Record<string, number> = {};
  for (const [key, value] of Object.entries(rawCooldowns)) cooldowns[key] = number(value);
  const diagnostics = record(source.diagnostics);
  const currentTick = number(source.tick);
  const fixedDelta = number(diagnostics.fixedDelta, 1 / 60);
  const events = array(source.events).map((value, index) => {
    const event = normalizeEvent(value, index);
    const rawEvent = record(value);
    return {
      ...event,
      age:
        rawEvent.tick === undefined
          ? event.age
          : Math.max(0, (currentTick - number(rawEvent.tick)) * fixedDelta),
      position:
        event.position ??
        (/shot/i.test(event.type)
          ? vec3(player.muzzle)
          : /skill/i.test(event.type)
            ? vec3(player.position)
            : /boss/i.test(event.type)
              ? vec3(record(source.boss).position)
              : null),
    };
  });

  return {
    tick: currentTick,
    runState: string(source.runState, 'playing'),
    paused: boolean(source.paused),
    pauseReason: optionalString(source.pauseReason),
    cameraMode: source.cameraMode === 'topDown' ? 'topDown' : 'thirdPerson',
    cameraBlend:
      typeof source.cameraBlend === 'number' && Number.isFinite(source.cameraBlend)
        ? source.cameraMode === 'topDown'
          ? Math.min(1, Math.max(0, source.cameraBlend))
          : 1 - Math.min(1, Math.max(0, source.cameraBlend))
        : null,
    player: {
      position: vec3(player.position),
      velocity: vec3(player.velocity),
      muzzle: vec3(player.muzzle),
      facing: number(player.facing ?? player.facingYaw),
      aimYaw: number(player.aimYaw, number(player.facing ?? player.facingYaw)),
      aimPitch: number(player.aimPitch),
      health: number(player.health, 1),
      maxHealth: Math.max(1, number(player.maxHealth, 1)),
      level: Math.max(1, number(player.level, 1)),
      exp: number(player.exp),
      nextExp: Math.max(1, number(player.nextExp ?? player.expToNext, 1)),
      sardis: number(player.sardis),
      ammo: number(player.ammo),
      magazine: Math.max(1, number(player.magazine ?? player.magazineSize, 1)),
      reloading: boolean(player.reloading) || number(player.reloading) > 0,
      reloadProgress: Math.min(1, Math.max(0, number(player.reloadProgress))),
      dodgeCooldown: Math.max(0, number(player.dodgeCooldown)),
      dodgeRemaining: Math.max(0, number(player.dodgeRemaining)),
      invulnerable: boolean(player.invulnerable) || number(player.invulnerability) > 0,
      ads: boolean(player.ads),
      sprinting: boolean(player.sprinting),
      recoil: Math.max(0, number(player.recoil)),
      skills: array(player.skills),
      cooldowns,
    },
    enemies: array(source.enemies).map(normalizeEnemy),
    projectiles: array(source.projectiles).map(normalizeProjectile),
    damageNumbers: array(source.damageNumbers).map(normalizeDamageNumber),
    pickups: array(source.pickups).map(normalizePickup),
    objective: {
      state: string(objective.state ?? objective.kind, 'searching'),
      label: string(objective.label),
      pedestalPosition: vec3(
        objective.pedestalPosition ?? objective.targetPosition ?? pedestal.position,
      ),
      distance:
        typeof objective.distance === 'number'
          ? number(objective.distance)
          : Math.hypot(
              vec3(objective.targetPosition ?? pedestal.position)[0] - vec3(player.position)[0],
              vec3(objective.targetPosition ?? pedestal.position)[2] - vec3(player.position)[2],
            ),
    },
    boss: normalizeBoss(source.boss),
    elapsed: number(source.elapsed ?? source.time),
    events,
  };
}
