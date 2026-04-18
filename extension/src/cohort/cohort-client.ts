import { env } from '@/lib/env';
import type { ParsedFilter } from '@/search/opl-url';

export type CohortLifter = {
  rank: number;
  name: string;
  username: string;
  federation: string;
  date: string;
  meetSlug: string;
  sex: 'M' | 'F';
  equipment: string;
  age: number | null;
  division: string;
  bodyweightKg: number | null;
  weightClass: string | null;
  squatKg: number | null;
  benchKg: number | null;
  deadliftKg: number | null;
  totalKg: number;
  score: number | null;
};

export type CohortResponse = {
  totalCount: number;
  userRank: number | null;
  topRows: CohortLifter[];
  surroundingRows: CohortLifter[];
  namedLifter: CohortLifter | null;
  namedRank: number | null;
  namedNotFound: boolean;
  fetchedAt: string;
  source: string;
  cached: boolean;
};

const toQuery = (filter: ParsedFilter, userTotalKg: number | null): URLSearchParams => {
  const params = new URLSearchParams();
  if (filter.equipment) params.set('equipment', filter.equipment);
  if (filter.weightClassSlug) params.set('weightClassSlug', filter.weightClassSlug);
  if (filter.federationSlug) params.set('federationSlug', filter.federationSlug);
  if (filter.sex) params.set('sex', filter.sex);
  if (filter.ageSlug) params.set('ageSlug', filter.ageSlug);
  if (filter.year) params.set('year', filter.year);
  if (filter.eventSlug) params.set('eventSlug', filter.eventSlug);
  if (filter.q) params.set('q', filter.q);
  if (userTotalKg != null && userTotalKg > 0) {
    params.set('userTotalKg', String(userTotalKg));
  }
  params.set('units', 'kg');
  return params;
};

// Hits the Worker /cohort endpoint with a 6s budget. Binary search on a large
// cohort is ~6 chained OPL requests; 6s leaves headroom for each to complete.
export const fetchCohort = async (
  filter: ParsedFilter,
  opts: { userTotalKg?: number | null; signal?: AbortSignal } = {},
): Promise<CohortResponse | null> => {
  if (!env.PROXY_URL) return null;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 6000);
  const signal = opts.signal
    ? anySignal([controller.signal, opts.signal])
    : controller.signal;

  try {
    const params = toQuery(filter, opts.userTotalKg ?? null);
    const resp = await fetch(`${env.PROXY_URL}/cohort?${params.toString()}`, {
      method: 'GET',
      signal,
    });
    if (!resp.ok) return null;
    return (await resp.json()) as CohortResponse;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
};

// Minimal AbortSignal.any polyfill — Chrome 116+ has it but the type isn't in
// TypeScript's DOM lib for @types/chrome's target.
const anySignal = (signals: AbortSignal[]): AbortSignal => {
  if (typeof (AbortSignal as unknown as { any?: unknown }).any === 'function') {
    return (AbortSignal as unknown as { any: (s: AbortSignal[]) => AbortSignal }).any(
      signals,
    );
  }
  const controller = new AbortController();
  const onAbort = () => controller.abort();
  for (const s of signals) {
    if (s.aborted) controller.abort();
    else s.addEventListener('abort', onAbort, { once: true });
  }
  return controller.signal;
};
