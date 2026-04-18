import type { ParsedFilter } from '@/search/opl-url';
import type { Equipment, Profile, Sex } from '@/lib/types';
import type {
  AssistantTurn,
  ChatThread,
  ChatTurn,
  ClarifyTurn,
  ErrorTurn,
} from '@/chat/types';
import {
  latestAssistantFilter,
  latestProfileFromThread,
  type ThreadProfile,
} from '@/chat/types';
import {
  hasAnyFilter,
  parseFilterPrompt,
} from '@/search/parse-filter-prompt';
import {
  parseFilterLLM,
  type ParseFilterResult,
  type ProfileExtract,
} from '@/llm/parse-filter-client';
import { fetchCohort } from '@/cohort/cohort-client';
import { buildWhereYouStandCard } from '@/card/build-card';
import { buildSuggestions } from '@/chat/SuggestionChips';
import { summarizeFilter } from '@/search/parse-filter-prompt';
import type { CohortResponse } from '@/cohort/cohort-client';
import type { WhereYouStandCard } from '@/chat/types';

const newId = (): string => crypto.randomUUID();
const now = (): string => new Date().toISOString();

const RESET_PATTERNS = [/\b(new\s+search|start\s+over|reset|clear|forget\s+that)\b/i];

const isFreshSearch = (text: string): boolean =>
  RESET_PATTERNS.some((re) => re.test(text));

const equipmentSlugToEnum = (
  slug: string | undefined,
  profileEquipment: Equipment | undefined,
): Equipment => {
  if (profileEquipment) return profileEquipment;
  switch (slug) {
    case 'single': return 'Single-ply';
    case 'multi': return 'Multi-ply';
    case 'wraps': return 'Wraps';
    default: return 'Raw';
  }
};

function mergeFilter(active: ParsedFilter | null, next: ParsedFilter): ParsedFilter {
  if (!active) return next;
  const out: ParsedFilter = { ...active };
  const keys: Array<keyof ParsedFilter> = [
    'equipment', 'weightClassSlug', 'federationSlug', 'sex',
    'ageSlug', 'year', 'eventSlug', 'sortSlug', 'q',
  ];
  for (const k of keys) {
    const v = next[k];
    if (v !== null && v !== undefined && v !== '') {
      (out as Record<string, unknown>)[k] = v;
    }
  }
  return out;
}

function resolveIntent(
  filter: ParsedFilter,
  profile: ProfileExtract | null,
  savedProfile: Profile | null,
  threadProfile: ThreadProfile | null,
): 'where-you-stand' | 'filter-search' | 'clarify' | 'empty' {
  const haveFilter = hasAnyFilter(filter);
  const total = profile?.totalKg ?? savedProfile?.currentTotalKg ?? threadProfile?.totalKg ?? null;
  const bw = profile?.bodyweightKg ?? savedProfile?.bodyweightKg ?? threadProfile?.bodyweightKg ?? null;
  if (total && bw) return 'where-you-stand';
  if (haveFilter) return 'filter-search';
  if (total && !bw) return 'clarify';
  return 'empty';
}

async function runParse(
  prompt: string,
  activeFilter: ParsedFilter | null,
): Promise<ParseFilterResult> {
  const llm = await parseFilterLLM(prompt, activeFilter ?? undefined);
  if (llm && (hasAnyFilter(llm.parsed) || llm.profile)) return llm;
  return { parsed: parseFilterPrompt(prompt), federations: null, profile: null, source: 'heuristic' };
}

function toCohortSummary(cohort: CohortResponse) {
  return {
    totalCount: cohort.totalCount,
    userRank: cohort.userRank,
    topRows: cohort.topRows,
    surroundingRows: cohort.surroundingRows,
    namedLifter: cohort.namedLifter,
    namedRank: cohort.namedRank,
    namedNotFound: cohort.namedNotFound,
    fetchedAt: cohort.fetchedAt,
  };
}

function buildTemplateText(
  intent: string,
  filter: ParsedFilter,
  cohort: CohortResponse | null,
  card: WhereYouStandCard | null,
): string {
  const summary = summarizeFilter(filter);
  if (intent === 'where-you-stand' && card) {
    const pct = card.cohort.totalCount > 0
      ? `#${card.cohort.userRank.toLocaleString()} of ${card.cohort.totalCount.toLocaleString()}`
      : '';
    return `You rank ${pct} in ${summary}. Here's your breakdown.`;
  }
  if (cohort?.namedLifter) {
    return `Found ${cohort.namedLifter.name} at #${cohort.namedRank} in ${summary}.`;
  }
  if (cohort?.namedNotFound && filter.q) {
    return `${filter.q} wasn't found in this cohort. Try loosening your filters.`;
  }
  if (cohort && cohort.totalCount > 0) {
    return `Here are the top lifters in ${summary}.`;
  }
  return `Showing results for ${summary}.`;
}

export type SubmitResult = {
  turns: ChatTurn[];
  narrationTarget?: { turnId: string; card: WhereYouStandCard };
};

