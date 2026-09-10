export interface DeathScreenProps {
  elapsed: number;
  level: number;
  enemiesDefeated: number;
  bossPhase?: number;
  onRetry: () => void;
  onReturnToMenu: () => void;
}

function formatTime(seconds: number): string {
  const safe = Math.max(0, Math.floor(seconds));
  return `${String(Math.floor(safe / 60)).padStart(2, '0')}:${String(safe % 60).padStart(2, '0')}`;
}

export function DeathScreen({
  elapsed,
  level,
  enemiesDefeated,
  bossPhase,
  onRetry,
  onReturnToMenu,
}: DeathScreenProps) {
  return (
    <main className="gfl-end-screen gfl-end-screen--death">
      <section>
        <p className="gfl-eyebrow">Operation terminated / Sardis lost</p>
        <h1>Doll signal lost</h1>
        <p>
          The Grassland run has ended. Retry starts a clean simulation with the selected Doll slot.
        </p>
        <dl className="gfl-run-ledger">
          <div>
            <dt>Field time</dt>
            <dd>{formatTime(elapsed)}</dd>
          </div>
          <div>
            <dt>Final level</dt>
            <dd>{level}</dd>
          </div>
          <div>
            <dt>Hostiles defeated</dt>
            <dd>{enemiesDefeated}</dd>
          </div>
          {bossPhase !== undefined && (
            <div>
              <dt>Warden phase reached</dt>
              <dd>{bossPhase}</dd>
            </div>
          )}
        </dl>
        <div className="gfl-end-actions">
          <button
            className="gfl-button gfl-button--primary"
            type="button"
            autoFocus
            onClick={onRetry}
          >
            Retry Grassland
          </button>
          <button className="gfl-button" type="button" onClick={onReturnToMenu}>
            Return to main menu
          </button>
        </div>
      </section>
    </main>
  );
}
