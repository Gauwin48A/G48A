# MHub Client

Last updated: 2026-02-27

## Stack
- React + Vite
- React Router
- TanStack Query

## Scripts
- `npm run dev`
- `npm test`
- `npm run build`

## Runtime Notes
- On localhost dev, API calls prefer same-origin `/api` (Vite proxy on `8081`) to avoid CORS issues.
- Keep `VITE_FORCE_ABSOLUTE_API_ORIGIN=false` unless you intentionally want direct backend origin calls.
- Default backend proxy target is `http://localhost:5001`.
- Keep route-level code splitting enabled for large screens.

## Validation
- Client tests pass.
- Production build passes.
