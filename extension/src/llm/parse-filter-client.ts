import { env } from '@/lib/env';
import type { ParsedFilter } from '@/search/opl-url';

export type ParseFilterSource = 'llm' | 'llm-cached' | 'heuristic';

export type ProfileExtract = {
  totalKg: number | null;
  bodyweightKg: number | null;
  ageYears: number | null;
};

export type ParseFilterResult = {
  parsed: ParsedFilter;
  federations: string[] | null;
  profile: ProfileExtract | null;
  source: ParseFilterSource;
  model?: string;
};

export type ActiveFilter = Partial<ParsedFilter>;

// Hits the Cloudflare Worker's /parse-filter endpoint with a 3s total budget.
// Returns null on any failure — caller falls back to the local heuristic parser.
export const parseFilterLLM = async (
  prompt: string,
  activeFilter?: ActiveFilter,
): Promise<ParseFilterResult | null> => {
  if (!env.PROXY_URL) return null;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 3000);

  try {
    const resp = await fetch(`${env.PROXY_URL}/parse-filter`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ prompt, activeFilter }),
      signal: controller.signal,
    });
    if (!resp.ok) return null;

    const data = (await resp.json()) as {
      parsed: ParsedFilter;
      federations?: string[] | null;
      profile: ProfileExtract | null;
      model?: string;
      cached?: boolean;
    };
    if (!data.parsed) return null;

    return {
      parsed: data.parsed,
      federations: data.federations ?? null,
      profile: data.profile ?? null,
      source: data.cached ? 'llm-cached' : 'llm',
      model: data.model,
    };
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
};
