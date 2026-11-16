/*
 * Put a backup back.
 *
 *   node self-host/backup/restore.mjs                 # the newest one
 *   node self-host/backup/restore.mjs 2026-11-14-09-30-00.dump
 *   node self-host/backup/restore.mjs --list
 *
 * The target is RESTORE_DATABASE_URL, which is deliberately not the same
 * variable the backup reads. Restoring is the one operation in this folder
 * that can destroy a working database, and it should not be possible to do it
 * to production by forgetting which shell you are in.
 *
 * It refuses a target that already holds data unless RESTORE_OVERWRITE=yes.
 *
 * This is also the drill. A backup nobody has restored is a belief rather than
 * a backup, so run it into a throwaway database now and again and count the
 * rows — the last thing it prints is what came back.
 */

import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { writeFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { s3FromEnv } from "./s3.mjs";

const PREFIX = process.env["BACKUP_PREFIX"] ?? "sales-crm/postgres/";
const TARGET = process.env["RESTORE_DATABASE_URL"];
const OVERWRITE = process.env["RESTORE_OVERWRITE"] === "yes";

const argument = process.argv[2];
const s3 = s3FromEnv();

const backups = await s3.list(PREFIX);
if (!backups.length) {
  console.error(`Nothing under ${PREFIX}. There is no backup to put back.`);
  process.exit(1);
}

if (argument === "--list") {
  for (const key of backups) {
    const head = await s3.head(key);
    console.log(`${key}  ${((head?.size ?? 0) / 1e6).toFixed(1)} MB`);
  }
  process.exit(0);
}

if (!TARGET) {
  console.error("Set RESTORE_DATABASE_URL to the database that should receive this.");
  process.exit(1);
}

const key = argument ? `${PREFIX}${argument.replace(PREFIX, "")}` : backups[backups.length - 1];
if (!backups.includes(key)) {
  console.error(`${key} is not one of the backups. --list shows them.`);
  process.exit(1);
}

const psql = (sql) => execFileSync("psql", [TARGET, "-tAc", sql], { encoding: "utf8" }).trim();

/*
 * Connect as the superuser or do not start.
 *
 * In the Supabase Postgres image `postgres` is not a superuser — one of the
 * image's own migrations demotes it — and `supabase_admin` is. A pg_restore
 * run as `postgres` is refused on the `auth` schema, does not stop, works
 * happily through `public`, and leaves a database holding every lead and not
 * one account. It looks like a restore. Found that way, which is why the check
 * is here rather than in a comment.
 */
if (psql("select rolsuper from pg_roles where rolname = current_user") !== "t") {
  console.error(
    `Connected as ${psql("select current_user")}, which is not a superuser.\n` +
      "Restore as supabase_admin. As anyone else the auth schema is silently skipped\n" +
      "and what you get back is a CRM with no accounts in it.",
  );
  process.exit(1);
}

// A restore over a database with rows in it is almost always a mistake, and
// the one time it is not, saying so costs a word.
const existing = Number(
  psql("select count(*) from information_schema.tables where table_schema = 'public'"),
);
if (existing > 0 && !OVERWRITE) {
  console.error(
    `The target already has ${existing} tables in public. Restore into an empty database,\n` +
      "or set RESTORE_OVERWRITE=yes if replacing them is what you mean.",
  );
  process.exit(1);
}

const local = join(tmpdir(), "restore.dump");
try {
  const body = await s3.get(key);
  const head = await s3.head(key);
  const md5 = createHash("md5").update(body).digest("hex");
  if (head && head.etag !== md5) {
    throw new Error(`${key} did not come back whole: ${md5} against ${head.etag}.`);
  }
  writeFileSync(local, body);
  console.log(`${key}  ${(body.length / 1e6).toFixed(1)} MB  checksum matches`);

  // --clean --if-exists makes a re-run safe. Errors are not fatal on purpose:
  // a dump carrying the auth and storage schemas will always have a handful of
  // objects the target's own image already made, and stopping on the first of
  // those would mean never restoring anything. What decides whether it worked
  // is the count at the end, not a silent exit code.
  execFileSync(
    "pg_restore",
    ["--dbname", TARGET, "--no-owner", "--no-privileges", "--clean", "--if-exists", local],
    { stdio: ["ignore", "inherit", "pipe"] },
  );
} catch (error) {
  if (error.status === undefined) throw error;
  console.log("  pg_restore reported errors; the counts below are what decides.");
} finally {
  rmSync(local, { force: true });
}

console.log("\nWhat came back:");
const counts = psql(`
  select 'auth.users ' || count(*) from auth.users
  union all select 'companies  ' || count(*) from public.companies
  union all select 'leads      ' || count(*) from public.leads
  union all select 'activities ' || count(*) from public.activities
  union all select 'user_roles ' || count(*) from public.user_roles
`);
console.log(
  counts
    .split("\n")
    .map((line) => `  ${line}`)
    .join("\n"),
);

const accounts = Number(psql("select count(*) from auth.users"));
if (accounts === 0) {
  console.error(
    "\nauth.users is empty. A CRM with no accounts is not a restore, whatever\n" +
      "else came back. Do not point anything at this database.",
  );
  process.exit(1);
}

const withPasswords = Number(
  psql(
    "select count(*) from auth.users where encrypted_password is not null and encrypted_password <> ''",
  ),
);
console.log(
  `\n  ${withPasswords} of ${accounts} accounts came back with a usable password.` +
    "\n  A dump carries the hashes, so whatever an account had, it still has. An account\n" +
    "  brought in through the API import never had one and still needs its first reset.",
);
