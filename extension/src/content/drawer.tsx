import { StrictMode, useCallback, useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import drawerStyles from './drawer.css?inline';
import uplotStyles from 'uplot/dist/uPlot.min.css?inline';
import { MESSAGES, STORAGE_KEYS } from '@/lib/constants';
import { buildOplRankingsUrl } from '@/search/opl-url';
import { useThreadStore } from '@/chat/thread-store';
import { SuggestionChips } from '@/chat/SuggestionChips';
import type { AssistantTurn } from '@/chat/types';
import type { DisplayUnit, Profile } from '@/lib/types';
import { fetchCohort } from '@/cohort/cohort-client';
import { buildWhereYouStandCard } from '@/card/build-card';
import { TurnView } from './components/TurnView';
import { EmptyState } from './components/EmptyState';
import { InputBar } from './components/InputBar';
import { handleSubmit, type SubmitResult } from './submit-handler';
import { env } from '@/lib/env';
import { applyNameSearchFromUrl } from './opl-name-inject';

const HOST_ID = 'opl-coach-shadow-host';
const DRAWER_WIDTH = 380;

const Drawer = () => {
  const { thread, hydrate, append, clear, hydrated } = useThreadStore();
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [displayUnit, setDisplayUnit] = useState<DisplayUnit>('kg');
  const [ready, setReady] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);
  const threadEndRef = useRef<HTMLDivElement>(null);
  const profileRef = useRef<Profile | null>(null);
  const queueRef = useRef<string[]>([]);
  const processingRef = useRef(false);

  useEffect(() => {
    hydrate();
    chrome.storage.local.get([STORAGE_KEYS.profile, STORAGE_KEYS.drawerOpen], (res) => {
      const savedProfile = res[STORAGE_KEYS.profile] as Profile | undefined;
      if (savedProfile) {
        profileRef.current = savedProfile;
        if (savedProfile.extras?.display_unit) setDisplayUnit(savedProfile.extras.display_unit);
      }
      if (res[STORAGE_KEYS.drawerOpen]) {
        setOpen(true);
        chrome.storage.local.remove(STORAGE_KEYS.drawerOpen);
      }
      setReady(true);
    });
  }, [hydrate]);

  useEffect(() => {
    const handler = () => setOpen((v) => !v);
    window.addEventListener('opl-coach:toggle-drawer', handler);
    return () => window.removeEventListener('opl-coach:toggle-drawer', handler);
  }, []);


  useEffect(() => {
    if (open) requestAnimationFrame(() => inputRef.current?.focus());
  }, [open]);

  useEffect(() => {
    if (open) threadEndRef.current?.scrollIntoView({ block: 'end' });
  }, [thread.turns.length, open]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape' && open) setOpen(false); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open]);

  const fireNarration = useCallback(async (target: SubmitResult['narrationTarget']) => {
    if (!target || !env.PROXY_URL) return;
    try {
      const { card, turnId } = target;
      const resp = await fetch(`${env.PROXY_URL}/narrate`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          cohortSummary: card.cohort.summary,
          totalCount: card.cohort.totalCount,
          userRank: card.cohort.userRank,
          userTotalKg: card.totals.userTotalKg,
          dots: card.scoring.dots,
          qualifying: card.qualifying.slice(0, 3).map((q) => ({
            event: `${q.federation} ${q.event}`,
            gapKg: q.gapKg,
          })),
        }),
      });
      if (!resp.ok) return;
      const data = (await resp.json()) as { line: string };
      if (data.line) {
        const store = useThreadStore.getState();
        const turn = store.thread.turns.find((t) => t.id === turnId);
        if (turn && turn.role === 'assistant' && turn.kind === 'result') {
          store.replace(turnId, { ...turn, narrateLine: data.line });
        }
      }
    } catch { /* silent */ }
  }, []);

  const processQueue = useCallback(async () => {
    if (processingRef.current) return;
    processingRef.current = true;
    while (queueRef.current.length > 0) {
      const text = queueRef.current.shift()!;
      setBusy(true);
      append({ role: 'user', id: crypto.randomUUID(), text, createdAt: new Date().toISOString() });
      const currentThread = useThreadStore.getState().thread;
      const result = await handleSubmit(text, currentThread, profileRef.current);
      for (const turn of result.turns) append(turn);
      if (result.narrationTarget) fireNarration(result.narrationTarget);
      setBusy(false);
    }
    processingRef.current = false;
    requestAnimationFrame(() => inputRef.current?.focus());
  }, [append, fireNarration]);

  const submit = useCallback((text: string) => {
    if (!text || !ready || !hydrated) return;
    setInput('');
    setBusy(true);
    queueRef.current.push(text);
    processQueue();
  }, [ready, hydrated, processQueue]);

  const onClarifyPick = useCallback((option: string) => {
    const mapped = option === 'men' ? 'sex: men'
      : option === 'women' ? 'sex: women'
      : option === 'all federations' ? 'all federations'
      : option;
    submit(mapped);
  }, [submit]);

  const onOpenCohort = useCallback((turn: AssistantTurn) => {
    chrome.storage.local.set({ [STORAGE_KEYS.drawerOpen]: true }, () => {
      window.location.href = buildOplRankingsUrl(turn.parsed);
    });
  }, []);

  const onWhereYouStand = useCallback((turn: AssistantTurn) => {
    if (!turn.cohort?.namedLifter) return;
    const nl = turn.cohort.namedLifter;
    const prompt = `where does ${nl.name} stand`;
    submit(prompt);
  }, [submit]);

  const onSuggestionPick = useCallback((s: string) => {
    setInput((prev) => (prev ? `${prev} ${s}` : s));
    inputRef.current?.focus();
  }, []);

  const onRefreshCard = useCallback(async (turn: AssistantTurn) => {
    if (!turn.card) return;
    setBusy(true);
    const cohort = await fetchCohort(turn.parsed, { userTotalKg: turn.card.totals.userTotalKg });
    if (cohort) {
      const nextCard = buildWhereYouStandCard({
        parsed: turn.parsed, cohort,
        userTotalKg: turn.card.totals.userTotalKg,
        bodyweightKg: turn.card.totals.bodyweightKg,
        sex: turn.card.totals.sex,
        equipment: turn.card.totals.equipment,
        ageYears: turn.card.totals.ageYears,
        federations: profileRef.current?.federations,
        ageDivisions: profileRef.current?.ageDivisions,
      });
      const turnId = crypto.randomUUID();
      const refreshedTurn: AssistantTurn = {
        role: 'assistant', id: turnId, kind: 'result',
        parsed: turn.parsed, profile: turn.profile,
        cohort: {
          totalCount: cohort.totalCount, userRank: cohort.userRank,
          topRows: cohort.topRows, surroundingRows: cohort.surroundingRows,
          namedLifter: cohort.namedLifter, namedRank: cohort.namedRank,
          namedNotFound: cohort.namedNotFound, fetchedAt: cohort.fetchedAt,
        },
        card: nextCard,
        suggestions: [],
        templateText: 'Refreshed your standings with latest data.',
        source: turn.source, createdAt: new Date().toISOString(),
      };
      append(refreshedTurn);
      fireNarration({ turnId, card: nextCard });
    }
    setBusy(false);
  }, [append, fireNarration]);

  const lastTurn = thread.turns[thread.turns.length - 1];
  const lastSuggestions =
    lastTurn?.role === 'assistant' && lastTurn.kind === 'result'
      ? lastTurn.suggestions
      : [];

  return (
    <>
      {/* Pull tab — always visible on right edge */}
      <button
        className={`drawer-tab${open ? ' tab-open' : ''}`}
        onClick={() => setOpen((v) => !v)}
        aria-label="Toggle AI Search"
        type="button"
      >
        <span className="tab-text">AI Search</span>
      </button>

      {/* Drawer panel — slides in from right */}
      <div className={`drawer${open ? ' drawer-open' : ''}`} style={{ width: DRAWER_WIDTH }}>
        <div className="header">
          <div className="brand">
            <span className="brand-opl">OPL</span>
            <span className="brand-name">Assistant</span>
          </div>
          <div className="header-actions">
            {thread.turns.length > 0 && (
              <button className="clear-btn" onClick={() => clear()} aria-label="Clear chat" type="button">
                Clear chat
              </button>
            )}
            <button className="header-btn close" onClick={() => setOpen(false)} aria-label="Close drawer">
              ✕
            </button>
          </div>
        </div>

        <div className="thread">
          {!hydrated ? null : thread.turns.length === 0 ? (
            <EmptyState onSubmit={submit} disabled={busy} />
          ) : (
            thread.turns.map((t) => (
              <TurnView
                key={t.id}
                turn={t}
                displayUnit={displayUnit}
                onClarifyPick={onClarifyPick}
                onOpenCohort={onOpenCohort}
                onRefreshCard={onRefreshCard}
                onWhereYouStand={onWhereYouStand}
              />
            ))
          )}
          <div ref={threadEndRef} />
        </div>

        <InputBar ref={inputRef} value={input} busy={busy} onChange={setInput} onSubmit={submit} />

        {lastSuggestions.length > 0 && (
          <div className="suggestion-row">
            <SuggestionChips suggestions={lastSuggestions} onPick={onSuggestionPick} />
          </div>
        )}
      </div>
    </>
  );
};

// ---- mount + message listener ----

const mount = () => {
  if (document.getElementById(HOST_ID)) return;
  const host = document.createElement('div');
  host.id = HOST_ID;
  host.style.all = 'initial';
  document.documentElement.appendChild(host);
  const shadow = host.attachShadow({ mode: 'open' });
  const style = document.createElement('style');
  style.textContent = drawerStyles + '\n' + uplotStyles;
  shadow.appendChild(style);
  const root = document.createElement('div');
  root.id = 'opl-coach-root';
  shadow.appendChild(root);
  createRoot(root).render(<StrictMode><Drawer /></StrictMode>);
};

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', mount, { once: true });
} else {
  mount();
}

chrome.runtime.onMessage.addListener((msg) => {
  if (msg?.action === MESSAGES.toggleDrawer) {
    window.dispatchEvent(new CustomEvent('opl-coach:toggle-drawer'));
  }
});

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', applyNameSearchFromUrl, { once: true });
} else {
  applyNameSearchFromUrl();
}
