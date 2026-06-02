## Context

ClipMark currently has two distribution assumptions mixed together:

- the Chrome extension is treated as a Chrome Web Store package with a future store-assigned production ID
- the Native Messaging host is released through GitHub Releases and writes a manifest whose `allowed_origins` must include that production extension ID

The new distribution path removes Chrome Web Store publishing from the normal release flow. Users will download release assets from GitHub, run a shell installer, and manually load the unpacked extension from a stable local directory. Chrome still requires manual user action for `Load unpacked`, and Native Messaging still requires a concrete `chrome-extension://<id>/` origin rather than a wildcard.

## Goals / Non-Goals

**Goals:**

- Make GitHub Releases the primary production distribution path for both ClipMark extension assets and native-host assets.
- Give the release extension a stable unpacked extension ID that can be used by default in the native-host manifest.
- Provide an installer flow that downloads the latest or pinned release, verifies checksums, unpacks the extension, installs the native host, and prints exact browser loading steps.
- Preserve explicit extension ID overrides for development builds, forks, and unusual browser profiles.
- Keep macOS/Linux as the supported installer platforms for this change.

**Non-Goals:**

- Do not publish to or depend on the Chrome Web Store.
- Do not silently enable or load the extension in Chrome; users must still use `chrome://extensions` and `Load unpacked`.
- Do not bundle the Plannotator CLI or UI into the native host.
- Do not add Windows Native Messaging registration in this change.

## Decisions

### Use a committed release public key to stabilize the unpacked extension ID

The release extension manifest should include Chrome's `key` field with a public key selected for ClipMark releases. Chrome derives the unpacked extension ID from that key, which lets the native-host installer use a stable default `allowed_origins` entry without Chrome Web Store involvement.

Alternative considered: make users load the extension, copy the generated unpacked ID, and rerun the native-host installer with `--extension-id`. That works for development, but it is too manual and error-prone for the normal release flow.

Alternative considered: rely on the extension install path to keep the unpacked ID stable. A fixed path helps avoid accidental ID churn for a given profile, but it does not give the project a known ID that can be documented and embedded in the native-host installer.

### Keep the extension as an unpacked zip, not a CRX installer

The release artifact should remain a zip containing the built MV3 extension. The installer unpacks it into `~/.local/share/plannotator/chrome-extension`, verifies the checksum, and prints browser-specific `Load unpacked` instructions.

Alternative considered: distribute a CRX. Chrome's normal end-user installation path for off-store CRX files is restricted and more brittle than explicit Developer mode loading. The unpacked path is clearer and matches the Native Messaging host's local-install nature.

### Provide one user-facing release installer with separate script support retained

The primary release command should install the extension files and native host together. Separate extension-only and native-host-only scripts can remain for testing and troubleshooting, but documentation should not call an extension-only script a full installation.

Alternative considered: keep two independent commands. That is simpler internally but leaves the user to discover the extension ID ordering problem and increases support risk.

### Update specs and docs away from Chrome Web Store production language

Chrome Web Store materials may remain as historical or optional submission notes, but production requirements and install docs should refer to the GitHub Release extension ID. Native-host installer errors should no longer say the production Chrome Web Store ID is missing.

Alternative considered: leave Chrome Web Store docs in place and add a CWS-free appendix. That preserves old context but keeps the wrong production model visible in the main workflow.

## Risks / Trade-offs

- Stable extension ID key handling could be misunderstood as committing a private signing key -> Commit only the public manifest `key` value and document that it exists solely to stabilize the extension ID.
- Users may expect the script to fully load the extension into Chrome -> Installer output must explicitly state that Chrome requires manual `Load unpacked`.
- Extension files can be overwritten while Chrome has the unpacked extension loaded -> Install to a stable directory and document that users may need to reload the extension on `chrome://extensions` after upgrades.
- Native-host manifest may be installed before the extension is loaded -> This is acceptable because Chrome checks `allowed_origins` when the loaded extension connects.
- Browser-specific manifest locations differ -> Keep the existing `--browser` option and default to Chrome, with Edge/Chromium-family support where already implemented.
