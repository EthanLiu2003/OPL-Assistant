import type { DisplayUnit } from '@/lib/types';
import { formatTotal } from '@/lib/units';
import type { WhereYouStandCard } from '@/chat/types';
import { topPercentile } from './cohort-summary';

const fmtPct = (pct: number) => {
  if (pct < 1) return pct.toFixed(2);
  if (pct < 10) return pct.toFixed(1);
  return Math.round(pct).toString();
};

const fmtScore = (n: number): string => {
  if (!Number.isFinite(n)) return '—';
  return n.toFixed(1);
};

export const Hero = ({
  card,
  displayUnit,
}: {
  card: WhereYouStandCard;
  displayUnit: DisplayUnit;
}) => {
  const { cohort, totals, scoring } = card;
  const pct = topPercentile(cohort.userRank, cohort.totalCount);
  const pctCopy = cohort.totalCount > 0 ? `top ${fmtPct(pct)}%` : 'no cohort data';

  if (cohort.totalCount <= 0) {
    return (
      <div className="card-hero">
        <div className="hero-pct">Cohort data unavailable</div>
        <div className="hero-cohort">{cohort.summary}</div>
        <div className="hero-total">
          {formatTotal(totals.userTotalKg, { unit: displayUnit })}
        </div>
      </div>
    );
  }

  return (
    <div className="card-hero">
      <div className="hero-pct">{pctCopy}</div>
      <div className="hero-cohort">of {cohort.summary}</div>
      <div className="hero-rank">
        #{cohort.userRank.toLocaleString()} of {cohort.totalCount.toLocaleString()}
      </div>
      <div className="hero-total">
        {formatTotal(totals.userTotalKg, { unit: displayUnit })}
      </div>
      <div className="hero-scores">
        <div className="score-chip">
          <span className="score-value">{fmtScore(scoring.dots)}</span>
          <span className="score-label">DOTS</span>
        </div>
        <div className="score-chip">
          <span className="score-value">{fmtScore(scoring.wilks)}</span>
          <span className="score-label">Wilks</span>
        </div>
        <div className="score-chip">
          <span className="score-value">{fmtScore(scoring.ipfGl)}</span>
          <span className="score-label">IPF GL</span>
        </div>
      </div>
    </div>
  );
};
