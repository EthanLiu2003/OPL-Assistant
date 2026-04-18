import { MESSAGES } from '@/lib/constants';

chrome.commands.onCommand.addListener((command) => {
  if (command !== 'toggle-drawer') return;
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    const tabId = tabs[0]?.id;
    if (tabId != null) {
      chrome.tabs.sendMessage(tabId, { action: MESSAGES.toggleDrawer }).catch(() => {});
    }
  });
});

chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install') {
    chrome.runtime.openOptionsPage();
  }
});
