import type { ParsedFilter } from '@/search/opl-url';
import { AGE_SLUGS_TO_LABEL } from './labels';

// Build a human-readable cohort description from the filter slugs — used
// by the Hero as the percentile-cohort copy line ("top 12% of active
// USAPL raw junior 83kg men").
const EQUIPMENT_LABEL: Record<string, string> = {
  raw: 'raw',
  wraps: 'wraps',
  raw_wraps: '',
  single: 'single-ply',
  multi: 'multi-ply',
  unlimited: 'unlimited',
};

const classLabel = (slug: string | undefined): string => {
  if (!slug) return '';
  if (slug.startsWith('ipfover')) return `${slug.replace('ipfover', '')}kg+`;
  if (slug.startsWith('ipf')) return `${slug.replace('ipf', '')}kg`;
  if (slug.startsWith('over')) return `${slug.replace('over', '')}kg+`;
  return `${slug}kg`;
};

const sexLabel = (sex: 'M' | 'F' | undefined): string => {
  if (sex === 'M') return 'men';
  if (sex === 'F') return 'women';
  return '';
};

const fedLabel = (slug: string | undefined): string => {
  if (!slug) return '';
  if (slug === 'usapl') return 'USAPL';
  if (slug === 'uspa') return 'USPA';
  if (slug === 'amp') return 'AMP';
  if (slug === 'ipf') return 'IPF';
  return slug.toUpperCase();
};

export const summarizeCohort = (f: ParsedFilter): string => {
  const parts: string[] = [];
  if (f.federationSlug) parts.push(fedLabel(f.federationSlug));
  if (f.equipment) {
    const eq = EQUIPMENT_LABEL[f.equipment] ?? f.equipment;
    if (eq) parts.push(eq);
  }
  if (f.ageSlug) {
    const age = AGE_SLUGS_TO_LABEL[f.ageSlug] ?? f.ageSlug;
    parts.push(age);
  }
  const cls = classLabel(f.weightClassSlug);
  if (cls) parts.push(cls);
  const sx = sexLabel(f.sex);
  if (sx) parts.push(sx);
  if (f.year) parts.push(f.year);
  return parts.length > 0 ? parts.join(' ') : 'all OPL rankings';
};

// Percentile from rank + total. Rank is 1-based. Returns a number in 0–100
// representing the "top N%" form of the percentile.
export const topPercentile = (rank: number, total: number): number => {
  if (total <= 0) return 0;
  return (rank / total) * 100;
};
