FROM chatwoot/chatwoot:v4.18.0-ce@sha256:faaa58a911cda8f2ab9d717ddf8ca4332163b07da4c5da10711d896e5d667442
USER root
RUN apk add --no-cache su-exec && addgroup -g 10001 dracma && adduser -D -u 10001 -G dracma dracma \
    && mkdir -p /app/tmp/pids /app/tmp/cache /app/log /app/storage /opt/dracma \
    && chown -R 10001:10001 /app/tmp /app/log /app/storage
COPY --chmod=0555 start.sh /opt/dracma/start.sh
COPY --chmod=0444 bootstrap.rb faq.json /opt/dracma/
COPY --chmod=0444 railway_health.rb /app/config/initializers/railway_health.rb
ENTRYPOINT ["/opt/dracma/start.sh"]
