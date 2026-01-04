#!/bin/bash

# Project Sarcophagus: VOID OS ISO Builder
# Generates a bootable "Kiosk" Linux ISO running VOID OS.

# Configuration
DISTRO_NAME="void-os"
ARCH="amd64"
DEBIAN_VERSION="bookworm"
# Configuration
DISTRO_NAME="void-os"
ARCH="amd64"
DEBIAN_VERSION="bookworm"

# Fix for "Space in Path" error:
# live-build fails if the current path has spaces.
# We will build in /tmp (safe path) and copy the ISO back.
ORIGINAL_DIR=$(pwd)
WORK_DIR="/tmp/void-os-build-system"
# Resolve absolute path to source to act as source for rsync
VOID_SOURCE_DIR=$(realpath "$ORIGINAL_DIR/../")

echo ">>> [VOID BUILDER] Initializing Project Sarcophagus..."
echo ">>> [VOID BUILDER] Working in $WORK_DIR to avoid path spaces..."

# 1. Prepare Workspace
if [ -d "$WORK_DIR" ]; then
    echo ">>> Cleaning old temp workspace..."
    sudo rm -rf "$WORK_DIR"
fi
mkdir -p "$WORK_DIR"
cd "$WORK_DIR"

# 2. Clean previous builds
lb clean

# 3. Configure Live Build
echo ">>> [VOID BUILDER] Configuring ISO Metadata..."
lb config \
    --binary-images iso-hybrid \
    --distribution $DEBIAN_VERSION \
    --architectures $ARCH \
    --linux-flavours generic \
    --archive-areas "main contrib non-free-firmware" \
    --bootappend-live "boot=live components quiet splash shutdown=1" \
    --iso-volume "VOID_OS_LIVE"

# 4. Package Selection
echo ">>> [VOID BUILDER] Selecting Packages..."
echo "xorg openbox nodejs npm python3 python3-pip git curl pulseaudio" > config/package-lists/my.list.chroot

# 5. Inject VOID OS Files
echo ">>> [VOID BUILDER] Injecting VOID OS Codebase from $VOID_SOURCE_DIR..."
TARGET_DIR="config/includes.chroot/opt/void-os"
mkdir -p "$TARGET_DIR"

# Copy files
rsync -av --exclude 'node_modules' --exclude 'iso_builder' --exclude '.git' "$VOID_SOURCE_DIR/" "$TARGET_DIR/"

# 6. Configure Autostart (Kiosk Mode)
echo ">>> [VOID BUILDER] Configuring Kiosk Autostart..."
mkdir -p config/includes.chroot/etc/xdg/openbox
cat <<EOF > config/includes.chroot/etc/xdg/openbox/autostart
# Disable screen saver
xset s off
xset -dpms
xset s noblank

# Start Audio
pulseaudio --start

# Start VOID OS
cd /opt/void-os
./linux_boot.sh &
EOF

# 7. Build the ISO
echo ">>> [VOID BUILDER] STARTING BUILD PROCESS (This may take a while)..."
sudo lb build

echo ">>> [VOID BUILDER] Build Complete!"
if [ -f "live-image-amd64.hybrid.iso" ]; then
    # Copy back to safe location (quoted to handle spaces)
    cp live-image-amd64.hybrid.iso "$ORIGINAL_DIR/../$DISTRO_NAME.iso"
    echo "========================================================"
    echo "SUCCESS: ISO Generated at:"
    echo "$ORIGINAL_DIR/../$DISTRO_NAME.iso"
    echo "========================================================"
else
    echo ">>> ERROR: ISO file not found inside $WORK_DIR. Check build logs."
fi
