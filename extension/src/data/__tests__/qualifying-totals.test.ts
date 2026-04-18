import { describe, expect, test } from 'vitest';
import { findApplicableTotals, slugToClassKg } from '../qualifying-totals';

describe('findApplicableTotals', () => {
  test('22yo USAPL 75kg raw male gets Open + Junior + Collegiate rows', () => {
    const rows = findApplicableTotals({
      sex: 'M',
      weightClassKg: 75,
      federations: ['USAPL'],
      ageDivisions: ['Junior'],
      equipment: 'Raw',
    });
    expect(rows.length).toBeGreaterThanOrEqual(1);
    const events = rows.map((r) => r.event);
    expect(events).toContain('Raw Nationals');
  });

  test('no match for unsupported class', () => {
    const rows = findApplicableTotals({
      sex: 'M',
      weightClassKg: 999,
      federations: ['USAPL'],
      equipment: 'Raw',
    });
    expect(rows.length).toBe(0);
  });

  test('USPA has no qualifying totals', () => {
    const rows = findApplicableTotals({
      sex: 'M',
      weightClassKg: 82.5,
      federations: ['USPA'],
      equipment: 'Raw',
    });
    expect(rows.length).toBe(0);
  });
});

describe('slugToClassKg', () => {
  test('ipf83 → 83', () => expect(slugToClassKg('ipf83')).toBe(83));
  test('82.5 → 82.5', () => expect(slugToClassKg('82.5')).toBe(82.5));
  test('ipfover120 → 121', () => expect(slugToClassKg('ipfover120')).toBe(121));
  test('over140 → 141', () => expect(slugToClassKg('over140')).toBe(141));
  test('undefined → undefined', () => expect(slugToClassKg(undefined)).toBeUndefined());
});
