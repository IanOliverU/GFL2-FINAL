import { createContext, useContext } from 'react';
import type { GameSimulationContract } from '../../game';
import type { AppStore } from '../store';

export interface GameRuntime {
  simulation: GameSimulationContract;
  store: AppStore;
}

export const GameContext = createContext<GameRuntime | null>(null);

export function useGameRuntime(): GameRuntime {
  const runtime = useContext(GameContext);
  if (runtime === null) throw new Error('useGameRuntime must be used inside GameProvider.');
  return runtime;
}
