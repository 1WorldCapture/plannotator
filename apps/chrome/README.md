# Plannotator Chrome Clipboard Workflow

This app area provides a non-invasive way to review copied web AI responses in Plannotator.

The extension does not inject content scripts, modify provider pages, inspect page DOM, poll the clipboard, or submit feedback back into AI web tools. The user explicitly copies a response, previews the clipboard in the extension popup, and sends it to Plannotator.

## Layout

```text
apps/chrome/
├── chrome-extension/       # Popup-only Chrome extension
└── chrome-native-host/     # Chrome Native Messaging host
```

## Development Workflow

Build the extension:

```bash
bun run --cwd apps/chrome/chrome-extension build
```

Load it in Chrome:

1. Open `chrome://extensions`.
2. Enable Developer mode.
3. Click Load unpacked.
4. Select `apps/chrome/chrome-extension/dist`.
5. Copy the generated extension ID.

Build the standalone native host:

```bash
bun run --cwd apps/chrome/chrome-native-host build
```

Install the native host manifest:

```bash
bun apps/chrome/chrome-native-host/install.ts --extension-id <extension-id>
```

The installer writes `ai.plannotator.clipboard.json` to Chrome's Native Messaging host directory on macOS or Linux. It points to the standalone executable at `apps/chrome/chrome-native-host/dist/plannotator-chrome-native-host` when that file exists. In source checkouts without a built executable, it falls back to `apps/chrome/chrome-native-host/bin/plannotator-chrome-native-host`.

## User Workflow

1. In Gemini, ChatGPT, Claude, or another tool, use the provider's own Copy button for the AI response.
2. Click the Plannotator Clipboard extension icon.
3. If the clipboard contains text, the extension launches Plannotator.
4. Plannotator opens in a new active Chrome tab immediately next to the tab where the extension was clicked. The original provider page remains open in its tab.
5. Submit annotations in Plannotator.
6. The extension copies returned annotation feedback to the clipboard when feedback exists.

If the Plannotator session is approved or closed without feedback, the extension reports that no feedback was returned and leaves the clipboard unchanged.

## Native Host

The native host name is:

```text
ai.plannotator.clipboard
```

The host accepts one Native Messaging request:

```json
{
  "type": "annotateClipboard",
  "text": "Copied AI response",
  "source": {
    "kind": "clipboard",
    "pageUrl": "https://gemini.google.com/",
    "title": "Gemini"
  }
}
```

It launches Plannotator's existing stdin annotation command:

```bash
plannotator annotate-last --stdin --gate --json
```

The extension uses a long-lived Native Messaging port. The native host first starts Plannotator with a temporary ready file and browser opening disabled:

```text
PLANNOTATOR_READY_FILE=<temp-jsonl-path>
PLANNOTATOR_SKIP_BROWSER_OPEN=1
```

When Plannotator publishes its local browser URL to the ready file, the native host sends a ready message:

```json
{
  "ok": true,
  "type": "ready",
  "url": "http://127.0.0.1:19432"
}
```

The extension opens that URL in a new active tab adjacent to the initiating tab. After the Plannotator session ends, the native host sends one final message:

```json
{
  "ok": true,
  "type": "feedback",
  "feedback": "Annotation feedback..."
}
```

or:

```json
{
  "ok": true,
  "type": "no-feedback",
  "decision": "approved"
}
```

Errors are returned as:

```json
{
  "ok": false,
  "type": "error",
  "error": "Plannotator could not be opened."
}
```

For packaged installs, the native host should be installed as a standalone executable and paired with the packaged Plannotator executable. The source-checkout launcher is a development fallback: it runs the host and Plannotator source through Bun so local development does not require a release build.
