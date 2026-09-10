import { useState, type ReactNode } from 'react';
import { createGameSimulation } from '../../game';
import { loadSettings } from '../../platform/storage/settings';
import { createAppStore } from '../store';
import { GameContext, type GameRuntime } from './gameContext';

export function GameProvider({ children }: { children: ReactNode }) {
  const [runtime] = useState<GameRuntime>(() => {
    const simulation = createGameSimulation(20260911);
    return {
      simulation,
      store: createAppStore(simulation.getSnapshot(), loadSettings()),
    };
  });
  return <GameContext.Provider value={runtime}>{children}</GameContext.Provider>;
}
