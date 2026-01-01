// Listener for when a tab is updated.
chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  // We wait for 'complete' to ensure the DOM is ready for the overlay
  if (changeInfo.status !== 'complete' || !tab.url || !tab.url.startsWith('http')) {
    return;
  }

  try {
    const { alwaysOnSites, enabledTabs = {}, tempAllowedEndTime } = await chrome.storage.local.get(['alwaysOnSites', 'enabledTabs', 'tempAllowedEndTime']);

    // Check if Timer is Active
    const isTimerActive = tempAllowedEndTime && tempAllowedEndTime > Date.now();
    if (isTimerActive) {
      console.log(`[Background] Timer active, skipping hide for: ${tab.url}`);
      return; // Do nothing, allowing access
    }

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
  const { enabledTabs, tempAllowedEndTime } = await chrome.storage.local.get(['enabledTabs', 'tempAllowedEndTime']);
  const isTimerActive = tempAllowedEndTime && tempAllowedEndTime > Date.now();

  if (!isTimerActive && enabledTabs && enabledTabs[activeInfo.tabId]) {
    chrome.tabs.sendMessage(activeInfo.tabId, { action: 'hide' }).catch(() => { });
  }
});

// Listener for window focus changes
chrome.windows.onFocusChanged.addListener(async (windowId) => {
  if (windowId === chrome.windows.WINDOW_ID_NONE) {
    // Browser lost focus, hide all enabled tabs
    const { enabledTabs, tempAllowedEndTime } = await chrome.storage.local.get(['enabledTabs', 'tempAllowedEndTime']);
    const isTimerActive = tempAllowedEndTime && tempAllowedEndTime > Date.now();

    if (!isTimerActive && enabledTabs) {
      for (const tabIdStr in enabledTabs) {
        const tId = parseInt(tabIdStr, 10);
        chrome.tabs.sendMessage(tId, { action: 'hide' }).catch(() => { });
      }
    }
  }
});

// --- Timer Logic (New) ---

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.action === 'startTimer') {
    const minutes = msg.durationMinutes;
    const endTime = Date.now() + (minutes * 60 * 1000);

    chrome.storage.local.set({ tempAllowedEndTime: endTime }, () => {
      // Create an alarm to clean up when time is up
      chrome.alarms.create('tempTimerEnd', { when: endTime });

      // Unhide all currently valid tabs
      chrome.tabs.query({}, (tabs) => {
        tabs.forEach(tab => {
          chrome.tabs.sendMessage(tab.id, { action: 'unhide_temp' }).catch(() => { });
        });
      });

      sendResponse({ success: true });
    });
    return true; // Keep channel open for async response
  }

  if (msg.action === 'stopTimer') {
    chrome.storage.local.remove('tempAllowedEndTime', () => {
      chrome.alarms.clear('tempTimerEnd');
      // Re-apply hiding logic
      reapplyHiding();
      sendResponse({ success: true });
    });
    return true;
  }
});

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === 'tempTimerEnd') {
    chrome.storage.local.remove('tempAllowedEndTime');
    reapplyHiding();
  }
});

async function reapplyHiding() {
  const { enabledTabs, alwaysOnSites } = await chrome.storage.local.get(['enabledTabs', 'alwaysOnSites']);

  chrome.tabs.query({}, (tabs) => {
    tabs.forEach(tab => {
      let shouldHide = false;
      if (enabledTabs && enabledTabs[tab.id]) {
        shouldHide = true;
      }
      if (alwaysOnSites && tab.url && alwaysOnSites.some(site => tab.url.toLowerCase().includes(site.toLowerCase()))) {
        shouldHide = true;
      }

      if (shouldHide) {
        // We can either send 'hide' message (if content script is already there)
        // or re-inject. Re-injecting is safer if the user reloaded during the allowed time and script is gone?
        // But existing logic injects on update.
        // Let's try sending message first, if it fails (not injected), execute script.

        // Actually, simplest is just to trigger the update logic or send 'hide' if we know script is there.
        // Since 'alwaysOn' logic in onUpdated handles injection, and persistent enabledTabs handles it too.
        // If the page was NOT reloaded, the script is still there.
        chrome.tabs.sendMessage(tab.id, { action: 'hide' }).catch(() => {
          // If message fails, maybe script isn't there? Inject it.
          chrome.scripting.executeScript({
            target: { tabId: tab.id },
            files: ['content.js']
          }).catch(() => { });
        });
      }
    });
  });
}