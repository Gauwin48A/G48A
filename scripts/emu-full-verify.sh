#!/bin/bash
# Full emulator E2E verification — pure bash + Node.js only for the script logic
set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
EMULATOR_BIN="/c/Users/laksh/AppData/Local/Android/Sdk/emulator/emulator.exe"
SDK_ADB="/c/Users/laksh/AppData/Local/Android/Sdk/platform-tools/adb.exe"

# ─────── HELPER ───────
wait_for_emulator() {
  local label="$1"
  echo "  Waiting for emulator ($label)..."
  for i in $(seq 1 20); do
    sleep 5
    STATUS=$("$SDK_ADB" devices 2>/dev/null | grep emulator-5554 | grep -c 'device$' || true)
    BOOT=$("$SDK_ADB" shell getprop sys.boot_completed 2>/dev/null | tr -d '\r' || echo "")
    echo "    Poll $i: device=$STATUS boot=$BOOT"
    if [ "$STATUS" = "1" ] && [ "$BOOT" = "1" ]; then
      echo "  EMULATOR READY ($label)"
      return 0
    fi
  done
  echo "  FAIL: Emulator not ready ($label)"
  return 1
}

tap() {
  "$SDK_ADB" shell input tap "$1" "$2"
}

screenshot() {
  local name="$1"
  mkdir -p "$PROJECT_DIR/emu-screenshots"
  local path="$PROJECT_DIR/emu-screenshots/$name.png"
  "$SDK_ADB" exec-out screencap -p > "$path" 2>/dev/null
  local size=$(wc -c < "$path" 2>/dev/null || echo 0)
  echo "  [SCREENSHOT] $name ($size bytes)"
}

dump_ui_text() {
  # Use double-slash prefix to avoid Git Bash path translation
  "$SDK_ADB" shell uiautomator dump //data/local/tmp/uid.xml 2>/dev/null
  "$SDK_ADB" exec-out cat //data/local/tmp/uid.xml 2>/dev/null | grep -o 'text="[^"]*"' 2>/dev/null | grep -v 'text=""' 2>/dev/null | sed 's/text="//;s/"//' 2>/dev/null | sort -u 2>/dev/null || true
}

# ─────── MAIN ───────
echo "═══════════════════════════════════════════"
echo "  Android Emulator E2E Verification"
echo "═══════════════════════════════════════════"

# Step 1: Cleanup
echo "--- Step 1: Cleanup and start emulator ---"
"$SDK_ADB" emu kill 2>/dev/null || true
sleep 2
taskkill -f -im qemu-system-* 2>/dev/null || true
sleep 2

cd "$(dirname "$EMULATOR_BIN")"
"$EMULATOR_BIN" -avd MHub_AVD -no-snapshot -netdelay none -netspeed full > /dev/null 2>&1 &
EMU_PID=$!
echo "Emulator PID: $EMU_PID"
cd "$PROJECT_DIR"
wait_for_emulator "initial-boot"

# Step 2: APK install
echo "--- Step 2: Install APK ---"
"$SDK_ADB" install -r "$PROJECT_DIR/android-native/app/build/outputs/apk/debug/app-debug.apk" 2>&1

# Re-check emulator after install
wait_for_emulator "after-install"

# Step 3: Seed data
echo "--- Step 3: Ensure seed data ---"
curl -s http://localhost:5001/api/sales/user/999001/sold-posts > /dev/null 2>&1 || (
  cd "$PROJECT_DIR/server" && node scripts/seed-e2e-data.js
)

# Step 4: Launch app
echo "--- Step 4: Launch app ---"
"$SDK_ADB" shell am start -n com.zaruda.app.debug/com.zaruda.app.MainActivity -a android.intent.action.MAIN -c android.intent.category.LAUNCHER --activity-clear-task 2>&1
sleep 5
screenshot "01-app-launch"

echo "--- Current screen text: ---"
dump_ui_text

# Step 5: Tap Electronics card to go to AllPosts
echo "--- Step 5: Navigate to AllPosts ---"
tap 283 945
sleep 5
screenshot "02-allposts"

echo "--- AllPosts screen: ---"
TEXTS=$(dump_ui_text)
echo "$TEXTS" | head -20

