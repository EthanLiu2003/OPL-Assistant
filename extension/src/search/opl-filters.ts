// Canonical OPL filter taxonomy, extracted from the controls on
// https://www.openpowerlifting.org/ (verified 2026-04-15).
//
// Every slug here is the exact `<option value>` OPL's router accepts. URL paths
// and API paths (`/api/rankings/...`) both consume these slugs; segments are
// order-independent and each optional.

import type { Federation } from '@/lib/types';

// ---- equipment ----

export const EQUIPMENT_SLUGS = {
  raw: 'raw',
  wraps: 'wraps',
  raw_wraps: 'raw_wraps', // default when no equipment specified
  single: 'single',
  multi: 'multi',
  unlimited: 'unlimited',
} as const;

export type EquipmentSlug = keyof typeof EQUIPMENT_SLUGS;

// Maps friendly equipment names (and our Profile's Equipment enum) to OPL slugs.
export const EQUIPMENT_NAME_TO_SLUG: Record<string, EquipmentSlug> = {
  raw: 'raw',
  sleeves: 'raw',
  classic: 'raw',
  wraps: 'wraps',
  'knee wraps': 'wraps',
  'raw+wraps': 'raw_wraps',
  'raw and wraps': 'raw_wraps',
  'single-ply': 'single',
  'single ply': 'single',
  singleply: 'single',
  equipped: 'single',
  'multi-ply': 'multi',
  'multi ply': 'multi',
  multiply: 'multi',
  unlimited: 'unlimited',
};

// ---- sex ----

export const SEX_SLUGS = {
  all: 'all',
  men: 'men',
  women: 'women',
} as const;

// ---- age divisions ----
// OPL's ageclass is an age range, not a federation division. We translate
// common division names (Junior / Masters / etc.) into the corresponding ranges.

export const AGE_SLUGS = [
  'all',
  '5-12',
  '13-15',
  '16-17',
  '18-19',
  '20-23',
  '24-34',
  '35-39',
  '40-44',
  '45-49',
  '50-54',
  '55-59',
  '60-64',
  '65-69',
  '70-74',
  '75-79',
  '80-84',
  '85-89',
  '40-49',
  '50-59',
  '60-69',
  '70-79',
  'over80',
] as const;

export type AgeSlug = (typeof AGE_SLUGS)[number];

// Maps federation-division names and age keywords to OPL age-range slugs.
export const AGE_DIVISION_TO_SLUG: Array<{ patterns: RegExp[]; slug: AgeSlug }> = [
  { patterns: [/\byouth\b/i, /\bkid/i], slug: '5-12' },
  { patterns: [/\bteen\s*13[\s-]?15\b/i, /\b13[\s-]?15\b/i], slug: '13-15' },
  { patterns: [/\bteen\s*16[\s-]?17\b/i, /\b16[\s-]?17\b/i], slug: '16-17' },
  {
    patterns: [/\bsub[\s-]?junior\b/i, /\bteen\s*18[\s-]?19\b/i, /\b18[\s-]?19\b/i],
    slug: '18-19',
  },
  { patterns: [/\bjuniors?\b/i, /\bjr\b/i, /\b20[\s-]?23\b/i], slug: '20-23' },
  {
    patterns: [/\bopen\b/i, /\bseniors?\b/i, /\b24[\s-]?34\b/i],
    slug: '24-34',
  },
  { patterns: [/\bsub[\s-]?masters?\b/i, /\b35[\s-]?39\b/i], slug: '35-39' },
  {
    patterns: [/\bmasters?\s*1\b/i, /\bm1\b/i, /\b40[\s-]?44\b/i],
    slug: '40-44',
  },
  {
    patterns: [/\bmasters?\s*2\b/i, /\bm2\b/i, /\b45[\s-]?49\b/i],
    slug: '45-49',
  },
  { patterns: [/\b50[\s-]?54\b/i], slug: '50-54' },
  { patterns: [/\b55[\s-]?59\b/i], slug: '55-59' },
  {
    patterns: [/\bmasters?\s*3\b/i, /\bm3\b/i, /\b60[\s-]?64\b/i],
    slug: '60-64',
  },
  { patterns: [/\b65[\s-]?69\b/i], slug: '65-69' },
  {
    patterns: [/\bmasters?\s*4\b/i, /\bm4\b/i, /\b70[\s-]?74\b/i],
    slug: '70-74',
  },
  { patterns: [/\b75[\s-]?79\b/i], slug: '75-79' },
  { patterns: [/\b80[\s-]?84\b/i], slug: '80-84' },
  { patterns: [/\b85[\s-]?89\b/i], slug: '85-89' },
  { patterns: [/\b80\+\b/i, /\bover\s*80\b/i], slug: 'over80' },
  // Generic "masters" without a tier — OPL's "Masters 40-49" grouping is the
  // most common unqualified interpretation in everyday talk.
  { patterns: [/\bmasters?\b/i], slug: '40-49' },
  // Collegiate is NOT a separate OPL age bucket; it maps to Juniors 20-23.
  { patterns: [/\bcollegiate\b/i], slug: '20-23' },
];

