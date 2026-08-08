## Firebase setup, env vars and security rules

This project uses Firebase Auth and Firestore. Follow these steps to configure and deploy safely.

1. Add environment variables locally (do NOT commit secrets)

Create a `.env.local` with the following keys (values from your Firebase console):

```
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=...
VITE_FIREBASE_PROJECT_ID=...
VITE_FIREBASE_STORAGE_BUCKET=...
VITE_FIREBASE_MESSAGING_SENDER_ID=...
VITE_FIREBASE_APP_ID=...
```

2. Local testing (recommended): Firebase Emulator Suite

- Install `firebase-tools` and start emulators:

```powershell
npm install -g firebase-tools
npx firebase emulators:start --only auth,firestore
```

3. Deploy Firestore rules (production)

Use the Firebase CLI to deploy only rules when ready:

```powershell
firebase deploy --only firestore:rules
```

4. Security notes

- The `firestore.rules` in the repo implements strict defaults: public read for marketing collections and strong restrictions for user data and bookings.
- The rules check for an `admin` custom claim (preferred) or the user's `users/{uid}.role == 'admin'` document field. To grant admin rights securely, set a custom claim from a trusted server or via Firebase Admin SDK.
- Rotate keys if they were ever committed publicly.

5. Next steps

- Wire the dashboard UI to Firestore queries (the codebase contains a `DashboardPage` scaffold).
- Consider adding Cloud Functions for privileged operations (role assignment, scheduled jobs).

## Seeding real catalog data (T2.2)

The catalog of services (`servicios`) and prices (`precios`) is **not** hardcodeado en la app — se lee de Firestore. Para tener datos en el emulador local o en producción, hay un script seed idempotente que pobla las colecciones con los servicios reales del spa canino (Spa Day, Grooming, Guardería, Pensión + 23 tarifas).

### Requisito: `firebase-admin` (solo dev)

El script usa el Admin SDK para saltar las reglas y escribir los docs. **No** está en dependencies — se instala on-demand para mantener limpio el bundle de producción:

```bash
npm install -D firebase-admin
```

### Sembrar el emulador local

Arrancá el emulador de Firestore en una terminal aparte:

```powershell
# Requisito: JDK 21+ en PATH (ver docs/firestore-tests.md si no lo tenés)
npx firebase emulators:start --only firestore
```

En otra terminal, con el emulador ya arriba:

```bash
npm run seed:services -- --emulator
```

Salida esperada: `✅ Done. 27 documents upserted. servicios: 4 · precios: 23`. Idempotente: correrlo de nuevo solo sobreescribe los mismos docs (los IDs son slugs estables), no duplica.

### Sembrar producción

Necesitás un service account JSON del proyecto `hachi-greciaspa` (descargable desde Firebase Console → Project settings → Service accounts → Generate new private key).

```bash
# path directo
npm run seed:services -- /path/to/serviceAccount.json

# o vía env var
FIREBASE_SERVICE_ACCOUNT=/path/to/sa.json npm run seed:services
```

⚠️ **No corras el seed de producción sin verificar antes el contenido** — sobreescribe docs existentes en `servicios` y `precios` con los valores hardcodeados en `tools/seed-services.mjs`. Si el spa agregó o modificó servicios manualmente en la consola, esos cambios se perderán al re-sembrar. Editá el script antes de re-correr.

### Modificar el seed

Editá las constantes `SERVICIOS` y `PRECIOS` al inicio de `tools/seed-services.mjs`. Los IDs son los slugs (e.g. `spa-day-mini-corto`), estables. Agregá ítems nuevos y volvés a correr.
