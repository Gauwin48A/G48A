#!/usr/bin/env bash
set -e
cd /workspaces/Mhub

echo "=== Step 1: Create server/.env ==="
if [ ! -f server/.env ]; then
  cp server/.env.example server/.env
  sed -i 's/your_password_here/mhub_dev_pass/g' server/.env
  sed -i 's|replace_with_random_min_32_chars_access_secret|mhub_jwt_dev_secret_replace_in_prod_32chr|g' server/.env
  sed -i 's|replace_with_random_min_32_chars_refresh_secret|mhub_ref_dev_secret_replace_in_prod_32chr|g' server/.env
  sed -i 's|your_refresh_secret_key_min_32_chars|mhub_ref_dev_secret_replace_in_prod_32chr|g' server/.env
  {
    echo 'DB_HOST=postgres'
    echo 'DB_USER=mhub'
    echo 'DB_PASSWORD=mhub_dev_pass'
    echo 'DB_NAME=mhub'
    echo 'REDIS_URL=redis://redis:6379'
    echo 'DATABASE_URL=postgres://mhub:mhub_dev_pass@postgres:5432/mhub'
    echo 'NODE_ENV=development'
    echo 'TRUST_PROXY=1'
  } >> server/.env
  echo "server/.env created."
else
  echo "server/.env already exists."
fi

echo ""
echo "=== Step 2: Create root .env for docker-compose ==="
if [ ! -f .env ]; then
  {
    echo 'POSTGRES_PASSWORD=mhub_dev_pass'
    echo 'POSTGRES_USER=mhub'
    echo 'POSTGRES_DB=mhub'
  } > .env
  echo "Root .env created."
else
  echo "Root .env already exists."
fi

echo ""
echo "=== Step 3: Start backend stack ==="
docker compose up -d --build
echo "Waiting 20s for services to fully start..."
sleep 20

echo ""
echo "=== Step 4: Health check ==="
for i in 1 2 3 4 5; do
  if curl -sf http://localhost:5001/api/health > /dev/null 2>&1; then
    echo "✅ Backend is healthy at http://localhost:5001"
    break
  fi
  echo "Attempt $i — waiting 10s..."
  sleep 10
done

echo ""
echo "=== Step 5: API URL ==="
echo "Using: https://ideal-xylophone-77v6x7w9g6whpr6v-5001.app.github.dev/"
echo "local.properties already written."
API_URL="https://ideal-xylophone-77v6x7w9g6whpr6v-5001.app.github.dev/"

echo ""
echo "=== Step 7: Build debug APK ==="
cd /workspaces/Mhub/android-native
./gradlew :app:assembleDebug --no-configuration-cache -q
echo "✅ APK built:"
ls -lh app/build/outputs/apk/debug/app-debug.apk

echo ""
echo "=== Step 8: Serve APK for download ==="
mkdir -p /tmp/apk-serve
cp app/build/outputs/apk/debug/app-debug.apk /tmp/apk-serve/mhub.apk
cd /tmp/apk-serve

if [ -n "$CODESPACE_NAME" ]; then
  APK_URL="https://${CODESPACE_NAME}-9000.app.github.dev/mhub.apk"
else
  APK_URL="http://localhost:9000/mhub.apk"
fi

echo ""
echo "========================================================"
echo "  MHub is live!"
echo ""
echo "  Web app:  http://localhost:8081  (if client dev server running)"
echo "  API:      $API_URL"
echo "  APK URL:  $APK_URL"
echo ""
echo "  ACTION NEEDED:"
echo "  1. Open PORTS tab in VS Code"
echo "  2. Set port 5001 visibility to 'Public'"
echo "  3. Set port 9000 visibility to 'Public'"
echo "  4. Open $APK_URL on your Android phone to download & install"
echo "  5. Enable 'Install from unknown sources' on the phone"
echo "========================================================"
echo ""
python3 -m http.server 9000
