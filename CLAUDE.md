# Convertidor de Imágenes Online

## Descripción

Herramienta web estática de conversión de imágenes entre los formatos **JPG, PNG, WebP, AVIF, BMP y PDF**, con ajuste de calidad y descarga en lote (.zip). Todo el procesamiento ocurre **en el navegador del cliente** (Canvas API de HTML5): ninguna imagen se sube a un servidor. Es un sitio en español, orientado a SEO y monetización con Google AdSense (hay slots de anuncios reservados, aún vacíos).

## Stack técnico

- HTML, CSS y JavaScript vanilla (sin frameworks, sin build step, sin `package.json`).
- Dependencias externas cargadas por CDN (cdnjs) en `index.html`:
  - [JSZip 3.10.1](https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js), usado para empaquetar las imágenes convertidas en un `.zip`.
  - [jsPDF 2.5.1](https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js) (global `window.jspdf.jsPDF`), usado solo para la conversión a PDF.
- Conversión de imágenes mediante `<canvas>`: `canvas.toBlob()` para PNG/JPG/WebP/AVIF (nativo), un encoder manual (`canvasToBMP`) para BMP, y jsPDF (`canvasToPDF`) para PDF.
- Repositorio git con remoto en `https://github.com/alesinho777/conversor.git`.

## Estructura de archivos

```
conversor/
├── index.html          # Página principal: UI del convertidor
├── privacy.html         # Política de privacidad
├── css/
│   └── style.css        # Estilos (soporta light/dark vía prefers-color-scheme)
├── js/
│   └── converter.js     # Toda la lógica del convertidor (IIFE, sin módulos)
└── assets/
    └── favicon.svg
```

No hay carpeta de tests, ni linter, ni configuración de build. Es un sitio puramente estático que puede servirse abriendo `index.html` directamente o con cualquier servidor estático.

## `index.html`

- Metadatos SEO en español (title, description) enfocados en "convertidor de imágenes online gratis".
- Dos `<section class="ad-slot">` (`#ad-top`, `#ad-bottom`) reservados para Google AdSense, actualmente vacíos.
- Estructura principal (`.converter-card`):
  - `#dropzone`: zona de arrastrar-y-soltar + botón "Elegir imágenes" (`#file-input`, acepta múltiples imágenes).
  - Controles: `#format-select` (PNG/JPG/WebP/AVIF/BMP/PDF) y `#quality-range` (10–100%, oculto para los formatos sin pérdida: PNG, BMP y PDF).
  - `#selected-files`: resumen de archivos elegidos + botón `#convert-btn`.
  - `#results` / `#results-list`: tarjetas de resultado con miniatura, nombre, peso y enlace de descarga individual; `#download-all` (oculto si hay <2 archivos) descarga un `.zip`.
- Sección de contenido SEO ("¿Cómo funciona...?") explicando el enfoque 100% cliente.
- Footer con enlace a `privacy.html`.
- `<canvas id="hidden-canvas" hidden>` usado internamente para la conversión.

## `js/converter.js`

Todo el código vive en una única IIFE, sin dependencias de build ni módulos ES.

Flujo principal:
1. **Selección de archivos**: por input o drag&drop (filtra por `type.startsWith("image/")`). Se guardan en `pendingFiles`; se resetean `convertedFiles` y resultados previos.
2. **Conversión** (`convertFile`): por cada archivo, se crea una `Image` desde un `Object URL`, se dibuja en el `<canvas>` oculto a su tamaño natural, y luego se exporta según el formato:
   - PNG/JPG/WebP/AVIF: `canvas.toBlob(callback, mimeType, quality)` nativo (la calidad solo se aplica si el formato no es PNG). Si el navegador no soporta el formato (típico de AVIF fuera de Chrome/Edge recientes), `toBlob` devuelve `null` y se muestra una tarjeta de error vía `addError` en vez de fallar silenciosamente.
   - BMP: `canvasToBMP(canvas)` — encoder manual de BMP de 24 bits sin compresión (sin librería).
   - PDF: `canvasToPDF(canvas, quality)` — usa `window.jspdf.jsPDF`, incrusta la imagen como JPEG con la calidad elegida dentro de una página del tamaño exacto de la imagen.
3. **Resultado** (`addResult`): genera un nombre de archivo con la extensión correspondiente (`EXTENSIONS` mapea cada mime type a su extensión), crea una tarjeta con miniatura (o un placeholder de texto para PDF, que no se puede previsualizar como `<img>`), tamaño formateado (`formatBytes`) y enlace de descarga (`<a download>`), y lo añade a `convertedFiles` para el zip.
4. **Descarga en lote** (`downloadAllBtn`): usa `JSZip` para empaquetar todos los blobs convertidos y dispara la descarga de `imagenes-convertidas.zip`.

Detalles a tener en cuenta:
- No hay límite de tamaño/cantidad de archivos ni manejo de errores visible al usuario para fallos de carga de imagen (solo `img.onerror` libera el Object URL silenciosamente); sí hay manejo de error visible cuando `canvas.toBlob` devuelve `null` (formato no soportado por el navegador).
- Los Object URLs de miniaturas de resultado (`url` en `addResult`) no se revocan explícitamente tras usarse.
- El selector de calidad se oculta con `display: none/flex` cuando el formato está en `NO_QUALITY_FORMATS` (PNG, BMP, PDF), vía `updateQualityVisibility()`.

## `css/style.css`

- Variables CSS en `:root` para colores, con override completo en `@media (prefers-color-scheme: dark)` (soporta tema oscuro automático).
- Layout centrado, `max-width: 48rem` para `main`.
- Grid responsive (`auto-fill, minmax(11rem, 1fr)`) para `.results-list`.
- Sin frameworks CSS (no Tailwind, no Bootstrap); todo escrito a mano.

## `privacy.html`

Página estática de política de privacidad en español, alineada con el enfoque "100% local": explica que las imágenes no se suben a servidores, pero menciona el uso potencial de Google Analytics y Google AdSense (cookies de terceros).

## Convenciones y notas para futuras modificaciones

- Idioma del sitio: **español** (`lang="es"`), mantener el tono y copy en español en cambios de UI/contenido.
- No introducir un build step ni gestor de paquetes salvo que se solicite explícitamente; el proyecto está pensado para desplegarse como archivos estáticos sin compilación.
- Cualquier nueva dependencia externa debe cargarse vía CDN igual que JSZip, o evaluarse si conviene vendorizarla.
- Mantener el principio central del proyecto: **ninguna imagen debe salir del navegador del usuario** (sin llamadas a APIs externas con los archivos).
- Los slots de anuncios (`#ad-top`, `#ad-bottom`) están reservados para Google AdSense; no eliminarlos al modificar el layout.
- Al añadir formatos de imagen, actualizar tanto el `<select id="format-select">` en `index.html` como el mapa `EXTENSIONS` en `converter.js`.
