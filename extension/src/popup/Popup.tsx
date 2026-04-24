import { STORAGE_KEYS } from '@/lib/constants';

export const Popup = () => {
  const go = () => {
    chrome.storage.local.set({ [STORAGE_KEYS.drawerOpen]: true }, () => {
      chrome.tabs.create({ url: 'https://www.openpowerlifting.org/' });
      window.close();
    });
  };

  return (
    <div className="w-80 bg-opl-bg text-opl-text font-sans text-[13px]">
      <header className="flex items-center px-4 py-[10px] border-b border-opl-border">
        <div className="flex items-center gap-[6px]">
          <span className="text-[12px] font-semibold text-opl-accent">OPL</span>
          <span className="text-[12px]">Coach</span>
        </div>
      </header>

      <div className="px-4 py-6 text-center">
        <div className="text-[24px] opacity-30 mb-2">🏋</div>
        <div className="text-[14px] text-opl-textStrong mb-4">OPL Assistant</div>
        <button
          onClick={go}
          className="w-full px-4 py-2 rounded bg-opl-accent hover:bg-opl-accentHover text-white text-[12px] font-medium"
        >
          Go to OpenPowerlifting →
        </button>
        <div className="text-center text-[9px] text-opl-muted mt-3">
          ⌘⇧O toggles the drawer on any OPL page
        </div>
      </div>
    </div>
  );
};
