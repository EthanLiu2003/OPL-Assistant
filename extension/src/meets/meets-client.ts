import { env } from '@/lib/env';
import type { Meet, MeetFederation } from './types';

type MeetsResponse = {
  meets: Meet[];
  cached: boolean;
  fetchedAt: string;
};

export type MeetsQuery = {
  federation?: MeetFederation | null;
  state?: string | null;
};

export type MeetsResult = {
  meets: Meet[];
  sources: Array<{ source: string; ok: boolean; count: number }>;
};

const FED_TO_ENDPOINT: Record<Exclude<MeetFederation, 'OTHER'>, string> = {
  USAPL: '/meets/usapl',
  PA: '/meets/pa',
  USPA: '/meets/uspa',
};

// Federation-specific fetch with 10s budget — Tribe Events pagination can be
// slow, and the Worker cache makes subsequent calls fast.
const fetchOne = async (
  endpoint: string,
  signal: AbortSignal,
): Promise<Meet[] | null> => {
  if (!env.PROXY_URL) return null;
  try {
    const resp = await fetch(`${env.PROXY_URL}${endpoint}`, {
      method: 'GET',
      signal,
    });
    if (!resp.ok) return null;
    const data = (await resp.json()) as MeetsResponse;
    return Array.isArray(data.meets) ? data.meets : [];
  } catch {
    return null;
  }
};

const byDateAsc = (a: Meet, b: Meet): number =>
  a.startDate.localeCompare(b.startDate);

const upcomingOnly = (meets: Meet[]): Meet[] => {
  const todayIso = new Date(new Date().setHours(0, 0, 0, 0)).toISOString();
  return meets.filter((m) => m.startDate >= todayIso);
};

export const fetchMeets = async (query: MeetsQuery = {}): Promise<MeetsResult> => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 15000);

  try {
    const targets: Array<[string, string]> =
      query.federation && query.federation !== 'OTHER'
        ? [[query.federation, FED_TO_ENDPOINT[query.federation]]]
        : [
            ['USAPL', FED_TO_ENDPOINT.USAPL],
            ['PA', FED_TO_ENDPOINT.PA],
            ['USPA', FED_TO_ENDPOINT.USPA],
          ];

    const results = await Promise.all(
      targets.map(async ([label, endpoint]) => {
        const meets = await fetchOne(endpoint, controller.signal);
        return { source: label, ok: meets !== null, count: meets?.length ?? 0, meets: meets ?? [] };
      }),
    );

    let merged = results.flatMap((r) => r.meets);
    merged = upcomingOnly(merged);
    if (query.state) {
      const state = query.state.toUpperCase();
      merged = merged.filter((m) => m.location.state === state);
    }
    merged.sort(byDateAsc);

    return {
      meets: merged,
      sources: results.map((r) => ({ source: r.source, ok: r.ok, count: r.count })),
    };
  } finally {
    clearTimeout(timer);
  }
};
