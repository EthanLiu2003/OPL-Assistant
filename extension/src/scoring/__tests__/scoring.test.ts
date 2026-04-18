import { describe, expect, test } from 'vitest';
import { dots } from '../dots';
import { wilks } from '../wilks';
import { ipfGl } from '../ipf-gl';

// Fixtures chosen from openpowerlifting.org's own displayed scores
// (probed 2026-04-16). Tolerance ±0.5 absorbs OPL rounding of bodyweight /
// total to 1 decimal before scoring, plus minor coefficient-revision drift.

const close = (actual: number, expected: number, tol = 0.5) => {
  const diff = Math.abs(actual - expected);
  return { ok: diff <= tol, diff, actual, expected };
};

describe('dots', () => {
  test('Joseph Borenstein — 74.9kg M Raw total 820 → dots ≈ 588.44', () => {
    const r = close(dots(820, 74.9, 'M'), 588.44);
    expect(r.ok, `diff=${r.diff.toFixed(3)} actual=${r.actual.toFixed(2)}`).toBe(true);
  });

  test('John Haack — 82.8kg M Raw total 813 → dots ≈ 549.59', () => {
    const r = close(dots(813, 82.8, 'M'), 549.59);
    expect(r.ok, `diff=${r.diff.toFixed(3)} actual=${r.actual.toFixed(2)}`).toBe(true);
  });

  test('zero total → 0', () => {
    expect(dots(0, 80, 'M')).toBe(0);
  });
});

describe('wilks', () => {
  // Wilks 2020 is published less often than DOTS in displayed scores. Sanity:
  // for the Borenstein row, wilks should be in the same general range as DOTS.
  test('Borenstein total 820, bw 74.9, M → wilks within [500, 750]', () => {
    const v = wilks(820, 74.9, 'M');
    expect(v).toBeGreaterThan(500);
    expect(v).toBeLessThan(750);
  });

  test('monotonic in total', () => {
    expect(wilks(820, 80, 'M')).toBeGreaterThan(wilks(800, 80, 'M'));
  });
});

describe('ipfGl', () => {
  // Published IPF coefficient table sanity:
  // 83kg M raw 650 total → GL coefficient ≈ 0.139 → ≈ 90.
  test('83kg M Raw total 650 → GL ≈ 90 (within ±5)', () => {
    const v = ipfGl(650, 83, 'M', 'Raw');
    expect(v).toBeGreaterThan(85);
    expect(v).toBeLessThan(95);
  });

  // 63kg F raw 380 total → GL should fall in 80–100 range.
  test('63kg F Raw total 380 → GL in [70, 110]', () => {
    const v = ipfGl(380, 63, 'F', 'Raw');
    expect(v).toBeGreaterThan(70);
    expect(v).toBeLessThan(110);
  });

  test('single-ply uses a different curve', () => {
    const raw = ipfGl(650, 83, 'M', 'Raw');
    const sp = ipfGl(650, 83, 'M', 'Single-ply');
    expect(raw).not.toEqual(sp);
  });
});
