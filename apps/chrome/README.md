# Plannotator Chrome Clipboard Workflow

This app area provides a non-invasive way to review copied web AI responses in Plannotator.

The extension does not inject content scripts, modify provider pages, inspect page DOM, poll the clipboard, or submit feedback back into AI web tools. The user explicitly copies a response, previews the clipboard in the extension popup, and sends it to Plannotator.

## Layout

```text
apps/chrome/
├── chrome-extension/       # Popup-only Chrome extension
├── chrome-native-host/     # Chrome Native Messaging host
└── store/                  # Web Store listing, release, and reviewer docs
```

## Production Workflow

Chrome Web Store installs only the browser extension. The Native Messaging host is a separate local executable that users install from GitHub Releases.

The native host is intentionally small: it validates Native Messaging requests, launches the installed `plannotator` command, and streams ready/final responses back to the extension. It does not bundle the Plannotator CLI or browser UI.

Production install flow:

1. Install the `plannotator` CLI:

   ```bash
   curl -fsSL https://plannotator.ai/install.sh | bash
   ```

2. Install the Chrome extension from Chrome Web Store.
3. Install the native host from the Chrome release artifacts:

   ```bash
   curl -fsSL https://github.com/1WorldCapture/plannotator/releases/latest/download/install-chrome-native-host.sh | bash
   ```

Until the Chrome Web Store production extension ID is recorded in `apps/chrome/chrome-native-host/install-release.sh`, pass an explicit extension ID:

```bash
curl -fsSL https://github.com/1WorldCapture/plannotator/releases/latest/download/install-chrome-native-host.sh | bash -s -- --extension-id <extension-id>
```

The installer currently supports macOS and Linux Native Messaging manifest locations. Windows registration is intentionally deferred until the production extension ID is available and a Windows installer format is selected.

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

Build the Chrome Web Store zip:

```bash
bun run --cwd apps/chrome/chrome-extension package
```

The package is written to:

```text
apps/chrome/chrome-extension/plannotator-clipboard-extension.zip
```

## Chrome Web Store Submission

Use `apps/chrome/store/web-store-submission.md` for listing copy, permission rationale, privacy disclosure text, reviewer instructions, and asset guidance.

The first store submission is also the step that establishes the stable production extension ID. That ID must be copied into the production native-host installer before the no-argument production installer can write a final Native Messaging `allowed_origins` entry.

## GitHub Release Artifacts

Chrome release artifacts are built by `.github/workflows/chrome-release.yml`.

Manual workflow runs validate artifacts without publishing a release. Pushing a `chrome-v*` tag uploads these release assets:

- Chrome Web Store zip
- Native host binaries for macOS and Linux
- SHA256 checksum files
- `install-chrome-native-host.sh`

See `apps/chrome/store/release-and-installation.md` for release settings and installer details.

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
