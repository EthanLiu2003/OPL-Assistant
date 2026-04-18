// Wilks (2020 revision by Robert Wilks) — bodyweight-adjusted scoring.
// Used by IPF-aligned meets; distinct from legacy Wilks (1995).
// Reference coefficients: https://gitlab.com/openpowerlifting/opl-data/-/blob/main/crates/coefficients/src/wilks2.rs

type Coefficients = readonly [
  a: number,
  b: number,
  c: number,
  d: number,
  e: number,
  f: number,
];

const MEN: Coefficients = [
  47.4617885411949,
  8.472061379,
  0.07369410346,
  -0.001395833811,
  7.07665973070743e-6,
  -1.20804336482315e-8,
];

const WOMEN: Coefficients = [
  -125.425539779509,
  13.7121941940668,
  -0.0330725063103405,
  -0.0010504000506583,  // cspell: disable-line
  9.38773881462799e-6,
  -2.3334613884954e-8,
];

const BW_CLAMP = { M: { min: 40, max: 210 }, F: { min: 40, max: 150 } } as const;

const polyDenom = (coef: Coefficients, bw: number): number => {
  const [a, b, c, d, e, f] = coef;
  return (
    a + b * bw + c * bw ** 2 + d * bw ** 3 + e * bw ** 4 + f * bw ** 5
  );
};

export const wilks = (totalKg: number, bodyweightKg: number, sex: 'M' | 'F'): number => {
  if (totalKg <= 0 || bodyweightKg <= 0) return 0;
  const { min, max } = BW_CLAMP[sex];
  const bw = Math.min(Math.max(bodyweightKg, min), max);
  const coef = sex === 'M' ? MEN : WOMEN;
  const denom = polyDenom(coef, bw);
  if (denom <= 0) return 0;
  return (totalKg * 600) / denom;
};
