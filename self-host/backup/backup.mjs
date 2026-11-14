/*
 * One database, dumped, uploaded, read back, and the old ones swept up.
 *
 * Supabase took care of this and Railway does not. A volume is one disk in one
 * place, and what is on that disk is the pipeline: every lead, every account,
 * every row policy. This is the job that makes the stack survivable.
 *
 * It runs on a schedule as its own Railway service, and by hand with
 * `node self-host/backup/backup.mjs`.
 *
 * What it takes
 * -------------
 * `pg_dump -Fc` of the whole database, as the superuser, so the dump carries
 * the `auth` and `storage` schemas as well as `public`. That matters: the
 * password hashes in auth.users are the one thing an API-level export cannot
 * reach, and they are ours again the moment we own the database. A restore
 * from this puts everyone back exactly as they were, with no reset.
 *
 * What it does NOT take
 * ---------------------
 * The stored files. With STORAGE_BACKEND=s3 those live in R2 and are kept by
 * R2's own versioning, which is a setting and not a script. With the `file`
 * backend they sit on a Railway volume and NOTHING here protects them — which
 * is the reason the README says production uses s3 and means it.
 *
 * Verification
 * ------------
 * Every upload is read back. A single-part PUT returns the body's MD5 as its
 * ETag, so comparing that against the MD5 of what we sent answers the only
 * question worth asking: is what is up there what we have. A backup nobody has
 * checked is a belief.
 */

import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFileSync, rmSync, statSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { s3FromEnv } from "./s3.mjs";

const DATABASE_URL = process.env["BACKUP_DATABASE_URL"];
const PREFIX = process.env["BACKUP_PREFIX"] ?? "sales-crm/postgres/";
const KEEP_DAYS = Number(process.env["BACKUP_KEEP_DAYS"] ?? 30);

if (!DATABASE_URL) {
  console.error("Set BACKUP_DATABASE_URL to a superuser connection string.");
  process.exit(1);
}

const startedAt = new Date();
const stamp = startedAt.toISOString().replace(/[:T]/g, "-").slice(0, 19);
const name = `${stamp}.dump`;
const local = join(tmpdir(), name);

function human(bytes) {
  return bytes > 1e6 ? `${(bytes / 1e6).toFixed(1)} MB` : `${(bytes / 1e3).toFixed(0)} kB`;
}

try {
  // Same reason the restore checks: `postgres` is not the superuser in the
  // Supabase image. It can read the auth schema today, but a dump taken by a
  // role that could not restore it is a dump nobody should rely on, and the
  // cheapest moment to find that out is before the first one is taken.
  const who = execFileSync(
    "psql",
    [
      DATABASE_URL,
      "-tAc",
      "select current_user, rolsuper from pg_roles where rolname = current_user",
    ],
    { encoding: "utf8" },
  ).trim();
  if (!who.endsWith("|t")) {
    throw new Error(
      `Connected as ${who.split("|")[0]}, which is not a superuser. Back up as supabase_admin.`,
    );
  }

  // -Fc is the custom format: compressed, and pg_restore can read one table
  // out of it without unpacking the rest, which is what you want at the moment
  // you need it. --no-owner keeps the dump loadable into a database whose
  // roles are not named identically.
  execFileSync(
    "pg_dump",
    [
      "--format=custom",
      "--no-owner",
      "--no-privileges",
      "--compress=9",
      "--file",
      local,
      DATABASE_URL,
    ],
    { stdio: ["ignore", "inherit", "inherit"] },
  );

  const body = readFileSync(local);
  const size = statSync(local).size;
  if (size < 1024) throw new Error(`The dump is ${size} bytes. That is not a database.`);

  const md5 = createHash("md5").update(body).digest("hex");
  const s3 = s3FromEnv();
  const key = `${PREFIX}${name}`;

  const etag = await s3.put(key, body, "application/octet-stream");

  // Read it back rather than trusting the 200. The ETag of a single-part
  // upload is the MD5 of the bytes the server actually stored.
  const stored = await s3.head(key);
  if (!stored) throw new Error(`${key} is not there after a successful upload.`);
  if (stored.size !== size) throw new Error(`${key} is ${stored.size} bytes, we sent ${size}.`);
  if (stored.etag !== md5 || (etag && etag !== md5)) {
    throw new Error(`${key} has checksum ${stored.etag}, we sent ${md5}.`);
  }

  console.log(`✓ ${key}  ${human(size)}  md5 ${md5}  verified`);

  // Sweep up. The names are timestamps, so the cut-off is a string compare and
  // nothing depends on the clock of the machine that wrote them.
  const cutoff = new Date(startedAt.getTime() - KEEP_DAYS * 86_400_000)
    .toISOString()
    .replace(/[:T]/g, "-")
    .slice(0, 19);
  const existing = await s3.list(PREFIX);
  const old = existing.filter((k) => k.slice(PREFIX.length).replace(/\.dump$/, "") < cutoff);

  // Never leave nothing behind. If a clock or a prefix goes wrong, deleting
  // every backup is the one mistake this job must not be able to make.
  const keeping = existing.length - old.length;
  if (keeping < 1) {
    console.log(
      `! ${old.length} backups look older than ${KEEP_DAYS} days and none would be left. Kept them all.`,
    );
  } else {
    for (const key of old) await s3.delete(key);
    if (old.length)
      console.log(`  swept ${old.length} older than ${KEEP_DAYS} days, ${keeping} kept`);
  }

  console.log(
    `  ${existing.length ? Math.max(keeping, existing.length) : 1} backup(s) in ${PREFIX}`,
  );
} finally {
  rmSync(local, { force: true });
}
