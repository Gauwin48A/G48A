# Network Reliability Runbook

## Canonical Local Ports
- Frontend (Vite): `http://localhost:8081`
- Backend API + Socket.IO: `http://localhost:5001`

## Startup Order
1. Start backend:
   - `cd server`
   - `npm install`
   - `npm start`
2. Start frontend:
   - `cd client`
   - `npm install`
   - `npm run dev`

## Required Environment Values
- `client/.env`:
  - `VITE_API_BASE_URL=http://localhost:5001`
  - `VITE_SOCKET_URL=http://localhost:5001` (optional; defaults to API origin)
- `server/.env`:
  - `PORT=5001` (or keep default)
  - `CLIENT_URL=http://localhost:8081`
  - `CORS_ORIGINS=http://localhost:8081`

## Reliability Controls (Current)
- Bootstrap preflight checks backend health before app mount.
- Runtime API origin override (`window.__MHUB_API_ORIGIN_OVERRIDE__`) pins all API/socket calls to the verified backend.
- Socket client has bounded reconnect attempts and connect timeout.
- Shared API client refreshes auth and normalizes network/CORS error messages.
- CI blocks hardcoded localhost API/socket URLs in `client/src`.

## Troubleshooting 404/CORS/Socket Issues
1. Check backend health:
   - `curl http://localhost:5001/api/health`
2. Check categories route:
   - `curl http://localhost:5001/api/categories`
3. Check for-you route:
   - `curl "http://localhost:5001/api/posts/for-you?page=1&limit=6"`
4. Check Socket.IO endpoint:
   - `curl "http://localhost:5001/socket.io/?EIO=4&transport=polling"`
5. If frontend shows "Backend unavailable":
   - Verify backend process is running.
   - Verify backend port matches `VITE_API_BASE_URL`.
   - Verify CORS allows `http://localhost:8081`.

## Regression Gates
- `npm run check:no-hardcoded-localhost`
- `npm run check:network-contract`
- `cd ../server && npm run check:route-contract`
- `cd ../server && npm run check:runtime-contract`
- `npm run test`
- `npm run build`
