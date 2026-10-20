# Agente DRACMA · Chatwoot en Railway

Instalación separada del backend de compras. El panel de la portada crea conversaciones reales en una bandeja API de Chatwoot. Un servicio Go responde preguntas frecuentes con contenido público revisado y deja las preguntas desconocidas para revisión humana. No usa un modelo generativo ni consulta cuentas privadas.

## Servicios

| Servicio | Función | Exposición |
| --- | --- | --- |
| chatwoot-web | Rails, panel del equipo y API | HTTPS público |
| chatwoot-worker | Sidekiq, entrega de webhooks | Red privada |
| chatwoot-postgres | PostgreSQL 16 con pgvector | Red privada, volumen persistente |
| chatwoot-redis | Redis 7.4, cola persistida AOF | Red privada, contraseña |
| dracma-agent | Sesiones, proxy a Chatwoot y respuestas FAQ | HTTPS; chat protegido por secreto del proxy, webhook firmado |

Cloudflare Pages sirve `/api/chat/*` en el mismo origen que el sitio. Solo esa función conoce `CHAT_PROXY_SECRET`. El navegador recibe una sesión opaca autenticada con AES-256-GCM, válida 24 horas. No recibe credenciales administrativas, identificadores internos de contacto ni tokens de Chatwoot.

## Configuración

Las credenciales de producción se generan fuera del repositorio y se cargan como variables de Railway o secretos de Pages mediante entrada estándar. No deben copiarse a este documento, comandos con valores literales, capturas ni incidencias. Conservar una copia privada de recuperación y rotarla si queda expuesta.

Web y worker requieren `RAILS_ENV`, `NODE_ENV`, `INSTALLATION_ENV`, `FRONTEND_URL`, `SECRET_KEY_BASE`, las tres claves `ACTIVE_RECORD_ENCRYPTION_*`, `POSTGRES_HOST`, `POSTGRES_PORT`, `POSTGRES_USERNAME`, `POSTGRES_PASSWORD`, `POSTGRES_DATABASE`, `REDIS_URL`, `REDIS_PASSWORD`, `ACTIVE_STORAGE_SERVICE`, `ENABLE_ACCOUNT_SIGNUP=false`, `FORCE_SSL=true`, `DISABLE_TELEMETRY=true`. El proceso lo selecciona `DRACMA_PROCESS=web|worker`.

El bootstrap web requiere `DRACMA_ADMIN_EMAIL`, `DRACMA_ADMIN_PASSWORD`, `DRACMA_ADMIN_API_TOKEN`, `DRACMA_AGENT_API_TOKEN`, `DRACMA_AGENT_DB_PASSWORD`, `DRACMA_INBOX_IDENTIFIER`, `DRACMA_BOT_WEBHOOK_SECRET` y `DRACMA_BOT_WEBHOOK_URL`. Es idempotente: no cambia la contraseña de un usuario existente. No envía correos de creación/confirmación. Crea una cuenta administrativa normal, una bandeja API, un AgentBot y respuestas guardadas; no crea un superadministrador.

El bot requiere `CHATWOOT_INTERNAL_URL`, `CHATWOOT_INBOX_IDENTIFIER`, `CHATWOOT_AGENT_TOKEN`, `CHATWOOT_WEBHOOK_SECRET`, `CHAT_PROXY_SECRET`, `CHAT_SESSION_KEY` (32 bytes hex), `CHATWOOT_ACCOUNT_ID`, `CHATWOOT_INBOX_ID`, `DATABASE_URL` y `PORT`. Usa el rol restringido `dracma_agent`, propietario de su esquema; no necesita acceso directo a las tablas de conversaciones.

Pages requiere `CHAT_API_ORIGIN` y `CHAT_PROXY_SECRET` como secretos. El origen debe ser HTTPS; el proxy solo admite las rutas y métodos previstos.

## Despliegue

Las imágenes base están fijadas por digest en los Dockerfiles. PostgreSQL usa `pgvector/pgvector:pg16`; Redis usa `redis:7.4-alpine`. No habilitar un proxy TCP público para las bases de datos. La comunicación interna de Railway usa su red privada cifrada; el webhook de Chatwoot se entrega a la URL HTTPS del bot para conservar la protección SSRF predeterminada.

