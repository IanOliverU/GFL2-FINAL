export interface RunResultLine {
  label: string;
  value: string | number;
}

export interface ResultsScreenProps {
  title?: string;
  summary: string;
  results: readonly RunResultLine[];
  reward?: string;
  onRetry: () => void;
  onReturnToMenu: () => void;
}

export function ResultsScreen({
  title = 'Grassland extracted',
  summary,
  results,
  reward,
  onRetry,
  onReturnToMenu,
}: ResultsScreenProps) {
  return (
    <main className="gfl-end-screen gfl-end-screen--success">
      <section>
        <p className="gfl-eyebrow">Stage 01 / operation complete</p>
        <h1>{title}</h1>
        <p>{summary}</p>
        <dl className="gfl-run-ledger">
          {results.map((result) => (
            <div key={result.label}>
              <dt>{result.label}</dt>
              <dd>{result.value}</dd>
            </div>
          ))}
        </dl>
        {reward && (
          <div className="gfl-result-reward">
            <span>Guaranteed field reward</span>
            <strong>{reward}</strong>
          </div>
        )}
        <div className="gfl-end-actions">
          <button
            className="gfl-button gfl-button--primary"
            type="button"
            autoFocus
            onClick={onRetry}
          >
            Run Grassland again
          </button>
          <button className="gfl-button" type="button" onClick={onReturnToMenu}>
            Return to main menu
          </button>
        </div>
      </section>
    </main>
  );
}
