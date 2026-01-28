#!/bin/bash

# jetid-cli installer
# Usage: curl -fsSL https://raw.githubusercontent.com/bsreeram08/jetid-cli/main/install.sh | bash

set -e

REPO="bsreeram08/jetid-cli"
GITHUB_API="https://api.github.com/repos/$REPO/releases/latest"

# Detect OS
OS_NAME=$(uname -s | tr '[:upper:]' '[:lower:]')
case "$OS_NAME" in
  darwin*)  OS="macos-latest" ;;
  linux*)   OS="ubuntu-latest" ;;
  msys*|cygwin*|mingw*) OS="windows-latest" ;;
  *)        echo "Unsupported OS: $OS_NAME"; exit 1 ;;
esac

# Detect Architecture
ARCH_NAME=$(uname -m)
case "$ARCH_NAME" in
  x86_64|amd64) ARCH="x64" ;;
  arm64|aarch64) ARCH="arm64" ;;
  *)            echo "Unsupported architecture: $ARCH_NAME"; exit 1 ;;
esac

# Windows arm64 is not supported in the current workflow
if [ "$OS" = "windows-latest" ] && [ "$ARCH" = "arm64" ]; then
  echo "Windows ARM64 is not supported."
  exit 1
fi

echo "Detecting latest version..."
LATEST_RELEASE=$(curl -s $GITHUB_API)
VERSION=$(echo "$LATEST_RELEASE" | grep '"tag_name":' | sed -E 's/.*"([^"]+)".*/\1/')

if [ -z "$VERSION" ]; then
  echo "Could not find latest version."
  exit 1
fi

echo "Installing jetid $VERSION for $OS-$ARCH..."

# Find the download URL for the matched asset
BINARY_NAME="jetid-$OS-$ARCH"
if [ "$OS" = "windows-latest" ]; then
  BINARY_NAME="$BINARY_NAME.exe"
fi

DOWNLOAD_URL=$(echo "$LATEST_RELEASE" | grep "browser_download_url" | grep "$BINARY_NAME" | head -n 1 | cut -d '"' -f 4)

if [ -z "$DOWNLOAD_URL" ]; then
  echo "Could not find binary for $OS-$ARCH in release $VERSION."
  exit 1
fi

TMP_DIR=$(mktemp -d)
INSTALL_DIR="/usr/local/bin"
TARGET="$INSTALL_DIR/jetid"

# Use sudo if needed
SUDO=""
if [ ! -w "$INSTALL_DIR" ]; then
  SUDO="sudo"
fi

echo "Downloading..."
curl -L "$DOWNLOAD_URL" -o "$TMP_DIR/jetid"

echo "Installing to $TARGET..."
$SUDO mkdir -p "$INSTALL_DIR"
$SUDO mv "$TMP_DIR/jetid" "$TARGET"
$SUDO chmod +x "$TARGET"

rm -rf "$TMP_DIR"

echo "Successfully installed jetid!"
echo "Run 'jetid --help' to get started."
