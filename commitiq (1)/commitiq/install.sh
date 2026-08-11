#!/usr/bin/env bash
#
# Installs git-commitiq. Copies the subcommand + its library into
# ~/.commitiq, then - since it's not on your PATH yet the first time -
# asks whether to add it there by editing your shell rc file. Never
# edits anything without asking first.
#
#   bash /path/to/commitiq/install.sh

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
INSTALL_ROOT="$HOME/.commitiq"
BIN_DIR="$INSTALL_ROOT/bin"
LIB_DIR="$INSTALL_ROOT/lib"
UI_DIR="$INSTALL_ROOT/ui"

mkdir -p "$BIN_DIR" "$LIB_DIR" "$UI_DIR"
cp "$SCRIPT_DIR/bin/git-commitiq" "$BIN_DIR/git-commitiq"
chmod +x "$BIN_DIR/git-commitiq"
cp "$SCRIPT_DIR/lib/commitiq_llm.sh" "$LIB_DIR/commitiq_llm.sh"
cp "$SCRIPT_DIR/lib/commitiq_config.sh" "$LIB_DIR/commitiq_config.sh"
chmod +x "$LIB_DIR/commitiq_llm.sh" "$LIB_DIR/commitiq_config.sh"
if [ -d "$SCRIPT_DIR/ui" ]; then
  cp -r "$SCRIPT_DIR/ui/"* "$UI_DIR/"
fi

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
