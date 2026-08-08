# Catalogo real y WhatsApp

Fecha: 2026-08-06
Estado: Diseno aprobado por el operador

## Objetivo

Alinear las paginas publicas de Hachi & Grecia Spa con el tarifario real de
`F:\Proyectos\hachi-greciaspa\Docs\Precios hachi-greciaspa.pdf` y reemplazar el
telefono ficticio por el WhatsApp extraido del QR del PDF.

El WhatsApp real es:

- Numero visible: `+52 55 7887 5525`
- URL del QR: `https://wa.me/525578875525?src=qr`

## Alcance aprobado

- Actualizar la landing publica, `/servicios`, `/precios`, `/contacto`, footer,
  metadatos SEO y datos estructurados.
- Alinear `tools/seed-services.mjs` con los mismos servicios y precios para
  Firestore.
- Agregar CTAs de WhatsApp en header, footer, contacto, precios y landing.
- Mantener la identidad visual luxe existente.
- Mantener intactos el flujo autenticado de reservas y la administracion de
  precios.
- No ejecutar seeds contra produccion ni desplegar.

## Datos comerciales

### Spa Day

Spa Day incluye aromaterapia (difusor), bano, secado, corte de unas, limpieza
de oidos, balsamo en patitas, hidratacion de nariz, masaje y fragancia de
temporada.

Pelo corto:

| Talla | Peso maximo | Precio MXN |
|---|---:|---:|
| Mini | 5 kg | 240 |
| Chica | 10 kg | 280 |
| Mediana | 15 kg | 340 |
| Mediana/grande | 20 kg | 420 |
| Grande | 30 kg | 550 |

Pelo largo (lacio, chino, alambre o doble capa), sin nudos:

| Talla | Peso maximo | Precio MXN |
|---|---:|---:|
| Mini | 5 kg | 280 |
| Chica | 10 kg | 300 |
| Mediana | 15 kg | 390 |
| Mediana/grande | 20 kg | 490 |
| Grande | 30 kg | 690 |

### Extras

| Extra | Precio MXN |
|---|---:|
| Aromaterapia (shampoo de aceites esenciales) | 140 |
| Mascarilla de restauracion, crecimiento saludable y nutricion capilar | 180 |
| Mascarilla de hidratacion, pelaje brillante y facil de peinar | 180 |
| Bano prevencion bichos (antipulgas) | 140 |
| Corte de unas | 70 |
| Limpieza de dientes | 100 |
| Deslanado/desanudar | Variable |
| Grooming (Spa + corte) | Variable |
| Pipeta antipulgas | Variable |

### Otros servicios

| Servicio | Precio MXN |
|---|---:|
| Guarderia mensual, lunes a viernes | 3,500 |
| Guarderia eventual | 250 |
| Pension, temporada baja | 300/noche |
| Pension, temporada alta | 380/noche |

### Condiciones

- Precios sujetos a cambio sin previo aviso; se deben consultar terminos y
  condiciones al agendar.
- Afiliados Hexalud obtienen 10% de descuento en cualquier servicio.
- Los productos son libres de sulfatos y parabenos, hipoalergenicos y cruelty
  free.
- El espacio es libre de jaulas.

## Presentacion publica

### `/precios`

`PricesList` conserva busqueda y filtro, pero presenta el catalogo agrupado en
Spa Day, Extras y Otros servicios. Spa Day separa pelo corto y pelo largo para
que talla, peso y precio se puedan comparar sin mezclar variantes.

La pagina muestra las condiciones comerciales y un CTA de WhatsApp para
consultar o agendar.

### `/servicios`

Las tarjetas muestran precio comercial en lugar de duracion como dato principal:

- Spa Day: `Desde $240`.
- Grooming: `Precio variable`.
- Guarderia: `$250/dia · $3,500/mes`.
- Pension: `$300-$380/noche`.

Las descripciones se mantienen alineadas con el PDF y con el catalogo seed.

### Landing y contacto

- Se mantienen las secciones y la identidad luxe actuales.
- Las referencias de servicios y precios usan los datos reales.
- El CTA principal puede llevar a `/reservar`; los CTAs de consulta llevan al
  WhatsApp real.
- `/contacto` reemplaza el telefono ficticio y agrega un boton directo de
  WhatsApp.

## WhatsApp y datos de contacto

Crear `src/config/contact.ts` con la etiqueta visible y la URL real. Los
componentes publicos consumen esa constante en vez de repetir el numero.

Los enlaces externos se abren con `target="_blank"` y
`rel="noreferrer"`. El numero tambien se actualiza en el JSON-LD de
`index.html` y en los footers legacy y luxe.

## Archivos previstos

- `src/config/contact.ts`: constante del WhatsApp real.
- `src/landing/data.ts`: catalogo estatico visible y condiciones comerciales.
- `src/components/PricesList.tsx`: agrupacion y presentacion del tarifario.
- `src/pages/Servicios.tsx`: precios comerciales de las tarjetas.
- `src/pages/Contacto.tsx`: WhatsApp real y copy de contacto.
- `src/landing/HeaderGlass.tsx`: enlace CTA visible a WhatsApp.
- `src/landing/FooterGlass.tsx`: contacto real.
- `src/components/Footer.tsx`: contacto real.
- `index.html`: telefono real en JSON-LD.
- `src/seo/seo.ts`: descripciones de `/precios` y `/contacto` consistentes con el
  tarifario y el canal de WhatsApp.
- `tools/seed-services.mjs`: catalogo real para `servicios` y `precios`.
- Pruebas existentes o nuevas de datos comerciales, contacto y SEO.

## No incluido

- No se cambia la logica de disponibilidad o creacion de reservas.
- No se modifica el esquema de Firestore de reservas.
- No se ejecuta un seed productivo.
- No se agregan pagos, promociones automaticas ni calculo automatico del
  descuento Hexalud.
- No se inventan horarios o datos de contacto que no esten respaldados por el
  proyecto o el PDF.

## Verificacion y criterios de aceptacion

- El tarifario publico muestra todos los importes del PDF sin valores
  ficticios ni faltantes.
- Spa Day distingue correctamente pelo corto y pelo largo sin nudos.
- Extras variables aparecen como `Variable`, sin convertirlos en importes.
- Servicios muestra precios comerciales y no presenta minutos como precio.
- El numero ficticio `+52 55 1234 5678` no aparece en codigo ni metadatos.
- Cada CTA de WhatsApp apunta a `https://wa.me/525578875525?src=qr`.
- El catalogo seed conserva los mismos valores que la interfaz publica.
- Pasan typecheck, build, pruebas existentes, pruebas nuevas y
  `git diff --check`.
- No se realiza despliegue ni escritura productiva durante esta tarea.
