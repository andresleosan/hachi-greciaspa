# Hachi & Grecia Spa — Repo guide

## Stack
React 19 + TypeScript 6 + Vite 8 + Tailwind CSS 4 + React Router 7 + Firebase (Auth, Firestore, Storage) + Zustand + React Hook Form + date-fns.

## Key commands
| Command | Purpose |
|---|---|
| `npm run dev` | Dev server (Vite) |
| `npm run build` | Prod build |
| `npm run preview` | Preview prod build |
| `npm run set-admin` | Grant admin role (runs `tools/set-admin.js`) |
| `npm run rules:test` | Firestore rules tests |
| `npx firebase emulators:start --only auth,firestore` | Local Firebase emulators |

## Routes (react-router-dom)
`/` (Inicio), `/inicio` (LandingNueva — versión actualizada con precios reales), `/servicios`, `/precios`, `/equipo`, `/galeria`, `/contacto`, `/login`, `/register`, `/dashboard`. See `src/App.tsx`.

## Architecture
- **Styling**: CSS custom properties in `src/styles/maqueta.css` (`:root` tokens). Tailwind utilities layered on top. Do NOT use inline styles.
- **Auth**: Firebase Auth + Firestore `users/{uid}` doc for role checks. Roles: `client` (default), `admin`.
- **Firebase env vars**: `import.meta.env.VITE_FIREBASE_*` from `.env.local`. See `.env.example`.
- **Emulator**: Set `VITE_USE_FIREBASE_EMULATOR=true` to connect local emulators (auth:9099, firestore:8080, storage:9199).
- **Protected routes**: Wrap in `<ProtectedRoute>` component (redirects to `/login` if unauthenticated).
- **Admin UI**: Dashboard shows `AdminPrices` component when `profile.role === 'admin'`.
- **HTML mockups**: `src/app/pages/*.html` — design references, not wired into the app.
- **Standalone HTML**: `src/dashboard/Dashboard.html` — separate file, not a React component.

## Firebase
- `.firebaserc` `default` is a placeholder — update to real project ID before deploy.
- `firebase.json` configures emulator ports and Firestore rules.
- `firestore.rules` enforces strict access: public reads for marketing, user-owned writes, admin-only for sensitive collections.

## Notable
- Registration auto-creates a Firestore user doc with `role: 'client'`. There is no /register -> /dashboard redirect (must /login after register).
- The Inicio page references "Roma Norte, CDMX" — verify location consistency with the real business.
