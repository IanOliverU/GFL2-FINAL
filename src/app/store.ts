import { create } from 'zustand';
import type { GameSnapshot } from '../game';
import type { RendererDiagnostics } from '../render';
import type { PlayerSettings } from '../ui';

export type AppScreen = 'menu' | 'game';

export const DEFAULT_SETTINGS: PlayerSettings = {
  uiScale: 1,
  reducedMotion: false,
  masterVolume: 0.45,
  graphicsQuality: 'high',
};

interface AppState {
  screen: AppScreen;
  selectedDollId: string;
  settings: PlayerSettings;
  snapshot: GameSnapshot;
  renderer: RendererDiagnostics | null;
  enemiesDefeated: number;
  setScreen: (screen: AppScreen) => void;
  setSettings: (settings: PlayerSettings) => void;
  setSnapshot: (snapshot: GameSnapshot) => void;
  setRenderer: (renderer: RendererDiagnostics) => void;
  setSelectedDollId: (selectedDollId: string) => void;
  setEnemiesDefeated: (enemiesDefeated: number) => void;
}

export function createAppStore(initialSnapshot: GameSnapshot, settings: PlayerSettings) {
  return create<AppState>((set) => ({
    screen: 'menu',
    selectedDollId: 'tololo',
    settings,
    snapshot: initialSnapshot,
    renderer: null,
    enemiesDefeated: 0,
    setScreen: (screen) => set({ screen }),
    setSettings: (next) => set({ settings: next }),
    setSnapshot: (snapshot) => set({ snapshot }),
    setRenderer: (renderer) => set({ renderer }),
    setSelectedDollId: (selectedDollId) => set({ selectedDollId }),
    setEnemiesDefeated: (enemiesDefeated) => set({ enemiesDefeated }),
  }));
}

export type AppStore = ReturnType<typeof createAppStore>;
