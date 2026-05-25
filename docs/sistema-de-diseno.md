# Sistema de Diseno - Hachi & Grecia Spa

## Estado

Analisis inicial hecho directamente sobre [hachi-greciaspa.png](../hachi-greciaspa.png). Este documento define la base visual antes de construir HTML, CSS o React.

## Referencias visuales

- [Imagen principal](../hachi-greciaspa.png)
- [Contact sheet de analisis](../contact-sheet.png)
- [Hero desktop ampliado](../hero_text_zoom.png)
- [Dashboard ampliado](../dashboard_header_zoom.png)
- [Vista movil ampliada](../mobile_top_zoom.png)

## Lectura general de la pieza

La referencia no es una sola pantalla; es un collage del sistema completo:

- pagina publica desktop
- dashboard administrativo desktop
- version movil de la pagina publica

El lenguaje visual es amable, premium y muy pet-friendly. Predominan fondos blancos, tarjetas muy limpias, sombras suaves, bordes redondeados y acentos coral/rosa y turquesa.

## Paleta de color

La imagen repite una base cromatica bastante consistente. Los valores siguientes provienen de la referencia renderizada y se usan como tokens base sugeridos.

| Token                    | Hex       | Uso observado                                         |
| ------------------------ | --------- | ----------------------------------------------------- |
| `color-primary`          | `#F65971` | CTA principal, estados activos, etiquetas importantes |
| `color-primary-strong`   | `#F55870` | Variante del primario en botones y resaltados         |
| `color-secondary`        | `#18AAAB` | Acento turquesa, bloques informativos, iconos         |
| `color-secondary-strong` | `#19AAAC` | Variante viva del turquesa                            |
| `color-ink`              | `#152233` | Texto oscuro, sidebar del dashboard, contraste alto   |
| `color-ink-strong`       | `#262C36` | Variante de texto casi negro detectada en el render   |
| `color-surface`          | `#FFFFFF` | Fondo principal de tarjetas y lienzo                  |
| `color-surface-soft`     | `#FEFEFE` | Blanco ligeramente roto del render                    |
| `color-bg-soft`          | `#F4F9F9` | Fondos muy suaves, secciones aireadas                 |
| `color-bg-muted`         | `#EFF1F1` | Separadores y superficies tenues                      |
| `color-border`           | `#DEE4E4` | Bordes finos de tarjetas y paneles                    |
| `color-mint`             | `#A3CECC` | Fondo decorativo, blob turquesa y cards suaves        |
| `color-blush`            | `#F5D0C9` | Fondo rosa muy claro, support visual                  |
| `color-sand`             | `#D8AB9F` | Variante beige/arena presente en el render            |
| `color-neutral-warm`     | `#D5CEC9` | Neutral cálido de apoyo                               |
| `color-lavender`         | `#F9EFFD` | Tarjetas de clientes del dashboard                    |
| `color-success`          | `#BFE8C9` | Chips de estado confirmado/completado                 |
| `color-warning`          | `#FFD59C` | Chips en proceso / atención                           |
| `color-info`             | `#D7EAFB` | Chips pendientes / informacion                        |

### Observacion cromatica

Los colores dominantes detectados en el render son muy consistentes con una identidad basada en:

- coral para conversion y energia emocional
- turquesa para confianza, higiene y frescura
- navy para estructura y legibilidad
- blanco casi puro como base

## Tipografia

No es posible confirmar el nombre comercial exacto de la fuente a partir de un PNG rasterizado, pero el comportamiento tipografico visible es muy claro.

### Familia principal

La interfaz usa una sans geometrica moderna, muy cercana visualmente a Poppins o Nunito Sans.

Uso observado:

- encabezados grandes
- navegacion
- labels de tarjetas
- cifras y metricas
- botones

Pesos observados o sugeridos:

- 400 para cuerpo
- 500 para labels y menus
- 600 para subtitulos y cards
- 700 u 800 para H1 y cifras fuertes

Tamanos aproximados observados:

- hero desktop: 56-64 px
- titulos de seccion: 30-40 px
- subtitulos: 18-24 px
- cuerpo: 15-18 px
- etiquetas auxiliares: 12-14 px

### Fuente de acento

El texto `Amor, cuidado y estilo` usa una tipografia script o handwritten, decorativa, con color turquesa. Se comporta como una fuente de acento, no como familia funcional.

### Jerarquia tipografica

- H1 con mucho peso visual y line-height compacto
- texto de soporte con gris medio
- labels y microcopy en tonos oscuros pero menos intensos
- cifras de dashboard con peso alto y buen espacio respiratorio

## Estructura de navegacion

### Pagina publica desktop

