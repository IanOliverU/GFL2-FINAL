import type { GameSnapshot, GameSimulationContract } from '../../game';
import type { RendererDiagnostics } from '../../render';
import { thirdPersonBasis, topDownBasis } from '../input/InputController';

declare global {
  interface Window {
    __THREE_GAME_DIAGNOSTICS__?: Record<string, unknown>;
    __THREE_GAME_TEST_HOOKS__?: {
      seed: (seed: number) => Promise<void>;
      setState: (name: string) => Promise<{ state: string }>;
      setPausedForScreenshot: (paused: boolean) => void;
      setReducedMotion: (reduced: boolean) => void;
      hideDebugUi: () => void;
      damagePlayer: (amount: number) => void;
      grantExperience: (amount: number) => void;
      spawnEnemy: (
        role: 'melee' | 'flanker' | 'ranged' | 'heavy' | 'elite' | 'lade',
        x: number,
        z: number,
      ) => number;
    };
  }
}

export function publishGameDiagnostics(
  snapshot: GameSnapshot,
  renderer: RendererDiagnostics | null,
): void {
  window.__THREE_GAME_DIAGNOSTICS__ = {
    frame: snapshot.tick,
    state: snapshot.runState,
    paused: snapshot.paused,
    cameraMode: snapshot.cameraMode,
    enemyPreview: snapshot.enemyPreview,
    player: snapshot.player,
    enemies: snapshot.enemies.map((enemy) => ({
      id: enemy.id,
      role: enemy.role,
      position: [...enemy.position],
      health: enemy.health,
      maxHealth: enemy.maxHealth,
      telegraph: enemy.telegraph,
      attackKind: enemy.attackKind,
      stagger: enemy.stagger,
    })),
    objective: snapshot.objective,
    boss: snapshot.boss,
    renderer,
    tololo: window.__GFL2_TOLOLO_DIAGNOSTICS__ ?? null,
    kit: describeTololoKit(snapshot),
    controls: describeControls(snapshot),
    simulation: snapshot.diagnostics,
    physics: {
      engine: '@react-three/rapier collision-proxy scaffold',
      timestep: snapshot.diagnostics.fixedDelta,
      bodies: 1,
      colliders: 5,
      sensors: 0,
      ccdBodies: 0,
    },
  };
}

type SkillId = 'skill1' | 'skill2' | 'ultimate';

/**
 * Development-only Tololo kit projection derived from the authoritative
 * snapshot. Display only: cooldowns, unlocks, damage, and targeting results
 * are owned by the simulation; this block merely republishes them for
 * diagnostics and deterministic Playwright hooks.
 */
function describeTololoKit(snapshot: GameSnapshot): Record<string, unknown> {
  const player = snapshot.player;
  const skills = (['skill1', 'skill2', 'ultimate'] as const).map((id: SkillId) => ({
    id,
    unlocked: (player.ownedSkills[id] ?? 0) > 0,
    rank: player.ownedSkills[id] ?? 0,
    cooldown: player.skillCooldowns[id] ?? 0,
  }));
  let lastSkill: { tick: number; id: SkillId | null } | null = null;
  let lastDamage: { tick: number; value: number } | null = null;
  for (const event of snapshot.events) {
    if (event.type === 'skill') {
      const id: SkillId | null =
        event.value === 1
          ? 'skill1'
          : event.value === 2
            ? 'skill2'
            : event.value === 3
              ? 'ultimate'
              : null;
      lastSkill = { tick: event.tick, id };
    } else if (event.type === 'hit' || event.type === 'critical') {
      lastDamage = { tick: event.tick, value: event.value };
    }
  }
  const [muzzleX, muzzleY, muzzleZ] = player.muzzle;
  const planar = Math.cos(player.aimPitch);
  const range = 38;
  return {
    weapon: {
      ammo: player.ammo,
      magazineSize: player.magazineSize,
      reloading: player.reloading,
      reloadProgress: player.reloadProgress,
      recoil: player.recoil,
    },
    passive: {
      hits: player.lightspikeHits,
    },
    skills,
    lastSkill,
    lastDamage,
    aimTarget: [
      muzzleX + Math.sin(player.facingYaw) * planar * range,
      muzzleY + Math.sin(player.aimPitch) * range,
      muzzleZ + Math.cos(player.facingYaw) * planar * range,
    ] as const,
    seed: snapshot.diagnostics.seed,
    cameraMode: snapshot.cameraMode,
  };
}