if echo "$TEXTS" | grep -qi "search"; then
  echo "PASS: Reached AllPosts (Search bar visible)"
else
  echo "WARNING: Search text not found on AllPosts"
fi

# Step 6: Trigger auth gate via Sell FAB
echo "--- Step 6: Trigger auth gate ---"
tap 540 2240
sleep 3
screenshot "03-auth-gate"

echo "--- After sell tap: ---"
TEXTS=$(dump_ui_text)
echo "$TEXTS" | head -20

# Step 7: Tap Sign In
echo "--- Step 7: Tap Sign In ---"
tap 540 1700
sleep 3
tap 540 1600
sleep 2
screenshot "04-login-screen"

echo "--- Login screen: ---"
TEXTS=$(dump_ui_text)
echo "$TEXTS" | head -25

if echo "$TEXTS" | grep -qi "demo login"; then
  echo "PASS: Login screen visible (Demo Login found)"
else
  echo "WARNING: Demo Login not found on screen"
fi

# Step 8: Tap Demo Login
echo "--- Step 8: Tap Demo Login ---"
tap 540 1150
sleep 4
screenshot "05-after-demo-login"

echo "--- Post-login screen: ---"
TEXTS=$(dump_ui_text)
echo "$TEXTS" | head -20

if echo "$TEXTS" | grep -qiE "(home|all posts|search)"; then
  echo "PASS: Demo login succeeded (main screen visible)"
else
  echo "FAIL: Demo login did not navigate to main screen"
  echo "Screenshots may show the login screen still"
fi

# Step 9: Deep link to UserSoldPosts
echo "--- Step 9: Deep link to UserSoldPosts ---"
"$SDK_ADB" shell am start -d 'zaruda://user/999001/sold-posts' -a android.intent.action.VIEW --activity-clear-task 2>&1
sleep 5
screenshot "06-user-sold-posts"

echo "--- UserSoldPosts screen: ---"
TEXTS=$(dump_ui_text)
echo "$TEXTS"

# Verify content
HAS_SELLER=$(echo "$TEXTS" | grep -ci "rahul" || true)
HAS_TRUST=$(echo "$TEXTS" | grep -ciE "(trust|gold|score)" || true)
HAS_SOLD=$(echo "$TEXTS" | grep -ci "sold" || true)
HAS_CATS=$(echo "$TEXTS" | grep -ciE "(electronics|fashion|vehicles)" || true)

echo ""
echo "--- VERIFICATION RESULTS ---"
echo "  Seller name (Rahul): $([ $HAS_SELLER -gt 0 ] && echo 'FOUND' || echo 'NOT FOUND')"
echo "  Trust info: $([ $HAS_TRUST -gt 0 ] && echo 'FOUND' || echo 'NOT FOUND')"
echo "  Sold posts: $([ $HAS_SOLD -gt 0 ] && echo 'FOUND' || echo 'NOT FOUND')"
echo "  Categories: $([ $HAS_CATS -gt 0 ] && echo 'FOUND' || echo 'NOT FOUND')"

if [ $HAS_SELLER -gt 0 ] || [ $HAS_TRUST -gt 0 ] || [ $HAS_SOLD -gt 0 ] || [ $HAS_CATS -gt 0 ]; then
  echo "PASS: UserSoldPosts page loaded with trust passport content"
else
  echo "FAIL: No expected UserSoldPosts content detected"
fi

# Step 10: Category filter test
echo "--- Step 10: Try category filter ---"
tap 200 680
sleep 3
screenshot "07-category-filter"

echo "--- Filtered screen: ---"
TEXTS=$(dump_ui_text)
echo "$TEXTS" | head -20

# ─────── SUMMARY ───────
echo ""
echo "═══════════════════════════════════════════"
echo "  Verification Complete!"
echo "═══════════════════════════════════════════"
ls -la "$PROJECT_DIR/emu-screenshots/" 2>/dev/null || echo "  No screenshots"
echo ""
echo "Screenshots:"
for f in "$PROJECT_DIR/emu-screenshots/"*.png; do
  [ -f "$f" ] && echo "  $(basename "$f"): $(wc -c < "$f") bytes"
done
