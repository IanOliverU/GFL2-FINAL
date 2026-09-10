import type { GameSnapshot } from '../../game';
import { ModalShell } from '../components/ModalShell';
import { toGameUiView } from '../types';

export interface LevelUpOverlayProps {
  snapshot: GameSnapshot;
  onChoose: (choiceId: string) => void;
  onReroll: () => void;
}

export function LevelUpOverlay({ snapshot, onChoose, onReroll }: LevelUpOverlayProps) {
  const view = toGameUiView(snapshot);
  if (!view.levelUp) return null;

  return (
    <ModalShell
      title={`Level ${view.player.level} field adaptation`}
      eyebrow="Simulation paused / choose one"
      description="The gameplay simulation remains frozen until a card is selected."
      dismissible={false}
      size="wide"
      actions={
        <button className="gfl-button" type="button" onClick={onReroll}>
          Reroll choices{' '}
          <span>
            {view.levelUp.rerolls} token{view.levelUp.rerolls === 1 ? '' : 's'}
          </span>
        </button>
      }
    >
      <div className="gfl-upgrade-grid">
        {view.levelUp.choices.map((choice, index) => (
          <button
            key={choice.id}
            className="gfl-upgrade-card"
            type="button"
            onClick={() => onChoose(choice.id)}
          >
            <span className="gfl-upgrade-card__index">0{index + 1}</span>
            <span className="gfl-upgrade-card__category">{choice.category}</span>
            <strong>{choice.name}</strong>
            <p>{choice.description}</p>
            <span className="gfl-upgrade-card__level">
              Rank {choice.level} / {choice.maxLevel}
            </span>
            {choice.guaranteed && <b className="gfl-status-label">Guaranteed core skill</b>}
            <i>Install adaptation</i>
          </button>
        ))}
      </div>
    </ModalShell>
  );
}
