#!/usr/bin/env bash
set -euo pipefail

APP_NAME="localdrop"
INSTALL_DIR="/usr/local/bin"
CONFIG_DIR="$HOME/.config/localdrop"
PORT=8080
REPO="Mo7sen007/LocalDrop"

echo "Installing $APP_NAME..."

# Detect OS + ARCH
OS=$(uname | tr '[:upper:]' '[:lower:]')
ARCH=$(uname -m)

case "$ARCH" in
  x86_64) ARCH="amd64" ;;
  amd64) ARCH="amd64" ;;
  aarch64) ARCH="arm64" ;;
  arm64) ARCH="arm64" ;;
  armv7l) ARCH="armv7" ;;
  armv6l) echo "Unsupported architecture: armv6l (only armv7 is published)"; exit 1 ;;
  i386|i686) ARCH="386" ;;
  *) echo "Unsupported architecture: $ARCH"; exit 1 ;;
esac

case "$OS" in
  linux|darwin) ;;
  *) echo "Unsupported OS: $OS"; exit 1 ;;
esac

ARCHIVE="localdrop_${OS}_${ARCH}.tar.gz"
BIN_URL="https://github.com/${REPO}/releases/latest/download/${ARCHIVE}"

# Download & install binary
TMP_DIR=$(mktemp -d)
trap 'rm -rf "$TMP_DIR"' EXIT

if ! curl -fL "$BIN_URL" -o "$TMP_DIR/$ARCHIVE"; then
  echo "Failed to download $ARCHIVE from latest release"
  echo "URL: $BIN_URL"
  echo "Check release assets at: https://github.com/${REPO}/releases/latest"
  exit 1
fi

tar -xzf "$TMP_DIR/$ARCHIVE" -C "$TMP_DIR"
chmod +x "$TMP_DIR/localdrop"
sudo mv "$TMP_DIR/localdrop" "$INSTALL_DIR"

# Config directory
mkdir -p "$CONFIG_DIR"

# setup env 
if [ ! -f "$CONFIG_DIR/.env" ]; then
  echo "Creating .env file"

  if command -v openssl >/dev/null 2>&1; then
    SESSION_SECRET=$(openssl rand -hex 32)
  else
    SESSION_SECRET=$(LC_ALL=C tr -dc 'A-Za-z0-9' </dev/urandom | head -c 64)
  fi

  cat > "$CONFIG_DIR/.env" <<EOF
SESSION_SECRET=${SESSION_SECRET}
SESSION_COOKIE_SECURE=false
GIN_MODE=release
EOF
fi

# Open port (best-effort)
if command -v ufw >/dev/null 2>&1; then
  echo "Allowing port $PORT (ufw)"
  sudo ufw allow "$PORT"
fi

echo "✔ Installed $APP_NAME"

echo ""
echo "Next: initializing app"
localdrop init
