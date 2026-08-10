#!/usr/bin/env bash
# Usage: walk.sh <name> <x> <y> [sleep_seconds]
set -u
NAME="$1"; X="$2"; Y="$3"; SLEEP="${4:-4}"
OUT=../analysis/issue-walk
mkdir -p "$OUT"

adb shell input tap "$X" "$Y"
sleep "$SLEEP"
adb exec-out screencap -p > "$OUT/$NAME.png"
cd "$(dirname "$0")"
node uidump.js > "$OUT/$NAME.txt" 2>&1
echo "--- saved $OUT/$NAME.png + txt ---"
