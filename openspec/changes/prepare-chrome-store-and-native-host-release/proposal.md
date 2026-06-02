## Why

The Chrome clipboard workflow works in local development, but it is not yet packaged for real users. Plannotator needs a Chrome Web Store submission path and a separate native-host release/installer path that makes the local bridge transparent, verifiable, and independent from the installed Plannotator CLI.

## What Changes

- Prepare the Chrome extension for Chrome Web Store submission with production listing copy, privacy/security disclosures, screenshots/assets guidance, reviewer instructions, and a stable release checklist.
- Treat the first Chrome Web Store submission as the step that establishes the production extension ID needed by the Native Messaging host's `allowed_origins`.
- Add a GitHub release pipeline for the Chrome native host so release artifacts are built by CI instead of from a local checkout.
- Add an install script that downloads the native host from GitHub Releases, installs it locally, and writes the platform-specific Native Messaging manifest for the production extension ID.
- Keep the native host as a thin launcher: it validates the Native Messaging request and invokes the user's installed `plannotator` command instead of bundling Plannotator itself.
- Document the repository relationship for maintaining a downstream Chrome packaging repo, with the original Plannotator repository as `upstream` and the packaging repository as `origin`.

## Capabilities

### New Capabilities
- `chrome-native-host-distribution`: Release, install, and register the Chrome Native Messaging host from GitHub Releases while keeping it separate from the Plannotator CLI.

### Modified Capabilities
- `chrome-clipboard-annotation`: Add production Chrome Web Store submission and production extension ID requirements for the existing clipboard annotation workflow.

## Impact

- `apps/chrome/chrome-extension`: Production manifest details, packaged build output, store listing support assets, and submission checklist.
- `apps/chrome/chrome-native-host`: Release artifact build, launcher behavior, manifest generation, and installer-facing assumptions.
- `.github/workflows`: Release workflow for Chrome extension/native-host artifacts.
- `scripts` or `apps/chrome/chrome-native-host`: Public install script for downloading GitHub release artifacts and registering the native host manifest.
- `apps/chrome/README.md` and marketing docs: User-facing Chrome installation flow, including the requirement to install Plannotator CLI before or alongside the native host.
- Git remotes: Maintain the source Plannotator repository as `upstream` and the downstream Chrome packaging repository as `origin`.
