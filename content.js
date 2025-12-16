if (!window.hasAutoHideScriptRun) {
  window.hasAutoHideScriptRun = true;

  const createDecoyPage = (isDarkMode) => {
    const overlay = document.createElement('div');
    overlay.id = 'auto-hide-overlay';
    if (isDarkMode) { overlay.classList.add('dark-mode'); }

    const contentWrapper = document.createElement('div');
    contentWrapper.id = 'auto-hide-overlay-content-wrapper';

    const iconDiv = document.createElement('div');
    iconDiv.id = 'auto-hide-overlay-icon';

    const title = document.createElement('h1');
    title.textContent = 'Error 452';

    const subtitle = document.createElement('p');
    subtitle.textContent = 'The server is temporarily unavailable due to high load.';

    const unhideBtn = document.createElement('button');
    unhideBtn.id = 'auto-hide-unhide-btn';
    // **TEXT CHANGE**: Updated the button text
    unhideBtn.textContent = 'Reload';
    unhideBtn.addEventListener('click', promptForPassword);

    contentWrapper.appendChild(iconDiv);
    contentWrapper.appendChild(title);
    contentWrapper.appendChild(subtitle);
    contentWrapper.appendChild(unhideBtn);
    overlay.appendChild(contentWrapper);

    return overlay;
  };
  
  const hidePage = async () => {
    if (!document.body || !document.documentElement) { setTimeout(hidePage, 50); return; }
    if (document.getElementById('auto-hide-overlay')) return;
    const { darkMode } = await chrome.storage.local.get('darkMode');
    injectStylesheet();
    const overlay = createDecoyPage(darkMode);
    document.documentElement.appendChild(overlay);
    document.documentElement.style.overflow = 'hidden';
  };

  const unhidePage = (isDisabling = false) => {
    const overlay = document.getElementById('auto-hide-overlay');
    if (overlay) overlay.remove();
    document.documentElement.style.overflow = '';
    if (!isDisabling) { chrome.runtime.sendMessage({ action: 'pageWasShown' }); }
  };

  const promptForPassword = () => {
    // **TEXT CHANGE**: Updated the prompt text
    const password = prompt('Enter error recovery code:');
    if (password === null) return;
    chrome.storage.local.get('password', (result) => {
      if (result.password && result.password === password) {
        unhidePage();
      } else { alert('Incorrect recovery code.'); }
    });
  };

  const injectStylesheet = () => {
    if (document.getElementById('auto-hide-styles')) return;
    const link = document.createElement('link');
    link.id = 'auto-hide-styles';
    link.rel = 'stylesheet';
    link.type = 'text/css';
    link.href = chrome.runtime.getURL('decoy.css');
    (document.head || document.documentElement).appendChild(link);
  };

  chrome.runtime.onMessage.addListener((request) => {
    if (request.action === 'hide') { hidePage(); }
    else if (request.action === 'unhide_and_disable') { unhidePage(true); }
  });

  hidePage();
}