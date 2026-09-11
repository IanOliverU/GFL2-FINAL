import { TOLOLO, type GameSnapshot, type SkillId } from '../../game';
import { ModalShell } from '../components/ModalShell';
import { toGameUiView } from '../types';

interface KitCardInfo {
  effect: string;
  meta: string;
}

// Static display data for the Tololo kit cards. Numbers mirror the provisional
// simulation coefficients and are labeled as such; this overlay never owns them.
const KIT_CARD_INFO: Readonly<Record<string, KitCardInfo>> = {
  skill1: {
    effect: 'Fan of 5 Hydro projectiles; marked targets take +20% weapon damage for 4s.',
    meta: `Cooldown ${TOLOLO.skills.skill1.cooldown}s · 10+3/rank dmg · PROVISIONAL values`,
  },
  skill2: {
    effect:
      'Defensive pulse: brief dodge window, stagger nearby hostiles, movement and armor buff.',
    meta: `Cooldown ${TOLOLO.skills.skill2.cooldown}s · 3+0.3s/rank buff · PROVISIONAL values`,
  },
  ultimate: {
    effect: 'Starfall strikes every hostile and immediately resets Skill 1 (extra action).',
    meta: `Cooldown ${TOLOLO.skills.ultimate.cooldown}s · 42+12/rank dmg · PROVISIONAL values`,
  },
  weaponDamage: {
    effect: 'Calibrate the AK-Alfa receiver for higher basic-attack damage.',
    meta: `+12% damage per rank · base ${TOLOLO.weapon.damage} · PROVISIONAL values`,
  },
};

function isCoreSkill(id: string): id is SkillId {
  return id === 'skill1' || id === 'skill2' || id === 'ultimate';
}

function cardStatus(choice: { id: string; level: number; maxLevel: number }): string {
  if (isCoreSkill(choice.id)) {
    return choice.level <= 0
      ? 'New unlock'
      : `Rank ${choice.level} → ${Math.min(choice.level + 1, choice.maxLevel)}`;
  }
  return `Rank ${choice.level} / ${choice.maxLevel}`;
}

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
            {KIT_CARD_INFO[choice.id] !== undefined && (
              <>
                <p className="gfl-upgrade-card__effect">{KIT_CARD_INFO[choice.id]?.effect}</p>
                <span className="gfl-upgrade-card__meta">{KIT_CARD_INFO[choice.id]?.meta}</span>
              </>
            )}
            <span className="gfl-upgrade-card__level">{cardStatus(choice)}</span>
            {choice.guaranteed && <b className="gfl-status-label">Guaranteed core skill</b>}
            <i>Install adaptation</i>
          </button>
        ))}
      </div>
    </ModalShell>
  );
}
