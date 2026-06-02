#!/usr/bin/env sh
set -eu

HOST_NAME="ai.plannotator.clipboard"
DEFAULT_REPO="1WorldCapture/plannotator"
PRODUCTION_EXTENSION_ID=""
INSTALL_DIR="${PLANNOTATOR_CHROME_HOST_DIR:-$HOME/.local/share/plannotator/chrome-native-host}"

usage() {
  code="${1:-1}"
  cat >&2 <<'EOF'
Usage: install-chrome-native-host.sh [options]

Options:
  --version <tag>          Install a specific GitHub release tag. Defaults to latest.
  --extension-id <id>      Chrome extension ID to allow. Required until the production ID is configured.
  --browser <name>         chrome, chromium, edge, brave, or vivaldi. Default: chrome.
  --repo <owner/repo>      GitHub repository to download from. Default: 1WorldCapture/plannotator.
  -h, --help               Show this help.

Examples:
  curl -fsSL https://github.com/1WorldCapture/plannotator/releases/latest/download/install-chrome-native-host.sh | bash
  curl -fsSL https://github.com/1WorldCapture/plannotator/releases/latest/download/install-chrome-native-host.sh | bash -s -- --extension-id abcdefghijklmnopabcdefghijklmnop
EOF
  exit "$code"
}

VERSION=""
EXTENSION_ID="${PLANNOTATOR_CHROME_EXTENSION_ID:-$PRODUCTION_EXTENSION_ID}"
BROWSER="chrome"
REPO="${PLANNOTATOR_CHROME_REPO:-$DEFAULT_REPO}"

while [ "$#" -gt 0 ]; do
  case "$1" in
    --version)
      [ "$#" -ge 2 ] || usage
      VERSION="$2"
      shift 2
      ;;
    --extension-id)
      [ "$#" -ge 2 ] || usage
      EXTENSION_ID="$2"
      shift 2
      ;;
    --browser)
      [ "$#" -ge 2 ] || usage
      BROWSER="$2"
      shift 2
      ;;
    --repo)
      [ "$#" -ge 2 ] || usage
      REPO="$2"
      shift 2
      ;;
    -h|--help)
      usage 0
      ;;
    *)
      echo "Unknown option: $1" >&2
      usage
      ;;
  esac
done

if ! printf '%s' "$EXTENSION_ID" | grep -Eq '^[a-p]{32}$'; then
  if [ -z "$PRODUCTION_EXTENSION_ID" ]; then
    echo "Production Chrome Web Store extension ID is not configured yet." >&2
    echo "Pass --extension-id <id> for an unpacked or reviewer extension build." >&2
  else
    echo "Invalid Chrome extension ID: $EXTENSION_ID" >&2
  fi
  exit 1
fi

if [ -n "${PLANNOTATOR_BIN:-}" ]; then
  PLANNOTATOR_CANDIDATE="$PLANNOTATOR_BIN"
elif command -v plannotator >/dev/null 2>&1; then
  PLANNOTATOR_CANDIDATE="$(command -v plannotator)"
elif [ -x "$HOME/.local/bin/plannotator" ]; then
  PLANNOTATOR_CANDIDATE="$HOME/.local/bin/plannotator"
elif [ -x "/opt/homebrew/bin/plannotator" ]; then
  PLANNOTATOR_CANDIDATE="/opt/homebrew/bin/plannotator"
elif [ -x "/usr/local/bin/plannotator" ]; then
  PLANNOTATOR_CANDIDATE="/usr/local/bin/plannotator"
else
  echo "Plannotator CLI is not installed." >&2
  echo "Install it first:" >&2
  echo "  curl -fsSL https://plannotator.ai/install.sh | bash" >&2
  exit 1
fi

