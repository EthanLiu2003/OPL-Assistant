import type { Sex } from '@/lib/types';
import type { ParsedFilter } from './opl-url';
import {
  AGE_DIVISION_TO_SLUG,
  EQUIPMENT_NAME_TO_SLUG,
  FEDERATION_ALIASES,
  IPF_MEN,
  IPF_WOMEN,
  TRADITIONAL_MEN,
  isIpfAffiliated,
} from './opl-filters';
import { parseWeight } from '@/lib/units';

// Heuristic (regex/keyword) filter-prompt parser, informed by OPL's canonical
// slug taxonomy. v1.1 will replace this with an LLM call when the Cloudflare
// Worker proxy lands — the taxonomy in `opl-filters.ts` becomes the LLM's
// system-prompt context.
//
// Handles inputs like:
//   "USAPL 83kg raw juniors"      → { fed: usapl, wc: ipf83, eq: raw, age: 20-23 }
//   "220lb wraps masters 40-44"   → { wc: 100, eq: wraps, age: 40-44 }
//   "uspa 75kg single-ply women"  → { fed: uspa, wc: 75, eq: single, sex: F }
//   "ipf 93kg open men 2024"      → { fed: ipf, wc: ipf93, age: 24-34, sex: M, year: 2024 }

// ---- constants ----

const YEAR_PATTERN = /\b(19[5-9]\d|20[0-3]\d)\b/;

// Snap a user-typed kg value to the nearest known class within each system.
const snapTraditionalKg = (
  kg: number,
): { slug: string } | null => {
  let best = TRADITIONAL_MEN[0];
  let bestDiff = Math.abs(best.kg - kg);
  for (const entry of TRADITIONAL_MEN) {
    const diff = Math.abs(entry.kg - kg);
    if (diff < bestDiff) {
      best = entry;
      bestDiff = diff;
    }
  }
  // Only accept the snap if within 3kg — otherwise the user typed something
  // unusual; leave it unset.
  if (bestDiff > 3) return null;
  return { slug: best.slug };
};

const snapIpfKg = (kg: number, sex: Sex | undefined): { slug: string } | null => {
  const table = sex === 'F' ? IPF_WOMEN : IPF_MEN;
  let best = table[0];
  let bestDiff = Math.abs(best.kg - kg);
  for (const entry of table) {
    const diff = Math.abs(entry.kg - kg);
    if (diff < bestDiff) {
      best = entry;
      bestDiff = diff;
    }
  }
  if (bestDiff > 3) return null;
  return { slug: best.slug };
};

// ---- main parser ----

