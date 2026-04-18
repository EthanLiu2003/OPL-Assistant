import type { AgeDivision, Equipment, Federation, Sex } from '@/lib/types';
import type { ParsedFilter } from '@/search/opl-url';
import type { ParseFilterSource, ProfileExtract } from '@/llm/parse-filter-client';
import type { CohortLifter } from '@/cohort/cohort-client';

export type CohortSummary = {
  totalCount: number;
  userRank: number | null;
  topRows: CohortLifter[];
  surroundingRows: CohortLifter[];
  namedLifter: CohortLifter | null;
  namedRank: number | null;
  namedNotFound: boolean;
  fetchedAt: string;
};

export type QualifyingGap = {
  federation: Federation;
  event: string;
  ageDivision: AgeDivision;
  equipment: Equipment;
  weightClassKg: number;
  targetTotalKg: number;
  gapKg: number; // positive = to-go; negative = cushion over
  sourceUrl: string;
  lastVerified: string;
};

export type WhereYouStandCard = {
  version: 1;
  cohort: {
    slugs: ParsedFilter;
    summary: string;
    totalCount: number;
    userRank: number;
  };
  totals: {
    userTotalKg: number;
    bodyweightKg: number;
    sex: Sex;
    ageYears: number | null;
    equipment: Equipment;
  };
  scoring: { dots: number; wilks: number; ipfGl: number };
  qualifying: QualifyingGap[];
  computedAt: string;
};

export type UserTurn = {
  role: 'user';
  id: string;
  text: string;
  createdAt: string;
};

export type AssistantTurn = {
  role: 'assistant';
  id: string;
  kind: 'result';
  parsed: ParsedFilter;
  profile: ProfileExtract | null;
  cohort?: CohortSummary;
  card?: WhereYouStandCard;
  suggestions: string[];
  templateText: string;
  narrateLine?: string;
  source: ParseFilterSource;
  createdAt: string;
};

export type ClarifyTurn = {
  role: 'assistant';
  id: string;
  kind: 'clarify';
  question: string;
  options: string[];
  // Filter state at the moment the clarify was raised. When the user picks
  // an option, the parsed option is merged onto this context — without it,
  // the prior prompt's weight-class/age/etc. would be lost.
  contextFilter: ParsedFilter;
  createdAt: string;
};

export type ErrorTurn = {
  role: 'assistant';
  id: string;
  kind: 'error';
  text: string;
  createdAt: string;
};

export type ChatTurn = UserTurn | AssistantTurn | ClarifyTurn | ErrorTurn;

export type ChatThread = {
  id: string;
  turns: ChatTurn[];
  updatedAt: string;
};

// Walk the thread backward for the most recent profile data — so once the user
// tells us their total/bodyweight/age in any turn, it carries forward into all
// subsequent searches (no need to repeat it or have a saved profile).
export type ThreadProfile = {
  totalKg: number;
  bodyweightKg: number;
  sex?: 'M' | 'F';
  ageYears?: number;
};

export const latestProfileFromThread = (
  thread: ChatThread,
): ThreadProfile | null => {
  for (let i = thread.turns.length - 1; i >= 0; i -= 1) {
    const t = thread.turns[i];
    if (t.role !== 'assistant' || t.kind !== 'result') continue;

    // 1. A prior "where you stand" card has authoritative user stats.
    if (t.card) {
      return {
        totalKg: t.card.totals.userTotalKg,
        bodyweightKg: t.card.totals.bodyweightKg,
        sex: t.card.totals.sex,
        ageYears: t.card.totals.ageYears ?? undefined,
      };
    }

    // 2. LLM-extracted profile fields (user typed their total + bw).
    if (t.profile) {
      const p = t.profile;
      if (p.totalKg != null && p.bodyweightKg != null) {
        return {
          totalKg: p.totalKg,
          bodyweightKg: p.bodyweightKg,
          sex: t.parsed.sex ?? undefined,
          ageYears: p.ageYears ?? undefined,
        };
      }
    }

    // 3. Named lifter lookup — user searched for themselves by name and
    //    we found their OPL data. Use as their profile context so "where
    //    do i stand" works after a name search.
    if (t.cohort?.namedLifter) {
      const nl = t.cohort.namedLifter;
      if (nl.totalKg > 0 && nl.bodyweightKg != null && nl.bodyweightKg > 0) {
        return {
          totalKg: nl.totalKg,
          bodyweightKg: nl.bodyweightKg,
          sex: nl.sex,
          ageYears: nl.age ?? undefined,
        };
      }
    }
  }
  return null;
};

// Pull the most recent assistant filter from the thread — used as activeFilter
// context when the user's next message is a continuation ("also...", "and...").
// Walks through both result and clarify turns so a clarify answer inherits
// the pre-clarify context.
export const latestAssistantFilter = (thread: ChatThread): ParsedFilter | null => {
  for (let i = thread.turns.length - 1; i >= 0; i -= 1) {
    const t = thread.turns[i];
    if (t.role !== 'assistant') continue;
    if (t.kind === 'result') return t.parsed;
    if (t.kind === 'clarify') return t.contextFilter;
  }
  return null;
};
