import type { Equipment, Sex } from '@/lib/types';
import type { ParsedFilter } from '@/search/opl-url';
import type { CohortResponse } from '@/cohort/cohort-client';
import type { WhereYouStandCard } from '@/chat/types';
import { computeScoring } from '@/scoring';
import {
  findApplicableTotals,
  type QualifyingProfile,
  slugToClassKg,
  sortQualifyingTotals,
} from '@/data/qualifying-totals';
import { summarizeCohort } from './cohort-summary';
import type { AgeDivision, Federation } from '@/lib/types';

type BuildInput = {
  parsed: ParsedFilter;
  cohort: CohortResponse;
  userTotalKg: number;
  bodyweightKg: number;
  sex: Sex;
  equipment: Equipment;
  ageYears: number | null;
  federations?: Federation[];
  ageDivisions?: AgeDivision[];
};

const ageSlugToDivisions = (slug: string | undefined): AgeDivision[] => {
  if (!slug) return ['Open'];
  if (slug === '20-23') return ['Junior', 'Open', 'Collegiate'];
  if (slug === '24-34') return ['Open'];
  if (slug === '18-19') return ['Sub-Junior', 'Open'];
  if (slug === '40-44') return ['Masters 1', 'Open'];
  if (slug === '45-49') return ['Masters 2', 'Open'];
  if (slug === '60-64') return ['Masters 3', 'Open'];
  if (slug === '70-74') return ['Masters 4', 'Open'];
  return ['Open'];
};

const ageYearsToDivisions = (age: number): AgeDivision[] => {
  if (age < 14) return ['Sub-Junior', 'Open'];
  if (age <= 17) return ['Sub-Junior', 'Open'];
  if (age <= 19) return ['Sub-Junior', 'Open'];
  if (age <= 23) return ['Junior', 'Open', 'Collegiate'];
  if (age <= 34) return ['Open'];
  if (age <= 39) return ['Open'];
  if (age <= 44) return ['Masters 1', 'Open'];
  if (age <= 49) return ['Masters 2', 'Open'];
  if (age <= 54) return ['Masters 2', 'Open'];
  if (age <= 59) return ['Masters 3', 'Open'];
  if (age <= 64) return ['Masters 3', 'Open'];
  if (age <= 69) return ['Masters 4', 'Open'];
  if (age <= 74) return ['Masters 4', 'Open'];
  return ['Open'];
};

const fedSlugToEnum = (slug: string | undefined): Federation | undefined => {
  if (!slug) return undefined;
  if (slug === 'usapl') return 'USAPL';
  if (slug === 'uspa' || slug === 'uspa-tested') return 'USPA';
  if (slug === 'amp') return 'PA';
  if (slug === 'ipf') return 'IPF';
  if (slug === 'rps') return 'RPS';
  if (slug.startsWith('wrpf')) return 'WRPF';
  // The qualifying-totals JSON only covers USAPL / PA / USPA. For any
  // other fed slug we return undefined → qualifying lookup uses all feds.
  return undefined;
};

export { fedSlugToEnum };

export const buildWhereYouStandCard = (input: BuildInput): WhereYouStandCard => {
  const { parsed, cohort, userTotalKg, bodyweightKg, sex, equipment, ageYears } = input;

  const scoring = computeScoring(userTotalKg, bodyweightKg, sex, equipment);

  const weightClassKg = slugToClassKg(parsed.weightClassSlug);
  const fedFromFilter = fedSlugToEnum(parsed.federationSlug);
  const fedsForLookup: Federation[] | undefined = input.federations?.length
    ? input.federations
    : fedFromFilter
      ? [fedFromFilter]
      : undefined;

  const divsForLookup = input.ageDivisions?.length
    ? input.ageDivisions
    : parsed.ageSlug
      ? ageSlugToDivisions(parsed.ageSlug)
      : ageYears != null
        ? ageYearsToDivisions(ageYears)
        : ['Open'] as AgeDivision[];

  const lookup: QualifyingProfile = {
    sex,
    weightClassKg,
    federations: fedsForLookup,
    ageDivisions: divsForLookup,
    equipment,
  };

  const matches = sortQualifyingTotals(findApplicableTotals(lookup));
  const qualifying = matches.map((row) => ({
    federation: row.federation,
    event: row.event,
    ageDivision: row.ageDivision,
    equipment: row.equipment,
    weightClassKg: row.weightClassKg,
    targetTotalKg: row.totalKg,
    gapKg: row.totalKg - userTotalKg,
    sourceUrl: row.sourceUrl,
    lastVerified: row.lastVerified,
  }));

  return {
    version: 1,
    cohort: {
      slugs: parsed,
      summary: summarizeCohort(parsed),
      totalCount: cohort.totalCount,
      userRank: cohort.userRank ?? cohort.totalCount,
    },
    totals: { userTotalKg, bodyweightKg, sex, ageYears, equipment },
    scoring,
    qualifying,
    computedAt: new Date().toISOString(),
  };
};
