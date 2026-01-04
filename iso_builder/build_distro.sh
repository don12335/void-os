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

# Fix for "Space in Path" and "Wrong Directory" errors:
# We resolve the directory where THIS script resides, then find the project root.
SCRIPT_DIR=$( cd -- "$( dirname -- "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )
ORIGINAL_DIR=$(pwd) # Keep track of where user ran it from
WORK_DIR="/tmp/void-os-build-system"

# Project Root is one level up from iso_builder
VOID_SOURCE_DIR=$(realpath "$SCRIPT_DIR/../")

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
echo "xorg openbox nodejs npm python3 python3-pip git curl pulseaudio firefox-esr fcitx5 fcitx5-chinese-addons network-manager" > config/package-lists/my.list.chroot

# 5. Inject VOID OS Files
echo ">>> [VOID BUILDER] Injecting VOID OS Codebase from $VOID_SOURCE_DIR..."
TARGET_DIR="config/includes.chroot/opt/void-os"
mkdir -p "$TARGET_DIR"

# Copy files
# EXCLUDING JUNK FILES to keep ISO small
rsync -av \
    --exclude 'node_modules' \
    --exclude 'iso_builder' \
    --exclude '.git' \
    --exclude '*.exe' \
    --exclude '*.msi' \
    --exclude '*.dll' \
    --exclude '*.cab' \
    --exclude '*.rar' \
    --exclude '*.zip' \
    --exclude '*.gguf' \
    --exclude '*.bin' \
    --exclude '__pycache__' \
    "$VOID_SOURCE_DIR/" "$TARGET_DIR/"

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

# Start Input Method (Chinese)
export GTK_IM_MODULE=fcitx
export QT_IM_MODULE=fcitx
export XMODIFIERS=@im=fcitx
fcitx5 -d &

# Start VOID OS
cd /opt/void-os
./linux_boot.sh &
EOF

# 6.5. Pre-install dependencies (NPM) during build
# This runs "npm install" INSIDE the ISO during creation, 
# so it works even without internet on first boot.
echo ">>> [VOID BUILDER] Configure Build-Time NPM Install..."
mkdir -p config/hooks/live
cat <<HOOK_EOF > config/hooks/live/install-deps.hook.chroot
#!/bin/bash
echo "Hook: Installing VOID OS dependencies..."
cd /opt/void-os
npm install --production
HOOK_EOF
chmod +x config/hooks/live/install-deps.hook.chroot

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
