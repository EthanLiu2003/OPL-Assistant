import { describe, expect, test } from 'vitest';
import { parseFilterPrompt, hasAnyFilter, summarizeFilter } from '../parse-filter-prompt';

describe('parseFilterPrompt', () => {
  test('USAPL 82.5kg raw juniors', () => {
    const r = parseFilterPrompt('USAPL 82.5kg raw juniors');
    expect(r.federationSlug).toBe('usapl');
    expect(r.weightClassSlug).toBe('82.5');
    expect(r.equipment).toBe('raw');
    expect(r.ageSlug).toBe('20-23');
  });

  test('USAPL 83kg snaps to 82.5 (Traditional)', () => {
    const r = parseFilterPrompt('USAPL 83kg raw');
    expect(r.weightClassSlug).toBe('82.5');
  });

  test('USAPL 74kg snaps to 75 (Traditional)', () => {
    const r = parseFilterPrompt('USAPL 74kg raw');
    expect(r.weightClassSlug).toBe('75');
  });

  test('AMP 83kg stays ipf83 (IPF-affiliated)', () => {
    const r = parseFilterPrompt('AMP 83kg raw');
    expect(r.weightClassSlug).toBe('ipf83');
  });

  test('bare 75kg → Traditional exact match', () => {
    const r = parseFilterPrompt('75kg raw junior');
    expect(r.weightClassSlug).toBe('75');
  });

  test('220lb wraps masters 40-44 USPA', () => {
    const r = parseFilterPrompt('220lb wraps masters 40-44 USPA');
    expect(r.equipment).toBe('wraps');
    expect(r.federationSlug).toBe('uspa');
    expect(r.ageSlug).toBe('40-44');
    expect(r.weightClassSlug).toBe('100');
  });

  test('women IPF 63kg 2024', () => {
    const r = parseFilterPrompt("women's IPF 63kg 2024");
    expect(r.sex).toBe('F');
    expect(r.federationSlug).toBe('ipf');
    expect(r.weightClassSlug).toBe('ipf63');
    expect(r.year).toBe('2024');
  });

  test('name extraction — name <full name>', () => {
    const r = parseFilterPrompt('name bryce mitchell');
    expect(r.q).toBe('bryce mitchell');
  });

  test('name with USAPL preserves filters', () => {
    const r = parseFilterPrompt('USAPL 75kg name Ethan Liu');
    expect(r.q).toBe('Ethan Liu');
    expect(r.federationSlug).toBe('usapl');
    expect(r.weightClassSlug).toBe('75');
  });
});

describe('hasAnyFilter', () => {
  test('returns false for empty filter', () => {
    expect(hasAnyFilter({})).toBe(false);
  });

  test('returns true when q is set', () => {
    expect(hasAnyFilter({ q: 'test' })).toBe(true);
  });

  test('returns true when equipment is set', () => {
    expect(hasAnyFilter({ equipment: 'raw' })).toBe(true);
  });
});

describe('summarizeFilter', () => {
  test('joins present fields', () => {
    const s = summarizeFilter({ equipment: 'raw', federationSlug: 'usapl', ageSlug: '20-23' });
    expect(s).toContain('raw');
    expect(s).toContain('usapl');
    expect(s).toContain('20-23');
  });
});
