const WINDOW_MS = 60_000;
const MAX_REQUESTS = 30;
const MAX_TRACKED_IPS = 10_000;

const hits = new Map<string, number[]>();

// Inline sweep: opportunistically evict stale entries on each call. Cloudflare
// Workers disallow setInterval at module scope (global I/O restrictions), and
// isolates are ephemeral anyway, so lazy eviction is the right trade-off.
const evictStale = (cutoff: number) => {
  if (hits.size < MAX_TRACKED_IPS) return;
  for (const [ip, timestamps] of hits) {
    const filtered = timestamps.filter((t) => t > cutoff);
    if (filtered.length === 0) hits.delete(ip);
    else hits.set(ip, filtered);
  }
};

export const checkRateLimit = (
  request: Request,
): { allowed: boolean; remaining: number } => {
  const ip =
    request.headers.get('cf-connecting-ip') ??
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    'unknown';

  const now = Date.now();
  const cutoff = now - WINDOW_MS;
  evictStale(cutoff);

  const timestamps = (hits.get(ip) ?? []).filter((t) => t > cutoff);
  timestamps.push(now);
  hits.set(ip, timestamps);

  return {
    allowed: timestamps.length <= MAX_REQUESTS,
    remaining: Math.max(0, MAX_REQUESTS - timestamps.length),
  };
};
