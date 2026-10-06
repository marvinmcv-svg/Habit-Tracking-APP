#!/usr/bin/env bash
# Spins up Postgres 16 + PostgREST with the repo migrations, then runs the sync e2e test.
# Requires: Postgres 16 binaries (/usr/lib/postgresql/16/bin), a `postgrest` binary on PATH or $POSTGREST.
set -euo pipefail
HERE="$(cd "$(dirname "$0")" && pwd)"
ROOT="$HERE/../../.."
PGB="${PGBIN:-/usr/lib/postgresql/16/bin}"
POSTGREST="${POSTGREST:-postgrest}"
DIR="$(mktemp -d /tmp/bloom-e2e.XXXX)"
SECRET="e2e-secret-that-is-at-least-32-characters-long"
RUNAS=""; [ "$(id -u)" = 0 ] && { chown -R postgres "$DIR"; RUNAS="su postgres -c"; }
run() { if [ -n "$RUNAS" ]; then su postgres -c "$*"; else sh -c "$*"; fi; }

run "$PGB/initdb -D $DIR/data -A trust -U postgres >/dev/null"
run "$PGB/pg_ctl -D $DIR/data -o '-p 55433 -k $DIR' -l $DIR/pg.log start >/dev/null"
trap 'run "$PGB/pg_ctl -D $DIR/data stop -m fast" >/dev/null 2>&1; kill $(jobs -p) 2>/dev/null; rm -rf "$DIR"' EXIT
sleep 2
PSQL="psql -h $DIR -p 55433 -U postgres -v ON_ERROR_STOP=1 -q"
$PSQL -c 'create database bloom'
$PSQL -d bloom -f "$HERE/auth-stub.sql"
for f in "$ROOT"/supabase/migrations/*.sql; do $PSQL -d bloom -f "$f"; done
$PSQL -d bloom -f "$HERE/grants.sql"

cat > "$DIR/pgrst.conf" <<CONF
db-uri = "postgres://authenticator@/bloom?host=$DIR&port=55433"
db-schemas = "public"
db-anon-role = "anon"
jwt-secret = "$SECRET"
server-port = 54390
CONF
"$POSTGREST" "$DIR/pgrst.conf" > "$DIR/pgrst.log" 2>&1 &
node "$HERE/proxy.mjs" 54391 http://127.0.0.1:54390 "-h $DIR -p 55433 -U postgres -d bloom" &
sleep 2

cd "$ROOT/apps/mobile"
SYNC_E2E_URL=http://127.0.0.1:54391 SYNC_E2E_JWT_SECRET="$SECRET" npx jest -c jest.e2e.config.js "$@"
