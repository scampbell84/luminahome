#!/bin/bash
# ==============================================================================
# Lumina Home - Ultra-Stable Raspberry Pi Kiosk Launcher Script
# ==============================================================================

TARGET_URL="${1:-http://localhost:3000/display}"
LOG_FILE="$HOME/.luminahome-kiosk.log"

# Log all output for easy debugging
exec >> "$LOG_FILE" 2>&1
echo "=========================================================="
echo "🚀 Starting Lumina Home Kiosk: $(date)"
echo "📍 Target URL: $TARGET_URL"
echo "=========================================================="

# Allow desktop session and window manager to finish initializing
sleep 3

# Detect Wayland or X11 environment
if [ -z "$DISPLAY" ]; then
  export DISPLAY=":0"
fi
if [ -z "$WAYLAND_DISPLAY" ] && [ -n "$XDG_RUNTIME_DIR" ] && [ -S "$XDG_RUNTIME_DIR/wayland-0" ]; then
  export WAYLAND_DISPLAY="wayland-0"
fi

echo "🖥️  Display Environment: DISPLAY=$DISPLAY, WAYLAND_DISPLAY=$WAYLAND_DISPLAY"

# Disable screen blanking & power management (works in X11 & XWayland)
xset s noblank 2>/dev/null || true
xset s off 2>/dev/null || true
xset -dpms 2>/dev/null || true

# Hide mouse cursor when inactive (unclutter)
if which unclutter >/dev/null 2>&1; then
  pkill unclutter 2>/dev/null || true
  unclutter -idle 0.5 -root &
fi

# Locate Chromium browser binary (different across 32-bit & 64-bit Pi OS versions)
CHROMIUM_BIN=$(which chromium-browser 2>/dev/null || which chromium 2>/dev/null || which google-chrome 2>/dev/null)
if [ -z "$CHROMIUM_BIN" ]; then
  echo "❌ Error: Neither 'chromium-browser' nor 'chromium' was found!"
  echo "👉 Installing chromium now..."
  sudo apt-get update && sudo apt-get install -y chromium-browser chromium || true
  CHROMIUM_BIN=$(which chromium-browser 2>/dev/null || which chromium 2>/dev/null)
fi

echo "🌐 Browser Binary: $CHROMIUM_BIN"

# Wait for Lumina Home server to respond (up to 45 seconds)
echo "⏳ Waiting for Lumina Home server on port 3000..."
MAX_TRIES=45
COUNT=0
while ! curl -s -f "http://localhost:3000/api/health" >/dev/null 2>&1; do
  sleep 1
  COUNT=$((COUNT + 1))
  if [ $COUNT -ge $MAX_TRIES ]; then
    echo "⚠️ Server took longer than 45s, launching browser anyway..."
    break
  fi
done

# Ensure clean Chromium recovery profile (prevents "Restore pages?" bubble)
mkdir -p ~/.config/chromium/Default 2>/dev/null || true
sed -i 's/"exited_cleanly":false/"exited_cleanly":true/' ~/.config/chromium/Default/Preferences 2>/dev/null || true
sed -i 's/"exit_type":"Crashed"/"exit_type":"Normal"/' ~/.config/chromium/Default/Preferences 2>/dev/null || true

echo "🚀 Launching $CHROMIUM_BIN in fullscreen kiosk mode..."

# Launch Chromium in Kiosk Mode with Raspberry Pi GPU hardware acceleration flags
"$CHROMIUM_BIN" \
  --noerrdialogs \
  --disable-infobars \
  --kiosk \
  --ozone-platform-hint=auto \
  --disable-dev-shm-usage \
  --enable-gpu-rasterization \
  --enable-zero-copy \
  --ignore-gpu-blocklist \
  --enable-native-gpu-memory-buffers \
  --enable-features=VaapiVideoDecoder,OverlayScrollbar,CanvasOopRasterization \
  --canvas-msaa-sample-count=0 \
  --no-first-run \
  --fast \
  --fast-start \
  --disable-features=Translate \
  --check-for-update-interval=31536000 \
  --disable-pinch \
  --overscroll-history-navigation=0 \
  --autoplay-policy=no-user-gesture-required \
  "$TARGET_URL"
