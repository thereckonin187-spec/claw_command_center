#!/bin/bash
# ═══════════════════════════════════════════════════════════
# COMMAND CENTER — macOS Desktop Dock Shortcut Creator
# Creates a native .app bundle and Launch Agent for auto-start
# ═══════════════════════════════════════════════════════════

set -e

APP_NAME="Command Center"
APP_DIR="/Applications/${APP_NAME}.app"
CONTENTS_DIR="${APP_DIR}/Contents"
MACOS_DIR="${CONTENTS_DIR}/MacOS"
RESOURCES_DIR="${CONTENTS_DIR}/Resources"
PROJECT_DIR="$(cd "$(dirname "$0")" && pwd)"
ICON_SOURCE="${PROJECT_DIR}/public/icon-512.png"
LAUNCH_AGENT_DIR="$HOME/Library/LaunchAgents"
LAUNCH_AGENT_PLIST="${LAUNCH_AGENT_DIR}/com.commandcenter.servers.plist"

echo "═══════════════════════════════════════════"
echo "  COMMAND CENTER — App Bundle Creator"
echo "═══════════════════════════════════════════"
echo ""

# ─── Step 1: Create .app bundle structure ────────────────────
echo "[1/5] Creating app bundle structure..."
mkdir -p "${MACOS_DIR}"
mkdir -p "${RESOURCES_DIR}"

# ─── Step 2: Convert PNG to ICNS ────────────────────────────
echo "[2/5] Converting icon to ICNS format..."
if [ -f "${ICON_SOURCE}" ]; then
  ICONSET_DIR="${RESOURCES_DIR}/AppIcon.iconset"
  mkdir -p "${ICONSET_DIR}"

  sips -z 16 16     "${ICON_SOURCE}" --out "${ICONSET_DIR}/icon_16x16.png"      2>/dev/null
  sips -z 32 32     "${ICON_SOURCE}" --out "${ICONSET_DIR}/icon_16x16@2x.png"   2>/dev/null
  sips -z 32 32     "${ICON_SOURCE}" --out "${ICONSET_DIR}/icon_32x32.png"      2>/dev/null
  sips -z 64 64     "${ICON_SOURCE}" --out "${ICONSET_DIR}/icon_32x32@2x.png"   2>/dev/null
  sips -z 128 128   "${ICON_SOURCE}" --out "${ICONSET_DIR}/icon_128x128.png"    2>/dev/null
  sips -z 256 256   "${ICON_SOURCE}" --out "${ICONSET_DIR}/icon_128x128@2x.png" 2>/dev/null
  sips -z 256 256   "${ICON_SOURCE}" --out "${ICONSET_DIR}/icon_256x256.png"    2>/dev/null
  sips -z 512 512   "${ICON_SOURCE}" --out "${ICONSET_DIR}/icon_256x256@2x.png" 2>/dev/null
  sips -z 512 512   "${ICON_SOURCE}" --out "${ICONSET_DIR}/icon_512x512.png"    2>/dev/null
  cp "${ICON_SOURCE}" "${ICONSET_DIR}/icon_512x512@2x.png"

  iconutil -c icns "${ICONSET_DIR}" -o "${RESOURCES_DIR}/AppIcon.icns" 2>/dev/null || echo "  Warning: iconutil failed, using PNG fallback"
  rm -rf "${ICONSET_DIR}"
  echo "  Icon converted successfully."
else
  echo "  Warning: icon-512.png not found, skipping icon."
fi

# ─── Step 3: Create launcher script ─────────────────────────
echo "[3/5] Creating launcher script..."
cat > "${MACOS_DIR}/launcher" << 'LAUNCHER'
#!/bin/bash
PROJECT_DIR="$(cd "$(dirname "$0")/../../.." && pwd)"

# Start voice_server.py if not running
if ! pgrep -f "voice_server.py" > /dev/null 2>&1; then
  if [ -f "${PROJECT_DIR}/voice_server.py" ]; then
    cd "${PROJECT_DIR}" && python3 voice_server.py &
    sleep 1
  fi
fi

# Start telegram_bot.py if not running
if ! pgrep -f "telegram_bot.py" > /dev/null 2>&1; then
  if [ -f "${PROJECT_DIR}/telegram_bot.py" ]; then
    cd "${PROJECT_DIR}" && python3 telegram_bot.py &
    sleep 1
  fi
fi

# Open in Chrome app mode if available, otherwise Safari
if [ -d "/Applications/Google Chrome.app" ]; then
  open -a "Google Chrome" --args --app=http://localhost:3000
elif [ -d "/Applications/Chromium.app" ]; then
  open -a "Chromium" --args --app=http://localhost:3000
else
  open http://localhost:3000
fi
LAUNCHER
chmod +x "${MACOS_DIR}/launcher"

# ─── Step 4: Create Info.plist ───────────────────────────────
echo "[4/5] Creating Info.plist..."
cat > "${CONTENTS_DIR}/Info.plist" << PLIST
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>CFBundleName</key>
    <string>${APP_NAME}</string>
    <key>CFBundleDisplayName</key>
    <string>${APP_NAME}</string>
    <key>CFBundleIdentifier</key>
    <string>com.commandcenter.app</string>
    <key>CFBundleVersion</key>
    <string>3.0</string>
    <key>CFBundleExecutable</key>
    <string>launcher</string>
    <key>CFBundleIconFile</key>
    <string>AppIcon</string>
    <key>CFBundlePackageType</key>
    <string>APPL</string>
    <key>LSMinimumSystemVersion</key>
    <string>10.15</string>
    <key>NSHighResolutionCapable</key>
    <true/>
</dict>
</plist>
PLIST

# ─── Step 5: Create Launch Agent ────────────────────────────
echo "[5/5] Creating Launch Agent for auto-start..."
mkdir -p "${LAUNCH_AGENT_DIR}"
cat > "${LAUNCH_AGENT_PLIST}" << AGENT
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>com.commandcenter.servers</string>
    <key>ProgramArguments</key>
    <array>
        <string>/bin/bash</string>
        <string>-c</string>
        <string>cd ${PROJECT_DIR} &amp;&amp; python3 voice_server.py &amp; python3 telegram_bot.py &amp; wait</string>
    </array>
    <key>RunAtLoad</key>
    <true/>
    <key>KeepAlive</key>
    <false/>
    <key>StandardOutPath</key>
    <string>${PROJECT_DIR}/logs/server_stdout.log</string>
    <key>StandardErrorPath</key>
    <string>${PROJECT_DIR}/logs/server_stderr.log</string>
    <key>WorkingDirectory</key>
    <string>${PROJECT_DIR}</string>
</dict>
</plist>
AGENT

# Create logs directory
mkdir -p "${PROJECT_DIR}/logs"

# Load the launch agent
launchctl load "${LAUNCH_AGENT_PLIST}" 2>/dev/null || true

echo ""
echo "═══════════════════════════════════════════"
echo "  INSTALLATION COMPLETE"
echo "═══════════════════════════════════════════"
echo ""
echo "  App:          ${APP_DIR}"
echo "  Launch Agent: ${LAUNCH_AGENT_PLIST}"
echo ""
echo "  The app is now in /Applications."
echo "  Drag it to your Dock for quick access."
echo "  Servers will auto-start on login."
echo ""
echo "  To uninstall:"
echo "    rm -rf '${APP_DIR}'"
echo "    launchctl unload '${LAUNCH_AGENT_PLIST}'"
echo "    rm '${LAUNCH_AGENT_PLIST}'"
echo ""
