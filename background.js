// Main listener for when a tab is updated.
chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  if (changeInfo.status !== 'complete' || !tab.url || !tab.url.startsWith('http')) {
    return;
  }
  
  const { alwaysOnSites, enabledTabs = {} } = await chrome.storage.local.get(['alwaysOnSites', 'enabledTabs']);
  const isAlwaysOnSite = alwaysOnSites && alwaysOnSites.some(site => tab.url.includes(site));
  
  if (isAlwaysOnSite && !enabledTabs[tabId]) {
    enabledTabs[tabId] = true;
    await chrome.storage.local.set({ enabledTabs: enabledTabs });
  }

  if (enabledTabs[tabId]) {
    // **THE FIX IS HERE**: We add a callback function to handle potential errors.
    chrome.scripting.executeScript({
      target: { tabId: tabId },
      files: ['content.js']
    }, () => {
      // This callback runs after the injection attempt.
      // If `lastError` exists, it means the injection failed (e.g., on an error page).
      // We can safely ignore it and prevent the error from showing up.
      if (chrome.runtime.lastError) {
        // console.log(`Could not inject script into tab ${tabId}: ${chrome.runtime.lastError.message}`);
      }
    });
  }
});

// Listener for when the user switches tabs (to re-hide pages).
chrome.tabs.onActivated.addListener(async (activeInfo) => {
  const allTabs = await chrome.tabs.query({ windowId: activeInfo.windowId });
  for (const tab of allTabs) {
    if (tab.id !== activeInfo.tabId) {
      rehideIfNeeded(tab.id);
    }
  }
});

// Listener for when the user switches windows (to re-hide pages).
chrome.windows.onFocusChanged.addListener(async (windowId) => {
  if (windowId === chrome.windows.WINDOW_ID_NONE) {
    const { enabledTabs } = await chrome.storage.local.get('enabledTabs');
    if (enabledTabs) {
      for (const tabIdStr in enabledTabs) {
        rehideIfNeeded(parseInt(tabIdStr, 10));
      }
    }
  }
});

// Helper function to send the 'hide' message to a tab that already has content.js.
async function rehideIfNeeded(tabId) {
  const { enabledTabs } = await chrome.storage.local.get('enabledTabs');
  if (enabledTabs && enabledTabs[tabId]) {
    chrome.tabs.sendMessage(tabId, { action: 'hide' }).catch(() => {});
  }
}