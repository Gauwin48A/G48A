#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."

echo "═══════════════════════════════════════════════════"
echo "  MHub — Launch for Android Testing"
echo "═══════════════════════════════════════════════════"

# Step 1: Restart Docker containers with fresh config
echo ""
echo "▸ Restarting Docker containers..."
docker compose down 2>/dev/null || true
sleep 2
docker compose up -d --build server
echo "  Waiting for server to be healthy..."
for i in $(seq 1 30); do
  if curl -sf http://localhost:5001/health > /dev/null 2>&1; then
    echo "  ✓ Server healthy!"
    break
  fi
  sleep 2
  if [ "$i" = "30" ]; then
    echo "  ✗ Server failed to start. Logs:"
    docker logs mhub-server-1 --tail 20
    exit 1
  fi
done

# Step 2: Make ports public
echo ""
echo "▸ Making ports public for external access..."
CODESPACE_NAME="${CODESPACE_NAME:-}"
if [ -n "$CODESPACE_NAME" ]; then
  gh codespace ports visibility 5001:public -c "$CODESPACE_NAME" 2>/dev/null && echo "  ✓ Port 5001 → Public" || echo "  ⚠ Could not set port 5001 public (set manually in PORTS tab)"
  gh codespace ports visibility 9000:public -c "$CODESPACE_NAME" 2>/dev/null && echo "  ✓ Port 9000 → Public" || echo "  ⚠ Could not set port 9000 public (set manually in PORTS tab)"
else
  echo "  ⚠ CODESPACE_NAME not set. Please make ports Public manually:"
  echo "    → Open PORTS tab → Right-click port 5001 → Port Visibility → Public"
  echo "    → Open PORTS tab → Right-click port 9000 → Port Visibility → Public"
fi

# Step 3: Serve APK
echo ""
echo "▸ Setting up APK server on port 9000..."
APK_PATH="/workspaces/Mhub/android-native/app/build/outputs/apk/debug/app-debug.apk"
APK_DIR="/tmp/apk-serve"
mkdir -p "$APK_DIR"
if [ -f "$APK_PATH" ]; then
  cp "$APK_PATH" "$APK_DIR/mhub.apk"
elif [ -f "$APK_DIR/mhub.apk" ]; then
  echo "  Using existing APK at $APK_DIR/mhub.apk"
else
  echo "  ⚠ No APK found. Build first with: cd android-native && ./gradlew assembleDebug"
fi

# Kill any existing server on 9000
lsof -ti:9000 2>/dev/null | xargs kill -9 2>/dev/null || true
if [ -f "$APK_DIR/mhub.apk" ]; then
  cd "$APK_DIR"
  nohup python3 -m http.server 9000 > /dev/null 2>&1 &
  echo "  ✓ APK server running on port 9000"
fi

# Step 4: Status summary
echo ""
echo "═══════════════════════════════════════════════════"
echo "  Status Check"
echo "═══════════════════════════════════════════════════"
echo ""
docker ps --format 'table {{.Names}}\t{{.Status}}\t{{.Ports}}'
echo ""

API_URL="https://${CODESPACE_NAME}-5001.app.github.dev"
APK_URL="https://${CODESPACE_NAME}-9000.app.github.dev/mhub.apk"

echo "▸ API URL:  $API_URL"
echo "▸ APK URL:  $APK_URL"
echo ""
echo "▸ Health check:"
curl -s http://localhost:5001/api/health | head -1
echo ""
echo ""
echo "═══════════════════════════════════════════════════"
echo "  IMPORTANT: Make sure ports are PUBLIC!"
echo "  In VS Code → PORTS tab → Right-click → Public"
echo "  Ports needed: 5001, 9000"
echo "═══════════════════════════════════════════════════"
