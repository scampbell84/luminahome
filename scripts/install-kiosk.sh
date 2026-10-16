#!/bin/bash
# ==============================================================================
# KioskBoard - Automated Raspberry Pi 4/5 Installer
# Run: bash scripts/install-kiosk.sh
# ==============================================================================
set -e

echo "=========================================================="
echo "🚀 Installing Lumina Home on Raspberry Pi..."
echo "=========================================================="

INSTALL_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

# Detect real desktop user even if script is executed with sudo
if [ -n "$SUDO_USER" ] && [ "$SUDO_USER" != "root" ]; then
  ACTUAL_USER="$SUDO_USER"
  ACTUAL_HOME=$(getent passwd "$SUDO_USER" | cut -d: -f6)
else
  ACTUAL_USER="${USER:-pi}"
  ACTUAL_HOME="${HOME:-/home/$ACTUAL_USER}"
fi

echo "👤 Configuring for desktop user: $ACTUAL_USER (Home: $ACTUAL_HOME)"
echo "📂 Application directory: $INSTALL_DIR"

# 1. Install prerequisites (Node.js 20 LTS, git, unclutter, curl, jq, chromium)
echo "📦 Installing system dependencies and Chromium..."
sudo apt-get update
sudo apt-get install -y curl git unclutter jq x11-xserver-utils chromium-browser chromium

if ! command -v node >/dev/null 2>&1 || [ "$(node -v | cut -d'.' -f1 | tr -d 'v')" -lt 20 ]; then
  echo "📦 Installing Node.js 20 LTS..."
  curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
  sudo apt-get install -y nodejs
fi

echo "✅ Node.js $(node -v) installed."

# 2. Setup systemd service for 24/7 background operation (Lumina Home)
echo "⚙️  Configuring background systemd service (luminahome.service)..."
sudo bash -c "cat > /etc/systemd/system/luminahome.service" <<EOF
[Unit]
Description=Lumina Home Smart Wall Display
After=network.target

[Service]
Type=simple
User=$ACTUAL_USER
WorkingDirectory=$INSTALL_DIR
Environment=NODE_ENV=production
Environment=PORT=3000
Environment=PATH=/usr/local/bin:/usr/bin:/bin:$INSTALL_DIR/node_modules/.bin
ExecStart=$(which npm) start
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
Alias=kioskboard.service
EOF

# Ensure backward compatibility link
sudo ln -sf /etc/systemd/system/luminahome.service /etc/systemd/system/kioskboard.service

# 3. Configure passwordless restart for in-app one-click updates
echo "🔑 Enabling passwordless service restart for In-App Updates..."
sudo bash -c "cat > /etc/sudoers.d/luminahome" <<EOF
$ACTUAL_USER ALL=(ALL) NOPASSWD: /bin/systemctl restart luminahome, /bin/systemctl stop luminahome, /bin/systemctl start luminahome, /bin/systemctl restart kioskboard, /bin/systemctl stop kioskboard, /bin/systemctl start kioskboard
EOF
sudo chmod 0440 /etc/sudoers.d/luminahome

# 3b. Optimize Raspberry Pi Swap memory (prevents OOM browser crashes)
echo "🧠 Checking swap memory..."
if [ -f /etc/dphys-swapfile ]; then
  CURRENT_SWAP=$(grep -E "^CONF_SWAPSIZE=" /etc/dphys-swapfile | cut -d'=' -f2 | tr -d ' ' || echo "100")
  if [ -n "$CURRENT_SWAP" ] && [ "$CURRENT_SWAP" -lt 1024 ]; then
    echo "⚡ Increasing swap size from ${CURRENT_SWAP}MB to 1024MB for browser stability..."
    sudo dphys-swapfile swapoff || true
    sudo sed -i 's/^CONF_SWAPSIZE=.*/CONF_SWAPSIZE=1024/' /etc/dphys-swapfile
    sudo dphys-swapfile setup || true
    sudo dphys-swapfile swapon || true
    echo "✅ Swap memory configured to 1024MB."
  fi
