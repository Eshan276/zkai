#!/usr/bin/env bash
# ZKai provider CLI — one-line installer
#
# Usage:
#   curl -fsSL https://raw.githubusercontent.com/your-org/zkai/main/install.sh | bash
#
# What this does:
#   1. Downloads zkai.pyz (self-contained Python zipapp — no pip/venv needed)
#   2. Places it at ~/.local/bin/zkai
#   3. Makes it executable
#
# Requirements: Python 3.9+, curl or wget

set -euo pipefail

GITHUB_ORG="Eshan276"
GITHUB_REPO="zkai"
VERSION="${ZKAI_VERSION:-latest}"
INSTALL_DIR="${ZKAI_INSTALL_DIR:-$HOME/.local/bin}"
BIN_NAME="zkai"

# Colours
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; BOLD='\033[1m'; RESET='\033[0m'

echo ""
echo -e "${BOLD}╔══════════════════════════════════════╗${RESET}"
echo -e "${BOLD}║      ZKai Provider CLI Installer     ║${RESET}"
echo -e "${BOLD}╚══════════════════════════════════════╝${RESET}"
echo ""

# ── Python check ──────────────────────────────────────────────────────────────
if ! command -v python3 &>/dev/null; then
  echo -e "${RED}✗  python3 not found.${RESET} Install Python 3.9+ and re-run."
  exit 1
fi

PY_VER=$(python3 -c "import sys; print(f'{sys.version_info.major}.{sys.version_info.minor}')")
PY_MAJ=$(echo "$PY_VER" | cut -d. -f1)
PY_MIN=$(echo "$PY_VER" | cut -d. -f2)
if [ "$PY_MAJ" -lt 3 ] || { [ "$PY_MAJ" -eq 3 ] && [ "$PY_MIN" -lt 9 ]; }; then
  echo -e "${RED}✗  Python $PY_VER found, but 3.9+ required.${RESET}"
  exit 1
fi
echo -e "${GREEN}✓${RESET}  Python $PY_VER"

# ── Resolve version ───────────────────────────────────────────────────────────
BASE_URL="https://github.com/${GITHUB_ORG}/${GITHUB_REPO}/releases"

if [ "$VERSION" = "latest" ]; then
  echo "  Fetching latest release..."
  if command -v curl &>/dev/null; then
    VERSION=$(curl -fsSL "${BASE_URL}/latest" | grep -oP '(?<=tag/v)[0-9]+\.[0-9]+\.[0-9]+' | head -1)
  elif command -v wget &>/dev/null; then
    VERSION=$(wget -qO- "${BASE_URL}/latest" | grep -oP '(?<=tag/v)[0-9]+\.[0-9]+\.[0-9]+' | head -1)
  else
    echo -e "${RED}✗  Neither curl nor wget found.${RESET}"
    exit 1
  fi
  if [ -z "$VERSION" ]; then
    echo -e "${RED}✗  Could not determine latest version.${RESET}"
    exit 1
  fi
fi

PYZ_URL="${BASE_URL}/download/v${VERSION}/zkai-${VERSION}.pyz"
echo -e "  Version: ${BOLD}${VERSION}${RESET}"
echo -e "  URL:     ${PYZ_URL}"

# ── Download ──────────────────────────────────────────────────────────────────
TMP_FILE=$(mktemp /tmp/zkai-XXXXXX.pyz)
trap 'rm -f "$TMP_FILE"' EXIT

echo ""
echo "  Downloading zkai-${VERSION}.pyz..."
if command -v curl &>/dev/null; then
  curl -fsSL --progress-bar "$PYZ_URL" -o "$TMP_FILE"
elif command -v wget &>/dev/null; then
  wget -q --show-progress "$PYZ_URL" -O "$TMP_FILE"
fi

# ── Sanity check (zipapp starts with PK magic bytes or shebang) ───────────────
if ! python3 "$TMP_FILE" --help &>/dev/null; then
  echo -e "${RED}✗  Downloaded file failed self-test.${RESET} The release may be corrupt."
  exit 1
fi

# ── Install ───────────────────────────────────────────────────────────────────
mkdir -p "$INSTALL_DIR"
DEST="$INSTALL_DIR/$BIN_NAME"
mv "$TMP_FILE" "$DEST"
chmod +x "$DEST"
trap - EXIT  # don't delete — we moved it

echo ""
echo -e "${GREEN}✅  zkai v${VERSION} installed to ${DEST}${RESET}"
echo ""

# ── PATH check ────────────────────────────────────────────────────────────────
if ! command -v zkai &>/dev/null; then
  echo -e "${YELLOW}⚠  $INSTALL_DIR is not on your PATH.${RESET}"
  echo ""
  echo "  Add it now:"
  echo -e "    ${BOLD}export PATH=\"\$HOME/.local/bin:\$PATH\"${RESET}"
  echo ""
  echo "  To persist, add the line above to ~/.bashrc or ~/.zshrc."
  echo ""
fi

echo "  Get started:"
echo -e "    ${BOLD}zkai --help${RESET}"
echo -e "    ${BOLD}zkai init${RESET}       Run first-time setup wizard"
echo ""
