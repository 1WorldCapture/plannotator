## Why

The Chrome clipboard workflow currently launches Plannotator through the native host and lets the Plannotator server open the URL with the system default browser. That breaks the user's browser context when Chrome is not the default browser and feels disconnected from the extension action that started the review.

## What Changes

- Change the Chrome clipboard workflow so Plannotator opens in a new active tab in the current Chrome window, adjacent to the tab where the extension action was invoked.
- Keep the Plannotator server browser-agnostic by using the existing ready-file side channel and browser-open skip flag.
- Extend the Chrome Native Messaging flow so the native host can publish the Plannotator URL before the final annotation decision is available.
- Preserve the existing final feedback behavior: submitted annotation feedback is copied to the clipboard, while approve/dismiss leaves the clipboard unchanged.
- Fall back to a clear extension error if Plannotator cannot publish a browser URL or the native host exits early.

## Capabilities

### New Capabilities

- None.

### Modified Capabilities

- `chrome-clipboard-annotation`: The Chrome extension must open the launched Plannotator session in a new active tab in the current Chrome window instead of relying on the system default browser.

## Impact

- `apps/chrome/chrome-extension`: Native Messaging client flow, tab opening behavior, popup state handling, Chrome API typings, and extension tests.
- `apps/chrome/chrome-native-host`: Native Messaging protocol, Plannotator child-process environment, ready-file polling, response sequencing, and native-host tests.
- `apps/chrome/README.md`: User and development workflow documentation for the Chrome-tab launch behavior.
- No server API change is expected; the design should reuse `PLANNOTATOR_READY_FILE` and `PLANNOTATOR_SKIP_BROWSER_OPEN`.
