document.addEventListener('DOMContentLoaded', () => {
  // Get references to all elements
  const mainControls = document.getElementById('mainControls');
  const darkModeToggle = document.getElementById('darkModeToggle');
  const toggleSwitch = document.getElementById('toggle');
  const manualToggleLabel = document.getElementById('manualToggleLabel');
  const passwordInput = document.getElementById('password');
  const setPasswordBtn = document.getElementById('setPassword');
  const statusEl = document.getElementById('status');
  const sitesTextarea = document.getElementById('alwaysOnSites');
  const saveSitesBtn = document.getElementById('saveSitesBtn');

  // --- Main Initialization Function ---
  const initializePopup = () => {
    chrome.storage.local.get(['password', 'enabledTabs', 'alwaysOnSites', 'darkMode'], (result) => {
      // 1. Check for Master Password first
      if (!result.password) {
        mainControls.disabled = true;
        statusEl.textContent = 'Please set a master password to enable features.';
        statusEl.style.color = '#ff9800'; // Orange color for warnings
        return; // Stop initialization here
      }

      // If password exists, enable controls and proceed
      mainControls.disabled = false;
      statusEl.textContent = '';
      statusEl.style.color = '#4caf50'; // Back to green

      // 2. Set Dark Mode state
      if (result.darkMode) {
        document.body.classList.add('dark-mode');
        darkModeToggle.checked = true;
      }
      
      // 3. Load the "Always On" sites list
      if (result.alwaysOnSites && result.alwaysOnSites.length > 0) {
        sitesTextarea.value = result.alwaysOnSites.join('\n');
      }

      // 4. Check the current tab's status ("double-check" logic)
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs.length === 0) return;
        const currentTab = tabs[0];
        const tabId = currentTab.id;
        
        // Check if this site is on the "always on" list
        const isAlwaysOnSite = result.alwaysOnSites && currentTab.url && result.alwaysOnSites.some(site => currentTab.url.includes(site));

        if (isAlwaysOnSite) {
          toggleSwitch.checked = true;
          toggleSwitch.disabled = true;
          manualToggleLabel.textContent = "Enabled automatically (in list)";
        } else if (currentTab.url && (currentTab.url.startsWith('chrome://') || currentTab.url.startsWith('https://chrome.google.com/webstore'))) {
          // Disable for protected pages
          toggleSwitch.disabled = true;
          manualToggleLabel.textContent = "Manual mode disabled on this page.";
        } else {
          // It's a normal page, so set the toggle based on manual setting
          toggleSwitch.disabled = false;
          manualToggleLabel.textContent = "Enable for this tab (Manual):";
          toggleSwitch.checked = !!(result.enabledTabs && result.enabledTabs[tabId]);
        }
      });
    });
  };

  // Run initialization when the popup opens
  initializePopup();

  // --- Event Listeners ---

  darkModeToggle.addEventListener('change', () => { /* ... (no changes) ... */ });
  saveSitesBtn.addEventListener('click', () => { /* ... (no changes) ... */ });
  toggleSwitch.addEventListener('change', () => { /* ... (no changes) ... */ });

  setPasswordBtn.addEventListener('click', () => {
    const password = passwordInput.value;
    if (password) {
      chrome.storage.local.set({ password: password }, () => {
        statusEl.textContent = 'Password set! Features enabled.';
        statusEl.style.color = '#4caf50';
        // Re-initialize the popup to enable controls and load settings
        initializePopup();
      });
    }
  });

  // --- Functions below are unchanged ---
  darkModeToggle.addEventListener('change', () => {
    const isDarkMode = darkModeToggle.checked;
    chrome.storage.local.set({ darkMode: isDarkMode });
    document.body.classList.toggle('dark-mode', isDarkMode);
  });
  saveSitesBtn.addEventListener('click', () => {
    const sites = sitesTextarea.value.split('\n').map(s => s.trim()).filter(s => s);
    chrome.storage.local.set({ alwaysOnSites: sites }, () => {
      statusEl.textContent = 'Site list saved!';
      setTimeout(() => { statusEl.textContent = ''; }, 2000);
    });
  });
  toggleSwitch.addEventListener('change', () => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs.length === 0) return;
      const tabId = tabs[0].id;
      chrome.storage.local.get(['enabledTabs'], (result) => {
        let enabledTabs = result.enabledTabs || {};
        if (toggleSwitch.checked) {
          enabledTabs[tabId] = true;
          chrome.storage.local.set({ enabledTabs: enabledTabs });
          chrome.scripting.executeScript({ target: { tabId: tabId }, files: ['content.js'] });
        } else {
          delete enabledTabs[tabId];
          chrome.storage.local.set({ enabledTabs: enabledTabs });
          chrome.tabs.sendMessage(tabId, { action: 'unhide_and_disable' }).catch(() => {});
        }
      });
    });
  });
});