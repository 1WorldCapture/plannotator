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

- `clipmark-extension.zip`
- `clipmark-extension.zip.sha256`
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
- `install-chrome-extension.sh`
- `install-chrome-extension.sh.sha256`
- `install-chrome.sh`
- `install-chrome.sh.sha256`

## GitHub Settings

Required repository settings:

- GitHub Actions enabled.
- Workflow permissions allow `contents: write` for release asset uploads.
- No secrets are required for the current Chrome release workflow.

The workflow uses the built-in `GITHUB_TOKEN` to create a public release when a matching tag is pushed and no release exists yet.

## Release Extension ID

The GitHub Release extension is loaded unpacked from a stable local directory. The release manifest includes a public key so Chrome assigns this stable extension ID:

```text
hoblepbiofcahbbaobbfhhfhiihdekan
```

The native-host installer uses this ID by default in the Native Messaging `allowed_origins` entry. Pass `--extension-id <id>` only for development, forked, or reviewer-specific unpacked builds.

## One-Command Install

The public combined installer asset is:

```text
https://github.com/1WorldCapture/plannotator/releases/latest/download/install-chrome.sh
```

Install Plannotator CLI first:

```bash
curl -fsSL https://plannotator.ai/install.sh | bash
```

Then install ClipMark extension files and the native host:

```bash
curl -fsSL https://github.com/1WorldCapture/plannotator/releases/latest/download/install-chrome.sh | bash
```

Pinned release:

```bash
curl -fsSL https://github.com/1WorldCapture/plannotator/releases/download/chrome-v0.1.0/install-chrome.sh | bash -s -- --version chrome-v0.1.0
```

Then load the extension manually:

1. Open `chrome://extensions`
2. Enable **Developer mode**
3. Click **Load unpacked**
4. Select `~/.local/share/plannotator/chrome-extension/`

Chrome and Edge do not provide a reliable scriptable path for enabling unpacked extensions, so this browser step is always manual.

## Separate Installers

The extension-only installer is useful for troubleshooting:

```bash
curl -fsSL https://github.com/1WorldCapture/plannotator/releases/latest/download/install-chrome-extension.sh | bash
```

The native-host-only installer is useful when changing browsers or testing a custom extension ID:

```bash
curl -fsSL https://github.com/1WorldCapture/plannotator/releases/latest/download/install-chrome-native-host.sh | bash
curl -fsSL https://github.com/1WorldCapture/plannotator/releases/latest/download/install-chrome-native-host.sh | bash -s -- --extension-id <extension-id>
```

## Native Host Install Location

The installer writes the native host binary to:

```text
~/.local/share/plannotator/chrome-native-host/plannotator-chrome-native-host
```

Set `PLANNOTATOR_CHROME_HOST_DIR` to override that directory.

## Extension Install Location

The extension installer writes unpacked extension files to:

```text
~/.local/share/plannotator/chrome-extension/
```

Set `PLANNOTATOR_CHROME_EXTENSION_DIR` to override that directory.

## Supported Browsers

The installer supports macOS and Linux Native Messaging manifest locations for:

- Chrome
- Chromium
- Microsoft Edge
- Brave
- Vivaldi

Windows Native Messaging registry registration is intentionally deferred until a Windows-specific installer format is selected.

## Plannotator CLI Requirement

The native host does not bundle Plannotator. Users must install the `plannotator` command first:

```bash
curl -fsSL https://plannotator.ai/install.sh | bash
```

## Upgrades

```bash
curl -fsSL https://github.com/1WorldCapture/plannotator/releases/latest/download/install-chrome.sh | bash
```

After upgrading, open `chrome://extensions` and click **Reload** on ClipMark if Chrome still has the unpacked extension loaded from the install directory.

The installer checks for `plannotator` before installing the native host. The native host also resolves the installed command at runtime before launching annotation mode.
