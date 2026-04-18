export type Sex = 'M' | 'F';

export type Equipment = 'Raw' | 'Wraps' | 'Single-ply' | 'Multi-ply';

export type Federation = 'USAPL' | 'PA' | 'USPA' | 'IPF' | 'WRPF' | 'RPS';

export type AgeDivision =
  | 'Sub-Junior'
  | 'Junior'
  | 'Open'
  | 'Collegiate'
  | 'Masters 1'
  | 'Masters 2'
  | 'Masters 3'
  | 'Masters 4';

export type DisplayUnit = 'kg' | 'lb';

export type ProfileExtras = {
  display_unit?: DisplayUnit;
  [k: string]: unknown;
};

export type Profile = {
  userId: string | null;
  sex?: Sex;
  ageYears?: number;
  bodyweightKg?: number;
  weightClass?: string;
  ageDivisions?: AgeDivision[];
  equipment?: Equipment;
  federations?: Federation[];
  currentTotalKg?: number;
  locationZip?: string;
  oplProfileUrl?: string;
  extras: ProfileExtras;
  clientUpdatedAt: string;
};
