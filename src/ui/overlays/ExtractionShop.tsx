export interface ExtractionPurchase {
  id: string;
  name: string;
  description: string;
  cost: number;
  available: boolean;
  status: string;
}

export interface ExtractionShopProps {
  sardis: number;
  purchases: readonly ExtractionPurchase[];
  attachmentSummary?: string;
  onPurchase: (purchaseId: string) => void;
  onExtract: () => void;
}

export function ExtractionShop({
  sardis,
  purchases,
  attachmentSummary,
  onPurchase,
  onExtract,
}: ExtractionShopProps) {
  return (
    <main className="gfl-extraction-shop">
      <section className="gfl-extraction-shop__intro">
        <p className="gfl-eyebrow">Warden neutralized / extraction online</p>
        <h1>Field terminal</h1>
        <p>
          Spend run-scoped Sardis before extraction. Unspent currency does not become permanent
          progression.
        </p>
        <output>
          <span>Sardis available</span>
          {Math.floor(sardis)}
        </output>
        {attachmentSummary && (
          <p className="gfl-shop-loot">
            Reward secured: <strong>{attachmentSummary}</strong>
          </p>
        )}
      </section>
      <section className="gfl-shop-list" aria-label="Extraction purchases">
        {purchases.map((purchase) => (
          <button
            key={purchase.id}
            type="button"
            className="gfl-shop-item"
            aria-disabled={!purchase.available}
            onClick={() => purchase.available && onPurchase(purchase.id)}
          >
            <span>
              <strong>{purchase.name}</strong>
              <small>{purchase.description}</small>
            </span>
            <span className="gfl-shop-item__cost">
              {purchase.cost} <i>S</i>
            </span>
            <b>{purchase.available ? 'Purchase available' : purchase.status}</b>
          </button>
        ))}
      </section>
      <footer>
        <button className="gfl-button gfl-button--primary" type="button" onClick={onExtract}>
          Complete extraction
        </button>
      </footer>
    </main>
  );
}
