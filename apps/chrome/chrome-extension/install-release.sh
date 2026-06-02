#!/usr/bin/env sh
set -eu

DEFAULT_REPO="1WorldCapture/plannotator"
RELEASE_EXTENSION_ID="hoblepbiofcahbbaobbfhhfhiihdekan"
INSTALL_DIR="${PLANNOTATOR_CHROME_EXTENSION_DIR:-$HOME/.local/share/plannotator/chrome-extension}"

usage() {
  code="${1:-1}"
  cat >&2 <<'EOF'
Usage: install-chrome-extension.sh [options]

Options:
  --version <tag>          Install a specific GitHub release tag. Defaults to latest.
  --repo <owner/repo>      GitHub repository to download from. Default: 1WorldCapture/plannotator.
  -h, --help               Show this help.

Examples:
  curl -fsSL https://github.com/1WorldCapture/plannotator/releases/latest/download/install-chrome-extension.sh | bash
  curl -fsSL https://github.com/1WorldCapture/plannotator/releases/latest/download/install-chrome-extension.sh | bash -s -- --version chrome-v0.1.0
EOF
  exit "$code"
}

VERSION=""
REPO="${PLANNOTATOR_CHROME_REPO:-$DEFAULT_REPO}"

while [ "$#" -gt 0 ]; do
  case "$1" in
    --version)
      [ "$#" -ge 2 ] || usage
      VERSION="$2"
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

echo "Downloading ClipMark extension from $REPO..."

ZIP="$TMP_DIR/clipmark-extension.zip"
curl -fsSL "$BASE_URL/clipmark-extension.zip" -o "$ZIP"
curl -fsSL "$BASE_URL/clipmark-extension.zip.sha256" -o "$ZIP.sha256"

EXPECTED="$(awk '{print $1}' "$ZIP.sha256")"
if command -v sha256sum >/dev/null 2>&1; then
  ACTUAL="$(sha256sum "$ZIP" | awk '{print $1}')"
else
  ACTUAL="$(shasum -a 256 "$ZIP" | awk '{print $1}')"
fi

if [ "$EXPECTED" != "$ACTUAL" ]; then
  echo "Checksum verification failed for clipmark-extension.zip" >&2
  echo "Expected: $EXPECTED" >&2
  echo "Actual:   $ACTUAL" >&2
  exit 1
fi

rm -rf "$INSTALL_DIR"
mkdir -p "$INSTALL_DIR"
unzip -qo "$ZIP" -d "$INSTALL_DIR"

echo ""
echo "ClipMark extension installed to:"
echo "  $INSTALL_DIR"
echo "Release extension ID:"
echo "  $RELEASE_EXTENSION_ID"
echo ""
echo "To load in Chrome:"
echo "  1. Open chrome://extensions"
echo "  2. Enable 'Developer mode' (toggle top right)"
echo "  3. Click 'Load unpacked'"
echo "  4. Select: $INSTALL_DIR"
echo ""
echo "To load in Edge:"
echo "  1. Open edge://extensions"
echo "  2. Enable 'Developer mode'"
echo "  3. Click 'Load unpacked'"
echo "  4. Select: $INSTALL_DIR"