case "$(uname -s)" in
  Darwin)
    OS="darwin"
    CONFIG_BASE="$HOME/Library/Application Support"
    case "$BROWSER" in
      chrome) MANIFEST_DIR="$CONFIG_BASE/Google/Chrome/NativeMessagingHosts" ;;
      chromium) MANIFEST_DIR="$CONFIG_BASE/Chromium/NativeMessagingHosts" ;;
      edge) MANIFEST_DIR="$CONFIG_BASE/Microsoft Edge/NativeMessagingHosts" ;;
      brave) MANIFEST_DIR="$CONFIG_BASE/BraveSoftware/Brave-Browser/NativeMessagingHosts" ;;
      vivaldi) MANIFEST_DIR="$CONFIG_BASE/Vivaldi/NativeMessagingHosts" ;;
      *) echo "Unsupported browser on macOS: $BROWSER" >&2; exit 1 ;;
    esac
    ;;
  Linux)
    OS="linux"
    CONFIG_BASE="${XDG_CONFIG_HOME:-$HOME/.config}"
    case "$BROWSER" in
      chrome) MANIFEST_DIR="$CONFIG_BASE/google-chrome/NativeMessagingHosts" ;;
      chromium) MANIFEST_DIR="$CONFIG_BASE/chromium/NativeMessagingHosts" ;;
      edge) MANIFEST_DIR="$CONFIG_BASE/microsoft-edge/NativeMessagingHosts" ;;
      brave) MANIFEST_DIR="$CONFIG_BASE/BraveSoftware/Brave-Browser/NativeMessagingHosts" ;;
      vivaldi) MANIFEST_DIR="$CONFIG_BASE/vivaldi/NativeMessagingHosts" ;;
      *) echo "Unsupported browser on Linux: $BROWSER" >&2; exit 1 ;;
    esac
    ;;
  *)
    echo "This installer currently supports macOS and Linux." >&2
    echo "Windows Native Messaging registration is intentionally deferred." >&2
    exit 1
    ;;
esac

case "$(uname -m)" in
  arm64|aarch64) ARCH="arm64" ;;
  x86_64|amd64) ARCH="x64" ;;
  *) echo "Unsupported architecture: $(uname -m)" >&2; exit 1 ;;
esac

ASSET="plannotator-chrome-native-host-$OS-$ARCH"
if [ -n "$VERSION" ]; then
  BASE_URL="https://github.com/$REPO/releases/download/$VERSION"
else
  BASE_URL="https://github.com/$REPO/releases/latest/download"
fi

TMP_DIR="$(mktemp -d)"
cleanup() {
  rm -rf "$TMP_DIR"
}
trap cleanup EXIT INT TERM

download() {
  url="$1"
  output="$2"
  curl -fsSL "$url" -o "$output"
}

echo "Downloading $ASSET from $REPO..."
download "$BASE_URL/$ASSET" "$TMP_DIR/$ASSET"
download "$BASE_URL/$ASSET.sha256" "$TMP_DIR/$ASSET.sha256"

EXPECTED="$(awk '{print $1}' "$TMP_DIR/$ASSET.sha256")"
if command -v sha256sum >/dev/null 2>&1; then
  ACTUAL="$(sha256sum "$TMP_DIR/$ASSET" | awk '{print $1}')"
else
  ACTUAL="$(shasum -a 256 "$TMP_DIR/$ASSET" | awk '{print $1}')"
fi

if [ "$EXPECTED" != "$ACTUAL" ]; then
  echo "Checksum verification failed for $ASSET" >&2
  echo "Expected: $EXPECTED" >&2
  echo "Actual:   $ACTUAL" >&2
  exit 1
fi

mkdir -p "$INSTALL_DIR" "$MANIFEST_DIR"
HOST_PATH="$INSTALL_DIR/plannotator-chrome-native-host"
cp "$TMP_DIR/$ASSET" "$HOST_PATH"
chmod 755 "$HOST_PATH"

MANIFEST_PATH="$MANIFEST_DIR/$HOST_NAME.json"
cat > "$MANIFEST_PATH" <<EOF
{
  "name": "$HOST_NAME",
  "description": "Plannotator clipboard annotation native host",
  "path": "$HOST_PATH",
  "type": "stdio",
  "allowed_origins": [
    "chrome-extension://$EXTENSION_ID/"
  ]
}
EOF

echo "Installed $HOST_NAME native host:"
echo "  Host:      $HOST_PATH"
echo "  Manifest:  $MANIFEST_PATH"
echo "  Browser:   $BROWSER"
echo "  Extension: $EXTENSION_ID"
echo "  Plannotator CLI: $PLANNOTATOR_CANDIDATE"
