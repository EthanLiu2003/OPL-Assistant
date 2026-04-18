import { create } from 'zustand';
import type { Profile } from '@/lib/types';
import { STORAGE_KEYS } from '@/lib/constants';
import { emptyProfile } from './schema';

type ProfileState = {
  profile: Profile | null;
  loaded: boolean;
  load: () => Promise<void>;
  save: (patch: Partial<Profile>) => Promise<void>;
  clear: () => Promise<void>;
};

export const useProfile = create<ProfileState>((set, get) => ({
  profile: null,
  loaded: false,
  load: async () => {
    const res = await chrome.storage.local.get([STORAGE_KEYS.profile]);
    set({ profile: res[STORAGE_KEYS.profile] ?? null, loaded: true });
  },
  save: async (patch) => {
    const current = get().profile ?? emptyProfile();
    const next: Profile = {
      ...current,
      ...patch,
      extras: { ...current.extras, ...(patch.extras ?? {}) },
      clientUpdatedAt: new Date().toISOString(),
    };
    await chrome.storage.local.set({ [STORAGE_KEYS.profile]: next });
    set({ profile: next });
  },
  clear: async () => {
    await chrome.storage.local.remove([STORAGE_KEYS.profile]);
    set({ profile: null });
  },
}));
