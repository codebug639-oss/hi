#!/usr/bin/env bash
#
# Installs git-commitiq. Copies the subcommand + its library into
# ~/.commitiq, then - since it's not on your PATH yet the first time -
# asks whether to add it there by editing your shell rc file. Never
# edits anything without asking first.
#
# Two ways to run it:
#
#   From a local checkout:
#     bash /path/to/commitiq/install.sh
#
#   Network one-liner (downloads bin/ and lib/ from GitHub):
#     curl -fsSL https://raw.githubusercontent.com/codebug639-oss/hi/main/install.sh | bash
#
# The script auto-detects: if bin/git-commitiq sits next to it, it uses
# those local files; otherwise it downloads the files from GitHub.
# Point the download at a different repo/ref with:
#     COMMITIQ_REPO=owner/repo COMMITIQ_REF=v1.0 bash .../install.sh

set -euo pipefail

# --- Download source (network mode) -------------------------------------
# Override per-run with env vars (handy for forks and pinned versions):
#   COMMITIQ_REPO=octocat/commitiq
#   COMMITIQ_REF=main | v1.0.0 | <any branch or tag>
COMMITIQ_REPO="${COMMITIQ_REPO:-codebug639-oss/hi}"
COMMITIQ_REF="${COMMITIQ_REF:-main}"
RAW_BASE="https://raw.githubusercontent.com/$COMMITIQ_REPO/$COMMITIQ_REF"
DIST_FILES=( "bin/git-commitiq" "lib/commitiq_llm.sh" "lib/commitiq_config.sh" )

INSTALL_ROOT="$HOME/.commitiq"
BIN_DIR="$INSTALL_ROOT/bin"
LIB_DIR="$INSTALL_ROOT/lib"

mkdir -p "$BIN_DIR" "$LIB_DIR"

# Local checkout? (When piped via `curl ... | bash` there is no local
# copy of bin/, so the script falls through to network mode.)
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd 2>/dev/null || true)"

if [ -f "$SCRIPT_DIR/bin/git-commitiq" ]; then
  echo "[commitiq] installing from local checkout at $SCRIPT_DIR"
  cp "$SCRIPT_DIR/bin/git-commitiq" "$BIN_DIR/git-commitiq"
  cp "$SCRIPT_DIR/lib/commitiq_llm.sh" "$LIB_DIR/commitiq_llm.sh"
  cp "$SCRIPT_DIR/lib/commitiq_config.sh" "$LIB_DIR/commitiq_config.sh"
else
  echo "[commitiq] downloading commitiq from $RAW_BASE ..."
  for f in "${DIST_FILES[@]}"; do
    echo "[commitiq]   fetching $f"
    curl -fsSL "$RAW_BASE/$f" -o "$INSTALL_ROOT/$f" || {
      echo "[commitiq] ERROR: could not download $RAW_BASE/$f" >&2
      echo "[commitiq]        set COMMITIQ_REPO=owner/repo (and COMMITIQ_REF if not main)" >&2
      echo "[commitiq]        e.g. COMMITIQ_REPO=octocat/commitiq curl -fsSL .../install.sh | bash" >&2
      exit 1
    }
    [ -s "$INSTALL_ROOT/$f" ] || {
      echo "[commitiq] ERROR: downloaded $f is empty" >&2
      exit 1
    }
  done
fi

chmod +x "$BIN_DIR/git-commitiq" "$LIB_DIR/commitiq_llm.sh" "$LIB_DIR/commitiq_config.sh"

echo "[commitiq] installed git-commitiq to $BIN_DIR"

case ":$PATH:" in
  *":$BIN_DIR:"*)
    echo "[commitiq] $BIN_DIR is already on PATH — you're all set."
    ;;
  *)
    RC_FILE=""
    case "${SHELL:-}" in
      */zsh) RC_FILE="$HOME/.zshrc" ;;
      */bash) RC_FILE="$HOME/.bashrc" ;;
      *) RC_FILE="$HOME/.profile" ;;
    esac
    LINE="export PATH=\"\$PATH:$BIN_DIR\""
    echo ""
    echo "[commitiq] $BIN_DIR is not on your PATH yet."
    echo "[commitiq] I can add this line to $RC_FILE :"
    echo "  $LINE"
    REPLY="n"
    read -r -p "[commitiq] Add it now? [y/N] " REPLY < /dev/tty || REPLY="n"
    case "$REPLY" in
      y|Y|yes|Yes)
        printf '\n# added by commitiq installer\n%s\n' "$LINE" >> "$RC_FILE"
        echo "[commitiq] added to $RC_FILE — restart your shell (or run 'source $RC_FILE') for it to take effect"
        ;;
      *)
        echo "[commitiq] skipped. Add this yourself when ready:"
        echo "  $LINE"
        ;;
    esac
    ;;
esac

echo ""
echo "[commitiq] next: run 'git commitiq setup' to configure a provider and API key"
