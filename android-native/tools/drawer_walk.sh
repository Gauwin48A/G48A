#!/usr/bin/env bash
# Walk More-drawer screens: open drawer -> tap item -> dump -> back -> repeat.
set -u
OUT=../analysis/issue-walk
mkdir -p "$OUT"
cd "$(dirname "$0")"

items=(
  "Sell|375|315"
  "Plans|390|508"
  "SaleDone|425|701"
  "SaleUndone|445|894"
  "Messages|425|1250"
  "Feedback|420|1443"
  "Complaints|435|1636"
  "Settings|285|2031"
)

for item in "${items[@]}"; do
  name="${item%%|*}"
  x="$(echo "$item" | cut -d'|' -f2)"
  y="$(echo "$item" | cut -d'|' -f3)"
  # ensure we're on a tab screen with bottom bar
  adb shell input tap 990 2321   # More
  sleep 3
  adb shell input tap "$x" "$y"
  sleep 5
  node uidump.js > "$OUT/drawer_$name.txt" 2>&1
  adb exec-out screencap -p > "$OUT/drawer_$name.png"
  echo "=== $name captured ==="
  adb shell input keyevent 4
  sleep 2
  adb shell input keyevent 4
  sleep 2
done
echo DRAWER_WALK_DONE
