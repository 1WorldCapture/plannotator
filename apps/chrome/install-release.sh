#!/usr/bin/env sh
set -eu

DEFAULT_REPO="1WorldCapture/plannotator"

usage() {
  code="${1:-1}"
  cat >&2 <<'EOF'
Usage: install-chrome.sh [options]

Options:
  --version <tag>          Install a specific GitHub release tag. Defaults to latest.
  --extension-id <id>      Chrome extension ID to allow. Defaults to the GitHub Release extension ID.
  --browser <name>         chrome, chrome-for-testing, chromium, arc, edge, brave, vivaldi, tge, or all. Default: chrome.
  --repo <owner/repo>      GitHub repository to download from. Default: 1WorldCapture/plannotator.
  -h, --help               Show this help.

Examples:
  curl -fsSL https://github.com/1WorldCapture/plannotator/releases/latest/download/install-chrome.sh | bash
  curl -fsSL https://github.com/1WorldCapture/plannotator/releases/latest/download/install-chrome.sh | bash -s -- --version chrome-v0.1.0
EOF
  exit "$code"
}

VERSION=""
EXTENSION_ID="${PLANNOTATOR_CHROME_EXTENSION_ID:-}"
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

if [ -n "${PLANNOTATOR_CHROME_BASE_URL:-}" ]; then
  BASE_URL="$PLANNOTATOR_CHROME_BASE_URL"
elif [ -n "$VERSION" ]; then
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
  download_url="$1"
  download_output="$2"
  curl -fsSL "$download_url" -o "$download_output"
}

verify_checksum() {
  file="$1"
  checksum_file="$2"
  expected="$(awk '{print $1}' "$checksum_file")"
  if command -v sha256sum >/dev/null 2>&1; then
    actual="$(sha256sum "$file" | awk '{print $1}')"
  elif command -v shasum >/dev/null 2>&1; then
    actual="$(shasum -a 256 "$file" | awk '{print $1}')"
  else
    echo "Neither sha256sum nor shasum is available for checksum verification." >&2
    exit 1
  fi

  if [ "$expected" != "$actual" ]; then
    echo "Checksum verification failed for $(basename "$file")" >&2
    echo "Expected: $expected" >&2
    echo "Actual:   $actual" >&2
    exit 1
  fi
}

fetch_installer() {
  name="$1"
  installer_path="$TMP_DIR/$name"
  download "$BASE_URL/$name" "$installer_path"
  download "$BASE_URL/$name.sha256" "$installer_path.sha256"
  verify_checksum "$installer_path" "$installer_path.sha256"
  chmod 755 "$installer_path"
}

echo "Installing ClipMark Chrome workflow from $REPO..."
fetch_installer install-chrome-extension.sh
fetch_installer install-chrome-native-host.sh

set -- --repo "$REPO"
if [ -n "$VERSION" ]; then
  set -- "$@" --version "$VERSION"
fi
sh "$TMP_DIR/install-chrome-extension.sh" "$@"

set -- --repo "$REPO" --browser "$BROWSER"
if [ -n "$VERSION" ]; then
  set -- "$@" --version "$VERSION"
fi
if [ -n "$EXTENSION_ID" ]; then
  set -- "$@" --extension-id "$EXTENSION_ID"
fi
sh "$TMP_DIR/install-chrome-native-host.sh" "$@"

echo ""
echo "ClipMark Chrome workflow installed."
echo "Chrome and Edge still require manually loading the unpacked extension."
