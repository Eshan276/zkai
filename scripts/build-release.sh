#!/usr/bin/env bash
# Build a self-contained zkai.pyz zipapp.
#
# Output: dist/zkai.pyz  (+ dist/zkai-<version>.pyz symlink)
#
# The .pyz bundles all Python dependencies (typer, rich, requests, etc.)
# so the end user needs only Python 3.9+ — no pip, no venv, no sudo.
#
# Usage:
#   bash scripts/build-release.sh            # uses version from pyproject.toml
#   bash scripts/build-release.sh 0.2.0      # override version

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
CLI_DIR="$REPO_ROOT/cli"
DIST_DIR="$REPO_ROOT/dist"
BUILD_TMP="$REPO_ROOT/.build-tmp"

# ── Version ───────────────────────────────────────────────────────────────────
if [ -n "${1:-}" ]; then
  VERSION="$1"
else
  VERSION=$(python3 -c "
import re, sys
txt = open('$CLI_DIR/pyproject.toml').read()
m = re.search(r'version\s*=\s*\"([^\"]+)\"', txt)
print(m.group(1) if m else sys.exit('could not parse version'))
")
fi

echo "Building zkai CLI v${VERSION}..."

# ── Prep ──────────────────────────────────────────────────────────────────────
rm -rf "$BUILD_TMP"
mkdir -p "$BUILD_TMP" "$DIST_DIR"

# ── Pick a Python with pip ────────────────────────────────────────────────────
# Prefer a local venv if one exists next to the repo (dev workflow), then
# fall back to any python3 that has pip.
PYTHON=""
for candidate in \
    "$REPO_ROOT/.venv/bin/python" \
    "$REPO_ROOT/.venv/bin/python3" \
    "$(command -v python3 2>/dev/null)" \
    "$(command -v python  2>/dev/null)"; do
  if [ -x "$candidate" ] && "$candidate" -m pip --version &>/dev/null 2>&1; then
    PYTHON="$candidate"
    break
  fi
done

if [ -z "$PYTHON" ]; then
  # Last resort: bootstrap pip into the venv if ensurepip is available
  if [ -x "$REPO_ROOT/.venv/bin/python" ]; then
    "$REPO_ROOT/.venv/bin/python" -m ensurepip --upgrade --quiet 2>/dev/null || true
    PYTHON="$REPO_ROOT/.venv/bin/python"
  fi
fi

if [ -z "$PYTHON" ] || ! "$PYTHON" -m pip --version &>/dev/null 2>&1; then
  echo "ERROR: could not find a Python with pip. Install pip or activate a venv."
  exit 1
fi
echo "  Using Python: $PYTHON"

# ── Install deps into a flat vendor dir ───────────────────────────────────────
echo "  Installing dependencies into vendor dir..."
"$PYTHON" -m pip install \
  --quiet \
  --target "$BUILD_TMP" \
  --no-compile \
  "$CLI_DIR"

# Remove unnecessary dist-info, __pycache__, tests to keep the binary lean
find "$BUILD_TMP" -type d -name "*.dist-info" -exec rm -rf {} + 2>/dev/null || true
find "$BUILD_TMP" -type d -name "__pycache__"  -exec rm -rf {} + 2>/dev/null || true
find "$BUILD_TMP" -type d -name "tests"         -exec rm -rf {} + 2>/dev/null || true

# ── Write zipapp __main__.py ──────────────────────────────────────────────────
# zipapp needs a top-level __main__.py as the entry point
cat > "$BUILD_TMP/__main__.py" <<'PYEOF'
from zkai_cli.main import app
if __name__ == "__main__":
    app()
PYEOF

# ── Pack into a zipapp ────────────────────────────────────────────────────────
OUT_PYZ="$DIST_DIR/zkai.pyz"
OUT_VERSIONED="$DIST_DIR/zkai-${VERSION}.pyz"

echo "  Packing into $OUT_PYZ ..."
"$PYTHON" -m zipapp \
  "$BUILD_TMP" \
  --output "$OUT_PYZ" \
  --python "/usr/bin/env python3" \
  --compress

cp "$OUT_PYZ" "$OUT_VERSIONED"

# ── Cleanup ───────────────────────────────────────────────────────────────────
rm -rf "$BUILD_TMP"

SIZE=$(du -sh "$OUT_PYZ" | cut -f1)
echo ""
echo "✅  dist/zkai.pyz          ($SIZE)"
echo "    dist/zkai-${VERSION}.pyz"
echo ""
echo "Test it:"
echo "    python3 dist/zkai.pyz --help"
echo ""
echo "Upload dist/zkai-${VERSION}.pyz to a GitHub release, then:"
echo "    curl -fsSL https://raw.githubusercontent.com/Eshan276/zkai/main/install.sh | bash"
