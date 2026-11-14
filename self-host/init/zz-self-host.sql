-- Everything the Supabase Postgres image does NOT do for itself.
--
-- The filename matters. The image's own roles and schemas are made by
-- `migrate.sh` in the same directory, and the Postgres entrypoint runs what it
-- finds there in plain sort order. Anything named `01-...` runs BEFORE that
-- script and fails on roles that do not exist yet. `zz-` is what puts this
-- last.
--
-- The image is generous: it already creates anon, authenticated,
-- authenticator, service_role, supabase_auth_admin, supabase_storage_admin
-- and supabase_admin, the auth, storage, extensions and vault schemas, and it
-- already lists pg_cron and pg_net in shared_preload_libraries. Checked
-- against a bare container of the pinned tag rather than assumed.
--
-- Three things it leaves undone, and one of them is a trap.

-- 1. The service roles have no passwords. Each service logs in as its own
--    role, so without these the stack comes up and nothing can connect.
--    The values arrive from the environment; see self-host/README.md.
\set auth_pw `echo "$AUTH_DB_PASSWORD"`
\set storage_pw `echo "$STORAGE_DB_PASSWORD"`
\set authenticator_pw `echo "$AUTHENTICATOR_DB_PASSWORD"`
\set jwt_secret `echo "$JWT_SECRET"`

ALTER ROLE supabase_auth_admin    WITH PASSWORD :'auth_pw';
ALTER ROLE supabase_storage_admin WITH PASSWORD :'storage_pw';
ALTER ROLE authenticator          WITH PASSWORD :'authenticator_pw';

-- 2. The trap.
--
--    The image ships auth.uid() reading `request.jwt.claim.sub` — one GUC per
--    claim, the way PostgREST set them before version 9. PostgREST 16 sets a
--    single `request.jwt.claims` JSON instead and nothing else, so the shipped
--    function returns NULL for every request.
--
--    Every row policy in this database is built on auth.uid(). With it
--    returning NULL they do not error: they simply match nothing, so the app
--    comes up, signs people in, and shows them an empty CRM. That is a far
--    worse failure than a crash, and it is invisible until someone logs in.
--
--    These bodies are copied from a working Supabase stack running the same
--    PostgREST tag. They read the new claims and keep the old path, so they
--    are right either way.
CREATE OR REPLACE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$
  select coalesce(
    nullif(current_setting('request.jwt.claim.sub', true), ''),
    (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub')
  )::uuid
$$;

CREATE OR REPLACE FUNCTION auth.role() RETURNS text LANGUAGE sql STABLE AS $$
  select coalesce(
    nullif(current_setting('request.jwt.claim.role', true), ''),
    (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'role')
  )::text
$$;

CREATE OR REPLACE FUNCTION auth.email() RETURNS text LANGUAGE sql STABLE AS $$
  select coalesce(
    nullif(current_setting('request.jwt.claim.email', true), ''),
    (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'email')
  )::text
$$;

-- 3. The extensions the CRM's own migrations expect to find.
--    20261016072038_ga4_crm_meetings.sql creates pg_cron itself and schedules
--    a job that runs every minute, and calls extensions.http_post. Both are
--    available in this image; creating them here means a migration run is not
--    the first thing to discover whether they are.
CREATE SCHEMA IF NOT EXISTS extensions;
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS http WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

-- Some Supabase helpers read the secret from the database rather than from
-- their own environment. Harmless when nothing does, and one less thing to
-- find out the hard way.
ALTER DATABASE postgres SET "app.settings.jwt_secret" TO :'jwt_secret';
