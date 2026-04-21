import type { Env } from './index';
import { errorResponse, jsonResponse } from './cors';
import type { Meet, MeetSource, MeetsResponse } from './sources/meets-types';
import { fetchUsaplMeets } from './sources/usapl-calendar';
import { fetchPaMeets } from './sources/pa-events';
import { fetchUspaMeets } from './sources/uspa-events';
import { fetchLiftingcastMeet } from './sources/liftingcast-meet';

const MEETS_LIST_TTL_SECONDS = 6 * 60 * 60;
const MEETS_LIFTINGCAST_TTL_SECONDS = 24 * 60 * 60;

type CachedList = { meets: Meet[]; fetchedAt: string };

const readList = async (
  env: Env,
  key: string,
  noCache: boolean,
): Promise<CachedList | null> => {
  if (!env.COHORT_KV || noCache) return null;
  return env.COHORT_KV.get<CachedList>(key, 'json');
};

const writeList = async (env: Env, key: string, value: CachedList, ttl: number) => {
  if (!env.COHORT_KV) return;
  try {
    await env.COHORT_KV.put(key, JSON.stringify(value), { expirationTtl: ttl });
  } catch {
    /* best-effort cache write */
  }
};

const respondList = (meets: Meet[], source: MeetSource, cached: boolean): Response => {
  const body: MeetsResponse = {
    meets,
    source,
    cached,
    fetchedAt: new Date().toISOString(),
  };
  return jsonResponse(body);
};

const noCacheParam = (request: Request): boolean =>
  new URL(request.url).searchParams.get('noCache') === '1';

type Loader = () => Promise<Meet[]>;

const handleSourceList = async (
  request: Request,
  env: Env,
  source: MeetSource,
  loader: Loader,
): Promise<Response> => {
  const noCache = noCacheParam(request);
  const cacheKey = `meets:${source}`;
  try {
    const cached = await readList(env, cacheKey, noCache);
    if (cached) return respondList(cached.meets, source, true);
    const meets = await loader();
    await writeList(
      env,
      cacheKey,
      { meets, fetchedAt: new Date().toISOString() },
      MEETS_LIST_TTL_SECONDS,
    );
    return respondList(meets, source, false);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'fetch failed';
    return errorResponse(`meets ${source}: ${message}`, 502);
  }
};

export const handleUsaplMeets = (request: Request, env: Env): Promise<Response> =>
  handleSourceList(request, env, 'usapl', fetchUsaplMeets);

export const handlePaMeets = (request: Request, env: Env): Promise<Response> =>
  handleSourceList(request, env, 'pa', fetchPaMeets);

export const handleUspaMeets = (request: Request, env: Env): Promise<Response> =>
  handleSourceList(request, env, 'uspa', fetchUspaMeets);

export const handleLiftingcastMeet = async (
  request: Request,
  env: Env,
  meetId: string,
): Promise<Response> => {
  const noCache = noCacheParam(request);
  const cacheKey = `meets:liftingcast:${meetId}`;
  try {
    if (!noCache && env.COHORT_KV) {
      const cached = await env.COHORT_KV.get<Meet>(cacheKey, 'json');
      if (cached) return jsonResponse({ meet: cached, cached: true });
    }
    const meet = await fetchLiftingcastMeet(meetId);
    if (!meet) return errorResponse('meet not found', 404);
    if (env.COHORT_KV) {
      try {
        await env.COHORT_KV.put(cacheKey, JSON.stringify(meet), {
          expirationTtl: MEETS_LIFTINGCAST_TTL_SECONDS,
        });
      } catch {
        /* best-effort */
      }
    }
    return jsonResponse({ meet, cached: false });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'fetch failed';
    return errorResponse(`liftingcast ${meetId}: ${message}`, 502);
  }
};
