// DOTS (Dots Of Total Score) — bodyweight-adjusted scoring formula.
// Adopted by OpenPowerlifting as the default ranking score since 2020.
// Reference coefficients: https://gitlab.com/openpowerlifting/opl-data/-/blob/main/crates/coefficients/src/dots.rs

type Coefficients = readonly [a: number, b: number, c: number, d: number, e: number];

const MEN: Coefficients = [
  -307.75076,
  24.0900756,
  -0.1918759221,
  0.0007391293,
  -0.000001093,
];

const WOMEN: Coefficients = [
  -57.96288,
  13.6175032,
  -0.1126655495,
  0.0005158568,
  -0.0000010706,
];

const BW_CLAMP = { M: { min: 40, max: 210 }, F: { min: 40, max: 150 } } as const;

const polyDenom = (coef: Coefficients, bw: number): number => {
  const [a, b, c, d, e] = coef;
  return a + b * bw + c * bw ** 2 + d * bw ** 3 + e * bw ** 4;
};

export const dots = (totalKg: number, bodyweightKg: number, sex: 'M' | 'F'): number => {
  if (totalKg <= 0 || bodyweightKg <= 0) return 0;
  const { min, max } = BW_CLAMP[sex];
  const bw = Math.min(Math.max(bodyweightKg, min), max);
  const coef = sex === 'M' ? MEN : WOMEN;
  const denom = polyDenom(coef, bw);
  if (denom <= 0) return 0;
  return (500 * totalKg) / denom;
};
