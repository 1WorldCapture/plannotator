# Optional Chrome Web Store Submission Reference

This file is optional reference material for a future ClipMark Chrome Web Store listing. GitHub Releases are the current production distribution path.

## Listing Copy

### Extension Name

ClipMark

### Short Description

Send copied clipboard text to Plannotator for annotation, markup, and feedback.

### Detailed Description

ClipMark opens text you explicitly copied into a local Plannotator annotation session.

The workflow is intentionally narrow:

1. Copy an AI response or any text using the page's own copy behavior.
2. Click the ClipMark extension icon.
3. The extension previews the clipboard size and asks a local Native Messaging host to start Plannotator.
4. Plannotator opens in a new Chrome tab next to the page you were using.
5. If you submit annotation feedback, the extension copies that feedback back to your clipboard.

The extension does not inject buttons into websites, inspect page DOM, monitor the clipboard in the background, or send clipboard content to a remote service. Clipboard text is passed to a local Native Messaging host only after the user clicks the extension action.

Plannotator must be installed separately on your computer. Native Messaging is used only to launch the local Plannotator command and receive the final annotation result.

## Category

Developer Tools

## Language

English

## Website and Support

- Website: `https://plannotator.ai`
- Support URL: `https://github.com/1WorldCapture/plannotator/issues`
- Source code: `https://github.com/1WorldCapture/plannotator`

## Permission Rationale

### `clipboardRead`

Used only after the user opens the extension popup. The extension reads the current clipboard text so the user can send explicitly copied content to local Plannotator.

### `clipboardWrite`

Used only after Plannotator returns annotation feedback. The extension writes non-empty feedback to the clipboard so the user can paste it back into their agent or AI tool.

### `nativeMessaging`

Required to communicate with the local Plannotator Native Messaging host. The host launches the installed `plannotator` command and returns ready/final annotation messages.

### `tabs`

Used to open the local Plannotator URL in a new active tab adjacent to the initiating tab.

### `activeTab`

Used to capture lightweight source metadata from the initiating tab, such as title and URL, after the user clicks the extension action.

## Privacy Disclosure

ClipMark does not collect, sell, or transmit user data to Plannotator servers.

The extension reads clipboard text only when the user opens the popup. That text is sent to a local Native Messaging host installed on the user's machine. The local host invokes the installed `plannotator` command. Plannotator opens a local browser session for review.

If the user submits annotation feedback, the extension writes that feedback to the user's clipboard. If the user approves or closes without feedback, the extension leaves the clipboard unchanged.

## Reviewer Instructions

The extension requires a registered Native Messaging host named:

```text
ai.plannotator.clipboard
```

For review, install the Plannotator CLI and native host before testing the extension:

```bash
curl -fsSL https://plannotator.ai/install.sh | bash
curl -fsSL https://github.com/1WorldCapture/plannotator/releases/latest/download/install-chrome.sh | bash
```

If testing a reviewer-specific extension ID instead of the GitHub Release extension ID, pass that ID explicitly:

```bash
curl -fsSL https://github.com/1WorldCapture/plannotator/releases/latest/download/install-chrome-native-host.sh | bash -s -- --extension-id <extension-id>
```

Manual test flow:

1. Copy any non-empty text in Chrome.
2. Click the ClipMark extension icon.
3. Confirm that Plannotator opens in a new active tab adjacent to the current tab.
4. Submit annotation feedback in Plannotator.
5. Confirm that the extension copies the returned feedback to the clipboard.

The extension does not use content scripts and does not modify the current web page.

## Required Listing Assets

### Extension Icons

Manifest icons are generated from `apps/marketing/public/favicon.svg` into:

- `apps/chrome/chrome-extension/assets/icons/icon-16.png`
- `apps/chrome/chrome-extension/assets/icons/icon-32.png`
- `apps/chrome/chrome-extension/assets/icons/icon-48.png`
- `apps/chrome/chrome-extension/assets/icons/icon-128.png`

### Screenshots

Store screenshots at 1280×800 covering the full user flow:

- `apps/chrome/store/screenshots/screenshot-1.png` — Popup after clipboard text is detected.
- `apps/chrome/store/screenshots/screenshot-2.png` — Plannotator annotation session opened in an adjacent Chrome tab.
- `apps/chrome/store/screenshots/screenshot-3.png` — Annotation feedback copied back to clipboard after submission.

### Promotional Images

- `apps/chrome/store/promo/small-tile.png` — Small tile: 440×280
- `apps/chrome/store/promo/marquee.png` — Marquee: 1400×560

## Optional Store Extension ID

The GitHub Release extension ID used by production release installers is:

```text
hoblepbiofcahbbaobbfhhfhiihdekan
```

If a future Chrome Web Store item is created, record that store-assigned ID separately and update only the optional store-specific installation notes.