// ---- weight classes ----
// OPL ships two parallel systems: Traditional (old IPL / pound-based rounded to
// 2.5kg) and IPF (post-2020). The slug disambiguates them.

// Traditional (IPL-style): `<value>` is the kg, but slugs may use keywords.
export type WeightClassEntry = { kg: number; slug: string };

export const TRADITIONAL_MEN: WeightClassEntry[] = [
  { kg: 44, slug: '44' },
  { kg: 48, slug: '48' },
  { kg: 52, slug: '52' },
  { kg: 56, slug: '56' },
  { kg: 60, slug: '60' },
  { kg: 67.5, slug: '67.5' },
  { kg: 75, slug: '75' },
  { kg: 82.5, slug: '82.5' },
  { kg: 90, slug: '90' },
  { kg: 91, slug: 'over90' }, // "198+" in lbs
  { kg: 100, slug: '100' },
  { kg: 110, slug: '110' },
  { kg: 111, slug: 'over110' },
  { kg: 125, slug: '125' },
  { kg: 140, slug: '140' },
  { kg: 141, slug: 'over140' },
];

export const IPF_MEN: WeightClassEntry[] = [
  { kg: 53, slug: 'ipf53' },
  { kg: 59, slug: 'ipf59' },
  { kg: 66, slug: 'ipf66' },
  { kg: 74, slug: 'ipf74' },
  { kg: 83, slug: 'ipf83' },
  { kg: 93, slug: 'ipf93' },
  { kg: 105, slug: 'ipf105' },
  { kg: 120, slug: 'ipf120' },
  { kg: 121, slug: 'ipfover120' },
];

export const IPF_WOMEN: WeightClassEntry[] = [
  { kg: 43, slug: 'ipf43' },
  { kg: 47, slug: 'ipf47' },
  { kg: 52, slug: 'ipf52' },
  { kg: 57, slug: 'ipf57' },
  { kg: 63, slug: 'ipf63' },
  { kg: 69, slug: 'ipf69' },
  { kg: 76, slug: 'ipf76' },
  { kg: 84, slug: 'ipf84' },
  { kg: 85, slug: 'ipfover84' },
];

// ---- events & sort ----

export const EVENT_SLUGS = {
  all: 'all',
  'full-power': 'full-power',
  'push-pull': 'push-pull',
} as const;

export const SORT_SLUGS = [
  'by-squat',
  'by-bench',
  'by-deadlift',
  'by-total',
  'by-dots',
  'by-glossbrenner',
  'by-goodlift',
  'by-mcculloch',
  'by-wilks',
] as const;

export type SortSlug = (typeof SORT_SLUGS)[number];

// ---- federations ----
// Abbreviated to the subset that matters for user prompts. Full 300+ list lives
// on OPL's site; we map the ones humans actually name. Extend on demand.

export const FEDERATION_SLUGS: Record<Federation, string> = {
  USAPL: 'usapl',
  USPA: 'uspa',
  PA: 'amp', // "Powerlifting America" — OPL slug is `amp`; `pa` in OPL means Powerlifting Australia
  IPF: 'ipf',
  WRPF: 'wrpf-and-affiliates',
  RPS: 'rps',
};

// Extended alias list — we match these in the parser but they don't exist in
// our Federation enum; we route them to the closest v1 match or the literal
// OPL slug.
export const FEDERATION_ALIASES: Array<{ patterns: RegExp[]; slug: string; kind: 'ipf-affiliated' | 'ipl-affiliated' | 'other' }> = [
  { patterns: [/\busapl\b/i], slug: 'usapl', kind: 'ipf-affiliated' },
  { patterns: [/\buspa\s*tested\b/i], slug: 'uspa-tested', kind: 'ipl-affiliated' },
  { patterns: [/\buspa\b/i], slug: 'uspa', kind: 'ipl-affiliated' },
  {
    patterns: [/\bpowerlifting\s*america\b/i, /\bamp\b/i],
    slug: 'amp',
    kind: 'ipf-affiliated',
  },
  { patterns: [/\bipf\b/i], slug: 'ipf', kind: 'ipf-affiliated' },
  { patterns: [/\bipl\b/i], slug: 'ipl', kind: 'ipl-affiliated' },
  {
    patterns: [/\bwrpf\s*usa\s*tested\b/i],
    slug: 'wrpf-usa-tested',
    kind: 'other',
  },
  { patterns: [/\bwrpf\s*usa\b/i], slug: 'wrpf-usa', kind: 'other' },
  { patterns: [/\bwrpf\b/i], slug: 'wrpf-and-affiliates', kind: 'other' },
  { patterns: [/\brps\b/i], slug: 'rps', kind: 'other' },
  { patterns: [/\bspf\b/i], slug: 'spf', kind: 'other' },
  { patterns: [/\bcpu\b/i], slug: 'cpu', kind: 'ipf-affiliated' },
  { patterns: [/\bepf\b/i], slug: 'epf', kind: 'ipf-affiliated' },
  { patterns: [/\bepa\b/i], slug: 'epa', kind: 'ipf-affiliated' },
  { patterns: [/\bapu\b/i], slug: 'apu', kind: 'ipf-affiliated' },
  { patterns: [/\bbp\b/i], slug: 'bp', kind: 'ipf-affiliated' },
  { patterns: [/\bplu\b/i], slug: 'plu', kind: 'other' },
  {
    patterns: [/\ball\s*tested\b/i, /\bfully\s*tested\b/i, /\btested\b/i],
    slug: 'all-tested',
    kind: 'other',
  },
  { patterns: [/\ball\s*feds?\b/i, /\ball\b/i], slug: 'all', kind: 'other' },
];

