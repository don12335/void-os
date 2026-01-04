#!/bin/bash

# Setup WSL Script for building VOID OS ISO
# This script installs the necessary tools to build a custom Debian ISO.

echo ">>> [VOID BUILDER] Installing Dependencies..."

# 1. Update Repositories
sudo apt-get update

# 2. Install Build Tools
# live-build: The official Debian tool for building custom ISOs
# syslinux, isolinux: Bootloader utilities
# squashfs-tools: For compressing the filesystem
# xorriso: For creating the ISO file
sudo apt-get install -y live-build syslinux syslinux-utils isolinux squashfs-tools xorriso

echo ">>> [VOID BUILDER] Dependencies Installed."
echo ">>> You are ready to run build_distro.sh"
