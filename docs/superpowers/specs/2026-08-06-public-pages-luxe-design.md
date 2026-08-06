# Migración De Páginas Públicas A Luxe

## Estado

Arquitectura aprobada por el operador el 2026-08-06.

## Alcance

Actualizar la presentación de `/precios`, `/equipo`, `/galeria` y `/contacto` para que compartan la identidad visual del Home, sin cambiar contratos de Firestore, navegación, formularios ni permisos.

El dashboard, login, registro y reserva quedan fuera de este bloque.

## Arquitectura

Crear `src/components/PublicLuxeShell.tsx` como shell compartido:

- monta `AuroraBackground`, `HeaderGlass`, `<main>` y `FooterGlass`;
- acepta `children` y una clase opcional para el `<main>`;
- no contiene lógica de datos ni reglas específicas de una página.

Las páginas públicas pasan a renderizar únicamente contenido de página dentro del shell. `maqueta.css` permanece disponible para dashboard y flujos que todavía no migran.

## Dirección visual

- **Precios:** encabezado editorial, toolbar oscura y filas de catálogo con filtros/búsqueda; conserva impresión y lectura pública de Firestore.
- **Equipo:** listado editorial reutilizando `TEAM` de `src/landing/data.ts`; conserva nombres y roles sin inventar fotografías.
- **Galería:** conserva la galería Luxe existente, pero usa el shell compartido y elimina duplicación de fondo/header/footer.
- **Contacto:** formulario, ubicación, horarios y tarifas principales migrados a superficies oscuras y composición editorial; conserva el submit a `mensajes`, estados de éxito/error y anclas `ubicacion`/`horarios`.

## Componentes y estilos

- Reutilizar `HeaderGlass`, `FooterGlass`, `AuroraBackground`, `PricesList`, `TEAM` y `motionRuntime`.
- Añadir clases específicas en `src/styles/luxe.css`; no agregar estilos inline.
- Mantener responsive desktop/móvil y `prefers-reduced-motion`.
- Mantener los componentes legacy sin cambios salvo los imports necesarios en las cuatro rutas.

## Verificación

- Tests de cliente existentes y tests nuevos para el shell y los contratos estáticos de las páginas.
- `npx tsc --noEmit`.
- `npm run build`.
- Verificación visual de las cuatro rutas en desktop y móvil, incluyendo filtros de precios, formulario de contacto, galería y navegación.
- No se afirma QA visual si el navegador interactivo no está disponible.

## Fuera de alcance

- No rediseñar dashboard/admin, login, registro ni reserva.
- No modificar reglas, colecciones ni consultas de Firestore.
- No agregar proveedor externo, dependencia nueva ni configuración de producción.
