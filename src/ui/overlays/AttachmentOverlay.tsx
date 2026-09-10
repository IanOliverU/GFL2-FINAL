import type { GameSnapshot } from '../../game';
import { ModalShell } from '../components/ModalShell';
import { toGameUiView, type AttachmentView } from '../types';

function AttachmentSpec({ item, label }: { item: AttachmentView | null; label: string }) {
  return (
    <section className="gfl-attachment-spec">
      <span className="gfl-eyebrow">{label}</span>
      {item ? (
        <>
          <header>
            <strong>{item.name}</strong>
            <span>
              {item.rarity} / {item.slot}
            </span>
          </header>
          <dl>
            {item.affixes.map((affix, index) => (
              <div key={`${affix.label}-${index}`}>
                <dt>{affix.label}</dt>
                <dd>{affix.value}</dd>
              </div>
            ))}
          </dl>
        </>
      ) : (
        <p className="gfl-empty-state">Empty {label.toLowerCase()} slot</p>
      )}
    </section>
  );
}

export interface AttachmentOverlayProps {
  snapshot: GameSnapshot;
  sardis?: number;
  rewardRerollCost?: number;
  rarityUpgradeCost?: number;
  onRewardReroll?: () => void;
  onRarityUpgrade?: () => void;
  onEquip: (attachmentId: string) => void;
  onRetain: (attachmentId: string) => void;
  onSalvage: (attachmentId: string) => void;
}

export function AttachmentOverlay({
  snapshot,
  sardis = 0,
  rewardRerollCost = 0,
  rarityUpgradeCost = 0,
  onRewardReroll,
  onRarityUpgrade,
  onEquip,
  onRetain,
  onSalvage,
}: AttachmentOverlayProps) {
  const view = toGameUiView(snapshot);
  const pending = view.pendingAttachment;
  if (!pending) return null;
  const equipped = view.equipped.find((item) => item.slot === pending.slot) ?? null;

  return (
    <ModalShell
      title="Attachment recovered"
      eyebrow="Field comparison"
      description="Choose where this run-scoped item goes. Compatible-slot rules remain owned by gameplay."
      dismissible={false}
      size="wide"
      actions={
        <>
          {onRewardReroll && (
            <button
              className="gfl-button"
              type="button"
              disabled={sardis < rewardRerollCost}
              onClick={onRewardReroll}
            >
              Reroll reward ({rewardRerollCost} Sardis)
            </button>
          )}
          {onRarityUpgrade && (
            <button
              className="gfl-button"
              type="button"
              disabled={sardis < rarityUpgradeCost || pending.rarity === 'Tier 4'}
              onClick={onRarityUpgrade}
            >
              Upgrade rarity ({rarityUpgradeCost} Sardis)
            </button>
          )}
          <button className="gfl-button" type="button" onClick={() => onRetain(pending.id)}>
            Retain in field cache
          </button>
          <button className="gfl-button" type="button" onClick={() => onSalvage(pending.id)}>
            Salvage for {pending.salvageValue} Sardis
          </button>
          <button
            className="gfl-button gfl-button--primary"
            type="button"
            onClick={() => onEquip(pending.id)}
          >
            Equip attachment
          </button>
        </>
      }
    >
      <div className="gfl-attachment-compare">
        <AttachmentSpec item={pending} label="Recovered" />
        <span className="gfl-attachment-compare__mark" aria-hidden="true">
          &lt;-&gt;
        </span>
        <AttachmentSpec item={equipped} label="Equipped" />
      </div>
    </ModalShell>
  );
}
