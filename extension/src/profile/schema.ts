import type { Profile, Sex, Equipment, Federation, AgeDivision } from '@/lib/types';

// Federation-scoped weight classes. These are rulebook-authoritative and subject to
// fed rule changes; verify against each federation's current handbook before release.
// All values stored as kg strings (RPS converts from its pound-native system to kg
// equivalents here — the Options UI displays in the user's preferred unit).
//
// Sources (verify per release):
// - IPF / Powerlifting America / USAPL: IPF open classes (https://www.powerlifting.sport)
// - USPA: IPL open classes (https://www.uspa.net)
// - WRPF: IPL-style classes
// - RPS: pound-based; kg equivalents shown (https://rpsstrength.com)
const IPF_MEN = ['59', '66', '74', '83', '93', '105', '120', '120+'] as const;
const IPF_WOMEN = ['47', '52', '57', '63', '69', '76', '84', '84+'] as const;

const IPL_MEN = ['52', '56', '60', '67.5', '75', '82.5', '90', '100', '110', '125', '140', '140+'] as const;
const IPL_WOMEN = ['44', '48', '52', '56', '60', '67.5', '75', '82.5', '90', '90+'] as const;

// RPS is pound-native in its own rulebook, but in practice OPL and cross-fed comparisons
// normalize to the USAPL/IPF kg classes. Map RPS to IPF classes for the picker.
export const WEIGHT_CLASSES: Record<Federation, { M: readonly string[]; F: readonly string[] }> = {
  IPF: { M: IPF_MEN, F: IPF_WOMEN },
  PA: { M: IPF_MEN, F: IPF_WOMEN },
  USAPL: { M: IPF_MEN, F: IPF_WOMEN }, // IPF-aligned as of current rulebook; re-verify annually
  USPA: { M: IPL_MEN, F: IPL_WOMEN },
  WRPF: { M: IPL_MEN, F: IPL_WOMEN },
  RPS: { M: IPF_MEN, F: IPF_WOMEN }, // normalized to USAPL/IPF classes for cross-fed consistency
};

export const getWeightClasses = (federation: Federation, sex: Sex): readonly string[] =>
  WEIGHT_CLASSES[federation][sex];

export const EQUIPMENT_OPTIONS: Equipment[] = ['Raw', 'Wraps', 'Single-ply', 'Multi-ply'];
export const FEDERATION_OPTIONS: Federation[] = [
  'USAPL',
  'PA',
  'USPA',
  'IPF',
  'WRPF',
  'RPS',
];
export const AGE_DIVISION_OPTIONS: AgeDivision[] = [
  'Sub-Junior',
  'Junior',
  'Open',
  'Collegiate',
  'Masters 1',
  'Masters 2',
  'Masters 3',
  'Masters 4',
];

export const SEX_OPTIONS: Sex[] = ['M', 'F'];

export const emptyProfile = (): Profile => ({
  userId: null,
  extras: { display_unit: 'kg' },
  clientUpdatedAt: new Date().toISOString(),
});
