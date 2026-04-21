import { callAnthropic } from './anthropic';
import { SYSTEM_PROMPT } from './system-prompt';
import { errorResponse, jsonResponse } from './cors';
import type { Env } from './index';

// Response schema — mirrors extension/src/search/opl-url.ts ParsedFilter +
// a profile block for "where I stand" prompts.
type ParsedFilter = {
  equipment: string | null;
  weightClassSlug: string | null;
  federationSlug: string | null;
  sex: 'M' | 'F' | null;
  ageSlug: string | null;
  year: string | null;
  eventSlug: 'full-power' | 'push-pull' | null;
  q: string | null;
};

type ProfileExtract = {
  totalKg: number | null;
  bodyweightKg: number | null;
  ageYears: number | null;
};

const ALLOWED_FILTER_KEYS = new Set<keyof ParsedFilter>([
  'equipment',
  'weightClassSlug',
  'federationSlug',
  'sex',
  'ageSlug',
  'year',
  'eventSlug',
  'q',
]);

const emptyFilter = (): ParsedFilter => ({
  equipment: null,
  weightClassSlug: null,
  federationSlug: null,
  sex: null,
  ageSlug: null,
  year: null,
  eventSlug: null,
  q: null,
});

// Strip any keys the model hallucinates and coerce missing ones to null so the
// extension always receives the exact schema shape.
const normalizeFilter = (raw: unknown): ParsedFilter => {
  const src = (raw ?? {}) as Record<string, unknown>;
  const out = emptyFilter();
  for (const k of ALLOWED_FILTER_KEYS) {
    const v = src[k];
    if (v === null || v === undefined || v === '') continue;
    if (typeof v === 'string') (out[k] as string) = v;
  }
  if (out.sex && out.sex !== 'M' && out.sex !== 'F') out.sex = null;
  if (
    out.eventSlug &&
    out.eventSlug !== 'full-power' &&
    out.eventSlug !== 'push-pull'
  ) {
    out.eventSlug = null;
  }
  return out;
};

const normalizeFederations = (raw: unknown): string[] | null => {
  if (!Array.isArray(raw) || raw.length === 0) return null;
  const slugs = raw
    .filter((v): v is string => typeof v === 'string' && v.length > 0)
    .map((s) => s.toLowerCase().trim());
  return slugs.length >= 2 ? slugs : null;
};

const clampNumber = (
  raw: unknown,
  min: number,
  max: number,
): number | null => {
  if (raw === null || raw === undefined) return null;
  const n = typeof raw === 'number' ? raw : parseFloat(String(raw));
  if (!Number.isFinite(n)) return null;
  if (n < min || n > max) return null;
  return n;
};

type MeetIntent = {
  federation: 'USAPL' | 'PA' | 'USPA' | null;
  state: string | null;
};

const ALLOWED_MEET_FEDS = new Set(['USAPL', 'PA', 'USPA']);

const normalizeMeetIntent = (raw: unknown): MeetIntent | null => {
  if (raw === null || raw === undefined) return null;
  if (typeof raw !== 'object') return null;
  const src = raw as Record<string, unknown>;
  let federation: MeetIntent['federation'] = null;
  if (typeof src.federation === 'string') {
    const fed = src.federation.toUpperCase();
    if (ALLOWED_MEET_FEDS.has(fed)) {
      federation = fed as MeetIntent['federation'];
    }
  }
  let state: string | null = null;
  if (typeof src.state === 'string') {
    const s = src.state.trim().toUpperCase();
    if (/^[A-Z]{2}$/.test(s)) state = s;
  }
  if (federation === null && state === null) return { federation: null, state: null };
  return { federation, state };
};

const normalizeProfile = (raw: unknown): ProfileExtract | null => {
  if (raw === null || raw === undefined) return null;
  if (typeof raw !== 'object') return null;
  const src = raw as Record<string, unknown>;
  const totalKg = clampNumber(src.totalKg, 50, 2000);
  const bodyweightKg = clampNumber(src.bodyweightKg, 20, 250);
  const ageYearsRaw = clampNumber(src.ageYears, 5, 100);
  const ageYears = ageYearsRaw != null ? Math.round(ageYearsRaw) : null;
  if (totalKg == null && bodyweightKg == null && ageYears == null) return null;
  return { totalKg, bodyweightKg, ageYears };
};

type ActiveFilter = Partial<ParsedFilter>;

const buildUserMessage = (prompt: string, active?: ActiveFilter): string => {
  if (!active || Object.keys(active).length === 0) return prompt;
  const activeJson = JSON.stringify(active);
  return `activeFilter: ${activeJson}\n\nuser: ${prompt}`;
};

export const handleParseFilter = async (
  request: Request,
  env: Env,
): Promise<Response> => {
  let body: { prompt?: string; activeFilter?: ActiveFilter };
  try {
    body = (await request.json()) as {
      prompt?: string;
      activeFilter?: ActiveFilter;
    };
  } catch {
    return errorResponse('body must be JSON', 400);
  }

  const prompt = body.prompt?.trim();
  if (!prompt) return errorResponse('missing prompt', 400);
  if (prompt.length > 500) return errorResponse('prompt too long (max 500)', 400);

  if (!env.ANTHROPIC_API_KEY) {
    return errorResponse('ANTHROPIC_API_KEY not configured', 500);
  }

  let anthropicResp;
  try {
    anthropicResp = await callAnthropic({
      apiKey: env.ANTHROPIC_API_KEY,
      model: env.MODEL_ID || 'claude-haiku-4-5-20251001',
      systemPrompt: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: buildUserMessage(prompt, body.activeFilter) }],
      maxTokens: 320,
      temperature: 0,
      timeoutMs: 2500,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return errorResponse(`llm error: ${msg}`, 502);
  }

  const textBlock = anthropicResp.content.find((c) => c.type === 'text');
  if (!textBlock) return errorResponse('no text in llm response', 502);

  let parsed: unknown;
  try {
    const text = textBlock.text.trim();
    const jsonStart = text.indexOf('{');
    const jsonEnd = text.lastIndexOf('}');
    if (jsonStart < 0 || jsonEnd < 0 || jsonEnd <= jsonStart) {
      throw new Error('no JSON object found');
    }
    parsed = JSON.parse(text.slice(jsonStart, jsonEnd + 1));
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return errorResponse(`llm output parse error: ${msg}`, 502);
  }

  const parsedObj = (parsed ?? {}) as Record<string, unknown>;
  const cacheHit = (anthropicResp.usage.cache_read_input_tokens ?? 0) > 0;

  return jsonResponse({
    parsed: normalizeFilter(parsedObj),
    federations: normalizeFederations(parsedObj.federations),
    profile: normalizeProfile(parsedObj.profile),
    meetIntent: normalizeMeetIntent(parsedObj.meetIntent),
    model: anthropicResp.model,
    cached: cacheHit,
  });
};
