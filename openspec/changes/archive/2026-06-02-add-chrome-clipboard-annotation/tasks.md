## 1. Plannotator Clipboard Entry Point

- [x] 1.1 Audit the existing `plannotator annotate-last --stdin` flow and decide to reuse it for clipboard annotation.
- [x] 1.2 Ensure the native host starts annotate mode through the existing stdin annotation path.
- [x] 1.3 Ensure annotate feedback, approve-without-feedback, and exit-without-feedback produce machine-readable native-host results.
- [x] 1.4 Add tests for stdin clipboard annotation outcomes, including feedback returned and no-feedback exit.

## 2. Chrome Native Host

- [x] 2.1 Create `apps/chrome/chrome-native-host` with the Native Messaging host entry point.
- [x] 2.2 Implement Native Messaging framing for reading one request from stdin and writing one response to stdout.
- [x] 2.3 Validate `annotateClipboard` payloads, including empty text, unsupported request type, and maximum text size.
- [x] 2.4 Launch the Plannotator clipboard annotation command, pass clipboard text through stdin, wait for completion, and return feedback or no-feedback status.
- [x] 2.5 Add host unit tests for framing, validation, command invocation, and error responses.

## 3. Chrome Extension

- [x] 3.1 Create `apps/chrome/chrome-extension` with a Chrome extension manifest, popup HTML, and TypeScript entry.
- [x] 3.2 Implement popup clipboard reading only after explicit user action.
- [x] 3.3 Show clipboard character count, short preview, empty clipboard errors, and oversized-content errors.
- [x] 3.4 Send valid clipboard text to the native host with optional current tab title and URL metadata.
- [x] 3.5 Copy returned annotation feedback to the clipboard only when feedback text is present.
- [x] 3.6 Add extension tests for popup state transitions and Native Messaging request/response handling.

## 4. Installation And Packaging

- [x] 4.1 Add a Native Messaging manifest template under `apps/chrome/chrome-native-host`.
- [x] 4.2 Add an install script that writes the Chrome native host manifest to the platform-appropriate location.
- [x] 4.3 Document local development, extension loading, host installation, and the user workflow.
- [x] 4.4 Add build scripts or workspace package metadata needed to build the Chrome extension and native host.

## 5. End-To-End Verification

- [ ] 5.1 Manually verify the flow with copied Gemini response text: copy, open extension, launch Plannotator, submit annotations, and confirm feedback is copied back.
- [x] 5.2 Verify the extension does not inject content scripts or modify provider pages.
- [x] 5.3 Verify no-feedback exit does not overwrite the clipboard.
- [x] 5.4 Run relevant repository tests and Chrome workflow tests.
