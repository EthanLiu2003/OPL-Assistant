import type { AssistantTurn } from '@/chat/types';
import type { DisplayUnit } from '@/lib/types';
import { formatTotal, formatWeightClass } from '@/lib/units';

type CohortPreviewProps = {
  turn: AssistantTurn;
  displayUnit: DisplayUnit;
  onOpen: (turn: AssistantTurn) => void;
  onWhereYouStand?: (turn: AssistantTurn) => void;
};

export const CohortPreview = ({ turn, displayUnit, onOpen, onWhereYouStand }: CohortPreviewProps) => {
  if (!turn.cohort) return null;

  const {
    totalCount,
    topRows,
    surroundingRows,
    namedLifter,
    namedRank,
    namedNotFound,
  } = turn.cohort;
  const slug = turn.parsed.weightClassSlug;
  const nameQuery = turn.parsed.q;
  const userRank = turn.cohort.userRank ?? turn.card?.cohort.userRank ?? null;
  const hasUserPosition = userRank != null && surroundingRows.length > 0;

  return (
    <div className="cohort-preview">
      <div className="cohort-meta">
        {totalCount.toLocaleString()} lifter{totalCount === 1 ? '' : 's'} in cohort
        {slug && ` · ${formatWeightClass(slug, displayUnit)} class`}
      </div>

      {nameQuery && namedLifter && namedRank != null && (
        <div className="named-lifter">
          <div className="named-label">Found in cohort</div>
          <div className="named-row">
            <span className="named-rank">#{namedRank}</span>
            <div className="named-main">
              <div className="named-name">{namedLifter.name}</div>
              <div className="named-meta">
                {namedLifter.bodyweightKg != null &&
                  `${namedLifter.bodyweightKg} kg BW · `}
                {namedLifter.equipment} · {namedLifter.federation}
                {namedLifter.date && ` · ${namedLifter.date}`}
              </div>
            </div>
            <div className="named-total">
              {formatTotal(namedLifter.totalKg, { unit: displayUnit })}
              {namedLifter.score != null && (
                <div className="named-score">{namedLifter.score.toFixed(1)} DOTS</div>
              )}
            </div>
          </div>
        </div>
      )}

      {nameQuery && namedNotFound && (
        <div className="cohort-hint">
          <strong>{nameQuery}</strong> not found in this cohort. They might be in
          a different weight class, federation, or age division — try loosening
          filters.
        </div>
      )}

      {hasUserPosition && (
        <div className="your-position">
          <div className="section-mini">Your position in cohort</div>
          <div className="cohort-rows">
            {surroundingRows.map((row) => {
              const isYou = row.rank === userRank;
              return (
                <div
                  key={`surr-${row.rank}-${row.username}`}
                  className={`cohort-row${isYou ? ' you-row' : ''}`}
                >
                  <span className="cr-rank">#{row.rank}</span>
                  <span className="cr-name">{isYou ? 'You' : row.name}</span>
                  <span className="cr-total">
                    {formatTotal(row.totalKg, { unit: displayUnit })}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="cohort-rows">
        <div className="section-mini">Top 5 by total</div>
        {topRows.slice(0, 5).map((row) => (
          <div
            key={`${row.username}-${row.meetSlug}`}
            className={`cohort-row${namedLifter?.username === row.username ? ' match' : ''}`}
          >
            <span className="cr-rank">#{row.rank}</span>
            <span className="cr-name">{row.name}</span>
            <span className="cr-total">
              {formatTotal(row.totalKg, { unit: displayUnit })}
            </span>
          </div>
        ))}
      </div>
      {nameQuery && namedLifter ? (
        <div className="cohort-actions">
          <a
            className="open-opl"
            href={`https://www.openpowerlifting.org/u/${namedLifter.username}`}
            target="_blank"
            rel="noopener noreferrer"
          >
            See {namedLifter.name} on OpenPowerlifting &rarr;
          </a>
          {onWhereYouStand && (
            <button className="wys-btn" onClick={() => onWhereYouStand(turn)} type="button">
              Where You Stand
            </button>
          )}
        </div>
      ) : (
        <button className="open-opl" onClick={() => onOpen(turn)} type="button">
          Open on OpenPowerlifting &rarr;
        </button>
      )}
    </div>
  );
};
