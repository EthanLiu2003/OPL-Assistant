export { dots } from './dots';
export { wilks } from './wilks';
export { ipfGl } from './ipf-gl';

import type { Equipment, Sex } from '@/lib/types';
import { dots } from './dots';
import { wilks } from './wilks';
import { ipfGl } from './ipf-gl';

export type ScoringResult = {
  dots: number;
  wilks: number;
  ipfGl: number;
};

export const computeScoring = (
  totalKg: number,
  bodyweightKg: number,
  sex: Sex,
  equipment: Equipment = 'Raw',
): ScoringResult => ({
  dots: dots(totalKg, bodyweightKg, sex),
  wilks: wilks(totalKg, bodyweightKg, sex),
  ipfGl: ipfGl(totalKg, bodyweightKg, sex, equipment),
});
