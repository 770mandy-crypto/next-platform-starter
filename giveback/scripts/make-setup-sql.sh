#!/usr/bin/env bash
# Concatenates the migrations into supabase/setup.sql: one file to paste into
# the Supabase SQL editor to create the whole database on a new project.
set -euo pipefail
cd "$(dirname "$0")/.."
{
  echo "-- GiveBack — full database setup. Generated from supabase/migrations by"
  echo "-- scripts/make-setup-sql.sh; do not edit by hand."
  echo "-- Paste into Supabase → SQL Editor → New query → Run, once, on an empty project."
  for f in supabase/migrations/*.sql; do
    echo
    echo "-- ===== $(basename "$f") ====="
    cat "$f"
  done
} > supabase/setup.sql
echo "wrote supabase/setup.sql"
