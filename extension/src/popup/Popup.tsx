import { useEffect, useState } from 'react';
import { STORAGE_KEYS, MESSAGES } from '@/lib/constants';
import type { Profile, DisplayUnit } from '@/lib/types';
import { formatBodyweight, formatTotal } from '@/lib/units';

export const Popup = () => {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    chrome.storage.local.get([STORAGE_KEYS.profile], (res) => {
      setProfile(res[STORAGE_KEYS.profile] ?? null);
      setLoaded(true);
    });
  }, []);

  const openDrawer = () => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const id = tabs[0]?.id;
      if (id != null) {
        chrome.tabs.sendMessage(id, { action: MESSAGES.toggleDrawer }).catch(() => {
          // Not on an OPL page — open OPL and let the user press the shortcut.
          chrome.tabs.create({ url: 'https://www.openpowerlifting.org/' });
        });
      }
      window.close();
    });
  };

  const openSettings = () => chrome.runtime.openOptionsPage();

  if (!loaded) return <div className="w-80 h-40 bg-opl-bg" />;

  const displayUnit: DisplayUnit = profile?.extras?.display_unit ?? 'kg';

  return (
    <div className="w-80 bg-opl-bg text-opl-text font-sans text-[13px]">
      <header className="flex items-center justify-between px-4 py-[10px] border-b border-opl-border">
        <div className="flex items-center gap-[6px]">
          <span className="text-[12px] font-semibold text-opl-accent">OPL</span>
          <span className="text-[12px]">Coach</span>
        </div>
        <button
          onClick={openSettings}
          className="text-[12px] opacity-50 hover:opacity-100 cursor-pointer"
          aria-label="Settings"
        >
          ⚙
        </button>
      </header>

      {profile ? (
        <>
          <div className="p-4">
            <div className="flex justify-between items-baseline mb-3">
              <span className="text-[14px] font-medium text-opl-textStrong">Your profile</span>
              <span className="text-[10px] text-opl-muted">
                {profile.weightClass ?? '—'} · {profile.equipment ?? 'Raw'}
              </span>
            </div>
            {profile.currentTotalKg != null && (
              <div className="flex items-end gap-2 mb-[14px]">
                <span className="text-[36px] font-bold font-mono text-opl-info tracking-tight leading-none">
                  {formatTotal(profile.currentTotalKg, { unit: displayUnit, withUnit: false })}
                </span>
                <span className="text-[10px] text-opl-muted pb-[6px]">
                  {displayUnit} total
                </span>
              </div>
            )}
            <div className="flex gap-4">
              {profile.bodyweightKg != null && (
                <div>
                  <div className="text-[13px] font-mono text-opl-textStrong">
                    {formatBodyweight(profile.bodyweightKg, { unit: displayUnit })}
                  </div>
                  <div className="text-[9px] uppercase tracking-wider text-opl-muted">BW</div>
                </div>
              )}
              {profile.ageYears != null && (
                <div>
                  <div className="text-[13px] font-mono text-opl-textStrong">
                    {profile.ageYears}
                  </div>
                  <div className="text-[9px] uppercase tracking-wider text-opl-muted">Age</div>
                </div>
              )}
              {profile.federations?.[0] && (
                <div>
                  <div className="text-[13px] font-mono text-opl-textStrong">
                    {profile.federations[0]}
                  </div>
                  <div className="text-[9px] uppercase tracking-wider text-opl-muted">Fed</div>
                </div>
              )}
            </div>
          </div>
          <div className="px-4 pb-3">
            <button
              onClick={openDrawer}
              className="flex items-center justify-center gap-[6px] w-full py-2 rounded bg-opl-accent hover:bg-opl-accentHover text-white text-[12px] font-medium"
            >
              Open drawer ↗
            </button>
            <div className="text-center text-[9px] text-opl-muted mt-2">
              ⌘⇧O on any OpenPowerlifting page
            </div>
          </div>
        </>
      ) : (
        <div className="px-4 py-8 text-center">
          <div className="text-[24px] opacity-30 mb-2">🏋</div>
          <div className="text-[14px] text-opl-textStrong mb-1">Welcome to OPL Assistant</div>
          <div className="text-[11px] text-opl-muted mb-4 leading-relaxed">
            Set up your profile to get personalized context on OpenPowerlifting.
          </div>
          <button
            onClick={openSettings}
            className="px-4 py-2 rounded bg-opl-accent hover:bg-opl-accentHover text-white text-[12px] font-medium"
          >
            Set up profile →
          </button>
        </div>
      )}
    </div>
  );
};
