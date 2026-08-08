# Firestore rules test harness

Suite de tests de las reglas de `firestore.rules` usando `@firebase/rules-unit-testing`.

## Archivos

- `tools/firestore-tests/run-rules-tests.mjs` — script ESM con casos de prueba cubriendo:
  - C1 — `precios`: lectura pública, escritura solo admin
  - `users`: perfil propio (create/read), bloqueo de perfiles ajenos, admin puede leer/borrar cualquier perfil
  - `reservas`: owner-only create, admin-only update/delete, no spoof de `userId`
  - `empleados` / `config`: admin-only
  - fallback catch-all deny
- `package.json` script: `npm run rules:test` →
  `firebase emulators:exec --only firestore "node tools/firestore-tests/run-rules-tests.mjs"`

## Cómo correr

### Requisito: Java

`firebase-tools` v15+ requiere **JDK 21+** (`java -version` debe funcionar en PATH). JDK 8 no sirve. Sin Java, el test fallará con `Could not spawn java -version` o `firebase-tools no longer supports Java version before 21`.

Instalar en Windows:
- `winget install EclipseAdoptium.Temurin.21.JDK`
- O descargar desde https://adoptium.net/ (elegir JDK 21 LTS)
- Verificar: `java -version`

### Ejecución

```bash
npm run rules:test
```

Esto arranca el emulador de Firestore, corre los tests, y lo apaga automáticamente. Output esperado cuando todo pasa:

```
Firestore rules test suite
--------------------------
  PASS  guest can read servicios
  ...
20 passed, 0 failed
```

## Estado actual (2026-07-31)

✅ **Java OK**: JDK 21 (Temurin) instalado en `C:\Program Files\Eclipse Adoptium\jdk-21.0.12.8-hotspot`. `firebase-tools` v15 lo requiere.

✅ **Tests verdes**: `npm run rules:test` → `23 passed, 0 failed`. Cubre los hallazgos de `AUDITORIA.md` (C1 precios, N1 escalación, reservas owner-only) + admin via custom claim + catch-all deny.

### Nota de PATH

El instalador MSI de Temurin 21 actualiza el PATH del sistema, pero las sesiones de PowerShell ya abiertas no lo recogen. Si `java -version` falla en una shell nueva, abrir una **nueva** terminal, o setear la variable temporal:

```powershell
$env:JAVA_HOME = "C:\Program Files\Eclipse Adoptium\jdk-21.0.12.8-hotspot"
$env:PATH = "$env:JAVA_HOME\bin;$env:PATH"
npm run rules:test
```

## Cómo extender

El test runner usa helpers `test(name, fn)` que registran PASS/FAIL. Agregar casos nuevos dentro del bloque `try` en `main()`, usando `assertSucceeds`/`assertFails` sobre los contextos predefinidos:

- `guestDb` — sin autenticar
- `aliceDb` — cliente autenticado (role: client)
- `bobAdminDb` — admin via custom claim `admin: true`
