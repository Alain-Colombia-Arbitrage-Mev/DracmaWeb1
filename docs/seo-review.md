# Revisión SEO y enlaces

Dominio principal: https://dracma.club. Copia técnica: https://dracmaweb1.pages.dev. Fecha local: 19 de octubre de 2026.

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

Se confirmó que `dracma.club` sirve esta misma web. Por elección del usuario, canonical, sitemap, robots y metadatos sociales apuntan a ese dominio. La copia `pages.dev` conserva la misma preferencia canonical. Esta revisión no configura una redirección global por host ni modifica callbacks de pagos.

## Validación reproducible

```sh
npm run build
npm run verify:pages
npm run verify:seo
npm run verify:publication
node --test tests/pages-api.test.mjs tests/seo-html.test.mjs
# Después de publicar exactamente ese build:
npm run verify:seo:live -- --report /tmp/dracma-seo-live.json
node scripts/verify-seo.mjs --live --origin https://dracmaweb1.pages.dev
```

El verificador revisa metadatos, canonical, robots, sitemap, encabezado principal,
idioma, imágenes con atributo alt, enlaces sin destino, anclas y referencias de
Astro/CSS. Comprueba que las páginas indexables tengan enlaces entrantes y que
las rutas inexistentes respondan 404. No redirige cualquier error al inicio.

Hay 28 URLs indexables en el sitemap y 15 documentos no indexables, incluidas
traducciones antiguas, retornos de compra y el 404. Ese número no representa una
medición de páginas redundantes de una cuenta de Semrush. El reporte de publicación
se guarda en `seo-live-report.json` después de ejecutar las comprobaciones HTTP.

Resultado publicado: 124 comprobaciones HTTP en `dracma.club` y 124 en la copia de Pages, sin errores internos ni títulos/descripciones duplicados. Se revisaron 8 destinos externos: 3 respuestas 403 de BscScan permanecen sin verificar. Cloudflare protege los correos en el dominio propio; el comparador normaliza exclusivamente esa transformación, con pruebas que conservan la detección de cambios en canonical, contenido y scripts ajenos.

La preferencia canonical sigue las [recomendaciones de Google Search Central](https://developers.google.com/search/docs/crawling-indexing/consolidate-duplicate-urls); no implica que Google ya haya actualizado su índice.

Los bloqueos o timeouts de sitios externos se mantienen como advertencias de
verificación pendiente. La revisión no acredita indexación en Google, posiciones,
una nueva puntuación de Semrush ni la reparación de URLs históricas que no figuren
en los enlaces actuales o en un informe proporcionado. No se accedió a Search Console.
