# Demo data

For a **local, throwaway database only**. Never for the production CRM, never
for any database that holds a real lead.

The screens in this product cannot be judged against the design boards on an
empty database. Half of what the boards draw is a state — a stale lead, a
workspace with nothing in it, a name too long for its column, a person waiting
for an account — and none of those appear unless something put them there.
These two scripts put them there.

## What you get

Three workspaces, all invented:

| Workspace | What it is for |
| --- | --- |
| **Hanssens Keukens** | 184 leads, matching the design boards figure for figure. The one to compare screens against. |
| **Velden Fietsen** | The signed-in user is a **sales rep** here, not an admin. Holds the awkward values: a company name nobody would fit in a column, a €1.250.000 deal, leads with no owner. |
| **Vanden Broucke Interieurbouw en Keukenrenovatie** | Empty, for the first-run screen, and long enough to test the switcher. |

Hanssens Keukens reproduces the dashboard, Leads and Prospectflow boards
exactly: 184 leads, 96 open, 38 won, 50 lost, a 43% win rate, €412.500 of open
pipeline with 31 not yet valued, per-stage totals of €22.000 / €58.500 /
€96.000 / €129.500 / €106.500, 39 leads owned by the signed-in user worth
€191.500, an eight-week inflow of 9-14-11-16-12-19-12-17, 23 leads needing
follow-up, 11 waiting for a first contact, 4 proposals gone quiet, and a team
carrying 81 / 62 / 41 accounts. `demo-data.mjs` asserts every one of those
before it prints a line of SQL, so if a change here stops matching the boards
you get an error rather than a database that merely looks plausible.

Also seeded: two people waiting for an account, one invited and not yet
accepted, two finished imports, a lead with a history long enough to scroll,
one with a single entry and one with none.

## Running it

Both scripts refuse to touch anything that is not local, and the SQL refuses
to load into a database holding leads, memberships or accounts it did not
create itself.

```bash
npx supabase start
npx supabase db reset        # applies every migration in supabase/migrations/
npm run demo:data | docker exec -i supabase_db_sales-crm psql -U postgres -v ON_ERROR_STOP=1 -q
npm run demo:docs            # 41 quotes and 18 contracts over 24 companies
```

`npm run demo:data` only writes SQL to stdout; nothing happens until you pipe
it somewhere. Read it first if you like — it is meant to be read.

Sign in as `tanguy@verkoopstudio.test`. The password is `demo-only-password`
unless you set `DEMO_PASSWORD`; it is a fixture for a disposable database, not
a credential. The other accounts (`sofie@`, `jens@`) share it.

## Two things worth knowing

**Documents are uploaded, not inserted.** The `lead-documents` bucket is
readable only by whoever uploaded a file (`owner_id = auth.uid()`), so
`demo-documents.mjs` signs in and uploads through the same storage call the app
uses. Writing `storage.objects` rows directly would produce paperwork the
Quotes and contracts screen cannot see.

**The timestamps are computed when you run it.** The dashboard buckets leads
into the last eight calendar weeks and calls a lead stale after seven quiet
days, so a fixed `.sql` file would drift out of shape within days. Re-run
`demo:data` rather than keeping its output around.
