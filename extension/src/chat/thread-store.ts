import { create } from 'zustand';
import { CHAT_THREAD_MAX_TURNS, STORAGE_KEYS } from '@/lib/constants';
import type { ChatThread, ChatTurn } from './types';

type ThreadState = {
  thread: ChatThread;
  hydrated: boolean;
  hydrate: () => Promise<void>;
  append: (turn: ChatTurn) => void;
  replace: (id: string, turn: ChatTurn) => void;
  clear: () => void;
};

const emptyThread = (): ChatThread => ({
  id: crypto.randomUUID(),
  turns: [],
  updatedAt: new Date().toISOString(),
});

const persist = (thread: ChatThread) => {
  chrome.storage.local.set({ [STORAGE_KEYS.drawerThread]: thread });
};

const prune = (turns: ChatTurn[]): ChatTurn[] => {
  if (turns.length <= CHAT_THREAD_MAX_TURNS) return turns;
  return turns.slice(turns.length - CHAT_THREAD_MAX_TURNS);
};

export const useThreadStore = create<ThreadState>((set, get) => ({
  thread: emptyThread(),
  hydrated: false,

  hydrate: async () => {
    const res = await chrome.storage.local.get(STORAGE_KEYS.drawerThread);
    const stored = res[STORAGE_KEYS.drawerThread] as ChatThread | undefined;
    set({
      thread: stored && stored.turns ? stored : emptyThread(),
      hydrated: true,
    });
  },

  append: (turn: ChatTurn) => {
    const thread = get().thread;
    const next: ChatThread = {
      ...thread,
      turns: prune([...thread.turns, turn]),
      updatedAt: new Date().toISOString(),
    };
    set({ thread: next });
    persist(next);
  },

  replace: (id: string, turn: ChatTurn) => {
    const thread = get().thread;
    const turns = thread.turns.map((t) => (t.id === id ? turn : t));
    const next: ChatThread = {
      ...thread,
      turns,
      updatedAt: new Date().toISOString(),
    };
    set({ thread: next });
    persist(next);
  },

  clear: () => {
    const next = emptyThread();
    set({ thread: next });
    persist(next);
  },
}));
