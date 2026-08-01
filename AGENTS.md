# Hachi & Grecia Spa — Repo guide

## Stack
React 19 + TypeScript 6 + Vite 8 + Tailwind CSS 4 + React Router 7 + Firebase (Auth, Firestore, App Check) + date-fns.

## Key commands
| Command | Purpose |
|---|---|
| `npm run dev` | Dev server (Vite) |
| `npm run build` | Prod build |
| `npm run preview` | Preview prod build |
| `npm run set-admin` | Grant admin role (runs `tools/set-admin.js`) |
| `npm run seed:services` | Seed Firestore with spa services and prices |
| `npm run rules:test` | Firestore rules tests (35 cases, JDK 21) |
| `npx firebase emulators:start --only auth,firestore` | Local Firebase emulators |

## Routes (react-router-dom)
`/` (LandingNueva), `/servicios`, `/precios`, `/equipo`, `/galeria`, `/contacto`, `/reservar`, `/login`, `/register`, `/dashboard`. See `src/App.tsx`.

## Architecture
- **Styling**: CSS custom properties in `src/styles/maqueta.css` (`:root` tokens). Tailwind utilities layered on top. Do NOT use inline styles.
- **Auth**: Firebase Auth + Firestore `users/{uid}` doc for role checks. Roles: `client` (default), `admin`.
- **Firebase env vars**: `import.meta.env.VITE_FIREBASE_*` from `.env.local`. See `.env.example`.
- **Emulator**: Set `VITE_USE_FIREBASE_EMULATOR=true` to connect local emulators (auth:9099, firestore:8080).
- **Protected routes**: Wrap in `<ProtectedRoute>` component (redirects to `/login` if unauthenticated).
- **Admin UI**: Dashboard shows `AdminPrices` component when `profile.role === 'admin'`.
- **App Check**: reCAPTCHA v3 rate limiting via `VITE_FIREBASE_APP_CHECK_SITE_KEY`.

## Firebase
- `.firebaserc` `default` is a placeholder — update to real project ID before deploy.
- `firebase.json` configures emulator ports and Firestore rules.
- `firestore.rules` enforces strict access: public reads for marketing, user-owned writes, admin-only for sensitive collections, contact form allows anonymous create.

## Collections
- `users/{uid}` — user profiles (role: client|admin)
- `servicios/{id}` — service catalog (public read)
- `precios/{id}` — price catalog (public read, admin write)
- `reservas/{id}` — bookings (owner read, admin all)
- `mensajes/{id}` — contact form messages (anonymous create, admin read)
- `empleados/{id}` — staff data (admin only)

## Notable
- Registration creates Firestore user doc with `role: 'client'`, redirects to `/login`.
- Reservation flow: `/reservar` → select service → date/time → submit (validates no double-booking).
- Contact form persists to `mensajes` collection (guest or authenticated).
- Gallery uses static paths in root (`/tl.png`, `/tr.png`, etc.) — not Cloud Storage.
