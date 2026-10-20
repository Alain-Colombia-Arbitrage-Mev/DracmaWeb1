# Revisión SEO y enlaces

Sitio auditado: https://dracmaweb1.pages.dev. Fecha local: 19 de octubre de 2026.

## Hallazgos y correcciones

- El commit del formulario `d616c6b` ya estaba publicado en `master` al comenzar.
- La auditoría inicial completó 100 comprobaciones HTTP del sitio publicado sin
  enlaces internos rotos, títulos duplicados ni descripciones duplicadas.
- El enlace de X configurado en las páginas antiguas devolvía HTTP 404 y aparecía
  en 21 documentos HTML. Se retiró hasta contar con un destino verificado.
- Se eliminaron enlaces sociales y recursos ficticios que apuntaban a `#`.
  Los enlaces legales y de GitHub apuntan a contenido existente; los selectores
  de idioma tienen URLs reales incluso antes de ejecutar JavaScript.
- Se hicieron descriptivos los títulos y resúmenes de las secciones y los títulos
  de las fichas de proyecto. Se conservan los avisos de contenido ilustrativo y
  las descripciones no atribuyen recaudación ni rentabilidad verificadas.
- Siete páginas incorporan contenido explicativo específico con H2/H3 y lecturas
  relacionadas: inicio, proyectos, comisiones, comercialización, ingresos
  recurrentes, modelo de negocio y compra del token.
- Se añadió navegación visible por secciones y `BreadcrumbList` coherente con
  esa navegación, además del texto alternativo de la imagen de Twitter.
- Las páginas de retorno antiguas solo muestran un enlace de transacción cuando
  el hash tiene el formato esperado; su enlace de respaldo es el explorador real.

## Validación reproducible

```sh
npm run build
npm run verify:pages
npm run verify:seo
npm run verify:publication
node --test tests/pages-api.test.mjs
# Después de publicar exactamente ese build:
npm run verify:seo:live -- --report /tmp/dracma-seo-live.json
```

El verificador revisa metadatos, canonical, robots, sitemap, encabezado principal,
idioma, imágenes con atributo alt, enlaces sin destino, anclas y referencias de
Astro/CSS. Comprueba que las páginas indexables tengan enlaces entrantes y que
las rutas inexistentes respondan 404. No redirige cualquier error al inicio.

Hay 28 URLs indexables en el sitemap y 15 documentos no indexables, incluidas
traducciones antiguas, retornos de compra y el 404. Ese número no representa una
medición de páginas redundantes de una cuenta de Semrush. El reporte de publicación
se guarda en `seo-live-report.json` después de ejecutar las comprobaciones HTTP.

Los bloqueos o timeouts de sitios externos se mantienen como advertencias de
verificación pendiente. La revisión no acredita indexación en Google, posiciones,
una nueva puntuación de Semrush ni la reparación de URLs históricas que no figuren
en los enlaces actuales o en un informe proporcionado. No se accedió a Search Console.
