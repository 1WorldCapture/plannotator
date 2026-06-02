# Chrome Release and Native Host Installation

## Repository

The Chrome packaging repository is:

```text
https://github.com/1WorldCapture/plannotator
```

The original Plannotator repository remains configured as `upstream`:

```text
https://github.com/backnotprop/plannotator
```

## Release Workflow

Chrome release artifacts are built by:

```text
.github/workflows/chrome-release.yml
```

Manual workflow runs validate the build and upload workflow artifacts only. Publishing to a GitHub Release happens on tags that match:

```text
chrome-v*
```

Example:

```bash
git tag chrome-v0.1.0
git push origin chrome-v0.1.0
```

The workflow builds and uploads:

- `plannotator-clipboard-extension.zip`
- `plannotator-clipboard-extension.zip.sha256`
- `plannotator-chrome-native-host-darwin-arm64`
- `plannotator-chrome-native-host-darwin-arm64.sha256`
- `plannotator-chrome-native-host-darwin-x64`
- `plannotator-chrome-native-host-darwin-x64.sha256`
- `plannotator-chrome-native-host-linux-arm64`
- `plannotator-chrome-native-host-linux-arm64.sha256`
- `plannotator-chrome-native-host-linux-x64`
- `plannotator-chrome-native-host-linux-x64.sha256`
- `install-chrome-native-host.sh`
- `install-chrome-native-host.sh.sha256`

## GitHub Settings

Required repository settings:

- GitHub Actions enabled.
- Workflow permissions allow `contents: write` for release asset uploads.
- No secrets are required for the current Chrome release workflow.

The workflow uses the built-in `GITHUB_TOKEN` to create a draft release when a matching tag is pushed and no release exists yet.

## Native Host Installer

The public installer asset is:

```text
https://github.com/1WorldCapture/plannotator/releases/latest/download/install-chrome-native-host.sh
```

Production command after the Chrome Web Store extension ID is configured:

```bash
curl -fsSL https://github.com/1WorldCapture/plannotator/releases/latest/download/install-chrome-native-host.sh | bash
```

Development or reviewer command before the production extension ID is configured:

```bash
curl -fsSL https://github.com/1WorldCapture/plannotator/releases/latest/download/install-chrome-native-host.sh | bash -s -- --extension-id <extension-id>
```

Pinned release:

```bash
curl -fsSL https://github.com/1WorldCapture/plannotator/releases/download/chrome-v0.1.0/install-chrome-native-host.sh | bash -s -- --version chrome-v0.1.0 --extension-id <extension-id>
```

## Native Host Install Location

The installer writes the native host binary to:

```text
~/.local/share/plannotator/chrome-native-host/plannotator-chrome-native-host
```

Set `PLANNOTATOR_CHROME_HOST_DIR` to override that directory.

## Supported Browsers

The installer supports macOS and Linux Native Messaging manifest locations for:

- Chrome
- Chromium
- Microsoft Edge
- Brave
- Vivaldi

Windows Native Messaging registry registration is intentionally deferred until the Chrome extension has a production ID and a Windows-specific installer format is selected.

## Plannotator CLI Requirement

The native host does not bundle Plannotator. Users must install the `plannotator` command first:

```bash
curl -fsSL https://plannotator.ai/install.sh | bash
```

The installer checks for `plannotator` before installing the native host. The native host also resolves the installed command at runtime before launching annotation mode.
