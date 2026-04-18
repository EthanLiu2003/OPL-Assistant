import { errorResponse, jsonResponse } from './cors';
import type { Env } from './index';
import {
  type CohortLifter,
  normalizeRow,
  type OplRankingsResponse,
} from './sources/opl-rankings';

// GET /cohort?<filter-params>[&userTotalKg=650][&noCache=1]
//
// Wraps OPL's /api/rankings with:
//   - always `by-total` sort (so rank lines up with totalKg percentile)
//   - KV-cached page fetches (30 min TTL)
//   - server-side binary search for the user's insertion point when
//     userTotalKg is provided (log-N API calls instead of full-fetch)
//
// Response shape is designed for the extension's `WhereYouStandCard` and
// cohort-preview bubble — both read from the same response.

export type CohortRequest = {
  equipment?: string;
  weightClassSlug?: string;
  federationSlug?: string;
  sex?: 'M' | 'F';
  ageSlug?: string;
  year?: string;
  eventSlug?: 'full-power' | 'push-pull';
  userTotalKg?: number;
  q?: string; // name search within the cohort
  units: 'kg' | 'lbs';
  noCache: boolean;
};

const OPL_BASE = 'https://www.openpowerlifting.org';

// Slugs whose presence is the "no filter" default — OPL's router treats them
// as omitted. Keep in sync with extension/src/search/opl-filters.ts DEFAULTS.
const DEFAULT_SKIP = new Set([
  'all',
  'raw_wraps', // equipment default
]);

const sexSlug = (sex: 'M' | 'F'): string => (sex === 'M' ? 'men' : 'women');

const buildFilterSegments = (req: CohortRequest): string[] => {
  const segments: string[] = [];
  const maybePush = (v: string | undefined) => {
    if (v && !DEFAULT_SKIP.has(v)) segments.push(v);
  };
  maybePush(req.equipment);
  maybePush(req.weightClassSlug);
  maybePush(req.federationSlug);
  if (req.sex) segments.push(sexSlug(req.sex));
  maybePush(req.ageSlug);
  if (req.year) segments.push(req.year);
  if (req.eventSlug) segments.push(req.eventSlug);
  return segments;
};

// OPL's /api/rankings supports multiple sort suffixes — /by-total, /by-dots,
// /by-wilks, etc. Omitting the suffix uses OPL's DEFAULT sort (DOTS).
// Critical: the /api/search/rankings endpoint's `next_index` is in the
// DEFAULT-sort index space, so fetchRowAtIndex must use the same order.
const buildOplUrl = (
  req: CohortRequest,
  start: number,
  end: number,
  sort: 'by-total' | 'default' = 'by-total',
): string => {
  const segments = buildFilterSegments(req);
  if (sort === 'by-total') segments.push('by-total');
  const path = segments.join('/');
  const params = new URLSearchParams({
    start: String(start),
    end: String(end),
    lang: 'en',
    units: req.units,
  });
  return `${OPL_BASE}/api/rankings/${path}?${params.toString()}`;
};

// /api/search/rankings/<segments>?q=<name>&start=0 → { next_index: number | null }
// next_index is the 0-based rank where the named lifter appears within the
// filter-scoped cohort (sorted by OPL's default — DOTS, not total). null when
// no match.
const buildSearchUrl = (req: CohortRequest, q: string, start = 0): string => {
  const segments = buildFilterSegments(req);
  const path = segments.length > 0 ? `/${segments.join('/')}` : '';
  const params = new URLSearchParams({ q, start: String(start) });
  return `${OPL_BASE}/api/search/rankings${path}?${params.toString()}`;
};

type SearchResponse = { next_index: number | null };

