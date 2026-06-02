## Context

The Chrome clipboard workflow currently exists as a development build under `apps/chrome/`. Developers build the extension, load `chrome-extension/dist` manually, copy the generated development extension ID, and run the native-host installer with that ID. This proves the workflow but does not give users a stable install path.

Chrome Web Store installation only installs the browser extension. The Native Messaging host remains a local application that must be installed and registered separately through a platform-specific manifest. The production extension ID is therefore a prerequisite for a production native-host manifest because `allowed_origins` must name the exact Chrome extension origin.

The native host should remain a small bridge. Users already install the `plannotator` command through Plannotator's install scripts, and the host can invoke that installed command. This avoids bundling Plannotator into the native host and keeps the security model easier to explain.

## Goals / Non-Goals

**Goals:**
- Prepare all Chrome Web Store listing, privacy, reviewer, and release-checklist materials needed to submit the extension.
- Establish an explicit first-submission step to obtain the stable production Chrome extension ID.
- Build Chrome extension and native-host artifacts through GitHub Actions.
- Publish native-host artifacts in GitHub Releases.
- Provide a curl-installable script that downloads the native host release artifact, installs it, and registers the Native Messaging manifest for the production extension ID.
- Preserve the upstream/downstream repository relationship by using the original Plannotator repository as `upstream` and the downstream packaging repository as `origin`.

**Non-Goals:**
- Do not auto-install the native host from the Chrome Web Store extension install event; Chrome does not provide that capability.
- Do not bundle the full Plannotator CLI or UI into the native host.
- Do not inject content scripts into AI provider pages or expand the clipboard workflow beyond explicit user-copied text.
- Do not submit to Chrome Web Store automatically from CI in this change.

## Decisions

### Submit the Chrome extension first enough to obtain the production extension ID

The native-host installer needs the production extension ID before it can write a final `allowed_origins` value. The first Chrome Web Store milestone should package and submit the extension listing so the project can obtain and verify the stable ID, even if the native host installer is still being finalized.

Alternative considered: keep accepting `--extension-id` as the production install path. That remains useful for development and forks, but it makes the normal user install flow too manual and error-prone.

### Keep the native host as a thin launcher

The release artifact for the native host should contain only the Native Messaging bridge. It validates input, communicates ready/final messages, and invokes the installed `plannotator` command. The installer should fail with a clear message if `plannotator` is unavailable, or direct the user to install it first.

Alternative considered: ship a native host artifact that includes Plannotator. That makes installation feel simpler, but it increases artifact size, creates a separate upgrade path, and weakens the security story because users cannot easily distinguish the bridge from the main application.

### Publish native host artifacts through GitHub Releases

GitHub Actions should build the Chrome extension package and native host artifacts from a tagged release. Release assets should include checksums. The native-host installer should download from the selected release tag or latest release, verify the checksum when available, and write the platform manifest.

Alternative considered: install the native host from the source checkout. That is acceptable for development but not for end users.

### Treat the downstream repository as the packaging origin

When this work moves to a separate GitHub repository, set the existing Plannotator remote to `upstream` and the new repository to `origin`. This keeps local development aligned with the original project while allowing packaging-specific release automation to live in the downstream repository.

Alternative considered: keep pushing packaging changes directly to the upstream Plannotator repository. That is simpler but makes it harder to separate extension packaging, release experiments, and Chrome-specific distribution from the main project.

## Risks / Trade-offs

- Production extension ID is unavailable until a Chrome Web Store item exists -> Gate the production installer constants behind a task that records the obtained ID.
- Chrome Web Store review rejects permissions or listing claims -> Provide reviewer notes that explain `clipboardRead`, `clipboardWrite`, `nativeMessaging`, and `tabs` in terms of explicit user action and adjacent-tab opening.
- Native host install feels like a second step -> Make the extension detect native-host connection failures and show the exact install command.
- Users install the native host without Plannotator CLI -> Installer and host should report the missing `plannotator` command with the standard CLI install instructions.
- Release artifact trust is weaker without verification -> Publish SHA256 checksums and have the installer verify them before installing when a checksum is available.
- Windows Native Messaging registration differs from macOS/Linux -> Keep Windows support explicit in design and tasks, including registry-key registration or a documented initial deferral if unsupported.
