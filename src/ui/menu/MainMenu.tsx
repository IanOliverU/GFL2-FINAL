import { useRef, useState } from 'react';
import { ModalShell } from '../components/ModalShell';
import { SettingsPanel } from '../components/SettingsPanel';
import type { DollOption, PlayerSettings } from '../types';

type MenuPanel = 'dolls' | 'settings' | 'credits' | 'return' | null;

const DEFAULT_DOLLS: readonly DollOption[] = [
  {
    id: 'tololo',
    name: 'Tololo',
    weapon: 'AK-Alfa',
    passive: 'Signature passive supplied by gameplay data',
    available: true,
  },
  {
    id: 'qiongjiu',
    name: 'Qiongjiu',
    weapon: 'QBZ-191',
    passive: 'Future roster slot',
    available: false,
  },
  {
    id: 'mosin',
    name: 'Mosin-Nagant',
    weapon: 'Mosin-Nagant',
    passive: 'Future roster slot',
    available: false,
  },
];

export interface MainMenuProps {
  selectedDollId: string;
  settings: PlayerSettings;
  dolls?: readonly DollOption[];
  onStartRun: () => void;
  onSelectDoll: (id: string) => void;
  onSettingsChange: (settings: PlayerSettings) => void;
  onModalChange?: (open: boolean) => void;
  onReturnAttempt?: () => void;
}