const searchByName = async (
  req: CohortRequest,
  q: string,
  env: Env,
): Promise<number | null> => {
  const url = buildSearchUrl(req, q);
  const cacheKey = `opl:${url}`;
  const kv = env.COHORT_KV;
  if (kv && !req.noCache) {
    const cached = await kv.get<SearchResponse>(cacheKey, 'json');
    if (cached) return cached.next_index;
  }
  const resp = await fetch(url, {
    headers: {
      'user-agent': 'opl-coach-proxy/1.0 (+https://github.com/ewl172003)',
      accept: 'application/json',
    },
    cf: { cacheTtl: 300, cacheEverything: true },
  });
  if (!resp.ok) throw new Error(`OPL search ${resp.status}`);
  const data = (await resp.json()) as SearchResponse;
  if (kv && !req.noCache) {
    await kv.put(cacheKey, JSON.stringify(data), {
      expirationTtl: cacheTtlSeconds(env),
    });
  }
  return data.next_index;
};

// Fetch a single row at a specific index within the cohort using OPL's
// DEFAULT sort (DOTS) — MUST match /api/search/rankings' index space.
const fetchRowAtIndex = async (
  req: CohortRequest,
  index: number,
  env: Env,
): Promise<OplRankingsResponse['rows'][number] | null> => {
  const page = await fetchPage(
    buildOplUrl(req, index, index, 'default'),
    env,
    req.noCache,
  );
  return page.rows[0] ?? null;
};

const cacheTtlSeconds = (env: Env): number => {
  const raw = parseInt(env.COHORT_CACHE_TTL_SECONDS ?? '1800', 10);
  return Number.isFinite(raw) && raw >= 60 ? raw : 1800;
};

const fetchPage = async (
  url: string,
  env: Env,
  skipCache: boolean,
): Promise<OplRankingsResponse> => {
  const kv = env.COHORT_KV;
  const key = `opl:${url}`;
  if (kv && !skipCache) {
    const cached = await kv.get<OplRankingsResponse>(key, 'json');
    if (cached) return cached;
  }
  const resp = await fetch(url, {
    headers: {
      'user-agent': 'opl-coach-proxy/1.0 (+https://github.com/ewl172003)',
      accept: 'application/json',
    },
    cf: { cacheTtl: 300, cacheEverything: true },
  });
  if (!resp.ok) {
    throw new Error(`OPL ${resp.status} ${resp.statusText}`);
  }
  const data = (await resp.json()) as OplRankingsResponse;
  if (kv && !skipCache) {
    await kv.put(key, JSON.stringify(data), {
      expirationTtl: cacheTtlSeconds(env),
    });
  }
  return data;
};

// Binary-search OPL's by-total cohort for the user's insertion point.
// Returns 1-based rank (consistent with OPL's rank column).
const findUserRank = async (
  req: CohortRequest,
  totalLength: number,
  userTotalKg: number,
  env: Env,
): Promise<number | null> => {
  if (totalLength === 0) return 1;
  let lo = 0;
  let hi = totalLength - 1;
  let insertion = totalLength; // worst case: user ranks below everyone fetched
  let safety = 0;
  while (lo <= hi && safety < 20) {
    safety += 1;
    const mid = Math.floor((lo + hi) / 2);
    const page = await fetchPage(buildOplUrl(req, mid, mid), env, req.noCache);
    const row = page.rows[0];
    if (!row) break;
    const normalized = normalizeRow(row);
    const rowTotal = normalized.totalKg;
    if (!Number.isFinite(rowTotal) || rowTotal <= 0) break;
    if (rowTotal <= userTotalKg) {
      insertion = mid;
      hi = mid - 1;
    } else {
      lo = mid + 1;
    }
  }
  return insertion + 1;
};

const parseNum = (s: string | null): number | undefined => {
  if (!s) return undefined;
  const n = parseFloat(s);
  return Number.isFinite(n) ? n : undefined;
};