export const parseFilterPrompt = (input: string): ParsedFilter => {
  const result: ParsedFilter = {};
  if (!input || !input.trim()) return result;
  const text = input.trim();

  // Federation — iterate FEDERATION_ALIASES (ordered specific → generic).
  for (const { patterns, slug } of FEDERATION_ALIASES) {
    if (patterns.some((re) => re.test(text))) {
      result.federationSlug = slug;
      break;
    }
  }

  // Sex
  if (/\b(women|womens|female|females|ladies)\b/i.test(text)) result.sex = 'F';
  else if (/\b(men|mens|male|males|guys)\b/i.test(text)) result.sex = 'M';

  // Equipment — scan keyword → slug dictionary. Longer / specific tokens first.
  const equipmentOrder = [
    'single-ply',
    'single ply',
    'singleply',
    'multi-ply',
    'multi ply',
    'multiply',
    'raw+wraps',
    'raw and wraps',
    'unlimited',
    'wraps',
    'knee wraps',
    'equipped',
    'raw',
    'sleeves',
    'classic',
  ];
  for (const token of equipmentOrder) {
    const re = new RegExp(`\\b${token.replace(/[+]/g, '\\+')}\\b`, 'i');
    if (re.test(text)) {
      result.equipment = EQUIPMENT_NAME_TO_SLUG[token];
      break;
    }
  }

  // Age division
  for (const { patterns, slug } of AGE_DIVISION_TO_SLUG) {
    if (patterns.some((re) => re.test(text))) {
      result.ageSlug = slug;
      break;
    }
  }

  // Year
  const yearMatch = text.match(YEAR_PATTERN);
  if (yearMatch) result.year = yearMatch[1];

  // Weight class — find first weight-looking token.
  // Grab every number+unit candidate and pick the most plausible (ignore years
  // that already matched).
  const weightPattern = /(\d{2,3}(?:\.\d+)?)\s*(kg|kgs|lb|lbs|pound|pounds|#)\b/gi;
  const weightMatches = Array.from(text.matchAll(weightPattern));
  let kgValue: number | null = null;
  for (const m of weightMatches) {
    const parsed = parseWeight(m[0]);
    if (!parsed || !parsed.unit) continue;
    const asKg = parsed.unit === 'lb' ? parsed.value * 0.45359237 : parsed.value;
    // Filter out values outside plausible lifter weights (20–250 kg ≈ 44–550 lb).
    if (asKg < 20 || asKg > 260) continue;
    kgValue = asKg;
    break;
  }
  // Fallback: numeric-only token in the 40–260 range (assume kg). Skip years.
  if (kgValue == null) {
    const bare = text.match(/\b(\d{2,3}(?:\.\d+)?)\b/);
    if (bare) {
      const n = Number.parseFloat(bare[1]);
      if (Number.isFinite(n) && n >= 40 && n <= 260) {
        kgValue = n;
      }
    }
  }

  if (kgValue != null) {
    // Federation-first routing. USAPL/USPA/WRPF/RPS and other non-IPF-
    // affiliated feds always use Traditional classes — so "USAPL 83kg" snaps
    // to 82.5 (Traditional), NOT ipf83 (IPF). Only IPF-affiliated feds use
    // IPF classes. When no federation is given, fall back to exact-match
    // priority so a bare "83kg" stays as ipf83 and a bare "75kg" stays as 75.
    const fedKnown = result.federationSlug != null;
    const useIpf = fedKnown && isIpfAffiliated(result.federationSlug!);

    if (fedKnown) {
      // Fed routes the class system unambiguously — snap to nearest in that
      // system regardless of whether the kg value is an exact match in the
      // other system.
      if (useIpf) {
        const snapped = snapIpfKg(kgValue, result.sex);
        if (snapped) result.weightClassSlug = snapped.slug;
      } else {
        const snapped = snapTraditionalKg(kgValue);
        if (snapped) result.weightClassSlug = snapped.slug;
      }
    } else {
      // No fed → exact-match priority (value's own system wins).
      const exactTraditional = TRADITIONAL_MEN.find(
        (c) => Math.abs(c.kg - kgValue!) < 0.01,
      );
      const exactIpf = [...IPF_MEN, ...IPF_WOMEN].find(
        (c) => Math.abs(c.kg - kgValue!) < 0.01,
      );
      if (exactTraditional && !exactIpf) {
        result.weightClassSlug = exactTraditional.slug;
      } else if (exactIpf && !exactTraditional) {
        result.weightClassSlug = exactIpf.slug;
      } else if (exactTraditional && exactIpf) {
        // Ambiguous value (52, 60) with no fed — default to Traditional.
        result.weightClassSlug = exactTraditional.slug;
      } else {
        const snapped = snapTraditionalKg(kgValue);
        if (snapped) result.weightClassSlug = snapped.slug;
      }
    }
  }

  // Name search — explicit "name/named/lifter X" trigger plus optional "is".
  const namedMatch = text.match(
    /\b(?:name(?:d)?(?:\s+is)?|lifter|my\s+name\s+is)\s+([a-z][a-z\s'\-.]{1,60})$/i,
  );
  if (namedMatch) {
    result.q = namedMatch[1].trim();
  }

  return result;
};

export const hasAnyFilter = (parsed: ParsedFilter): boolean =>
  Boolean(
    parsed.equipment ??
      parsed.weightClassSlug ??
      parsed.federationSlug ??
      parsed.sex ??
      parsed.ageSlug ??
      parsed.year ??
      parsed.eventSlug ??
      parsed.sortSlug ??
      parsed.q,
  );

// Human-readable summary, used by the drawer's status banner.
export const summarizeFilter = (parsed: ParsedFilter): string => {
  const parts: string[] = [];
  if (parsed.equipment) parts.push(parsed.equipment.replace('_', '+'));
  if (parsed.weightClassSlug) parts.push(parsed.weightClassSlug);
  if (parsed.federationSlug) parts.push(parsed.federationSlug);
  if (parsed.sex) parts.push(parsed.sex === 'M' ? 'men' : 'women');
  if (parsed.ageSlug) parts.push(parsed.ageSlug);
  if (parsed.year) parts.push(parsed.year);
  if (parsed.eventSlug) parts.push(parsed.eventSlug);
  if (parsed.q) parts.push(`name: ${parsed.q}`);
  return parts.join(' · ');
};
