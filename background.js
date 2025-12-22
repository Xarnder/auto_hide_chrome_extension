// Listener for when a tab is updated.
chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  // We wait for 'complete' to ensure the DOM is ready for the overlay
  if (changeInfo.status !== 'complete' || !tab.url || !tab.url.startsWith('http')) {
    return;
  }

  try {
    const { alwaysOnSites, enabledTabs = {} } = await chrome.storage.local.get(['alwaysOnSites', 'enabledTabs']);
    
    // Check if the current URL matches any site in the "Always On" list
    // We use toLowerCase() to ensure case-insensitive matching
    const isAlwaysOnSite = alwaysOnSites && alwaysOnSites.some(site => tab.url.toLowerCase().includes(site.toLowerCase()));
    
    // If it's a listed site, force it to be enabled
    if (isAlwaysOnSite) {
      console.log(`[Background] Auto-hiding site: ${tab.url}`);
      if (!enabledTabs[tabId]) {
        enabledTabs[tabId] = true;
        await chrome.storage.local.set({ enabledTabs: enabledTabs });
      }
    }

    // Inject the script if enabled
    if (enabledTabs[tabId]) {
      chrome.scripting.executeScript({
        target: { tabId: tabId },
        files: ['content.js']
      }, () => {
        if (chrome.runtime.lastError) {
          // This usually happens on restricted pages like chrome://settings
          // console.warn('Injection failed:', chrome.runtime.lastError.message);
        }
      });
    }
  } catch (err) {
    console.error('[Background] Error:', err);
  }
});

// Listener for tab switching (Re-hides pages if you switch back to them)
chrome.tabs.onActivated.addListener(async (activeInfo) => {
  const { enabledTabs } = await chrome.storage.local.get('enabledTabs');
  if (enabledTabs && enabledTabs[activeInfo.tabId]) {
    chrome.tabs.sendMessage(activeInfo.tabId, { action: 'hide' }).catch(() => {});
  }
});

// Listener for window focus changes
chrome.windows.onFocusChanged.addListener(async (windowId) => {
  if (windowId === chrome.windows.WINDOW_ID_NONE) {
    // Browser lost focus, hide all enabled tabs
    const { enabledTabs } = await chrome.storage.local.get('enabledTabs');
    if (enabledTabs) {
      for (const tabIdStr in enabledTabs) {
        const tId = parseInt(tabIdStr, 10);
        chrome.tabs.sendMessage(tId, { action: 'hide' }).catch(() => {});
      }
    }
  }
});