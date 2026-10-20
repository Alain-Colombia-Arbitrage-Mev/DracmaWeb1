#!/bin/sh
set -eu
umask 077
if [ "$(id -u)" = 0 ]; then
  if [ "${DRACMA_PROCESS:-web}" = web ]; then chown 10001:10001 /app/storage; chmod 700 /app/storage; fi
  exec su-exec 10001:10001 /opt/dracma/start.sh
fi
cd /app
until pg_isready -q -h "$POSTGRES_HOST" -p "${POSTGRES_PORT:-5432}" -U "$POSTGRES_USERNAME"; do sleep 2; done
if [ "${DRACMA_PROCESS:-web}" = worker ]; then
  until bundle exec rails runner 'exit(ActiveRecord::Base.connection.table_exists?("installation_configs") ? 0 : 1)' >/dev/null 2>&1; do sleep 5; done
  exec bundle exec sidekiq -C config/sidekiq.yml
fi
rm -f /app/tmp/pids/server.pid
bundle exec rails db:chatwoot_prepare
bundle exec rails runner /opt/dracma/bootstrap.rb
exec bundle exec rails s -b 0.0.0.0 -p "${PORT:-3000}"
