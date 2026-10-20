# Verificación del chat publicado

Revisado el 19 de octubre de 2026 (America/Bogota). Código funcional publicado: `06ad287`.

- Sitio: https://dracma.club/#agente-dracma
- Panel del equipo: https://chatwoot-web-production-dcbd.up.railway.app
- Salud del bot: https://dracma-agent-production.up.railway.app/health
- Railway: proyecto separado `dracma-chatwoot`, con web, worker, PostgreSQL, Redis y bot Go. Los cinco servicios terminaron con despliegue exitoso.

## Comprobado

1. La bandeja API de Chatwoot crea conversaciones reales y guarda mensajes y respuestas del bot FAQ.
2. El dominio público carga diez preguntas sugeridas y permite enviar desde el panel de la portada.
3. Una pregunta sobre comisiones recibió una respuesta persistida; se recuperó tras recargar el navegador.
4. “Quiero hablar con el equipo” produjo una respuesta de derivación y dejó la conversación abierta para el equipo. Las tres conversaciones de prueba se etiquetaron `prueba-integracion` y se resolvieron después, conservando su historial.
5. Repetir un webhook con firma válida no duplicó la respuesta. Un token de sesión alterado y el acceso directo sin secreto del proxy fueron rechazados.
6. Una nota privada creada por un administrador no apareció en el historial público.
7. Se revisó el panel en escritorio y a 390 px de ancho: columnas apiladas, controles legibles y ausencia de desbordamiento horizontal.
8. Pasaron siete pruebas Go (incluidos los casos de autenticidad, caducidad, firmas, notas privadas y derivación), `go vet` y quince pruebas Node de proxies y normalización SEO.
9. El build y los verificadores de páginas y publicación pasaron. La revisión SEO del sitio publicado realizó 125 comprobaciones HTTP sin errores, recursos internos faltantes, títulos duplicados ni descripciones duplicadas. No se hizo una nueva auditoría de Semrush ni se evaluó indexación en buscadores.

## Alcance y pendientes

El asistente es de preguntas frecuentes, sin modelo generativo. No accede a contabilidad privada ni envía alertas de proyectos. Las conversaciones son legibles por el equipo autorizado y no tienen cifrado de extremo a extremo. No se han configurado SMTP, recuperación por correo, almacenamiento compartido de adjuntos ni una restauración de backup verificada. Estos resultados no equivalen a una prueba de penetración ni a una auditoría integral de Chatwoot.

Las credenciales están fuera de Git, en archivos locales privados y variables del proveedor. La configuración y el mantenimiento se describen en [la guía de operación](../deploy/chatwoot/README.md).
