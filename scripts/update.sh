#!/bin/bash
# ==============================================================================
# Lumina Home - Automated Update Script
# Updates repository, dependencies, rebuilds, and restarts the system service
# ==============================================================================

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$SCRIPT_DIR"

echo "🔄 Updating Lumina Home in $SCRIPT_DIR..."

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
