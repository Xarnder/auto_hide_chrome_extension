document.addEventListener('DOMContentLoaded', () => {
  // --- Timer Elements ---
  const timerDurationInput = document.getElementById('timerDuration');
  const startTimerBtn = document.getElementById('startTimerBtn');
  const stopTimerBtn = document.getElementById('stopTimerBtn');
  const timerInputContainer = document.getElementById('timerInputContainer');
  const timerActiveContainer = document.getElementById('timerActiveContainer');
  const timerCountdownEl = document.getElementById('timerCountdown');

  // --- Existing Elements ---
  const mainControls = document.getElementById('mainControls');
  const darkModeToggle = document.getElementById('darkModeToggle');
  const toggleSwitch = document.getElementById('toggle');
  const manualToggleLabel = document.getElementById('manualToggleLabel');
  const passwordInput = document.getElementById('password');
  const setPasswordBtn = document.getElementById('setPassword');
  const statusEl = document.getElementById('status');
  const sitesTextarea = document.getElementById('alwaysOnSites');
  const saveSitesBtn = document.getElementById('saveSitesBtn');

  let countdownInterval;

  const updateTimerUI = (endTime) => {
    if (!endTime) {
      timerInputContainer.style.display = 'block';
      timerActiveContainer.style.display = 'none';
      if (countdownInterval) clearInterval(countdownInterval);
      return;
    }

    const showTime = () => {
      const now = Date.now();
      const diff = endTime - now;

      if (diff <= 0) {
        clearInterval(countdownInterval);
        timerInputContainer.style.display = 'block';
        timerActiveContainer.style.display = 'none';
        // Timer theoretically ended, storage should update soon or alarm clears it
        return;
      }

      timerInputContainer.style.display = 'none';
      timerActiveContainer.style.display = 'block';

      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);
      timerCountdownEl.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    };

    showTime();
    if (countdownInterval) clearInterval(countdownInterval);
    countdownInterval = setInterval(showTime, 1000);
  };

  const initializePopup = () => {
    chrome.storage.local.get(['password', 'enabledTabs', 'alwaysOnSites', 'darkMode', 'tempAllowedEndTime'], (result) => {
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

      // 4. Timer State
      if (result.tempAllowedEndTime && result.tempAllowedEndTime > Date.now()) {
        updateTimerUI(result.tempAllowedEndTime);
      } else {
        updateTimerUI(null);
      }

      // 5. Check Current Tab
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs.length === 0) return;
        const currentTab = tabs[0];
        const tabId = currentTab.id;

        // Check if current site is in the "Always On" list
        const isAlwaysOnSite = result.alwaysOnSites && currentTab.url && result.alwaysOnSites.some(site => currentTab.url.toLowerCase().includes(site.toLowerCase()));

        // Check if Timer is Active (Overrrides everything)
        const isTimerActive = result.tempAllowedEndTime && result.tempAllowedEndTime > Date.now();

        if (isTimerActive) {
          toggleSwitch.checked = false;
          toggleSwitch.disabled = true;
          manualToggleLabel.textContent = "Temporary Allowed (Timer Active)";
          manualToggleLabel.style.color = "#4caf50";
        } else if (isAlwaysOnSite) {
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

  startTimerBtn.addEventListener('click', () => {
    const minutes = parseInt(timerDurationInput.value, 10);
    if (!minutes || minutes <= 0) return;

    // Send message to background to start timer
    chrome.runtime.sendMessage({ action: 'startTimer', durationMinutes: minutes }, () => {
      initializePopup();
    });
  });

  stopTimerBtn.addEventListener('click', () => {
    chrome.runtime.sendMessage({ action: 'stopTimer' }, () => {
      initializePopup();
    });
  });

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
          chrome.tabs.sendMessage(tabId, { action: 'unhide_and_disable' }).catch(() => { });
        }
      });
    });
  });
});