## Context

The Chrome clipboard workflow is split across a popup-only Chrome extension and a Native Messaging host. The extension reads clipboard text after a user action, sends it to `ai.plannotator.clipboard`, and waits for the native host to return either annotation feedback or a no-feedback decision. The native host starts `plannotator annotate-last --stdin --gate --json`, and the Plannotator server currently opens the review URL through its generic browser opener.

That generic opener is correct for CLI and plugin runtimes, but it is the wrong owner for Chrome extension sessions. Only the extension knows the active Chrome window and tab index, and only the extension can reliably open a new tab adjacent to the initiating tab.

Existing server infrastructure already supports the desired split:

- `PLANNOTATOR_READY_FILE` makes the server append `{ url, isRemote, port }` when the local UI is ready.
- `PLANNOTATOR_SKIP_BROWSER_OPEN=1` prevents the server from opening the system browser.
- The Amp plugin already uses the ready-file side channel for host-managed opening.

## Goals / Non-Goals

**Goals:**

- Open Plannotator in a new active tab in the current Chrome window, adjacent to the tab where the extension popup was invoked.
- Keep Plannotator server code browser-agnostic.
- Preserve the existing clipboard feedback contract after the user submits annotations.
- Surface clear errors if Plannotator fails before publishing a URL.
- Keep the workflow popup-only; no provider-page content scripts or DOM extraction.

**Non-Goals:**

- Add settings for choosing current-tab vs. new-tab behavior.
- Support Firefox, Edge, or Safari extension APIs in this change.
- Change plan/review/annotate server routes.
- Change clipboard payload limits or annotation export format.

## Decisions

### Use the ready-file side channel instead of teaching the server about Chrome

The native host will spawn Plannotator with:

```text
PLANNOTATOR_READY_FILE=<temp-jsonl-path>
PLANNOTATOR_SKIP_BROWSER_OPEN=1
```

It will watch the ready file until it sees the first valid URL, then notify the extension. This keeps browser ownership in the host that has browser context, while reusing the existing server-ready mechanism.

Alternative considered: add a Chrome-specific opener to `packages/server/browser.ts`. Rejected because the server process has no Chrome extension context and would have to guess a browser/window, which reintroduces the default-browser problem in a different form.

### Use a long-lived Native Messaging port for multi-step responses

The extension should use `chrome.runtime.connectNative` rather than `sendNativeMessage`. The native host needs to send an early `ready` event and a later final result after the Plannotator session completes:

```text
extension -> native host: annotateClipboard
native host -> extension: ready(url)
native host -> extension: feedback | no-feedback | error
```

Alternative considered: keep `sendNativeMessage` and return the URL in the final response. Rejected because the final response arrives only after the user finishes the Plannotator session, too late to open the tab.

### Open an adjacent active tab from the extension

When the extension receives the ready URL, it should query the initiating active tab and create a new tab in the same window at `activeTab.index + 1`, with `active: true`. If the active tab cannot be resolved, it should create an active tab in the current window as a fallback.

Alternative considered: replace the current tab with `chrome.tabs.update`. Rejected because it hides the AI provider page the user copied from and makes it harder to preserve context.

### Keep final clipboard behavior unchanged

The extension still copies returned annotation feedback to the clipboard only when the final native-host message contains non-empty feedback. Approve and dismiss final states still report no feedback and leave the clipboard unchanged.

## Risks / Trade-offs

- Popup lifetime may end while Plannotator is open -> Keep the popup status visible while the native port remains open; tests should cover final response handling through the port. If Chrome closes popup execution unexpectedly, a later background-service-worker migration may be needed, but this change should first verify whether the current popup can hold the native port reliably during the review.
- Ready file can be delayed or malformed -> Native host should time out, terminate or observe child exit, and send a clear error event.
- Native host can publish multiple ready lines -> Use the first valid URL and ignore duplicates.
- Tab creation can fail because of Chrome API errors -> Surface the tab-opening error and leave the native session result handling intact where possible.
- Existing installed native hosts may not support ready events -> This is a development/package version alignment concern; README and tests should describe the new protocol.
