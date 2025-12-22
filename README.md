

# 🕵️ Auto Hide Page Extension

**Auto Hide Page** is a stealth/privacy Chrome Extension that automatically disguises specified websites (or the current tab) with a realistic, randomized "System Error" screen. Access to the actual content is blocked until a Master Password is entered.

> **Status:** Active Development  
> **Manifest Version:** V3

## ✨ Features

*   **🛡️ Decoy Overlay:** Replaces webpage content with realistic error messages (e.g., "Error 503", "Connection Lost", "DNS Failure").
*   **🔐 Password Protection:** A global Master Password is required to unlock the page.
*   **🎨 Modern UI:** Clean, rounded card-style popup interface with toggle switches.
*   **🌙 Dark Mode:** Fully supports dark mode for both the settings popup and the decoy error screen.
*   **🎲 Randomization:** Picks from a pool of error messages and SVG icons to make the decoy look authentic each time.
*   **⚡ "Always On" List:** Automatically hides specific domains (e.g., `youtube.com`) whenever they are visited.
*   **📱 Responsive:** Decoy screens adapt to window resizing and mobile viewports.

---

## 📂 Project Structure

Ensure your project directory looks exactly like this to avoid loading errors:

```text
auto-hide-extension/
├── manifest.json       # Extension configuration and permissions
├── background.js       # Service worker for handling tab updates and logic
├── content.js          # The script injected into pages to create the overlay
├── decoy.css           # Styles for the fake error screen (overlay)
├── popup.html          # The HTML for the extension icon menu
├── popup.js            # Logic for saving settings/passwords
├── styles.css          # CSS for the popup menu (Modern UI)
├── README.md           # Documentation
├── icons/              # Extension Toolbar Icons
│   ├── icon16.png
│   ├── icon48.png
│   ├── icon128.png
│   └── error.svg       # Default fallback icon
└── assets/             # Custom SVG images for the decoy screen
    ├── image1.svg
    ├── image2.svg
    └── error3.svg
```

---

## 🚀 Installation (Developer Mode)

Since this extension is local, you must install it via Chrome's "Load Unpacked" feature.

1.  **Clone or Download** this repository to your computer.
2.  Open Google Chrome and navigate to `chrome://extensions`.
3.  Toggle **Developer mode** in the top-right corner.
4.  Click the **Load unpacked** button in the top-left.
5.  Select the folder containing the `manifest.json` file (e.g., `auto-hide-extension`).
6.  The extension is now installed! 🎉

---

## 📖 Usage Guide

### 1. Initial Setup
1.  Click the extension icon in your Chrome toolbar.
2.  Enter a **Master Password** in the password field.
3.  Click **Set Password**.
    *   *Note: The controls will remain disabled until a password is set.*

### 2. Manual Hiding
1.  Navigate to any website.
2.  Open the extension popup.
3.  Toggle **"Hide this Tab"** to ON.
4.  The page will immediately be covered by a decoy error.

### 3. Automatic Hiding (Always On)
1.  Open the extension popup.
2.  In the text area under "Automatic List", enter domains one per line.
    *   Example:
        ```text
        youtube.com
        facebook.com
        ```
3.  Click **Save List**.
4.  Anytime you visit these URLs, they will be hidden automatically.

### 4. Unlocking a Page
1.  On the decoy screen, click the **RELOAD** button.
2.  A browser prompt will appear asking for the **Recovery Code**.
3.  Enter your Master Password.
4.  The page will reveal itself.

---

## 🛠️ Configuration & Customization

### Adding Custom Images
To add your own images to the random rotation:
1.  Save your `.svg` files into the `assets/` folder.
2.  Open `content.js`.
3.  Update the `svgAssets` array to match your filenames:

```javascript
// content.js
const svgAssets = [
  'image1.svg',
  'cool-icon.svg',
  'error3.svg' 
];
```

### Changing Error Messages
To customize the fake text shown on the screen, edit the `errorMessages` array in `content.js`:

```javascript
// content.js
const errorMessages = [
  { title: 'Restricted Area', sub: 'Authorized personnel only.' },
  { title: 'System Meltdown', sub: 'Please contact IT support.' }
];
```

---

## 🐛 Troubleshooting

**"Uncaught SyntaxError: Invalid or unexpected token"**
*   **Cause:** Usually a missing comma `,` or quote `'` in the `svgAssets` list in `content.js`.
*   **Fix:** Ensure the list looks like `['file1.svg', 'file2.svg']`.

**Images not showing on the decoy page**
*   **Cause:** The filename in `content.js` does not match the file in the `assets/` folder, or `manifest.json` does not have permission to access the `assets` folder.
*   **Fix:** Check spelling case-sensitively. Ensure `manifest.json` contains `"web_accessible_resources": [{"resources": ["assets/*.svg"], ...}]`.

**Extension not hiding the page**
*   **Fix:** The extension cannot run on pages loaded *before* the extension was installed. Refresh the webpage. Note that Chrome prevents extensions from running on `chrome://` system pages.

---

## 💻 Technologies Used

*   **HTML5 & CSS3:** For the popup UI and the Decoy Overlay.
*   **Vanilla JavaScript:** Core logic (no frameworks required).
*   **Chrome Extension API (Manifest V3):** `storage`, `scripting`, `tabs`.

---

## 📝 License

This project is open-source. Feel free to modify and distribute.