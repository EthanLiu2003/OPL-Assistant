import { errorResponse, jsonResponse } from './cors';
import type { Env } from './index';

export type CompetitionEntry = {
  date: string;
  federation: string;
  meetName: string;
  division: string;
  equipment: string;
  bodyweightKg: number | null;
  weightClassKg: string;
  squatKg: number | null;
  benchKg: number | null;
  deadliftKg: number | null;
  totalKg: number | null;
  dots: number | null;
  wilks: number | null;
  goodlift: number | null;
  place: string;
  age: number | null;
  sex: 'M' | 'F';
  tested: boolean;
};

const toNum = (s: string): number | null => {
  if (!s || s === '') return null;
  const n = parseFloat(s);
  return Number.isFinite(n) ? n : null;
};

function parseCSV(csv: string): CompetitionEntry[] {
  const lines = csv.split('\n').filter((l) => l.trim());
  if (lines.length < 2) return [];

  const headers = lines[0].split(',');
  const idx = (name: string): number => headers.indexOf(name);

  return lines.slice(1).map((line) => {
    const cols = line.split(',');
    const get = (name: string): string => cols[idx(name)] ?? '';
    return {
      date: get('Date'),
      federation: get('Federation'),
      meetName: get('MeetName'),
      division: get('Division'),
      equipment: get('Equipment'),
      bodyweightKg: toNum(get('BodyweightKg')),
      weightClassKg: get('WeightClassKg'),
      squatKg: toNum(get('Best3SquatKg')),
      benchKg: toNum(get('Best3BenchKg')),
      deadliftKg: toNum(get('Best3DeadliftKg')),
      totalKg: toNum(get('TotalKg')),
      dots: toNum(get('Dots')),
      wilks: toNum(get('Wilks')),
      goodlift: toNum(get('Goodlift')),
      place: get('Place'),
      age: toNum(get('Age')),
      sex: get('Sex') === 'F' ? 'F' : 'M',
      tested: get('Tested') === 'Yes',
    };
  });
}

export const handleLifterCsv = async (
  _request: Request,
  env: Env,
  username: string,
): Promise<Response> => {
  if (!username || username.length < 2) {
    return errorResponse('username too short', 400);
  }

  const kv = env.COHORT_KV;
  const cacheKey = `lifter:${username}`;

  if (kv) {
    const cached = await kv.get<CompetitionEntry[]>(cacheKey, 'json');
    if (cached) return jsonResponse({ entries: cached, cached: true });
  }

  const url = `https://www.openpowerlifting.org/api/liftercsv/${encodeURIComponent(username)}`;
  const resp = await fetch(url, {
    headers: {
      'user-agent': 'opl-coach-proxy/1.0 (+https://github.com/ewl172003)',
      accept: 'text/csv',
    },
  });

  if (!resp.ok) {
    if (resp.status === 404) return errorResponse('lifter not found', 404);
    return errorResponse(`OPL ${resp.status}`, 502);
  }

  const csv = await resp.text();
  const entries = parseCSV(csv);

  if (kv) {
    const ttl = parseInt(env.COHORT_CACHE_TTL_SECONDS ?? '1800', 10);
    await kv.put(cacheKey, JSON.stringify(entries), {
      expirationTtl: Number.isFinite(ttl) ? ttl : 1800,
    });
  }

  return jsonResponse({ entries, cached: false });
};