const parseCohortRequest = (url: URL): CohortRequest | string => {
  const p = url.searchParams;
  const sexRaw = p.get('sex');
  const sex = sexRaw === 'M' || sexRaw === 'F' ? sexRaw : undefined;
  const eventRaw = p.get('eventSlug');
  const eventSlug =
    eventRaw === 'full-power' || eventRaw === 'push-pull' ? eventRaw : undefined;
  const unitsRaw = p.get('units');
  const units = unitsRaw === 'lbs' ? 'lbs' : 'kg';

  const req: CohortRequest = {
    equipment: p.get('equipment') ?? undefined,
    weightClassSlug: p.get('weightClassSlug') ?? undefined,
    federationSlug: p.get('federationSlug') ?? undefined,
    sex,
    ageSlug: p.get('ageSlug') ?? undefined,
    year: p.get('year') ?? undefined,
    eventSlug,
    userTotalKg: parseNum(p.get('userTotalKg')),
    q: p.get('q')?.trim() || undefined,
    units,
    noCache: p.get('noCache') === '1',
  };

  const hasFilter =
    req.equipment ||
    req.weightClassSlug ||
    req.federationSlug ||
    req.sex ||
    req.ageSlug ||
    req.year ||
    req.eventSlug ||
    req.q;
  if (!hasFilter) return 'at least one filter or q param is required';

  return req;
};

export const handleCohort = async (
  request: Request,
  env: Env,
): Promise<Response> => {
  const url = new URL(request.url);
  const parsed = parseCohortRequest(url);
  if (typeof parsed === 'string') return errorResponse(parsed, 400);
  const req = parsed;

  let top: OplRankingsResponse;
  try {
    top = await fetchPage(buildOplUrl(req, 0, 4), env, req.noCache);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return errorResponse(`OPL fetch failed: ${msg}`, 502);
  }

  const totalCount = top.total_length;
  const topRows: CohortLifter[] = top.rows.map(normalizeRow);

  let userRank: number | null = null;
  if (req.userTotalKg != null && req.userTotalKg > 0 && totalCount > 0) {
    try {
      userRank = await findUserRank(req, totalCount, req.userTotalKg, env);
    } catch {
      userRank = null;
    }
  }

  // Fetch ±2 rows around the user's rank so the drawer can show "Your Position"
  // with adjacent lifters. Uses the by-total sort to match userRank's index.
  let surroundingRows: CohortLifter[] = [];
  if (userRank != null && totalCount > 0) {
    try {
      const lo = Math.max(0, userRank - 3); // 2 rows above (rank is 1-based; index = rank-1)
      const hi = Math.min(totalCount - 1, userRank + 1); // 2 rows below
      const page = await fetchPage(
        buildOplUrl(req, lo, hi, 'by-total'),
        env,
        req.noCache,
      );
      surroundingRows = page.rows.map(normalizeRow);
    } catch {
      surroundingRows = [];
    }
  }

  // Resolve a named lifter within the cohort via OPL's search API.
  // /api/search/rankings returns next_index in OPL's DEFAULT (DOTS) sort —
  // so fetchRowAtIndex reads from the same sort to return the correct row.
  let namedLifter: CohortLifter | null = null;
  let namedRank: number | null = null;
  let namedNotFound = false;
  if (req.q) {
    try {
      const idx = await searchByName(req, req.q, env);
      if (idx == null) {
        namedNotFound = true;
      } else {
        const row = await fetchRowAtIndex(req, idx, env);
        if (row) {
          namedLifter = normalizeRow(row);
          // The row's `rank` field is the DOTS rank (1-based) == idx + 1.
          namedRank = namedLifter.rank;
        }
      }
    } catch {
      namedNotFound = true;
      namedLifter = null;
    }
  }

  return jsonResponse({
    totalCount,
    userRank,
    topRows,
    surroundingRows,
    namedLifter,
    namedRank,
    namedNotFound,
    fetchedAt: new Date().toISOString(),
    source: 'opl/api/rankings/by-total',
    cached: env.COHORT_KV != null && !req.noCache,
  });
};
