document.addEventListener('DOMContentLoaded', () => {
  const mainControls = document.getElementById('mainControls');
  const darkModeToggle = document.getElementById('darkModeToggle');
  const toggleSwitch = document.getElementById('toggle');
  const manualToggleLabel = document.getElementById('manualToggleLabel');
  const passwordInput = document.getElementById('password');
  const setPasswordBtn = document.getElementById('setPassword');
  const statusEl = document.getElementById('status');
  const sitesTextarea = document.getElementById('alwaysOnSites');
  const saveSitesBtn = document.getElementById('saveSitesBtn');

  const initializePopup = () => {
    chrome.storage.local.get(['password', 'enabledTabs', 'alwaysOnSites', 'darkMode'], (result) => {
      // 1. Password Check
      if (!result.password) {
        mainControls.disabled = true;
        statusEl.textContent = 'Set a master password first.';
        statusEl.style.color = '#e91e63'; 
        statusEl.style.backgroundColor = '#fce4ec';
        return;
      }

      mainControls.disabled = false;
      statusEl.textContent = '';
      statusEl.style.backgroundColor = 'transparent';

      // 2. Dark Mode
      if (result.darkMode) {
        document.body.classList.add('dark-mode');
        darkModeToggle.checked = true;
      }
      
      // 3. Load Sites List
      if (result.alwaysOnSites && result.alwaysOnSites.length > 0) {
        sitesTextarea.value = result.alwaysOnSites.join('\n');
      }

      // 4. Check Current Tab
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs.length === 0) return;
        const currentTab = tabs[0];
        const tabId = currentTab.id;
        
        // Check if current site is in the "Always On" list
        const isAlwaysOnSite = result.alwaysOnSites && currentTab.url && result.alwaysOnSites.some(site => currentTab.url.toLowerCase().includes(site.toLowerCase()));

        if (isAlwaysOnSite) {
          toggleSwitch.checked = true;
          toggleSwitch.disabled = true;
          manualToggleLabel.textContent = "Automatic (Always On Site)";
          manualToggleLabel.style.color = "#4caf50";
        } else if (currentTab.url && (currentTab.url.startsWith('chrome://') || currentTab.url.startsWith('https://chrome.google.com/webstore'))) {
          toggleSwitch.disabled = true;
          manualToggleLabel.textContent = "System Page (Protected)";
        } else {
          toggleSwitch.disabled = false;
          manualToggleLabel.textContent = "Manual override";
          manualToggleLabel.style.color = "";
          toggleSwitch.checked = !!(result.enabledTabs && result.enabledTabs[tabId]);
        }
      });
    });
  };

  initializePopup();

  // --- Listeners ---

  setPasswordBtn.addEventListener('click', () => {
    const password = passwordInput.value;
    if (password) {
      chrome.storage.local.set({ password: password }, () => {
        statusEl.textContent = 'Password saved!';
        statusEl.style.color = '#4caf50';
        statusEl.style.backgroundColor = '#e8f5e9';
        initializePopup();
        setTimeout(() => { statusEl.textContent = ''; statusEl.style.backgroundColor = 'transparent'; }, 2000);
      });
    }
  });

  darkModeToggle.addEventListener('change', () => {
    const isDarkMode = darkModeToggle.checked;
    chrome.storage.local.set({ darkMode: isDarkMode });
    document.body.classList.toggle('dark-mode', isDarkMode);
  });
  
  saveSitesBtn.addEventListener('click', () => {
    // Split by new line, trim whitespace, remove empty lines
    const sites = sitesTextarea.value.split('\n').map(s => s.trim()).filter(s => s);
    chrome.storage.local.set({ alwaysOnSites: sites }, () => {
      saveSitesBtn.textContent = 'Saved!';
      setTimeout(() => { saveSitesBtn.textContent = 'Save List'; }, 2000);
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