// ---- federation class system routing ----
// Given a federation slug, decide whether to use IPF or Traditional classes.
//
// Authoritative IPF-affiliated list sourced from openipf.org's federation
// dropdown (2026-04-15). Notably: USAPL is NOT on this list — USAPL left the
// IPF in 2021; AMP (Powerlifting America) is the current US IPF affiliate.
// USAPL meets still appear in OPL's data under the traditional class system
// for historical entries and may use IPF-aligned classes for post-2022 entries;
// the exact-match priority in parse-filter-prompt.ts handles this cleanly.

export const IPF_AFFILIATED_FEDS = new Set([
  // International + continental
  'ipf',
  'africanpf',
  'asianpf',
  'fesupo',
  'napf',
  'orpf',
  'commonwealthpf',
  'nordicpf',
  // Country-specific IPF affiliates
  'aep', // Spain
  'aiwbpa', // Indonesia
  'amp', // USA (Powerlifting America)
  'apla', // Australia
  'apportugal', // Portugal
  'belpf', // Belarus
  'bp', // UK
  'bpa', // Belize
  'bulgarianpf',
  'bvdk', // Germany
  'cblb', // Brazil
  'cpu', // Canada
  'csst', // Czechia
  'ctpa', // Taiwan
  'cypruspf',
  'dsf', // Denmark
  'egyptpf',
  'ejtl', // Estonia
  'epa', // England
  'falpo', // Argentina
  'fapl', // Algeria
  'fclp', // Colombia
  'fdnlp', // Peru
  'fecapolif', // Cameroon
  'fechipo', // Chile
  'fedepotencia', // Guatemala
  'feficulp', // Ecuador
  'femepo', // Mexico
  'fevepo', // Venezuela
  'ffforce', // France
  'fipl', // Italy
  'fmpb', // Morocco
  'fpp', // Panama
  'fppr', // Puerto Rico
  'fpr', // Russia
  'frpl', // Romania
  'fulp', // Uruguay
  'gaplf', // Guyana
  'hkwpa', // Hong Kong
  'hpf', // Greece
  'hpls', // Croatia
  'hunpower', // Hungary
  'ilpf', // Israel
  'all-ipf-belgium',
  'ipf-china',
  'iranbbf',
  'iraqpf',
  'irishpf',
  'jpa', // Japan
  'kbgv', // Belgium
  'kdks', // Switzerland
  'knkf-sp', // Netherlands
  'kpc', // Kuwait
  'kpf', // Kazakhstan
  'kraft', // Iceland
  'lebanonpf',
  'lfph', // Belgium
  'libyapf',
  'ljtf', // Lithuania
  'lpf', // Latvia
  'maltapa',
  'manxpl', // Isle of Man
  'map', // Malaysia
  'mupf', // Mongolia
  'naurupf',
  'nipf', // N. Ireland
  'npaj', // Jamaica
  'nsf', // Norway
  'nzpf', // New Zealand
  'ocwp', // Oman
  'oevk', // Austria
  'pap', // Philippines
  'pfbd', // Brunei
  'pi', // India
  'plrd', // Dominican Republic
  'plss', // Serbia
  'plzs', // Slovenia
  'pngpf', // Papua New Guinea
  'posk', // South Korea
  'ps', // Singapore
  'pwfl', // Luxembourg
  'pzkfits', // Poland
  'qatarpl',
  'safkst', // Slovakia
  'safp', // Syria
  'sapf', // South Africa
  'scottishpl',
  'slpf', // Sri Lanka
  'ssf', // Sweden
  'sssc', // Saudi Arabia
  'svnl', // Finland
  'taap', // Thailand
  'tpssf', // Türkiye
  'ttpf', // Trinidad & Tobago
  'uaepl',
  'ukrainepf',
  'usvipf',
  'vgpf', // Belgium
  'vpf', // Vietnam
  'welshpa',
]);

export const isIpfAffiliated = (fedSlug: string): boolean =>
  IPF_AFFILIATED_FEDS.has(fedSlug) || fedSlug.startsWith('all-ipf-');

// ---- defaults ----

export const DEFAULTS = {
  equipment: 'raw_wraps',
  weightClass: 'all',
  federation: 'all',
  sex: 'all',
  age: 'all',
  year: 'all',
  event: 'all',
  sort: 'by-dots',
} as const;