- logo en el extremo izquierdo
- navegacion horizontal centrada
- CTA destacado a la derecha: `AGENDAR CITA`
- secciones visibles en el hero y el cuerpo: Inicio, Servicios, Equipo, Galeria, Contacto, Ubicacion

### Pagina publica movil

- header compacto con logo y menu
- CTA principal en bloque grande
- navegacion inferior fija con iconos
- boton central destacado para agendar

### Dashboard administrativo

- sidebar izquierda vertical con logo
- item activo resaltado en coral
- menu con icono + texto
- perfil de usuario al final del sidebar
- topbar con titulo a la izquierda y acciones rapidas a la derecha

## Componentes visuales identificados

### Botones

- boton primario coral, relleno, con icono y texto blanco
- boton secundario blanco con borde turquesa
- CTA reducido en header
- botones de accion dentro de cards del dashboard
- botones tipo pill para filtros, exportacion y ver detalle

### Cards

- hero card con gran ilustracion/foto de mascota
- card de estadisticas resumidas bajo el hero
- cards de servicios con imagen, titulo, descripcion, precio y duracion
- card de valor diferencial en franja turquesa
- cards de galeria con miniaturas cuadradas
- cards de metricas del dashboard con fondo tintado
- cards de citas, grafica de dona, grafica lineal, lista de actividad y cumpleanos

### Estados y chips

- `Confirmada` en verde suave
- `En Proceso` en naranja/peach
- `Pendiente` en azul suave
- `Cancelada` en rosa/rojo suave
- etiqueta `Mas Popular` sobre una card de servicio

### Navegacion y feedback

- sidebar con iconos lineales
- topbar con busqueda, notificaciones y menu
- bottom nav movil con iconos y estado activo
- barras de progreso horizontales en servicios mas solicitados
- timeline vertical en actividad reciente

### Elementos de soporte visual

- ilustracion o fotografia principal de mascota en forma de recorte redondeado
- decoracion con huellas semitransparentes
- burbujas transparentes sobre la imagen hero
- iconos lineales de trazo fino

## Layout y composicion

### Publico desktop

1. header superior
2. hero de dos columnas
3. tarjeta de metricas
4. bloque de servicios
5. franja de diferenciadores
6. galeria de imagenes
7. footer con contacto

El hero divide el contenido en texto a la izquierda y mascota/ilustracion a la derecha. La composicion usa mucho aire y alineaciones limpias.

### Dashboard desktop

1. sidebar fija a la izquierda
2. topbar superior
3. cards resumen en una fila
4. seccion principal con citas y analiticas
5. listas complementarias debajo

El dashboard mezcla paneles blancos con sombras muy suaves, manteniendo una lectura modular y ordenada.

## Espaciado, margenes y radios

La referencia usa una grilla generosa y respirada.

### Espaciados observados

- gutters laterales amplios: 24-32 px
- separacion entre bloques grandes: 64-96 px
- separacion entre cards: 16-24 px
- padding interno de cards: 16-24 px
- microespacios entre icono y texto: 8-12 px

### Radios observados

- cards: 16-24 px
- botones: 12-16 px
- imagenes de galeria: 12-16 px
- sidebar y paneles: esquinas grandes y muy suaves

### Sombras

- sombras difusas, ligeras y largas
- profundidad suave, nunca dura
- el efecto debe sentirse premium, no material pesado

## Responsive design

### Desktop grande

- hero en dos columnas
- servicios en grid horizontal
- dashboard con sidebar fija y panel amplio

### Tablet

- hero apilado o casi apilado
- cards en 2 o 3 columnas
- sidebar del dashboard debe poder colapsar

### Movil

- hero apilado en una sola columna
- CTA principal primero
- cards en columna unica
- bottom navigation fija
- sidebar sustituida por drawer o menu compacto

### Comportamiento visual en movil

La referencia movil mantiene la misma identidad pero reduce densidad:

- mas jerarquia vertical
- menos columnas
- botones mas grandes y tactiles
- cards mas compactas

## Sistema visual resumido

La identidad se puede sintetizar en estos ejes:

- blanco como lienzo principal
- coral como accion
- turquesa como confianza
- navy como estructura
- tipografia sans geometrica con acento script
- radios generosos
- sombras suaves
- iconografia lineal

## Recomendacion de implementacion

Antes de escribir maquetacion o componentes, este sistema deberia convertirse en:

- tokens de color
- escala tipografica
- escala de spacing
- componentes base de botones, cards y badges
- layout public y layout dashboard

## Estado final

Este documento queda como base de referencia para la fase de maquetacion. No se continua a HTML o React hasta que se confirme este sistema de diseno.
