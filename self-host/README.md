# Running the database ourselves

The CRM's Supabase project is in an account nobody here can sign in to. This folder moves it somewhere we own, without touching a line of the app.

That last part is the whole design. Supabase is not one thing — it is Postgres, PostgREST on top of it, GoTrue for accounts and Storage for files, behind a gateway that puts them all on one address. The app calls all four: 22 PostgREST queries, 13 database functions, 23 auth calls, one storage call, and no realtime subscriptions anywhere. Give it the same shape of address and it cannot tell the difference. Replace Supabase with a plain Postgres and it is not a migration, it is writing a new back end — including re-expressing every row policy, which is the only thing keeping one customer's leads away from another's.

So: the same four services, pinned to the versions the working project runs today, on Railway.

## What runs

| Service   | Image                          | What it is                                                        |
| --------- | ------------------------------ | ----------------------------------------------------------------- |
| `db`      | built from `Dockerfile.db`     | Postgres, with the roles, schemas and extensions Supabase expects |
| `auth`    | `supabase/gotrue:v2.197.0`     | accounts, sessions, the confirmation and reset mail               |
| `rest`    | `supabase/postgrest:v16.5`     | every `supabase.from(...)` in the app                             |
| `storage` | `supabase/storage-api:v1.90.1` | the `lead-documents` bucket                                       |
| `kong`    | `supabase/kong:2.8.1`          | one origin, with `/auth/v1`, `/rest/v1` and `/storage/v1` on it   |

Realtime, Studio, the edge runtime, analytics and the pooler are deliberately absent. Nothing in the CRM calls them, and every service that exists is a service that can break.

Versions are read off the working project rather than taken from a README. The app's migrations, its row policies and PostgREST's claim handling are all version-sensitive.

## Try it here first

```bash
node self-host/keys.mjs > self-host/.env
# then add the block under "Variables" below to that file
docker compose -f self-host/docker-compose.yml --env-file self-host/.env up -d --build
```

This brings up the same five services plus a mail catcher on <http://127.0.0.1:54334>, so a confirmation mail can be read without sending one to a stranger. Point the app at it with `VITE_SUPABASE_URL=http://127.0.0.1:54331` and the generated `ANON_KEY`.

## On Railway

One project, five services, in this order. Each service's private hostname is its name, so `db`, `auth`, `rest` and `storage` resolve inside the project.

1. **`db`** — deploy from this repository, Dockerfile `self-host/Dockerfile.db`, root directory `self-host`. Attach a volume at `/var/lib/postgresql/data`. Set `POSTGRES_PASSWORD`, `JWT_SECRET`, `AUTH_DB_PASSWORD`, `STORAGE_DB_PASSWORD`, `AUTHENTICATOR_DB_PASSWORD`. **The init SQL runs once, on an empty volume.** Get these right before the first boot or start the volume again.
2. **`rest`, `auth`, `storage`** — deploy from their images, with the variables from `docker-compose.yml`.
3. **`kong`** — from its image, with `kong.yml` mounted or baked in, and a public domain. That domain is what the app gets as `VITE_SUPABASE_URL`.

Then apply the schema, from a machine with `psql` and the public database URL:

```bash
for f in supabase/migrations/*.sql; do psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -q -f "$f" || break; done
```

All 22 apply clean on a fresh stack. Walked, not assumed.

## Variables

`node self-host/keys.mjs` prints the secrets. The rest describe the deployment:

```
PUBLIC_API_URL=https://<the kong domain>
SITE_URL=https://crm.verkoop.studio
URI_ALLOW_LIST=https://crm.verkoop.studio/**
MAILER_EXTERNAL_HOSTS=<the kong domain>
MAILER_AUTOCONFIRM=false
SMTP_HOST=smtp.resend.com
SMTP_PORT=465
SMTP_USER=resend
SMTP_PASS=<a Resend API key>
SMTP_SENDER=account@send.verkoop.studio
SMTP_SENDER_NAME=Verkoop Studio Sales
TEMPLATE_BASE_URL=https://crm.verkoop.studio/auth-mail
STORAGE_BACKEND=s3
```

`SITE_URL` and `URI_ALLOW_LIST` are the two settings that mailed out a working link to a machine the reader did not own. Here they are variables in a file we control, reviewed like anything else, instead of fields in a dashboard nobody can open.

`TEMPLATE_BASE_URL` must serve the five files from `supabase/templates/` over HTTP. Serving them from the CRM's own `public/auth-mail/` keeps the app and what it says in one repository.

## Three things that will bite

**The init SQL has to run last.** The Postgres image makes its own roles and schemas from `migrate.sh` in the same directory, and the entrypoint runs that directory in plain sort order. `zz-` is what puts ours after it. Named `01-`, it fails on roles that do not exist yet.

**`auth.uid()` must be replaced.** The image ships the version that reads `request.jwt.claim.sub`, one GUC per claim, the way PostgREST set them before version 9. PostgREST 16 sets a single `request.jwt.claims` JSON and nothing else, so the shipped function returns NULL for every request — and every row policy here is built on it. They do not error, they match nothing. The app comes up, signs people in, and shows them an empty CRM. `init/zz-self-host.sql` replaces all three helpers with the bodies a working stack runs.

**The link in the mail has no `/auth/v1` in it.** This tag of GoTrue throws away any path on `API_EXTERNAL_URL` and writes `<scheme>://<host>/verify`. Tried both ways and read the mail. `kong.yml` answers `/verify`, `/callback` and `/authorize` at the root for that reason. Remove those routes and every confirmation mail is perfect and every link in one is a 404.

## Backups

Supabase did this; Railway does not. A volume is one disk in one place, and what is on it is the pipeline.

Nothing here sets that up yet. Before this takes real traffic, there must be a `pg_dump` on a schedule, written somewhere that is not Railway — Cloudflare R2 is already in the picture for storage — and a restore that has actually been run once. A backup nobody has restored is a belief, not a backup.

The same goes for `STORAGE_BACKEND`. `file` puts the signed contracts on the same disk; `s3` against R2 puts them somewhere that survives the service being deleted. Use `s3`.

## Moving the data

`npm run export:all` against the old project, then `npm run import:all` against the export. The import writes SQL rather than calling the API, because `leads.owner_id`, `profiles.id` and `user_roles.user_id` all point at `auth.users(id)` and re-creating accounts through the API would give them new ids — leads with no owner, nobody with a role, a CRM that loads and is empty.

Walked end to end between two live stacks: 203 leads, 244 rows across ten tables, 17 accounts with their ids intact, 118 files and 61 MB, and a document downloaded back out afterwards.

The one thing that does not travel is passwords. No API hands out a hash, so every account arrives with none and everybody signs in once with "forgot my password". If the old dashboard is ever reachable again, even for ten minutes, take the database password and `pg_dump` instead: that brings the hashes and nobody notices the move at all.
