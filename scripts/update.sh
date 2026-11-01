#!/bin/bash
# ==============================================================================
# Lumina Home - Automated Update Script
# Updates repository, dependencies, rebuilds, and restarts the system service
# Note: User configurations (Reward Chart, custom tasks, star banks, schedules)
# are stored in ~/.luminahome/config.json and mirrored to data/config.json.
# ==============================================================================

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$SCRIPT_DIR"

echo "🔄 Updating Lumina Home in $SCRIPT_DIR..."

# 1. Pre-update safety snapshot of user settings
BACKUP_TMP="/tmp/luminahome-preupdate-$(date +%s).json"
if [ -f "$HOME/.luminahome/config.json" ]; then
  cp "$HOME/.luminahome/config.json" "$BACKUP_TMP" 2>/dev/null || true
  cp "$HOME/.luminahome/config.json" "/tmp/kioskboard-config.bak.json" 2>/dev/null || true
elif [ -f "/home/pi/.luminahome/config.json" ]; then
  cp "/home/pi/.luminahome/config.json" "$BACKUP_TMP" 2>/dev/null || true
  cp "/home/pi/.luminahome/config.json" "/tmp/kioskboard-config.bak.json" 2>/dev/null || true
elif [ -f "data/config.json" ]; then
  cp "data/config.json" "$BACKUP_TMP" 2>/dev/null || true
  cp "data/config.json" "/tmp/kioskboard-config.bak.json" 2>/dev/null || true
fi

if [ -f "$BACKUP_TMP" ]; then
  echo "🛡️  Backed up existing user settings to $BACKUP_TMP"
fi

if [ -d ".git" ]; then
  echo "📥 Pulling latest updates from GitHub..."
  # Stash any local uncommitted script modifications
  git stash push -m "auto-stash-before-update-$(date +%s)" 2>/dev/null || true
  git fetch origin main || git fetch origin
  git reset --hard origin/main || git pull --rebase origin main || git pull origin main
fi

echo "📦 Installing application dependencies..."
npm install

echo "🏗️ Building application..."
npm run build

# 2. Verify / restore configuration files if needed
if [ -f "$BACKUP_TMP" ]; then
  mkdir -p "$HOME/.luminahome" 2>/dev/null || true
  mkdir -p "data" 2>/dev/null || true

  # Ensure destination files exist and are not empty
  if [ ! -s "$HOME/.luminahome/config.json" ]; then
    cp "$BACKUP_TMP" "$HOME/.luminahome/config.json" 2>/dev/null || true
  fi
  if [ ! -s "data/config.json" ]; then
    cp "$BACKUP_TMP" "data/config.json" 2>/dev/null || true
  fi
  if [ -d "/home/pi/.luminahome" ] && [ ! -s "/home/pi/.luminahome/config.json" ]; then
    cp "$BACKUP_TMP" "/home/pi/.luminahome/config.json" 2>/dev/null || true
  fi
  echo "✅ Configuration integrity verified."
fi

if command -v systemctl >/dev/null 2>&1; then
  if systemctl is-active --quiet luminahome; then
    echo "🔄 Restarting luminahome.service..."
    sudo systemctl restart luminahome
  elif systemctl is-active --quiet kioskboard; then
    echo "🔄 Restarting kioskboard.service..."
    sudo systemctl restart kioskboard
  fi
elif command -v pm2 >/dev/null 2>&1; then
  pm2 restart luminahome || pm2 restart kioskboard || true
fi

echo "✅ Lumina Home updated successfully!"

