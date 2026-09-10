import type { GameSnapshot, GameSimulationContract } from '../../game';
import type { RendererDiagnostics } from '../../render';

declare global {
  interface Window {
    __THREE_GAME_DIAGNOSTICS__?: Record<string, unknown>;
    __THREE_GAME_TEST_HOOKS__?: {
      seed: (seed: number) => Promise<void>;
      setState: (name: string) => Promise<{ state: string }>;
      setPausedForScreenshot: (paused: boolean) => void;
      setReducedMotion: (reduced: boolean) => void;
      hideDebugUi: () => void;
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
    player: snapshot.player,
    objective: snapshot.objective,
    boss: snapshot.boss,
    renderer,
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

export type TestStateSetter = (name: string) => void;

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
        if (name === 'active-third') withCombatRoster();
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