fi

# 4. Configure Universal Autostart on boot (Labwc, Wayfire, and LXDE)
echo "🖥️  Configuring fullscreen kiosk autostart on boot..."
chmod +x "$INSTALL_DIR/scripts/kiosk-launch.sh"

# A. Labwc autostart (Raspberry Pi OS Bookworm default)
mkdir -p "$ACTUAL_HOME/.config/labwc"
if [ ! -f "$ACTUAL_HOME/.config/labwc/autostart" ]; then
  cat > "$ACTUAL_HOME/.config/labwc/autostart" << 'EOF'
#!/bin/bash
[ -f /etc/xdg/labwc/autostart ] && /bin/bash /etc/xdg/labwc/autostart &
EOF
fi
if ! grep -q "kiosk-launch.sh" "$ACTUAL_HOME/.config/labwc/autostart"; then
  echo "/bin/bash $INSTALL_DIR/scripts/kiosk-launch.sh &" >> "$ACTUAL_HOME/.config/labwc/autostart"
fi
chmod +x "$ACTUAL_HOME/.config/labwc/autostart"

# B. Universal User XDG Autostart (.desktop file)
mkdir -p "$ACTUAL_HOME/.config/autostart"
cat > "$ACTUAL_HOME/.config/autostart/luminahome.desktop" <<EOF
[Desktop Entry]
Type=Application
Name=Lumina Home Display
Comment=Fullscreen Kiosk Wall Display
Exec=/bin/bash $INSTALL_DIR/scripts/kiosk-launch.sh
Terminal=false
Hidden=false
X-GNOME-Autostart-enabled=true
EOF

# C. System-wide XDG Autostart (Guarantees launch on any desktop session)
sudo mkdir -p /etc/xdg/autostart
sudo bash -c "cat > /etc/xdg/autostart/luminahome.desktop" <<EOF
[Desktop Entry]
Type=Application
Name=Lumina Home Display
Comment=Fullscreen Kiosk Wall Display
Exec=/bin/bash $INSTALL_DIR/scripts/kiosk-launch.sh
Terminal=false
Hidden=false
X-GNOME-Autostart-enabled=true
EOF

# D. Wayfire autostart (Early Bookworm)
if [ -f "$ACTUAL_HOME/.config/wayfire.ini" ] || [ -d "$ACTUAL_HOME/.config/wayfire" ]; then
  if ! grep -q "kiosk-launch.sh" "$ACTUAL_HOME/.config/wayfire.ini" 2>/dev/null; then
    cat >> "$ACTUAL_HOME/.config/wayfire.ini" <<EOF

[autostart]
luminahome = /bin/bash $INSTALL_DIR/scripts/kiosk-launch.sh
screensaver = false
dpms = false
EOF
  fi
fi

# E. LXDE autostart (Raspberry Pi OS Bullseye)
mkdir -p "$ACTUAL_HOME/.config/lxsession/LXDE-pi"
if ! grep -q "kiosk-launch.sh" "$ACTUAL_HOME/.config/lxsession/LXDE-pi/autostart" 2>/dev/null; then
  cat >> "$ACTUAL_HOME/.config/lxsession/LXDE-pi/autostart" <<EOF
@/bin/bash $INSTALL_DIR/scripts/kiosk-launch.sh
EOF
fi

# Ensure user owns their config files
sudo chown -R "$ACTUAL_USER:$ACTUAL_USER" "$ACTUAL_HOME/.config" 2>/dev/null || true

# 5. Build and launch
cd "$INSTALL_DIR"
echo "🔨 Building Lumina Home application..."
npm install --legacy-peer-deps
npm run build
sudo systemctl daemon-reload
sudo systemctl enable --now luminahome

echo "=========================================================="
echo "✅ Lumina Home successfully installed and running!"
echo "📺 Display Screen : http://localhost:3000/display"
echo "⚙️  Admin Settings : http://localhost:3000/admin"
echo "=========================================================="
