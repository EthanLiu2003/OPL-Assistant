export type Unit = 'kg' | 'lb';

// Exact NIST conversion factor. Do not round — 2.5 kg plate increments require precision
// for gap math across weight classes.
export const KG_PER_LB = 0.45359237;

export const toKg = (value: number, unit: Unit): number =>
  unit === 'kg' ? value : value * KG_PER_LB;

export const toLb = (value: number, unit: Unit): number =>
  unit === 'lb' ? value : value / KG_PER_LB;

export const convert = (value: number, from: Unit, to: Unit): number => {
  if (from === to) return value;
  return from === 'lb' ? value * KG_PER_LB : value / KG_PER_LB;
};

export type FormatOptions = {
  unit: Unit;
  precision?: number; // overrides default rounding
  withUnit?: boolean; // append " kg" / " lb"; default true
};

const roundDefaults: Record<'total' | 'bodyweight' | 'plate', Record<Unit, number>> = {
  total: { kg: 0, lb: 0 }, // whole numbers for readability
  bodyweight: { kg: 1, lb: 0 },
  plate: { kg: 1, lb: 0 }, // 2.5kg increments in gym
};

export const formatTotal = (kg: number, opts: FormatOptions): string => {
  const value = opts.unit === 'kg' ? kg : toLb(kg, 'kg');
  const precision = opts.precision ?? roundDefaults.total[opts.unit];
  const rounded = value.toFixed(precision);
  return opts.withUnit === false ? rounded : `${rounded} ${opts.unit}`;
};

export const formatBodyweight = (kg: number, opts: FormatOptions): string => {
  const value = opts.unit === 'kg' ? kg : toLb(kg, 'kg');
  const precision = opts.precision ?? roundDefaults.bodyweight[opts.unit];
  const rounded = value.toFixed(precision);
  return opts.withUnit === false ? rounded : `${rounded} ${opts.unit}`;
};

// Parses user input like "650 lb", "650lbs", "650#", "295 kg", "295kg", or bare "650".
// Bare numbers return null unit; caller applies the user's display default.
export type ParsedWeight = { value: number; unit: Unit | null };

const WEIGHT_PATTERN = /^\s*([\d.]+)\s*(kg|kgs|lb|lbs|pound|pounds|#)?\s*$/i;

export const parseWeight = (input: string): ParsedWeight | null => {
  const match = input.match(WEIGHT_PATTERN);
  if (!match) return null;
  const value = Number.parseFloat(match[1]);
  if (!Number.isFinite(value)) return null;
  const suffix = match[2]?.toLowerCase();
  if (!suffix) return { value, unit: null };
  if (suffix.startsWith('kg')) return { value, unit: 'kg' };
  return { value, unit: 'lb' };
};

// Resolve a ParsedWeight to kg, using the given default unit when the user didn't supply one.
export const resolveToKg = (parsed: ParsedWeight, fallback: Unit): number => {
  const unit = parsed.unit ?? fallback;
  return toKg(parsed.value, unit);
};

// Format a weight class in the user's display unit. Weight classes are distinct
// from totals: `82.5` kg must render with its 0.5, not round to `83`. `over90`
// and `ipf83` slugs also get humanized here so the UI never shows raw slugs.
export const formatWeightClass = (
  slug: string | number,
  unit: Unit,
): string => {
  if (typeof slug === 'number') {
    const value = unit === 'kg' ? slug : toLb(slug, 'kg');
    const rounded =
      Number.isInteger(value) ? value.toString() : value.toFixed(1).replace(/\.0$/, '');
    return `${rounded} ${unit}`;
  }
  // String slug path — normalize OPL's class slugs.
  const s = String(slug);
  const parseKg = (raw: string): number | null => {
    const n = Number.parseFloat(raw);
    return Number.isFinite(n) ? n : null;
  };
  if (s.startsWith('ipfover')) {
    const n = parseKg(s.replace('ipfover', ''));
    return n != null ? `${unit === 'kg' ? n : Math.round(toLb(n, 'kg'))}+ ${unit}` : s;
  }
  if (s.startsWith('ipf')) {
    const n = parseKg(s.replace('ipf', ''));
    return n != null ? formatWeightClass(n, unit) : s;
  }
  if (s.startsWith('over')) {
    const n = parseKg(s.replace('over', ''));
    return n != null ? `${unit === 'kg' ? n : Math.round(toLb(n, 'kg'))}+ ${unit}` : s;
  }
  const n = parseKg(s);
  return n != null ? formatWeightClass(n, unit) : s;
};
