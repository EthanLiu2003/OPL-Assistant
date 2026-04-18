import { useEffect, useState } from 'react';
import type { DisplayUnit } from '@/lib/types';
import { formatTotal, formatWeightClass } from '@/lib/units';
import { fetchLifterCsv } from './lifter-client';
import { buildLifterProfile, type LifterProfile } from './types';
import { ProgressionChart } from './ProgressionChart';
import { dots } from '@/scoring/dots';

type Props = {
  username: string;
  displayUnit: DisplayUnit;
};

export const LifterProfileView = ({ username, displayUnit }: Props) => {
  const [profile, setProfile] = useState<LifterProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    fetchLifterCsv(username).then((entries) => {
      if (cancelled) return;
      if (!entries || entries.length === 0) {
        setError('Lifter data not available.');
        setLoading(false);
        return;
      }
      setProfile(buildLifterProfile(username, entries));
      setLoading(false);
    });

    return () => { cancelled = true; };
  }, [username]);
  /* eslint-enable react-hooks/set-state-in-effect */

  if (loading) {
    return <div className="lifter-loading">Loading {username}...</div>;
  }

  if (error || !profile) {
    return <div className="lifter-error">{error ?? 'Could not load lifter data.'}</div>;
  }

  const { bestTotal, latestEntry, entries } = profile;
  const best = bestTotal;
  const latest = latestEntry;

  return (
    <div className="lifter-profile">
      <div className="lifter-header">
        <div className="lifter-name">{best?.sex === 'F' ? '♀' : '♂'} {username}</div>
        {latest && (
          <div className="lifter-meta">
            {latest.federation} · {latest.equipment}
            {latest.weightClassKg && ` · ${formatWeightClass(latest.weightClassKg, displayUnit)}`}
          </div>
        )}
      </div>

      {best && (
        <div className="lifter-bests">
          <div className="best-row">
            <span className="best-label">Best total</span>
            <span className="best-value">{formatTotal(best.totalKg!, { unit: displayUnit })}</span>
          </div>
          {best.squatKg != null && (
            <div className="best-row">
              <span className="best-label">Squat</span>
              <span className="best-value squat">{formatTotal(best.squatKg, { unit: displayUnit })}</span>
            </div>
          )}
          {best.benchKg != null && (
            <div className="best-row">
              <span className="best-label">Bench</span>
              <span className="best-value bench">{formatTotal(best.benchKg, { unit: displayUnit })}</span>
            </div>
          )}
          {best.deadliftKg != null && (
            <div className="best-row">
              <span className="best-label">Deadlift</span>
              <span className="best-value deadlift">{formatTotal(best.deadliftKg, { unit: displayUnit })}</span>
            </div>
          )}
          {best.bodyweightKg != null && best.totalKg != null && (
            <div className="best-row">
              <span className="best-label">DOTS</span>
              <span className="best-value">{dots(best.totalKg, best.bodyweightKg, best.sex).toFixed(1)}</span>
            </div>
          )}
        </div>
      )}

      <div className="lifter-section">
        <div className="section-mini">Progression</div>
        <ProgressionChart entries={entries} displayUnit={displayUnit} />
      </div>

    </div>
  );
};
