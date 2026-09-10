import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './app/App';
import { GameProvider } from './app/providers/GameProvider';
import './styles/index.css';

const root = document.getElementById('root');
if (root === null) throw new Error('Application root was not found.');

createRoot(root).render(
  <StrictMode>
    <GameProvider>
      <App />
    </GameProvider>
  </StrictMode>,
);
