#!/usr/bin/env bash
set -euo pipefail

APP_NAME="localdrop"
INSTALL_DIR="/usr/local/bin"
CONFIG_DIR="$HOME/.config/localdrop"
PORT=8080

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
  armv6l) ARCH="armv6" ;;
  i386|i686) ARCH="386" ;;
esac

BIN_URL="https://github.com/Mo7sen007/LocalDrop/releases/latest/download/localdrop_${OS}_${ARCH}.tar.gz"

# Download & install binary
curl -fsSL "$BIN_URL" | tar -xz
chmod +x localdrop
sudo mv localdrop "$INSTALL_DIR"

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
