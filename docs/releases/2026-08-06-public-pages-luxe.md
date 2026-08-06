# Release: Public Pages Luxe

Fecha: 2026-08-06
Commit de aplicación: `bc9b571`
Estado: desplegada y verificada

## Alcance

- Shell Luxe compartido para `/precios`, `/equipo`, `/galeria` y `/contacto`.
- Suite Playwright versionada para rutas públicas y login de admin/cliente.
- Asociación accesible de labels e inputs en `/login`.
- Reglas Firestore publicadas en el proyecto `hachi-greciaspa`.
- Perfil y custom claim administrativos sincronizados para la cuenta de QA autorizada.

## Evidencia

- `npm run test:client`: 17 archivos, 87 tests pasados.
- `npx tsc --noEmit`: correcto.
- `npm run build`: correcto.
- `npm --prefix functions run typecheck`: correcto.
- `npm --prefix functions run build`: correcto.
- QA Playwright en producción: 7 tests pasados.
- URL verificada: `https://hachi-greciaspa.vercel.app`.
- Deployment Vercel verificado: `hachi-greciaspa-2h57c5a7l-andres-leo-san-s-projects.vercel.app`.

## Incidencia y recuperación

El primer deployment no recibió las variables `VITE_FIREBASE_*` y dejó las rutas que importan Firebase en `Cargando…`. Se detectó mediante `pageerror`, se intentó rollback y, al no permitir Vercel Free retroceder más de un deployment, se corrigió agregando las variables públicas de Firebase, `VITE_USE_FIREBASE_EMULATOR=false` y reasignando el alias principal al deployment corregido.

## Rollback

1. Confirmar el deployment objetivo en Vercel con `npx vercel ls hachi-greciaspa`.
2. Reasignar el alias principal: `npx vercel alias set <deployment-url> hachi-greciaspa.vercel.app`.
3. Verificar las siete pruebas Playwright contra el alias.
4. Para las reglas Firestore, restaurar el archivo `firestore.rules` desde el commit objetivo y ejecutar `firebase deploy --only firestore:rules --project hachi-greciaspa`.

No se desplegaron Functions ni se ejecutaron migraciones de datos.