export async function handleSubmit(
  text: string,
  thread: ChatThread,
  profile: Profile | null,
): Promise<SubmitResult> {
  const turns: ChatTurn[] = [];
  let narrationTarget: SubmitResult['narrationTarget'];

  const active = isFreshSearch(text) ? null : latestAssistantFilter(thread);
  const parseResult = await runParse(text, active);
  const mergedFilter = mergeFilter(active, parseResult.parsed);
  const threadProfile = latestProfileFromThread(thread);
  const intent = resolveIntent(mergedFilter, parseResult.profile, profile, threadProfile);

  if (parseResult.federations && parseResult.federations.length >= 2) {
    const fedLabels = parseResult.federations.map((slug) => slug.toUpperCase());
    turns.push({
      role: 'assistant', id: newId(), kind: 'clarify',
      question: 'Which federation would you like to search?',
      options: [...fedLabels, 'all federations'],
      contextFilter: mergedFilter, createdAt: now(),
    } satisfies ClarifyTurn);
    return { turns, narrationTarget };
  }

  if (intent === 'where-you-stand') {
    const total = parseResult.profile?.totalKg ?? profile?.currentTotalKg ?? threadProfile?.totalKg;
    const bw = parseResult.profile?.bodyweightKg ?? profile?.bodyweightKg ?? threadProfile?.bodyweightKg;
    const sex: Sex | undefined = mergedFilter.sex ?? profile?.sex ?? threadProfile?.sex;
    const equipment = equipmentSlugToEnum(mergedFilter.equipment, profile?.equipment);

    if (!sex) {
      turns.push({
        role: 'assistant', id: newId(), kind: 'clarify',
        question: "Men's or women's rankings?",
        options: ['men', 'women'],
        contextFilter: mergedFilter, createdAt: now(),
      } satisfies ClarifyTurn);
      return { turns, narrationTarget };
    }

    if (total == null || bw == null) {
      turns.push({
        role: 'assistant', id: newId(), kind: 'clarify',
        question: 'Need bodyweight and total to compute percentile. What are they?',
        options: [], contextFilter: mergedFilter, createdAt: now(),
      } satisfies ClarifyTurn);
      return { turns, narrationTarget };
    }

    const cohort = await fetchCohort(mergedFilter, { userTotalKg: total });
    if (!cohort) {
      turns.push({
        role: 'assistant', id: newId(), kind: 'error',
        text: 'Could not reach OPL for cohort data. Try again in a moment.',
        createdAt: now(),
      } satisfies ErrorTurn);
      return { turns, narrationTarget };
    }

    const card = buildWhereYouStandCard({
      parsed: mergedFilter, cohort,
      userTotalKg: total, bodyweightKg: bw, sex, equipment,
      ageYears: parseResult.profile?.ageYears ?? profile?.ageYears ?? threadProfile?.ageYears ?? null,
      federations: profile?.federations,
      ageDivisions: profile?.ageDivisions,
    });

    const turnId = newId();
    const templateText = buildTemplateText('where-you-stand', mergedFilter, cohort, card);
    turns.push({
      role: 'assistant', id: turnId, kind: 'result',
      parsed: mergedFilter, profile: parseResult.profile,
      cohort: toCohortSummary(cohort), card,
      suggestions: buildSuggestions(mergedFilter),
      templateText,
      source: parseResult.source, createdAt: now(),
    } satisfies AssistantTurn);
    narrationTarget = { turnId, card };
    return { turns, narrationTarget };
  }

  if (intent === 'filter-search') {
    if (mergedFilter.weightClassSlug && !mergedFilter.federationSlug) {
      turns.push({
        role: 'assistant', id: newId(), kind: 'clarify',
        question: 'Which federation?',
        options: ['USAPL', 'USPA', 'AMP (Powerlifting America)', 'all federations'],
        contextFilter: mergedFilter, createdAt: now(),
      } satisfies ClarifyTurn);
      return { turns, narrationTarget };
    }

    const threadProfile = latestProfileFromThread(thread);
    const knownTotal = threadProfile?.totalKg ?? profile?.currentTotalKg;
    const cohort = await fetchCohort(mergedFilter, {
      userTotalKg: knownTotal ?? undefined,
    });

    turns.push({
      role: 'assistant', id: newId(), kind: 'result',
      parsed: mergedFilter, profile: parseResult.profile,
      cohort: cohort ? toCohortSummary(cohort) : undefined,
      suggestions: buildSuggestions(mergedFilter),
      templateText: buildTemplateText('filter-search', mergedFilter, cohort, null),
      source: parseResult.source, createdAt: now(),
    } satisfies AssistantTurn);

    const isNameOnly =
      mergedFilter.q && !mergedFilter.federationSlug && !mergedFilter.weightClassSlug;
    if (isNameOnly) {
      turns.push({
        role: 'assistant', id: newId(), kind: 'clarify',
        question: 'Which federation would you like to see results in?',
        options: ['USAPL', 'USPA', 'AMP (Powerlifting America)', 'all federations'],
        contextFilter: mergedFilter, createdAt: now(),
      } satisfies ClarifyTurn);
    }
    return { turns, narrationTarget };
  }

  turns.push({
    role: 'assistant', id: newId(), kind: 'error',
    text: "Couldn't detect filters or personal stats. Try: 'USAPL 82.5kg raw juniors' or '24yo raw 82.5kg hit 585'.",
    createdAt: now(),
  } satisfies ErrorTurn);
  return { turns, narrationTarget };
}
