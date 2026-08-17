#!/bin/bash
# Full login-flow E2E — verifies user_sessions columns (token_hash, device_fingerprint,
# is_active, last_activity) added by migration 052 + fix_user_sessions_user_id_type.
cd /c/Users/laksh/GITHUB/1hub_rep2/G48A/server || exit 1
API=http://localhost:5001/api

TS()  { node -e "process.stdout.write(String(Date.now()))"; }
NONCE() { node -e "process.stdout.write(require('crypto').randomBytes(12).toString('hex'))"; }
JAR=/tmp/_authjar.txt
rm -f $JAR

PASS=0; FAIL=0
check() { # $1=name $2=expected $3=actual
  if echo "$3" | grep -q "$2"; then echo "  PASS: $1"; PASS=$((PASS+1));
  else echo "  FAIL: $1 => $3"; FAIL=$((FAIL+1)); fi
}

DEVICE_HDRS=(-H "X-Device-Fingerprint: auth-e2e-fp-001" -H "X-Device-Id: auth-e2e-fp-001")

echo "=== step 0: CSRF bootstrap ==="
CSRF_BODY=$(curl -s -c $JAR "$API/auth/csrf-token" "${DEVICE_HDRS[@]}")
CSRF_TOKEN=$(echo "$CSRF_BODY" | grep -oE '"csrfToken":"[^"]+"' | sed 's/.*:"\(.*\)"/\1/')
COOKIE=$(grep 'XSRF-TOKEN' $JAR | awk '{print $6"="$7}' | head -1)
echo "csrf: ${CSRF_TOKEN:0:16}... cookie: ${COOKIE:0:20}..."

mut() { # $1=method $2=path $3=body
  curl -s -X "$1" "$API$2" -c $JAR -b $JAR "${DEVICE_HDRS[@]}" \
    -H "Content-Type: application/json" -H "X-MHub-Timestamp: $(TS)" -H "X-MHub-Nonce: $(NONCE)" \
    -H "Cookie: $COOKIE" -H "X-XSRF-TOKEN: $CSRF_TOKEN" -d "$3"
}

echo "=== step 1: SIGNUP (creates a session row) ==="
SUFFIX=$(node -e "process.stdout.write(String(Date.now()).slice(-9))")
PHONE="9${SUFFIX}"
EMAIL="auth.e2e.${SUFFIX}@example.com"
PASSWORD="StrongPass123!A"
echo "EMAIL=$EMAIL PHONE=$PHONE"
R=$(mut POST "/auth/signup" "{\"fullName\":\"Auth E2E User\",\"email\":\"$EMAIL\",\"phone\":\"$PHONE\",\"password\":\"$PASSWORD\"}")
check "signup 201" '"success":true' "$R"
USERID=$(echo "$R" | grep -oE '"id":"[0-9a-f-]{36}"' | head -1 | sed 's/.*:"\(.*\)"/\1/')
echo "USERID=$USERID"
SIGNUP_TOKEN=$(echo "$R" | grep -oE '"token":"[^"]+"' | head -1 | sed 's/.*:"\(.*\)"/\1/')

if [ -n "$USERID" ]; then
echo "=== step 2: user_sessions row written by signup ==="
ROW=$(docker exec g48a-postgres-1 psql -U mhub -d mhub -t -A -c \
  "SELECT token_hash IS NOT NULL, device_fingerprint IS NOT NULL, is_active, last_activity IS NOT NULL FROM user_sessions WHERE user_id='$USERID' ORDER BY created_at DESC LIMIT 1" 2>&1)
echo "row: $ROW"
check "session has token_hash" 't' "$(echo "$ROW" | cut -d'|' -f1)"
check "session has device_fingerprint" 't' "$(echo "$ROW" | cut -d'|' -f2)"
check "session is_active" 't' "$(echo "$ROW" | cut -d'|' -f3)"
check "session has last_activity" 't' "$(echo "$ROW" | cut -d'|' -f4)"
else
  echo "  SKIP step 2 (no user created)"
fi

echo "=== step 3: LOGIN (password) ==="
R=$(mut POST "/auth/login" "{\"email\":\"$EMAIL\",\"password\":\"$PASSWORD\"}")
check "login 200" '"success":true' "$R"
LOGIN_TOKEN=$(echo "$R" | grep -oE '"token":"[^"]+"' | head -1 | sed 's/.*:"\(.*\)"/\1/')
REFRESH_TOKEN=$(echo "$R" | grep -oE '"refreshToken":"[^"]+"' | head -1 | sed 's/.*:"\(.*\)"/\1/')
echo "token: ${LOGIN_TOKEN:0:20}... refresh: ${REFRESH_TOKEN:0:20}..."

echo "=== step 3.5: users.last_login + last_login_ip written by login ==="
ROW3=$(docker exec g48a-postgres-1 psql -U mhub -d mhub -t -A -c \
  "SELECT last_login IS NOT NULL, last_login_ip IS NOT NULL FROM users WHERE user_id='$USERID'" 2>&1)
check "last_login written" 't' "$(echo "$ROW3" | cut -d'|' -f1)"
check "last_login_ip written" 't' "$(echo "$ROW3" | cut -d'|' -f2)"

echo "=== step 4: GET /me with bearer ==="
R=$(curl -s "$API/auth/me" -H "Authorization: Bearer $LOGIN_TOKEN" "${DEVICE_HDRS[@]}")
check "me returns id" "$USERID" "$R"

echo "=== step 5: GET /auth/session ==="
R=$(curl -s "$API/auth/session" -H "Authorization: Bearer $LOGIN_TOKEN" "${DEVICE_HDRS[@]}")
check "session status" 'authenticated' "$R"

echo "=== step 6: REFRESH rotation (updates token_hash + last_activity) ==="
R=$(mut POST "/auth/refresh-token" "{\"refreshToken\":\"$REFRESH_TOKEN\"}")
check "refresh 200" '"token":' "$R"

echo "=== step 7: session still active after refresh ==="
ROW2=$(docker exec g48a-postgres-1 psql -U mhub -d mhub -t -A -c \
  "SELECT is_active FROM user_sessions WHERE user_id='$USERID' ORDER BY created_at DESC LIMIT 1" 2>&1)
check "session active after refresh" 't' "$ROW2"

echo "=== step 8: LOGOUT ==="
R=$(mut POST "/auth/logout" '{}')
check "logout success" 'Logged out\|success' "$R"

echo "=== cleanup ==="
if [ -n "$USERID" ]; then
  docker exec g48a-postgres-1 psql -U mhub -d mhub -q -c "
    DELETE FROM profiles WHERE user_id='$USERID';
    DELETE FROM user_sessions WHERE user_id='$USERID';
    DELETE FROM auth_activity_log WHERE user_id='$USERID';
    DELETE FROM device_bindings WHERE user_id='$USERID';
    DELETE FROM user_risk_states WHERE user_id='$USERID';
    DELETE FROM risk_decision_events WHERE user_id='$USERID';
    DELETE FROM coin_transactions WHERE user_id='$USERID';
    DELETE FROM users WHERE user_id='$USERID';
  " 2>&1 | head -1
  echo "cleaned user $USERID"
fi
rm -f $JAR

echo ""
echo "=========================================="
echo "AUTH E2E RESULT: PASS=$PASS FAIL=$FAIL"
echo "=========================================="