export type TestStateSetter = (name: string) => void;

/**
 * Temporary M1.1 development readout of the active movement basis so browser
 * tests and manual checks can assert direction against the camera instead of
 * guessing from displacement. Derived from the authoritative snapshot only.
 */
function describeControls(snapshot: GameSnapshot): Record<string, unknown> {
  const third = thirdPersonBasis(snapshot.player.facingYaw);
  const top = topDownBasis();
  return {
    cameraMode: snapshot.cameraMode,
    facingYaw: snapshot.player.facingYaw,
    aimPitch: snapshot.player.aimPitch,
    thirdPersonBasis: { forward: [...third.forward], right: [...third.right] },
    topDownBasis: { forward: [...top.forward], right: [...top.right] },
  };
}

export function installTestHooks(
  simulation: GameSimulationContract,
  setState: TestStateSetter,
  setSnapshot: (snapshot: GameSnapshot) => void,
  setReducedMotion: (reduced: boolean) => void,
  setEvidenceCapturePaused: (paused: boolean) => void,
): () => void {
  if (new URLSearchParams(window.location.search).get('e2e') !== '1') return () => undefined;

  const sync = () => setSnapshot(simulation.getSnapshot());
  const withCombatRoster = () => {
    simulation.setTestState('combat');
    simulation.debugSpawnEnemy('melee', [-5, 0, 5]);
    simulation.debugSpawnEnemy('flanker', [6, 0, 8]);
    simulation.debugSpawnEnemy('ranged', [-8, 0, 11]);
    simulation.debugSpawnEnemy('heavy', [9, 0, 12]);
    simulation.debugSpawnEnemy('elite', [0, 0, 15]);
  };

  window.__THREE_GAME_TEST_HOOKS__ = {
    async seed(seed) {
      simulation.restart(seed);
      sync();
    },
    async setState(name) {
      setEvidenceCapturePaused(false);
      simulation.restart(42);
      simulation.setPaused(false);
      if (name === 'menu') {
        setState('menu');
      } else {
        setState('game');
        if (name === 'tololo-model') simulation.setTestState('combat');
        else if (name === 'active-third') withCombatRoster();
        else if (name === 'active-top') {
          withCombatRoster();
          simulation.advance(1 / 60, createSwitchIntent(true));
          simulation.advance(1 / 60, createSwitchIntent(false));
          simulation.advance(0.25, createSwitchIntent(false));
        } else if (name === 'pedestal-ready') simulation.setTestState('bossReady');
        else if (name === 'level-up') simulation.setTestState('levelUp');
        else if (name === 'attachment') {
          simulation.setTestState('postBoss');
          simulation.debugQueueAttachment(simulation.debugGenerateAttachment(3, 'boss'));
        } else if (name === 'boss') simulation.setTestState('bossFight');
        else if (name === 'boss-break') {
          simulation.setTestState('bossFight');
          simulation.debugDamageBoss(120, 'core');
        } else if (name === 'extraction') simulation.setTestState('postBoss');
        else if (name === 'death') simulation.debugDamagePlayer(9999);
        else throw new Error(`Unknown test state: ${name}`);
      }
      sync();
      await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
      return { state: name };
    },
    setPausedForScreenshot(paused) {
      setEvidenceCapturePaused(paused);
      simulation.setPaused(paused);
      sync();
    },
    setReducedMotion,
    hideDebugUi() {
      document.documentElement.dataset.hideDebug = 'true';
    },
    damagePlayer(amount) {
      simulation.debugDamagePlayer(amount);
      sync();
    },
    grantExperience(amount) {
      simulation.debugGrantExperience(amount);
      sync();
    },
    spawnEnemy(role, x, z) {
      const id = simulation.debugSpawnEnemy(role, [x, 0, z]);
      sync();
      return id;
    },
  };
  return () => {
    delete window.__THREE_GAME_TEST_HOOKS__;
  };
}

function createSwitchIntent(switchCamera: boolean) {
  return {
    move: [0, 0] as const,
    sprint: false,
    dodge: false,
    fire: false,
    ads: false,
    reload: false,
    skill1: false,
    skill2: false,
    ultimate: false,
    interact: false,
    switchCamera,
    aimYaw: 0,
    aimPitch: 0,
    aimPoint: null,
  };
}