export function MainMenu({
  selectedDollId,
  settings,
  dolls = DEFAULT_DOLLS,
  onStartRun,
  onSelectDoll,
  onSettingsChange,
  onModalChange,
  onReturnAttempt,
}: MainMenuProps) {
  const [panel, setPanelState] = useState<MenuPanel>(null);
  const returnFocus = useRef<HTMLButtonElement>(null);
  const selected = dolls.find((doll) => doll.id === selectedDollId) ?? dolls[0];

  const setPanel = (next: MenuPanel, trigger?: HTMLButtonElement) => {
    if (trigger) returnFocus.current = trigger;
    setPanelState(next);
    onModalChange?.(next !== null);
    if (next === null) requestAnimationFrame(() => returnFocus.current?.focus());
  };

  return (
    <main
      className="gfl-menu-shell"
      style={{ '--gfl-ui-scale': settings.uiScale } as React.CSSProperties}
    >
      <a className="gfl-skip-link" href="#gfl-main-actions">
        Skip to menu actions
      </a>
      <section className="gfl-menu-rail" aria-labelledby="gfl-main-title">
        <header className="gfl-menu-brand">
          <p className="gfl-eyebrow">Elmo command / Grassland sortie</p>
          <h1 id="gfl-main-title">
            GFL2
            <br />
            Field Protocol
          </h1>
          <div className="gfl-menu-stage-line">
            <span>Stage 01</span>
            <strong>Flat Grassland</strong>
          </div>
        </header>

        <nav id="gfl-main-actions" className="gfl-menu-actions" aria-label="Main menu">
          <button className="gfl-action gfl-action--primary" type="button" onClick={onStartRun}>
            <span>Start run</span>
            <small>Grassland / Level 1</small>
          </button>
          <button
            className="gfl-action"
            type="button"
            onClick={(event) => setPanel('dolls', event.currentTarget)}
          >
            <span>Doll selection</span>
            <small>{selected?.name ?? 'No Doll selected'}</small>
          </button>
          <button
            className="gfl-action"
            type="button"
            aria-describedby="archive-unavailable"
            onClick={() => undefined}
          >
            <span>Loadout / Archive</span>
            <small id="archive-unavailable">Unavailable in this one-shot</small>
          </button>
          <button
            className="gfl-action"
            type="button"
            onClick={(event) => setPanel('settings', event.currentTarget)}
          >
            <span>Settings</span>
            <small>Display / audio / access</small>
          </button>
          <button
            className="gfl-action"
            type="button"
            onClick={(event) => setPanel('credits', event.currentTarget)}
          >
            <span>Credits</span>
            <small>Project and placeholder notices</small>
          </button>
          <button
            className="gfl-action gfl-action--quiet"
            type="button"
            onClick={(event) => setPanel('return', event.currentTarget)}
          >
            <span>Return to browser</span>
            <small>Browser limitation applies</small>
          </button>
        </nav>

        <footer className="gfl-menu-footer">
          <span className="gfl-status-dot" aria-hidden="true" />
          <span>Local runtime ready</span>
          <b>v0.1 one-shot</b>
        </footer>
      </section>

      <aside className="gfl-placeholder-notice" aria-label="Asset status">
        <strong>Local Tololo PMX integration</strong>
        <span>
          Gameplay-only proof. Procedural motion and temporary AK-Alfa; redistribution unverified.
        </span>
      </aside>

      {panel === 'dolls' && (
        <ModalShell
          title="Doll selection"
          eyebrow="Sortie roster"
          description="Only the Grassland proof slot is active in this build."
          onClose={() => setPanel(null)}
          size="wide"
          actions={
            <button
              className="gfl-button gfl-button--primary"
              type="button"
              onClick={() => setPanel(null)}
            >
              Confirm selection
            </button>
          }
        >
          <div className="gfl-doll-list" role="radiogroup" aria-label="Available Dolls">
            {dolls.map((doll) => (
              <button
                key={doll.id}
                className="gfl-doll-option"
                type="button"
                role="radio"
                aria-checked={doll.id === selectedDollId}
                aria-disabled={!doll.available}
                onClick={() => doll.available && onSelectDoll(doll.id)}
              >
                <span className="gfl-doll-option__silhouette" aria-hidden="true">
                  <i />
                </span>
                <span className="gfl-doll-option__copy">
                  <strong>{doll.name}</strong>
                  <span>{doll.weapon}</span>
                  <small>
                    {doll.available ? doll.passive : 'Unavailable until a later Grassland gate'}
                  </small>
                  {doll.placeholder && <b>Temporary mannequin presentation</b>}
                </span>
                <span className="gfl-doll-option__state">
                  {doll.id === selectedDollId
                    ? 'Selected'
                    : doll.available
                      ? 'Available'
                      : 'Locked'}
                </span>
              </button>
            ))}
          </div>
        </ModalShell>
      )}

      {panel === 'settings' && (
        <ModalShell
          title="Settings"
          eyebrow="Local preferences"
          description="Changes are emitted to the app; persistence is owned by the platform layer."
          onClose={() => setPanel(null)}
          actions={
            <button
              className="gfl-button gfl-button--primary"
              type="button"
              onClick={() => setPanel(null)}
            >
              Apply and close
            </button>
          }
        >
          <SettingsPanel value={settings} onChange={onSettingsChange} />
        </ModalShell>
      )}

      {panel === 'credits' && (
        <ModalShell
          title="Credits and notices"
          eyebrow="One-shot build"
          onClose={() => setPanel(null)}
        >
          <div className="gfl-prose">
            <p>
              <strong>Direction:</strong> Ian Oliver Umipig
            </p>
            <p>
              GFL2-inspired project palette values are approximate production tokens pending
              authoritative licensed references.
            </p>
            <p>
              Tololo uses local-only PMX source during gameplay. Her procedural animation and the
              temporary AK-Alfa remain provisional; redistribution permission is not verified.
            </p>
          </div>
        </ModalShell>
      )}

      {panel === 'return' && (
        <ModalShell
          title="Return to browser"
          eyebrow="Browser limitation"
          description="A web page usually cannot close a tab that you opened yourself."
          onClose={() => setPanel(null)}
          actions={
            <>
              <button className="gfl-button" type="button" onClick={() => setPanel(null)}>
                Stay in menu
              </button>
              <button
                className="gfl-button gfl-button--primary"
                type="button"
                onClick={onReturnAttempt}
              >
                Attempt to close tab
              </button>
            </>
          }
        >
          <div className="gfl-prose">
            <p>
              If the browser refuses the request, close this tab with <kbd>Ctrl</kbd> + <kbd>W</kbd>{' '}
              or use your browser's tab controls. No progress is stored by this interface.
            </p>
          </div>
        </ModalShell>
      )}
    </main>
  );
}
