/*
 * The secrets the stack needs, generated here rather than invented by hand.
 *
 * `node self-host/keys.mjs` prints a block ready to paste into an .env file or
 * into Railway's variables. It prints to stdout and writes nothing: whatever
 * you do with it afterwards is a decision you make on purpose.
 *
 * The anon and service keys are not random strings. They are JWTs signed with
 * JWT_SECRET, carrying `role: anon` and `role: service_role`, which is exactly
 * what PostgREST verifies and then uses to pick a database role. Generate them
 * any other way and PostgREST will reject every request.
 *
 * The anon key is public — it ships in the browser bundle, by design. The
 * service key is not: it bypasses row level security entirely and is the
 * difference between one customer's leads and everybody's.
 */

import { createHmac, randomBytes } from "node:crypto";

const base64url = (input) =>
  Buffer.from(input).toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");

function sign(payload, secret) {
  const header = base64url(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const body = base64url(JSON.stringify(payload));
  const signature = createHmac("sha256", secret).update(`${header}.${body}`).digest("base64");
  return `${header}.${body}.${signature.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "")}`;
}

const YEARS = Number(process.env["KEY_YEARS"] ?? 10);
const issuedAt = Math.floor(Date.now() / 1000);
const expiresAt = issuedAt + Math.round(YEARS * 365.25 * 24 * 60 * 60);

// 32 random bytes as hex is 64 characters, over GoTrue's minimum, and prints
// without quoting trouble in any shell or Railway's variable editor.
const jwtSecret = randomBytes(32).toString("hex");
const password = () => randomBytes(24).toString("base64url");

const claims = (role) => ({ iss: "supabase", role, iat: issuedAt, exp: expiresAt });

console.log(`# Generated ${new Date().toISOString().slice(0, 10)}. Keys expire in ${YEARS} years.
# The anon key is public. Everything else here is not.

JWT_SECRET=${jwtSecret}
ANON_KEY=${sign(claims("anon"), jwtSecret)}
SERVICE_ROLE_KEY=${sign(claims("service_role"), jwtSecret)}

POSTGRES_PASSWORD=${password()}
AUTH_DB_PASSWORD=${password()}
STORAGE_DB_PASSWORD=${password()}
AUTHENTICATOR_DB_PASSWORD=${password()}`);
