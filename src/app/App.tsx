import { useCallback, useEffect, useRef, useState } from 'react';
import { useStore } from 'zustand';
import { SARDIS_COSTS, type SardisPurchase } from '../game';
import { GameScene, MenuPreview, type RendererDiagnostics } from '../render';
import {
  AttachmentOverlay,
  ControlsOverlay,
  DeathScreen,
  ExtractionShop,
  GameplayHUD,
  LevelUpOverlay,
  MainMenu,
  PauseMenu,
  ResultsScreen,
  type PlayerSettings,
} from '../ui';
import { AudioFeedback } from '../platform/browser/AudioFeedback';
import { installTestHooks, publishGameDiagnostics } from '../platform/browser/diagnostics';
import { InputController } from '../platform/input/InputController';
import { saveSettings } from '../platform/storage/settings';
import { useGameRuntime } from './providers/gameContext';

const RUN_SEED = 20260911;

function formatTime(seconds: number): string {
  const total = Math.max(0, Math.floor(seconds));
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`;
}

export function App() {
  const { simulation, store } = useGameRuntime();
  const screen = useStore(store, (state) => state.screen);
  const snapshot = useStore(store, (state) => state.snapshot);
  const settings = useStore(store, (state) => state.settings);
  const selectedDollId = useStore(store, (state) => state.selectedDollId);
  const renderer = useStore(store, (state) => state.renderer);
  const enemiesDefeated = useStore(store, (state) => state.enemiesDefeated);
  const [menuModalOpen, setMenuModalOpen] = useState(false);
  const [evidenceCapturePaused, setEvidenceCapturePaused] = useState(false);
  const surface = useRef<HTMLDivElement>(null);
  const defeatedIds = useRef(new Set<number>());
  const audio = useRef(new AudioFeedback());
  const input = useRef<InputController | null>(null);

  const sync = useCallback(() => {
    const next = simulation.getSnapshot();
    for (const event of next.events) {
      if (event.type === 'enemyDefeated') defeatedIds.current.add(event.subjectId);
    }
    store.getState().setEnemiesDefeated(defeatedIds.current.size);
    store.getState().setSnapshot(next);
    audio.current.process(next.events);
    publishGameDiagnostics(next, store.getState().renderer);
  }, [simulation, store]);

  const togglePause = useCallback(() => {
    const current = simulation.getSnapshot();
    if (current.pauseReason === 'manual') simulation.setPaused(false);
    else if (current.pauseReason === null && current.runState !== 'dead')
      simulation.setPaused(true);
    sync();
  }, [simulation, sync]);

  useEffect(() => {
    input.current = new InputController(togglePause);
    return () => input.current?.detach();
  }, [togglePause]);

  useEffect(() => {
    saveSettings(settings);
    audio.current.setVolume(settings.masterVolume);
    document.documentElement.style.setProperty('--gfl-ui-scale', String(settings.uiScale));
  }, [settings]);

  useEffect(
    () =>
      installTestHooks(
        simulation,
        (next) => store.getState().setScreen(next === 'menu' ? 'menu' : 'game'),
        (next) => store.getState().setSnapshot(next),
        (reducedMotion) =>
          store.getState().setSettings({ ...store.getState().settings, reducedMotion }),
        setEvidenceCapturePaused,
      ),
    [simulation, store],
  );

  useEffect(() => {
    if (screen !== 'game' || surface.current === null || input.current === null) return;
    const controls = input.current;
    controls.attach(surface.current);
    const controlsDebug = new URLSearchParams(window.location.search).get('controlsDebug') === '1';
    let frame = 0;
    let last = performance.now();
    const loop = (now: number) => {
      const current = simulation.getSnapshot();
      const intent = controls.getIntent(current);
      if (controlsDebug) {
        window.__GFL2_CONTROLS_DEBUG__ = {
          cameraMode: current.cameraMode,
          move: intent.move,
          aimYaw: intent.aimYaw,
          aimPitch: intent.aimPitch,
          keys: controls.debugState().keys,
        };
      }
      const steps = simulation.advance((now - last) / 1000, intent);
      controls.acknowledgeSteps(steps);
      last = now;
      sync();
      frame = requestAnimationFrame(loop);
    };
    frame = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(frame);
      controls.detach();
      if (document.pointerLockElement) document.exitPointerLock();
    };
  }, [screen, simulation, sync]);

  useEffect(() => () => audio.current.dispose(), []);

  const updateSettings = (next: PlayerSettings) => store.getState().setSettings(next);
  const startRun = () => {
    simulation.restart(RUN_SEED);
    defeatedIds.current.clear();
    audio.current.reset();
    void audio.current.resume(settings.masterVolume);
    store.getState().setEnemiesDefeated(0);
    store.getState().setScreen('game');
    sync();
  };
  const retry = () => startRun();
  const returnToMenu = () => {
    simulation.setPaused(true);
    store.getState().setScreen('menu');
    sync();
  };
  const chooseUpgrade = (id: string) => {
    simulation.chooseUpgrade(id);
    sync();
  };
  const resolveAttachment = (action: 'equip' | 'retain' | 'salvage') => {
    simulation.resolveAttachment(action);
    sync();
  };
  const purchase = (type: SardisPurchase) => {
    simulation.purchaseSardis(type);
    sync();
  };
  const onDiagnostics = (next: RendererDiagnostics) => {
    store.getState().setRenderer(next);
    publishGameDiagnostics(simulation.getSnapshot(), next);
  };

  if (screen === 'menu') {
    return (
      <div className="gfl-app" data-screen="menu">
        <MenuPreview
          reducedMotion={settings.reducedMotion}
          modalOpen={menuModalOpen}
          onDiagnostics={onDiagnostics}
        />
        <MainMenu
          selectedDollId={selectedDollId}
          settings={settings}
          onStartRun={startRun}
          onSelectDoll={store.getState().setSelectedDollId}
          onSettingsChange={updateSettings}
          onModalChange={setMenuModalOpen}
          onReturnAttempt={() => window.close()}
        />
      </div>
    );
  }

  const rewardReady = snapshot.runState === 'reward' && snapshot.pendingAttachment === null;
  const purchaseRows = [
    {
      id: 'healing',
      name: 'Field repair',
      description: 'Restore 45 health before extraction.',
      cost: SARDIS_COSTS.healing,
      available: snapshot.player.sardis >= SARDIS_COSTS.healing,
      status: 'Insufficient Sardis',
    },
    {
      id: 'levelRerollToken',
      name: 'Adaptation reroll token',
      description: 'Carry one additional card reroll for this run.',
      cost: SARDIS_COSTS.levelRerollToken,
      available: snapshot.player.sardis >= SARDIS_COSTS.levelRerollToken,
      status: 'Insufficient Sardis',
    },
  ] as const;

  return (
    <div
      ref={surface}
      className="gfl-app gfl-game-surface"
      data-screen="game"
      data-run-state={snapshot.runState}
      data-camera-mode={snapshot.cameraMode}
      data-paused={snapshot.paused}
      onPointerDown={(event) => input.current?.requestPointerLock(snapshot, event.target)}
    >
      <GameScene
        snapshot={snapshot}
        reducedMotion={settings.reducedMotion}
        quality={settings.graphicsQuality}
        onDiagnostics={onDiagnostics}
      />
      <GameplayHUD
        snapshot={snapshot}
        uiScale={settings.uiScale}
        onPause={togglePause}
        onSwitchCamera={() => input.current?.queuePulse('switchCamera')}
      />
      <ControlsOverlay />

      <LevelUpOverlay
        snapshot={snapshot}
        onChoose={chooseUpgrade}
        onReroll={() => {
          simulation.rerollUpgrades();
          sync();
        }}
      />
      <AttachmentOverlay
        snapshot={snapshot}
        sardis={snapshot.player.sardis}
        rewardRerollCost={SARDIS_COSTS.attachmentReroll}
        rarityUpgradeCost={SARDIS_COSTS.rarityUpgrade}
        onRewardReroll={() => purchase('attachmentReroll')}
        onRarityUpgrade={() => purchase('rarityUpgrade')}
        onEquip={() => resolveAttachment('equip')}
        onRetain={() => resolveAttachment('retain')}
        onSalvage={() => resolveAttachment('salvage')}
      />
      <PauseMenu
        open={snapshot.pauseReason === 'manual' && !evidenceCapturePaused}
        settings={settings}
        pauseReason={snapshot.pauseReason}
        onResume={togglePause}
        onSettingsChange={updateSettings}
        onRestart={retry}
        onReturnToMenu={returnToMenu}
      />
      {snapshot.runState === 'dead' && (
        <DeathScreen
          elapsed={snapshot.time}
          level={snapshot.player.level}
          enemiesDefeated={enemiesDefeated}
          {...(snapshot.boss ? { bossPhase: snapshot.boss.phase } : {})}
          onRetry={retry}
          onReturnToMenu={returnToMenu}
        />
      )}
      {rewardReady && (
        <ExtractionShop
          sardis={snapshot.player.sardis}
          purchases={purchaseRows}
          attachmentSummary="Guaranteed Warden attachment resolved"
          onPurchase={(id) => purchase(id as SardisPurchase)}
          onExtract={() => {
            simulation.beginExtraction();
            sync();
          }}
        />
      )}
      {snapshot.runState === 'complete' && (
        <ResultsScreen
          summary="The Grassland Warden is neutralized. Stage 2 remains outside this milestone."
          results={[
            { label: 'Field time', value: formatTime(snapshot.time) },
            { label: 'Final level', value: snapshot.player.level },
            { label: 'Hostiles defeated', value: enemiesDefeated },
            { label: 'Sardis remaining', value: Math.floor(snapshot.player.sardis) },
          ]}
          reward="Run-scoped attachment loadout recorded"
          onRetry={retry}
          onReturnToMenu={returnToMenu}
        />
      )}
      <div className="gfl-control-strip" aria-label="Controls">
        WASD move / mouse aim / LMB fire / RMB focus / Shift sprint / Space dodge / R reload / Q E F
        skills / G interact / V camera / Esc pause
      </div>
      <output className="gfl-render-status" aria-label="Renderer status">
        {renderer ? `${renderer.calls} calls / ${renderer.triangles} tris` : 'Renderer warming up'}
      </output>
    </div>
  );
}
