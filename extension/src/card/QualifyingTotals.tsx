import type { DisplayUnit } from '@/lib/types';
import { formatTotal } from '@/lib/units';
import type { QualifyingGap, WhereYouStandCard } from '@/chat/types';

const statusOf = (gapKg: number): 'qualified' | 'near' | 'distant' => {
  if (gapKg <= 0) return 'qualified';
  if (gapKg <= 20) return 'near';
  return 'distant';
};

const glyph: Record<'qualified' | 'near' | 'distant', string> = {
  qualified: '✓',
  near: '○',
  distant: '·',
};

const statusLabel: Record<'qualified' | 'near' | 'distant', string> = {
  qualified: 'Qualified',
  near: 'Within range',
  distant: 'Distant',
};

const gapCopy = (gapKg: number, unit: DisplayUnit): string => {
  if (gapKg <= 0) {
    return `qualified — +${formatTotal(Math.abs(gapKg), { unit })} cushion`;
  }
  return `${formatTotal(gapKg, { unit })} to go`;
};

const Row = ({
  row,
  displayUnit,
}: {
  row: QualifyingGap;
  displayUnit: DisplayUnit;
}) => {
  const status = statusOf(row.gapKg);
  return (
    <div className={`qt-row qt-${status}`}>
      <span className="qt-glyph" aria-label={statusLabel[status]}>
        {glyph[status]}
      </span>
      <div className="qt-main">
        <div className="qt-title">
          {row.federation} · {row.event}
        </div>
        <div className="qt-meta">
          {row.ageDivision} · {formatTotal(row.weightClassKg, { unit: displayUnit })} · {row.equipment}
        </div>
      </div>
      <div className="qt-target">
        <div className="qt-target-num">
          {formatTotal(row.targetTotalKg, { unit: displayUnit })}
        </div>
        <div className="qt-gap">{gapCopy(row.gapKg, displayUnit)}</div>
      </div>
    </div>
  );
};

export const QualifyingTotals = ({
  card,
  displayUnit,
}: {
  card: WhereYouStandCard;
  displayUnit: DisplayUnit;
}) => {
  if (card.qualifying.length === 0) {
    return (
      <div className="card-section">
        <div className="section-title">Qualifying totals</div>
        <div className="empty-note">
          No rows matched for {card.totals.sex === 'M' ? 'men' : 'women'} at this class + equipment.
        </div>
      </div>
    );
  }
  return (
    <div className="card-section">
      <div className="section-title">Qualifying totals</div>
      <div className="qt-list">
        {card.qualifying.map((row, i) => (
          <Row key={`${row.federation}-${row.event}-${i}`} row={row} displayUnit={displayUnit} />
        ))}
      </div>
    </div>
  );
};