1. Crear PostgreSQL con volumen `/var/lib/postgresql/data` y Redis con volumen `/data`; generar contraseñas distintas.
2. Configurar web y worker. El web tiene volumen `/app/storage`. Cargar las claves de Rails antes de inicializar los datos.
3. Desplegar `deploy/chatwoot` como raíz de ambos servicios. `start.sh` espera PostgreSQL, ejecuta `db:chatwoot_prepare`, configura la bandeja y arranca Rails; el worker espera la inicialización y ejecuta Sidekiq.
4. Verificar los IDs reales de cuenta/bandeja antes de configurar el bot. Desplegar `deploy/chatwoot/bot` como raíz del servicio Go. Mantener una réplica del bot (el procesador actual es secuencial).
5. Cargar secretos en Pages, compilar y desplegar el frontend.
6. Probar un envío desde el dominio público, la respuesta persistida, la recarga de historial, el rechazo de firmas incorrectas y la derivación al equipo.

Railway comprueba `/health` por HTTP dentro del contenedor. El inicializador excluye solo ese endpoint sin información sensible de la redirección HTTPS; el resto conserva HTTPS. El cliente Go comunica el esquema externo a Rails sobre la red interna.

## Contenido y mantenimiento

`faq.json` contiene las preguntas, respuestas y términos del bot. Sincronizar la copia del bot con `cp deploy/chatwoot/faq.json deploy/chatwoot/bot/faq.json` antes de compilar. Actualizar ambos servicios cuando cambien las respuestas guardadas. Conservar las advertencias sobre fichas ilustrativas, contratos pendientes y falta de acceso a contabilidad privada.

El webhook valida HMAC-SHA256 y una ventana de cinco minutos. La cola PostgreSQL deduplica por ID de mensaje. Se persiste la intención antes de enviar la respuesta, y se consulta una marca de respuesta en los atributos del historial público al recuperar una entrega incierta. Una entrega ambigua sin confirmación se deriva a revisión; no se reenvía a ciegas. El historial público filtra notas privadas y actividades.

Pruebas locales:

```sh
node --test tests/chat-api.test.mjs tests/pages-api.test.mjs tests/seo-html.test.mjs
cd deploy/chatwoot/bot
go test -race ./...
go vet ./...
```

## Límites operativos

- Los mensajes se almacenan en PostgreSQL y son legibles por el equipo autorizado. No hay cifrado de extremo a extremo. Las claves de Active Record protegen los campos cifrados que define Chatwoot; no cifran toda la conversación a nivel de aplicación.
- SMTP no está configurado: no hay recuperación de contraseña ni avisos por correo operativos. Mantener las credenciales privadas y configurar un proveedor antes de ofrecer esas funciones.
- El panel implementado es de texto. No ofrece adjuntos. El worker no comparte el volumen local del web; usar almacenamiento de objetos compatible antes de habilitar un flujo de archivos.
- Un volumen persistente no equivale a una copia de seguridad. Configurar backups y probar restauración; el plan actual debe permitir la función elegida. No se declara una restauración verificada.
- No hay sincronización contable, avisos de proyectos, KYC, acceso a wallets ni asesoramiento financiero personalizado. La derivación no promete disponibilidad o plazo de respuesta humana.
- El modo FAQ no comprende todas las preguntas abiertas. Las consultas no cubiertas se conservan para revisión del equipo.

Referencias: [Docker oficial](https://developers.chatwoot.com/self-hosted/deployment/docker), [variables de Chatwoot](https://developers.chatwoot.com/self-hosted/configuration/environment-variables), [red privada de Railway](https://docs.railway.com/networking/private-networking/how-it-works).

## Idiomas del asistente

El proxy valida `X-Dracma-Locale` (`es`, `en`, `ar`, `zh`, `ru`, `it`). `GET /chat/questions` devuelve las sugerencias de ese idioma. `POST /chat/session` admite `{ "locale": "en" }`; si no se indica, conserva el valor predeterminado español. La selección queda vinculada a la conversación en `dracma_agent.conversation_locales`, tabla creada al arrancar dentro del esquema propio del bot. No se accede directamente a tablas de conversaciones de Chatwoot.

`bot/faq-locales.json` contiene 50 respuestas traducidas y revisadas, términos de búsqueda y mensajes de bienvenida/derivación. El worker responde en el idioma de la conversación aunque la consulta use una pregunta equivalente en otro idioma. Las consultas fuera del catálogo siguen abriendo la conversación al equipo, con un mensaje en el idioma seleccionado y sin prometer disponibilidad o plazos. No hay traducción externa de conversaciones privadas ni un modelo generativo conectado a cuentas. Las sesiones del frontend están separadas por idioma.
