## 1. Release Extension Identity

- [x] 1.1 Generate or select the ClipMark release extension public key and derive the stable Chrome extension ID.
- [x] 1.2 Add the release public key to the built extension manifest so GitHub Release unpacked loads receive the stable ID.
- [x] 1.3 Record the stable release extension ID in the Chrome release documentation.

## 2. Release Artifacts

- [x] 2.1 Ensure the Chrome extension package artifact is named and documented consistently as the GitHub Release extension zip.
- [x] 2.2 Update the Chrome release workflow to upload the extension zip, extension checksum, native-host binaries, native-host checksums, and installer scripts.
- [x] 2.3 Keep release version pinning supported for extension and native-host downloads.

## 3. Installers

- [x] 3.1 Update the native-host release installer to default to the GitHub Release extension ID instead of a Chrome Web Store production ID.
- [x] 3.2 Preserve `--extension-id`, `--version`, `--repo`, and `--browser` overrides for development and forked releases.
- [x] 3.3 Make the user-facing release install path install both extension files and native host assets for macOS/Linux.
- [x] 3.4 Ensure the installer verifies SHA256 checksums before installing downloaded release assets.
- [x] 3.5 Ensure installer output clearly states that Chrome/Edge still require manual `Load unpacked` from the installed extension directory.

## 4. Documentation

- [x] 4.1 Update `apps/chrome/README.md` to describe GitHub Releases as the production distribution path.
- [x] 4.2 Update `apps/chrome/store/release-and-installation.md` so the documented one-command flow matches actual installer behavior.
- [x] 4.3 Demote Chrome Web Store submission materials to optional/historical reference and remove CWS production ID language from the production install path.
- [x] 4.4 Document upgrade behavior, including re-running the installer and reloading the unpacked extension if Chrome has it loaded.

## 5. Tests and Validation

- [x] 5.1 Update native-host installer tests to assert the GitHub Release extension ID default and non-CWS error text.
- [x] 5.2 Add or update extension installer tests for release zip name, checksum verification, stable install directory, and version/repo options.
- [x] 5.3 Run `bun run test:chrome`.
- [x] 5.4 Build the extension package and verify the release zip contains `manifest.json`, `popup.html`, `popup.js`, icons, and the stable manifest key.
- [x] 5.5 Smoke-test the documented installer flow locally with a pinned release or local release-asset substitute where practical.
