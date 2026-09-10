import { useState } from 'react';
import { ModalShell } from '../components/ModalShell';
import { SettingsPanel } from '../components/SettingsPanel';
import type { PlayerSettings } from '../types';

export interface PauseMenuProps {
  open: boolean;
  settings: PlayerSettings;
  pauseReason?: string | null;
  onResume: () => void;
  onSettingsChange: (settings: PlayerSettings) => void;
  onRestart: () => void;
  onReturnToMenu: () => void;
}

export function PauseMenu({
  open,
  settings,
  pauseReason,
  onResume,
  onSettingsChange,
  onRestart,
  onReturnToMenu,
}: PauseMenuProps) {
  const [showSettings, setShowSettings] = useState(false);
  if (!open) return null;

  return (
    <ModalShell
      title={showSettings ? 'Run settings' : 'Field operation paused'}
      eyebrow={pauseReason ? `Paused / ${pauseReason}` : 'Simulation suspended'}
      description={
        showSettings
          ? 'Settings apply without advancing the simulation.'
          : 'All authoritative gameplay systems should remain frozen.'
      }
      onClose={showSettings ? () => setShowSettings(false) : onResume}
      actions={
        showSettings ? (
          <button
            className="gfl-button gfl-button--primary"
            type="button"
            onClick={() => setShowSettings(false)}
          >
            Apply and return
          </button>
        ) : (
          <button className="gfl-button gfl-button--primary" type="button" onClick={onResume}>
            Resume operation
          </button>
        )
      }
    >
      {showSettings ? (
        <SettingsPanel value={settings} onChange={onSettingsChange} />
      ) : (
        <nav className="gfl-pause-actions" aria-label="Pause menu actions">
          <button type="button" onClick={() => setShowSettings(true)}>
            Settings <small>Audio, access, graphics</small>
          </button>
          <button type="button" onClick={onRestart}>
            Restart run <small>Current run progress will be lost</small>
          </button>
          <button type="button" onClick={onReturnToMenu}>
            Return to main menu <small>End this run</small>
          </button>
        </nav>
      )}
    </ModalShell>
  );
}
