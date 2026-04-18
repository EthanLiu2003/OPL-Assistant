import type { Sex } from '@/lib/types';
import type { AgeSlug, EquipmentSlug, SortSlug } from './opl-filters';
import { DEFAULTS, SEX_SLUGS } from './opl-filters';

// OPL's rankings URL format (verified via Playwright + HTML probe 2026-04-15):
//   https://www.openpowerlifting.org/rankings/<...segments>
//   https://www.openpowerlifting.org/api/rankings/<...segments>?start=0&end=99&lang=en&units=lbs
//
// Each segment is optional and order-independent. OPL's router identifies
// segments by prefix / pattern matching against the canonical slug lists in
// `opl-filters.ts`. Name search is a client-side filter inside the results
// table — there is no URL segment for it.

export const OPL_BASE = 'https://www.openpowerlifting.org';

export type ParsedFilter = {
  // Equipment slug: raw / wraps / raw_wraps / single / multi / unlimited
  equipment?: EquipmentSlug;
  // Weight class: OPL slug (traditional `82.5`, IPF `ipf83`, over-classes `over90`, etc.)
  weightClassSlug?: string;
  // Federation slug — full OPL taxonomy including `amp`, `usapl`, `uspa`, `all-tested`, etc.
  federationSlug?: string;
  sex?: Sex;
  ageSlug?: AgeSlug;
  year?: string; // "2024" etc.
  eventSlug?: 'full-power' | 'push-pull';
  sortSlug?: SortSlug;
  // Client-side name search — no URL segment; passed through as ?q= for the
  // drawer to re-apply to OPL's search field on page load (future enhancement).
  q?: string;
};

const sexToSlug = (sex: Sex): string =>
  sex === 'M' ? SEX_SLUGS.men : SEX_SLUGS.women;

// Build the rankings URL path. Segments emitted only when the value is
// non-default; OPL's router treats missing segments as "all".
const buildSegments = (f: ParsedFilter): string[] => {
  const segments: string[] = [];
  if (f.equipment && f.equipment !== DEFAULTS.equipment) segments.push(f.equipment);
  if (f.weightClassSlug && f.weightClassSlug !== DEFAULTS.weightClass) {
    segments.push(f.weightClassSlug);
  }
  if (f.federationSlug && f.federationSlug !== DEFAULTS.federation) {
    segments.push(f.federationSlug);
  }
  if (f.sex) segments.push(sexToSlug(f.sex));
  if (f.ageSlug && f.ageSlug !== DEFAULTS.age) segments.push(f.ageSlug);
  if (f.year && f.year !== DEFAULTS.year) segments.push(f.year);
  if (f.eventSlug) segments.push(f.eventSlug);
  if (f.sortSlug && f.sortSlug !== DEFAULTS.sort) segments.push(f.sortSlug);
  return segments;
};

export const buildOplRankingsUrl = (filter: ParsedFilter): string => {
  const segments = buildSegments(filter);
  const path = segments.length > 0 ? `/rankings/${segments.join('/')}` : '/';
  const query = filter.q ? `?q=${encodeURIComponent(filter.q)}` : '';
  return `${OPL_BASE}${path}${query}`;
};

// API endpoint (JSON response) — same segment structure, different prefix +
// pagination. Used for future in-drawer rendering; not wired to the content
// script yet.
export const buildOplRankingsApiUrl = (
  filter: ParsedFilter,
  opts: { start?: number; end?: number; lang?: string; units?: 'lbs' | 'kg' } = {},
): string => {
  const segments = buildSegments(filter);
  const path = `/api/rankings${segments.length > 0 ? '/' + segments.join('/') : ''}`;
  const params = new URLSearchParams({
    start: String(opts.start ?? 0),
    end: String(opts.end ?? 99),
    lang: opts.lang ?? 'en',
    units: opts.units ?? 'lbs',
  });
  return `${OPL_BASE}${path}?${params.toString()}`;
};
