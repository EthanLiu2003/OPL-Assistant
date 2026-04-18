// OPL's /api/rankings response shape — empirically probed 2026-04-16.
// Fixture: ../../fixtures/opl-rankings.json
//
// OPL returns rows as tuples (array-of-arrays), not object-per-row. Column
// indices are documented in the fixture's `_probe.columnsByIndex`. This file
// owns the mapping from that tuple format to a friendly object shape the rest
// of the Worker consumes.

export type OplRankingRow = [
  rowIndex: number,
  rank: number,
  name: string,
  username: string,
  social: string | null,
  colorBand: string | null,
  country: string | null,
  state: string | null,
  federation: string,
  date: string,
  meetCountry: string | null,
  meetState: string | null,
  meetSlug: string,
  sex: 'M' | 'F',
  equipment: string,
  age: string,
  division: string,
  bodyweightKg: string, // may be empty string
  weightClass: string, // may be empty string
  squatKg: string,
  benchKg: string,
  deadliftKg: string,
  totalKg: string,
  score: string,
];

export type OplRankingsResponse = {
  total_length: number;
  rows: OplRankingRow[];
};

export type CohortLifter = {
  rank: number;
  name: string;
  username: string;
  federation: string;
  date: string; // ISO-ish YYYY-MM-DD
  meetSlug: string;
  sex: 'M' | 'F';
  equipment: string;
  age: number | null;
  division: string;
  bodyweightKg: number | null;
  weightClass: string | null;
  squatKg: number | null;
  benchKg: number | null;
  deadliftKg: number | null;
  totalKg: number;
  score: number | null;
};

const toNum = (s: string): number | null => {
  if (!s || s === '') return null;
  const n = parseFloat(s);
  return Number.isFinite(n) ? n : null;
};

const parseAge = (s: string): number | null => {
  if (!s) return null;
  // OPL age fields can have trailing ~ to denote estimated. Strip and parse.
  const clean = s.replace(/~/g, '').trim();
  const n = parseInt(clean, 10);
  return Number.isFinite(n) ? n : null;
};

export const normalizeRow = (row: OplRankingRow): CohortLifter => ({
  rank: row[1],
  name: row[2],
  username: row[3],
  federation: row[8],
  date: row[9],
  meetSlug: row[12],
  sex: row[13],
  equipment: row[14],
  age: parseAge(row[15]),
  division: row[16],
  bodyweightKg: toNum(row[17]),
  weightClass: row[18] || null,
  squatKg: toNum(row[19]),
  benchKg: toNum(row[20]),
  deadliftKg: toNum(row[21]),
  totalKg: toNum(row[22]) ?? 0,
  score: toNum(row[23]),
});
