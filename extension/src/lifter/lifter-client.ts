import { env } from '@/lib/env';
import type { CompetitionEntry } from './types';

export async function fetchLifterCsv(
  username: string,
): Promise<CompetitionEntry[] | null> {
  if (!env.PROXY_URL) return null;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 6000);

  try {
    const resp = await fetch(
      `${env.PROXY_URL}/lifter-csv/${encodeURIComponent(username)}`,
      { signal: controller.signal },
    );
    if (!resp.ok) return null;
    const data = (await resp.json()) as { entries: CompetitionEntry[] };
    return data.entries ?? null;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}
