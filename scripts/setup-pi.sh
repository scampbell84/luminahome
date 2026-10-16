#!/bin/bash
# ==============================================================================
# KioskBoard - Automated Raspberry Pi Kiosk Setup Script
# Run this once on your Raspberry Pi:
# bash scripts/setup-pi.sh http://<YOUR-PC-IP>:3000/display
# ==============================================================================

set -e

DISPLAY_URL="${1:-http://localhost:3000/display}"

echo "========================================================"
echo " Setting up Raspberry Pi Kiosk for KioskBoard"
echo " Target Display URL: $DISPLAY_URL"
echo "========================================================"

# 1. Install prerequisites
echo "[1/4] Installing unclutter & x11 tools..."
sudo apt-get update -y
sudo apt-get install -y unclutter x11-xserver-utils

# 2. Configure autostart for LXDE-pi
echo "[2/4] Configuring LXDE autostart..."
AUTOSTART_DIR="$HOME/.config/lxsession/LXDE-pi"
mkdir -p "$AUTOSTART_DIR"

cat <<EOF > "$AUTOSTART_DIR/autostart"
@xset s off
@xset -dpms
@xset s noblank
@unclutter -idle 0.5 -root
@sed -i 's/"exited_cleanly":false/"exited_cleanly":true/' ~/.config/chromium/Default/Preferences
@sed -i 's/"exit_type":"Crashed"/"exit_type":"Normal"/' ~/.config/chromium/Default/Preferences
@chromium-browser --noerrdialogs --disable-infobars --kiosk --window-size=1920,1200 --window-position=0,0 --check-for-update-interval=31536000 --disable-pinch --overscroll-history-navigation=0 "$DISPLAY_URL"
EOF

# 3. Create standalone launcher
echo "[3/4] Creating launcher in ~/.config/kioskboard-launch.sh..."
cat <<EOF > "$HOME/.config/kioskboard-launch.sh"
#!/bin/bash
xset s off
xset -dpms
xset s noblank
unclutter -idle 0.5 -root &
chromium-browser --noerrdialogs --disable-infobars --kiosk --window-size=1920,1200 --window-position=0,0 "$DISPLAY_URL"
EOF
chmod +x "$HOME/.config/kioskboard-launch.sh"

echo "[4/4] Setup complete!"
echo "Reboot your Raspberry Pi or test now with:"
echo "bash ~/.config/kioskboard-launch.sh"
echo "========================================================"
