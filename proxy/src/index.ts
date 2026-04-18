import { corsPreflight, errorResponse, jsonResponse } from './cors';
import { handleCohort } from './cohort';
import { handleLifterCsv } from './lifter-csv';
import { handleNarrate } from './narrate';
import { handleParseFilter } from './parse-filter';
import { checkRateLimit } from './rate-limit';

export type Env = {
  ANTHROPIC_API_KEY: string;
  MODEL_ID: string;
  PROMPT_CACHE_TTL: string;
  COHORT_CACHE_TTL_SECONDS?: string;
  COHORT_KV?: KVNamespace;
};

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    if (request.method === 'OPTIONS') return corsPreflight();

    const url = new URL(request.url);

    if (url.pathname === '/' || url.pathname === '/health') {
      return jsonResponse({ status: 'ok', service: 'opl-assistant-proxy' });
    }

    const { allowed, remaining } = checkRateLimit(request);
    if (!allowed) {
      return errorResponse('rate limit exceeded — try again in a minute', 429);
    }
    void remaining;

    if (url.pathname === '/parse-filter') {
      if (request.method !== 'POST') return errorResponse('method not allowed', 405);
      return handleParseFilter(request, env);
    }

    if (url.pathname === '/narrate') {
      if (request.method !== 'POST') return errorResponse('method not allowed', 405);
      return handleNarrate(request, env);
    }

    if (url.pathname === '/cohort') {
      if (request.method !== 'GET') return errorResponse('method not allowed', 405);
      return handleCohort(request, env);
    }

    const lifterMatch = url.pathname.match(/^\/lifter-csv\/([a-z0-9._-]+)$/i);
    if (lifterMatch) {
      if (request.method !== 'GET') return errorResponse('method not allowed', 405);
      return handleLifterCsv(request, env, lifterMatch[1]);
    }

    return errorResponse('not found', 404);
  },
} satisfies ExportedHandler<Env>;
