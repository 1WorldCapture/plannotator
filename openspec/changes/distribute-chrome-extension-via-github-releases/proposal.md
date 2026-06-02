## Why

Chrome Web Store publishing is no longer the intended distribution path for ClipMark, but the current release model still assumes a production Chrome Web Store extension ID. Native Messaging requires a concrete extension origin in `allowed_origins`, so GitHub Releases distribution needs its own stable extension identity and installer flow.

## What Changes

- Distribute the ClipMark Chrome extension zip through GitHub Releases as the user-facing production package.
- Add a release/unpacked extension identity that remains stable across downloads and local unpacked loads.
- Update the native-host installer to use the GitHub Release extension ID by default instead of a Chrome Web Store production ID.
- Provide a curl-installable macOS/Linux installer path that downloads the latest or pinned release, verifies checksums, installs the native host, unpacks the extension to a stable local path, and prints the required manual `Load unpacked` browser steps.
- Keep explicit `--extension-id` override support for development, forks, and reviewer-specific unpacked builds.
- Remove or demote Chrome Web Store submission assumptions from the production release documentation.

## Capabilities

### New Capabilities

- None.

### Modified Capabilities

- `chrome-native-host-distribution`: release artifacts and installers must support GitHub Releases as the primary extension and native-host distribution path.
- `chrome-clipboard-annotation`: production installation must target a stable GitHub Release/unpacked extension ID instead of a Chrome Web Store production ID.

## Impact

- `.github/workflows/chrome-release.yml`
- `apps/chrome/chrome-extension/manifest.json`
- `apps/chrome/chrome-extension/package.json`
- `apps/chrome/chrome-extension/install-release.sh`
- `apps/chrome/chrome-native-host/install-release.sh`
- Chrome release and installation documentation under `apps/chrome/`
- Existing Chrome release and installer tests
