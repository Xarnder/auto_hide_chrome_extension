// Check if script has already run to prevent duplicate injections
if (!window.autoHideFunctionsDefined) {
  window.autoHideFunctionsDefined = true;
  console.log("[Content] Initializing Auto Hide Script...");

  // --- CONFIGURATION ---
  // I put 'error3.svg' here for you. 
  // If you add more files, separate them with commas like: ['error3.svg', 'error4.svg']
  const svgAssets = [
    'error.svg',
    'error1.svg',
    'error2.svg',
    'error3.svg',
    'error4.svg',
    'error5.svg',
    'error6.svg',
    'error7.svg',
    'error8.svg',
    'error9.svg'
  ]; 

  const errorMessages = [
    { title: 'Error 503', sub: 'The server is temporarily unavailable.' },
    { title: 'Connection Lost', sub: 'Could not establish a secure connection.' },
    { title: 'Error 404', sub: 'The resource has been deleted.' },
    { title: 'System Failure', sub: 'Critical system error.' }
  ];

  window.getRandomItem = (arr) => arr[Math.floor(Math.random() * arr.length)];

  window.createDecoyPage = (isDarkMode) => {
    const randomMsg = window.getRandomItem(errorMessages);
    
    // Safety check: Is the array empty?
    const hasAssets = (svgAssets && svgAssets.length > 0);
    const randomIconName = hasAssets ? window.getRandomItem(svgAssets) : null;

    const overlay = document.createElement('div');
    overlay.id = 'auto-hide-overlay';
    if (isDarkMode) overlay.classList.add('dark-mode');

    const contentWrapper = document.createElement('div');
    contentWrapper.id = 'auto-hide-overlay-content-wrapper';

    const iconDiv = document.createElement('div');
    iconDiv.id = 'auto-hide-overlay-icon';

    // LOGIC: Build the full path (assets/filename)
    let iconUrl;
    if (randomIconName) {
        // This becomes: chrome-extension://.../assets/error3.svg
        iconUrl = chrome.runtime.getURL(`assets/${randomIconName}`);
    } else {
        // Fallback if list is empty or file missing
        iconUrl = chrome.runtime.getURL('icons/error.svg');
    }
    
    // Debug log to help you check if the path is correct
    console.log("[Content] Using Icon URL:", iconUrl);

    iconDiv.style.webkitMaskImage = `url('${iconUrl}')`;
    iconDiv.style.maskImage = `url('${iconUrl}')`;

    const title = document.createElement('h1');
    title.textContent = randomMsg.title;

    const subtitle = document.createElement('p');
    subtitle.textContent = randomMsg.sub;

    const unhideBtn = document.createElement('button');
    unhideBtn.id = 'auto-hide-unhide-btn';
    unhideBtn.textContent = 'Reload';
    unhideBtn.addEventListener('click', window.promptForPassword);

    contentWrapper.appendChild(iconDiv);
    contentWrapper.appendChild(title);
    contentWrapper.appendChild(subtitle);
    contentWrapper.appendChild(unhideBtn);
    overlay.appendChild(contentWrapper);

    return overlay;
  };

  window.hidePage = async () => {
    if (document.getElementById('auto-hide-overlay')) return;

    try {
      const { darkMode } = await chrome.storage.local.get('darkMode');
      window.injectStylesheet();
      
      const overlay = window.createDecoyPage(darkMode);
      
      // Force append to documentElement (<html> tag)
      if (document.documentElement) {
        document.documentElement.appendChild(overlay);
        document.documentElement.style.overflow = 'hidden';
      }
    } catch (e) {
      console.error("[Content] Hide Error:", e);
    }
  };

  window.unhidePage = (isDisabling = false) => {
    const overlay = document.getElementById('auto-hide-overlay');
    if (overlay) overlay.remove();
    document.documentElement.style.overflow = '';
    if (!isDisabling) { 
        chrome.runtime.sendMessage({ action: 'pageWasShown' }).catch(()=>{}); 
    }
  };

  window.promptForPassword = () => {
    setTimeout(() => {
        const password = prompt('Enter error recovery code:');
        if (password === null) return;

        chrome.storage.local.get('password', (result) => {
          if (result.password && result.password === password) {
            window.unhidePage();
          } else { 
            alert('Incorrect recovery code.'); 
          }
        });
    }, 10);
  };

  window.injectStylesheet = () => {
    if (document.getElementById('auto-hide-styles')) return;
    const link = document.createElement('link');
    link.id = 'auto-hide-styles';
    link.rel = 'stylesheet';
    link.type = 'text/css';
    link.href = chrome.runtime.getURL('decoy.css');
    (document.head || document.documentElement).appendChild(link);
  };

  chrome.runtime.onMessage.addListener((msg) => {
    if (msg.action === 'hide') window.hidePage();
    if (msg.action === 'unhide_and_disable') window.unhidePage(true);
  });
}

// Ensure hidePage runs immediately
if (window.hidePage) {
    window.hidePage();
}