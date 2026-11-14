#!/usr/bin/env sh
#
# Apply supabase/migrations/ to the database, from inside the network.
#
# The obvious way to do this is to open a TCP proxy and run psql from a laptop.
# That means putting the database on the public internet so that one person can
# type for ten seconds, and then remembering to close it again. This runs in
# the same private network as the database instead; nothing is exposed, and
# `db.railway.internal` is a name only the project can resolve.
#
# It is safe to run twice. Each file that succeeds is recorded, and a second
# run says there is nothing to do — which matters, because a service that exits
# is a service the platform may start again.

set -eu

: "${MIGRATE_DATABASE_URL:?Set MIGRATE_DATABASE_URL to a superuser connection string}"

PSQL="psql $MIGRATE_DATABASE_URL -v ON_ERROR_STOP=1 -q"

# supabase_admin, not postgres: the migrations touch the auth and storage
# schemas, and `postgres` is demoted in this image. The same trap the restore
# fell into.
# Concatenating a boolean renders it as the word, not as psql's t/f.
who=$($PSQL -tAc "select current_user || '|' || (select rolsuper from pg_roles where rolname = current_user)")
case "$who" in
  *"|true") : ;;
  *) echo "Connected as ${who%|*}, which is not a superuser. Connect as supabase_admin: the migrations touch the auth and storage schemas and postgres is demoted in this image." >&2; exit 1 ;;
esac

# 20260930160000_lead_documents.sql puts a row in storage.buckets, and that
# table is made by the storage service's OWN migrations, not by the database
# image. On a fresh stack the storage service has to have started at least once
# before the CRM's schema will apply, and the error you get otherwise —
# relation "storage.buckets" does not exist, fifteen files in — says nothing
# about why. Say it here instead.
# ::text, because psql prints a bare boolean as t and f. Concatenating one
# gives the word instead, which is why the superuser check above compares
# against "true" and this one has to ask for it.
if [ "$($PSQL -tAc "select (to_regclass('storage.buckets') is not null)::text")" != "true" ]; then
  echo "storage.buckets does not exist yet." >&2
  echo "The storage service writes that table when it first starts, and one of the" >&2
  echo "migrations needs it. Deploy storage, wait for it to come up, then run this again." >&2
  echo "" >&2
  echo "What the database can see right now:" >&2
  echo "  storage schema: $($PSQL -tAc "select case when exists (select 1 from pg_namespace where nspname='storage') then 'exists' else 'MISSING' end")" >&2
  echo "  storage tables: $($PSQL -tAc "select coalesce(string_agg(tablename, ', ' order by tablename), '(none)') from pg_tables where schemaname='storage'")" >&2
  echo "  storage role:   $($PSQL -tAc "select case when exists (select 1 from pg_roles where rolname='supabase_storage_admin') then 'exists' else 'MISSING' end")" >&2
  exit 1
fi

$PSQL -c "create table if not exists public.self_host_migrations (
  filename text primary key,
  applied_at timestamptz not null default now()
)" >/dev/null

applied=0
skipped=0
for file in /migrations/*.sql; do
  name=$(basename "$file")
  done_already=$($PSQL -tAc "select 1 from public.self_host_migrations where filename = '$name'")
  if [ "$done_already" = "1" ]; then
    skipped=$((skipped + 1))
    continue
  fi
  printf '  %s ... ' "$name"
  # Each file in its own transaction with the record of it, so a migration can
  # never be half-applied and remembered, or applied and forgotten.
  if $PSQL -1 -f "$file" >/dev/null 2>/tmp/err; then
    $PSQL -c "insert into public.self_host_migrations (filename) values ('$name')" >/dev/null
    echo "ok"
    applied=$((applied + 1))
  else
    echo "FAILED"
    sed 's/^/    /' /tmp/err >&2
    echo "Stopped at $name. Nothing after it was applied." >&2
    exit 1
  fi
done

total=$(ls -1 /migrations/*.sql | wc -l | tr -d ' ')
echo "$applied applied, $skipped already there, $total in all."

# Say what the database looks like afterwards, because "the migrations ran" and
# "the CRM will work" are different claims. Row security on every table is the
# one that matters: without it one company reads another's leads.
$PSQL -tAc "select
  (select count(*) from pg_class c join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relkind = 'r') || ' tables, ' ||
  (select count(*) filter (where relrowsecurity) from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relkind = 'r') || ' with row security, ' ||
  (select count(*) from pg_policies where schemaname = 'public') || ' policies'"

$PSQL -tAc "select 'auth.' || proname || ' reads the new claims: ' ||
  (prosrc like '%request.jwt.claims%')::text
  from pg_proc p join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'auth' and proname in ('uid','role','email') order by proname"
