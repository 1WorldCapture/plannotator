## 1. Native Host Ready URL Flow

- [x] 1.1 Extend the Chrome native-host response protocol with a structured `ready` message that carries the Plannotator session URL and distinct final result messages for feedback, approve, dismiss, and error states.
- [x] 1.2 Spawn Plannotator with a temporary `PLANNOTATOR_READY_FILE` and `PLANNOTATOR_SKIP_BROWSER_OPEN=1` for Chrome clipboard annotation requests.
- [x] 1.3 Poll the ready file until the first valid server-ready JSON line is available, the child process exits, or a timeout is reached.
- [x] 1.4 Send the `ready` message before waiting for the final `annotate-last --stdin --gate --json` decision, then send the final result after Plannotator exits.
- [x] 1.5 Clean up the temporary ready file and child process state on success, early failure, timeout, and native-host errors.

## 2. Chrome Extension Port and Tab Opening

- [x] 2.1 Replace the popup's one-shot `chrome.runtime.sendNativeMessage` call with a long-lived `chrome.runtime.connectNative` port that can receive `ready` and final messages.
- [x] 2.2 Track the initiating active tab's `windowId` and `index` before launching the native request.
- [x] 2.3 On the native-host `ready` message, create a new active tab at `index + 1` in the initiating Chrome window using the Plannotator URL.
- [x] 2.4 Preserve existing clipboard-copy behavior for final feedback and preserve the no-feedback behavior for approve or dismiss decisions.
- [x] 2.5 Surface clear popup status/error messages for invalid native messages, native-host failure before ready, ready timeout, and Chrome tab creation errors.

## 3. Tests

- [x] 3.1 Add native-host protocol tests for ready messages, final messages, invalid requests, and malformed response handling.
- [x] 3.2 Add native-host Plannotator runner tests covering ready-file publication, timeout, child exit before ready, final decision parsing, and ready-file cleanup.
- [x] 3.3 Add extension tests for port message sequencing, adjacent tab creation, fallback tab creation when active tab metadata is unavailable, final feedback clipboard copying, and no-feedback decisions.
- [x] 3.4 Run `bun run --cwd apps/chrome/chrome-native-host test` and `bun run --cwd apps/chrome/chrome-extension test`.

## 4. Documentation and Manual Verification

- [x] 4.1 Update `apps/chrome/README.md` to describe the new-tab Chrome launch behavior and the native-host ready/final message flow.
- [x] 4.2 Document the expected user workflow: copy text, click extension, Plannotator opens in a new adjacent Chrome tab, submit annotations, feedback is copied to clipboard.
- [ ] 4.3 Manually verify the flow in Chrome with copied AI response text and confirm the provider page remains open in the original tab.
