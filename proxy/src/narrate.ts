import { callAnthropic } from './anthropic';
import { errorResponse, jsonResponse } from './cors';
import type { Env } from './index';

const NARRATE_PROMPT = `You generate a single-sentence insight about a powerlifter's standing. Be factual, concise, no hype. Use "you" voice. Examples:
- "Your DOTS of 427 puts you above the cohort median, and you're 37.5 kg from Raw Nationals qualifying."
- "At #4 in this cohort, you're in the top 0.1% — already qualified for every event at this class."
- "The 40 kg gap to Open Nationals is reachable within a training cycle for most intermediate lifters at this level."
Return ONLY the sentence — no quotes, no prefix.`;

type NarrateBody = {
  cohortSummary?: string;
  totalCount?: number;
  userRank?: number;
  userTotalKg?: number;
  dots?: number;
  wilks?: number;
  qualifying?: Array<{ event: string; gapKg: number }>;
};

export const handleNarrate = async (
  request: Request,
  env: Env,
): Promise<Response> => {
  let body: NarrateBody;
  try {
    body = (await request.json()) as NarrateBody;
  } catch {
    return errorResponse('body must be JSON', 400);
  }

  if (!env.ANTHROPIC_API_KEY) {
    return errorResponse('ANTHROPIC_API_KEY not configured', 500);
  }

  const parts: string[] = [];
  if (body.cohortSummary) parts.push(`Cohort: ${body.cohortSummary}`);
  if (body.totalCount != null && body.userRank != null) {
    parts.push(`Rank #${body.userRank} of ${body.totalCount}`);
  }
  if (body.userTotalKg != null) parts.push(`Total: ${body.userTotalKg} kg`);
  if (body.dots != null) parts.push(`DOTS: ${body.dots.toFixed(1)}`);
  if (body.qualifying?.length) {
    const qLines = body.qualifying
      .slice(0, 3)
      .map((q) =>
        q.gapKg <= 0
          ? `${q.event}: qualified (+${Math.abs(q.gapKg)} kg cushion)`
          : `${q.event}: ${q.gapKg} kg to go`,
      );
    parts.push(`Qualifying: ${qLines.join('; ')}`);
  }

  if (parts.length === 0) {
    return errorResponse('no data provided', 400);
  }

  try {
    const resp = await callAnthropic({
      apiKey: env.ANTHROPIC_API_KEY,
      model: env.MODEL_ID || 'claude-haiku-4-5-20251001',
      systemPrompt: NARRATE_PROMPT,
      messages: [{ role: 'user', content: parts.join('\n') }],
      maxTokens: 100,
      temperature: 0.3,
      timeoutMs: 2000,
    });
    const text = resp.content.find((c) => c.type === 'text');
    return jsonResponse({ line: text?.text?.trim() ?? '' });
  } catch {
    return jsonResponse({ line: '' });
  }
};
