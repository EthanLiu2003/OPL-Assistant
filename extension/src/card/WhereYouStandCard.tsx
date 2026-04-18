import type { DisplayUnit } from '@/lib/types';
import type { WhereYouStandCard as CardShape } from '@/chat/types';
import { Hero } from './Hero';
import { QualifyingTotals } from './QualifyingTotals';

export const WhereYouStandCard = ({
  card,
  displayUnit,
  onRefresh,
}: {
  card: CardShape;
  displayUnit: DisplayUnit;
  onRefresh?: () => void;
}) => (
  <div className="ws-card">
    <Hero card={card} displayUnit={displayUnit} />
    <QualifyingTotals card={card} displayUnit={displayUnit} />
    {onRefresh && (
      <div className="card-footer">
        <button className="refresh-btn" onClick={onRefresh} type="button">
          Refresh against current data
        </button>
        <div className="card-ts">
          computed {new Date(card.computedAt).toLocaleTimeString()}
        </div>
      </div>
    )}
  </div>
);
