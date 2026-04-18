import type { AgeDivision, Equipment, Federation, Sex } from '@/lib/types';
import rawData from './qualifying-totals.json' with { type: 'json' };

export type QualifyingTotal = {
  federation: Federation;
  event: string;
  sex: Sex;
  ageDivision: AgeDivision;
  weightClassKg: number;
  equipment: Equipment;
  totalKg: number;
  sourceUrl: string;
  lastVerified: string;
};

export const ALL_QUALIFYING_TOTALS: QualifyingTotal[] = (
  rawData as { rows: QualifyingTotal[] }
).rows;

export type QualifyingProfile = {
  sex?: Sex;
  weightClassKg?: number; // user's bucket, e.g. 83 for 'ipf83'
  federations?: Federation[];
  ageDivisions?: AgeDivision[];
  equipment?: Equipment;
};

// The Open division implicitly applies to anyone meeting its cutoff (per
// every major fed's rules). A 22-year-old Junior can also hit Open. Expand
// the lifter's declared divisions to all the divisions their age is eligible
// for. Conservative mapping — doesn't add Masters for younger lifters.
const expandEligibleDivisions = (
  divisions: AgeDivision[] = [],
): AgeDivision[] => {
  const set = new Set<AgeDivision>(divisions);
  // Every non-Open division also competes Open eligibility-wise.
  if (divisions.length > 0) set.add('Open');
  return [...set];
};

export const findApplicableTotals = (
  profile: QualifyingProfile,
): QualifyingTotal[] => {
  const feds = new Set(profile.federations ?? []);
  const divs = new Set(expandEligibleDivisions(profile.ageDivisions));
  const out: QualifyingTotal[] = [];
  for (const row of ALL_QUALIFYING_TOTALS) {
    if (feds.size > 0 && !feds.has(row.federation)) continue;
    if (profile.sex && row.sex !== profile.sex) continue;
    if (divs.size > 0 && !divs.has(row.ageDivision)) continue;
    if (profile.equipment && row.equipment !== profile.equipment) continue;
    if (
      profile.weightClassKg != null &&
      Math.abs(row.weightClassKg - profile.weightClassKg) > 0.1
    ) {
      continue;
    }
    out.push(row);
  }
  return out;
};

// Sort by federation (stable alphabetical) then by event name so the UI
// groups rows predictably.
export const sortQualifyingTotals = (rows: QualifyingTotal[]): QualifyingTotal[] =>
  [...rows].sort((a, b) => {
    if (a.federation !== b.federation) return a.federation.localeCompare(b.federation);
    return a.event.localeCompare(b.event);
  });

// Map an OPL weight-class slug (`ipf83`, `82.5`, `over90`) to a kg value
// usable for matching against the `weightClassKg` column. Over-classes use
// the floor (`over90` → 91); exact IPF/Traditional slugs map to their kg.
export const slugToClassKg = (slug: string | undefined): number | undefined => {
  if (!slug) return undefined;
  if (slug.startsWith('ipfover')) {
    const n = parseInt(slug.replace('ipfover', ''), 10) + 1;
    return Number.isFinite(n) ? n : undefined;
  }
  if (slug.startsWith('ipf')) {
    const n = parseFloat(slug.replace('ipf', ''));
    return Number.isFinite(n) ? n : undefined;
  }
  if (slug.startsWith('over')) {
    const n = parseFloat(slug.replace('over', '')) + 1;
    return Number.isFinite(n) ? n : undefined;
  }
  const n = parseFloat(slug);
  return Number.isFinite(n) ? n : undefined;
};
