## Context

Plannotator already supports annotating arbitrary markdown and latest assistant messages through the annotate UI. The missing piece for web AI usage is a safe browser-to-local handoff for content that the user has explicitly copied from a web AI response.

Earlier options included injecting provider-specific buttons into ChatGPT, Gemini, Claude, and similar pages. That approach would require fragile DOM adapters and would create unnecessary ambiguity around automated extraction. The chosen direction is provider-agnostic: the user clicks the provider's own copy button, then clicks the Chrome extension icon to send clipboard text to Plannotator.

## Goals / Non-Goals

**Goals:**

- Provide a Chrome extension entry point for opening current clipboard text in Plannotator.
- Use Chrome Native Messaging instead of a permanently listening local HTTP bridge.
- Keep the workflow user-triggered at every sensitive step: copying content, sending it to Plannotator, and copying returned feedback.
- Reuse the existing annotate UI and annotation export behavior.
- Keep the implementation under `apps/chrome/chrome-extension` and `apps/chrome/chrome-native-host`.

**Non-Goals:**

- No content script injection into AI provider pages.
- No DOM parsing, network interception, or provider-specific message extraction.
- No background clipboard polling.
- No automatic feedback insertion or submission into web AI tools.
- No first-version support for images copied from provider pages.

## Decisions

### Use Native Messaging as the local bridge

The Chrome extension will communicate with a Native Messaging host installed on the user's machine. The host is launched on demand by Chrome and receives a single JSON message containing clipboard text and lightweight source metadata.

Alternatives considered:

- **Persistent local HTTP bridge:** smoother for repeated calls, but exposes a local port and requires a background process.
- **Extension-only implementation:** impossible because the extension cannot run Plannotator server code or spawn local commands directly.
- **Provider page injection:** convenient UI, but fragile and less defensible from a privacy/compliance perspective.

### Keep the extension popup generic

The extension will be framed as "Open Clipboard in Plannotator" rather than a Gemini- or ChatGPT-specific integration. It may display the current tab title and URL as optional source metadata, but it will not depend on provider identity.

The popup should read clipboard text only after an explicit user action and show a short preview or character count before sending. This reduces accidental submission of secrets or unrelated private content.

### Launch annotate mode through the native host

The host will validate the request, launch the Plannotator annotate flow with stdin content, and wait for the result. It will use the existing `plannotator annotate-last --stdin --gate --json` command so the Chrome workflow can work with currently installed Plannotator binaries.

The annotate session will use the existing annotate-last UI wording. A dedicated clipboard label can be added later if the core CLI grows a first-class clipboard command.

### Return feedback to the extension

When the user submits annotations, the host returns the exported feedback to the extension. The extension then writes that feedback to the clipboard and reports success.

If the user exits or approves without feedback, the host returns a no-feedback result and the extension does not overwrite the clipboard unless there is explicit feedback text.

### Security boundaries

Native Messaging already limits callers to the extension IDs declared in the host manifest. The host should still validate message shape, maximum text size, and command type before spawning Plannotator. It should process one request per invocation and then exit.

## Risks / Trade-offs

- **Native Messaging installation is more complex than a local HTTP bridge** → Provide a dedicated install script and clear README for supported platforms.
- **Clipboard may contain sensitive or unrelated content** → Require a popup button click and show preview/count before sending.
- **Large copied responses may exceed practical message or UI limits** → Enforce a documented maximum and show a clear extension error when exceeded.
- **Feedback copy-back may overwrite useful clipboard content** → Only copy back after annotation feedback is returned, and communicate that result in the popup.
- **Host command may hang while Plannotator waits for user input** → Treat this as expected for the active annotation session, but surface errors if the native host process fails before opening Plannotator.
