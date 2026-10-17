#!/usr/bin/env bash
# Starts a local PostgreSQL and creates the sales databases (idempotent).
# For development and evaluation runs on a machine or container with
# PostgreSQL installed. Prints the DATABASE_URL to use.
set -euo pipefail
service postgresql start >/dev/null 2>&1 || pg_ctlcluster 16 main start || true
for _ in 1 2 3 4 5; do pg_isready -q && break; sleep 1; done
run() { su postgres -c "psql -qtAc \"$1\""; }
[ "$(run "SELECT 1 FROM pg_roles WHERE rolname = 'sales'")" = 1 ] || run "CREATE ROLE sales LOGIN PASSWORD 'sales'"
for db in sales sales_test; do
    [ "$(run "SELECT 1 FROM pg_database WHERE datname = '$db'")" = 1 ] || run "CREATE DATABASE $db OWNER sales"
done
echo "DATABASE_URL=postgres://sales:sales@localhost/sales"
echo "SALES_TEST_DATABASE_URL=postgres://sales:sales@localhost/sales_test"
