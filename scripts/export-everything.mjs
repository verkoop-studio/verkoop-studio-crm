/*
 * Take a complete copy of a Supabase project through its own API.
 *
 * Why this exists: the dashboard login is one thing and the data is another.
 * A service role key — the one the deployed server already holds — reads every
 * row in every table, every account, and every file in the private bucket,
 * with no dashboard involved. So a project nobody can log in to any more is
 * still a project you can take your business out of.
 *
 * What it cannot take
 * -------------------
 * Password hashes. They live in `auth.users` and no API hands them out; only a
 * direct Postgres connection does, and that needs the database password, which
 * is behind the same dashboard. Everyone signs in once more after a move.
 * Everything else about an account — address, name, metadata, which addresses
 * were confirmed, when they last signed in — does come across.
 *
 * Run it
 * ------
 *   read -rs SUPABASE_SERVICE_ROLE_KEY && export SUPABASE_SERVICE_ROLE_KEY
 *   export SUPABASE_URL=https://<project>.supabase.co
 *   npm run export:all
 *
 * `read -rs` is deliberate: the key never reaches the shell history, a process
 * list, or this file. Nothing is printed except counts.
 *
 * What lands on disk is every lead, every contact and every signed contract
 * the business has. `export/` is in .gitignore and must stay there.
 */

import { mkdirSync, writeFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";

const BASE = (process.env["SUPABASE_URL"] ?? "").replace(/\/+$/, "");
const KEY = process.env["SUPABASE_SERVICE_ROLE_KEY"] ?? "";
const OUT =
  process.env["EXPORT_DIR"] ??
  join("export", new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-"));

if (!BASE || !KEY) {
  console.error(
    "Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY first. See the comment at the top of this file.",
  );
  process.exit(1);
}
if (existsSync(OUT)) {
  console.error(
    `${OUT} already exists. Export somewhere else rather than over a copy you may still need.`,
  );
  process.exit(1);
}

/** Every table in the public schema, with the key that makes paging stable. */
const TABLES = {
  account_requests: "id",
  activities: "id",
  app_settings: "company_id,key",
  companies: "id",
  company_invitations: "id",
  import_batches: "id",
  leads: "id",
  profiles: "id",
  teamleader_contacts: "id",
  user_roles: "id",
};

const BUCKETS = ["lead-documents"];
const PAGE = 1000;

const headers = { apikey: KEY, Authorization: `Bearer ${KEY}` };

function save(relative, data) {
  const path = join(OUT, relative);
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, data);
  return path;
}

async function ask(url, init = {}) {
  const response = await fetch(url, { ...init, headers: { ...headers, ...(init.headers ?? {}) } });
  if (!response.ok) {
    // Never echo the body: an error from PostgREST can quote the row it choked on.
    throw new Error(`${init.method ?? "GET"} ${new URL(url).pathname} answered ${response.status}`);
  }
  return response;
}

/**
 * One table, in pages, ordered by its primary key.
 *
 * The order matters more than it looks: without it PostgREST makes no promise
 * about which rows a later page holds, so a busy table can hand you one row
 * twice and miss another. The count comes from the server rather than from
 * what was written, so the manifest can say whether the two agree.
 */
async function exportTable(name, key) {
  const order = key
    .split(",")
    .map((column) => `${column}.asc`)
    .join(",");
  const rows = [];
  for (let offset = 0; ; offset += PAGE) {
    const url = `${BASE}/rest/v1/${name}?select=*&order=${order}&limit=${PAGE}&offset=${offset}`;
    const page = await (await ask(url)).json();
    rows.push(...page);
    if (page.length < PAGE) break;
  }
  const counted = await ask(`${BASE}/rest/v1/${name}?select=${key.split(",")[0]}&limit=1`, {
    method: "HEAD",
    headers: { Prefer: "count=exact" },
  });
  const reported = Number((counted.headers.get("content-range") ?? "/0").split("/")[1]);
  save(`tables/${name}.json`, JSON.stringify(rows, null, 2));
  return { rows: rows.length, reported, agrees: rows.length === reported };
}

/** Accounts, without their passwords. */
async function exportUsers() {
  const users = [];
  for (let page = 1; ; page++) {
    const body = await (
      await ask(`${BASE}/auth/v1/admin/users?page=${page}&per_page=${PAGE}`)
    ).json();
    const batch = body.users ?? [];
    users.push(...batch);
    if (batch.length < PAGE) break;
  }
  save("auth/users.json", JSON.stringify(users, null, 2));
  return { users: users.length, confirmed: users.filter((u) => u.email_confirmed_at).length };
}

/** Every object in a bucket, folders and all, with the bytes beside the listing. */
async function exportBucket(bucket) {
  const found = [];
  const walk = async (prefix) => {
    for (let offset = 0; ; offset += PAGE) {
      const response = await ask(`${BASE}/storage/v1/object/list/${bucket}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prefix,
          limit: PAGE,
          offset,
          sortBy: { column: "name", order: "asc" },
        }),
      });
      const entries = await response.json();
      for (const entry of entries) {
        const path = prefix ? `${prefix}/${entry.name}` : entry.name;
        // A row with no id is a folder, not an object: Supabase lists the two
        // the same way and only the object carries metadata.
        if (entry.id) found.push({ path, size: entry.metadata?.size ?? null });
        else await walk(path);
      }
      if (entries.length < PAGE) break;
    }
  };
  await walk("");

  let bytes = 0;
  for (const object of found) {
    const file = await ask(`${BASE}/storage/v1/object/${bucket}/${encodeURI(object.path)}`);
    const body = Buffer.from(await file.arrayBuffer());
    bytes += body.length;
    save(join("storage", bucket, object.path), body);
  }
  save(`storage/${bucket}.json`, JSON.stringify(found, null, 2));
  return { objects: found.length, bytes };
}

const manifest = {
  takenAt: new Date().toISOString(),
  project: new URL(BASE).host,
  tables: {},
  passwordsIncluded: false,
};

for (const [name, key] of Object.entries(TABLES)) {
  manifest.tables[name] = await exportTable(name, key);
  const { rows, reported, agrees } = manifest.tables[name];
  console.log(
    `${agrees ? "✓" : "!"} ${name.padEnd(22)} ${String(rows).padStart(7)} rows${agrees ? "" : ` (the server counts ${reported})`}`,
  );
}

manifest.auth = await exportUsers();
console.log(
  `✓ ${"auth.users".padEnd(22)} ${String(manifest.auth.users).padStart(7)} accounts, ${manifest.auth.confirmed} confirmed, no passwords`,
);

manifest.storage = {};
for (const bucket of BUCKETS) {
  manifest.storage[bucket] = await exportBucket(bucket);
  const { objects, bytes } = manifest.storage[bucket];
  console.log(
    `✓ ${bucket.padEnd(22)} ${String(objects).padStart(7)} files, ${(bytes / 1e6).toFixed(1)} MB`,
  );
}

save("manifest.json", JSON.stringify(manifest, null, 2));

const short = Object.entries(manifest.tables).filter(([, t]) => !t.agrees);
console.log(`\nWritten to ${OUT}`);
if (short.length) {
  console.log(
    `\n${short.length} table(s) came back short of the server's own count. Run it again before trusting this copy:`,
  );
  for (const [name, t] of short)
    console.log(`  ${name}: wrote ${t.rows}, server counts ${t.reported}`);
  process.exit(1);
}
console.log(
  "Every table matches the count the server reports. Passwords are not in here by design.",
);
