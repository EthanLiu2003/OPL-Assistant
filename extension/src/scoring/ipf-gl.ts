// IPF GL (Goodlift) Points — current IPF-official bodyweight-adjusted score.
// Replaces the IPF Points formula (2018) with exponential-decay coefficients
// tuned per sex × equipment.
// Reference: https://www.openpowerlifting.org/static/pdf/IPF_GL_Points.pdf
// OPL implementation: https://gitlab.com/openpowerlifting/opl-data/-/blob/main/crates/coefficients/src/goodlift.rs

import type { Equipment, Sex } from '@/lib/types';

type Coefficients = readonly [A: number, B: number, C: number];

// [sex][equipmentKind] → [A, B, C]. SBD (squat+bench+deadlift) is implied.
// OPL groups equipment as "raw/wraps" vs "single-ply" vs "multi-ply" for GL;
// wraps uses raw coefficients, multi-ply uses single-ply coefficients
// (the IPF doesn't sanction multi-ply, so we borrow the closest curve).
const COEF: Record<Sex, Record<'raw' | 'single', Coefficients>> = {
  M: {
    raw: [1199.72839, 1025.18162, 0.00921],
    single: [1236.25115, 1449.21864, 0.01644],
  },
  F: {
    raw: [610.32796, 1045.59282, 0.03048],
    single: [758.63878, 949.31382, 0.02435],
  },
};

const equipmentKind = (eq: Equipment | undefined): 'raw' | 'single' => {
  if (eq === 'Single-ply' || eq === 'Multi-ply') return 'single';
  return 'raw';
};

export const ipfGl = (
  totalKg: number,
  bodyweightKg: number,
  sex: Sex,
  equipment: Equipment = 'Raw',
): number => {
  if (totalKg <= 0 || bodyweightKg <= 0) return 0;
  const [A, B, C] = COEF[sex][equipmentKind(equipment)];
  const denom = A - B * Math.exp(-C * bodyweightKg);
  if (denom <= 0) return 0;
  return (100 * totalKg) / denom;
};
