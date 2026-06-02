## Why

Users often want to review long AI web responses with Plannotator's annotation workflow, but injecting buttons into ChatGPT, Gemini, Claude, or other provider pages creates provider-specific maintenance burden and a murkier compliance posture.

This change introduces a non-invasive Chrome workflow: the user copies a response using the provider's own UI, then explicitly sends the current clipboard text to Plannotator from the extension popup.

## What Changes

- Add a Chrome extension under `apps/chrome/chrome-extension` that lets users review clipboard text in Plannotator.
- Add a Chrome Native Messaging host under `apps/chrome/chrome-native-host` that receives extension requests and launches the existing Plannotator annotate flow.
- Add an install path for registering the native host manifest with Chrome.
- Return submitted Plannotator annotation feedback to the extension so the extension can copy that feedback back to the clipboard.
- Do not inject UI into AI provider pages, read page DOM, poll clipboard contents, or automatically submit feedback back into web AI tools.

## Capabilities

### New Capabilities

- `chrome-clipboard-annotation`: Allows users to open explicitly copied clipboard text in Plannotator from a Chrome extension using Native Messaging.

### Modified Capabilities

- None.

## Impact

- New Chrome app area:
  - `apps/chrome/chrome-extension`
  - `apps/chrome/chrome-native-host`
- The native host reuses the existing `annotate-last --stdin --gate --json` command for stdin-based clipboard annotation and feedback return.
- Packaging and install scripts need to register the Native Messaging host manifest with Chrome on supported platforms.
- Documentation should describe the user-triggered clipboard workflow and privacy boundaries.
