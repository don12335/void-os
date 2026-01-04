#!/bin/bash

# VOID OS Linux Boot Script
echo "Initializing VOID OS..."

# Ensure we are in the correct directory
cd "$(dirname "$0")"

# 1. Start X Server (if not running) - simplified for testing
# In a real kiosk mode, this would be handled by .xinitrc
# export DISPLAY=:0

# 2. Install dependencies if needed (first run only)
if [ ! -d "node_modules" ]; then
    echo "First time setup: Installing NodeJS dependencies..."
    npm install
fi

# --- OTA SYSTEM UPDATE ---
echo ">>> [VOID UPDATE] Checking for interstellar frequencies (Internet)..."
# Ping Google DNS to check connection
if ping -c 1 8.8.8.8 &> /dev/null; then
    echo ">>> Connection Established. Syncing with The Oracle..."
    
    # 1. Stash any local changes (e.g. logs) to avoid conflicts
    git stash
    
    # 2. Force pull latest code from GitHub
    # (Requires the repo to be set up correctly in the VM)
    git pull origin main
    
    if [ $? -eq 0 ]; then
        echo ">>> [VOID UPDATE] System Updated Successfully."
        # Re-install dependencies in case package.json changed
        npm install
    else
        echo ">>> [VOID UPDATE] Update Failed. Continuing with current version."
    fi
else
    echo ">>> No Connection. Running in Offline Mode."
fi
# -------------------------

# 3. Check for Python dependencies
# (Assumes python3-pip is installed)
# pip3 install -r requirements.txt

# 4. Launch Application
# 4. Launch Application
echo "Starting Electron..."
# Use strict compatibility flags (disable GPU) for VM/ISO stability
./node_modules/.bin/electron . --no-sandbox --disable-gpu --disable-software-rasterizer > /tmp/void-os.log 2>&1 || xterm
