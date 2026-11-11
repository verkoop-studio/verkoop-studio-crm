#!/usr/bin/env node
/*
 * Open the OAuth consent screen locally. LOCAL, THROWAWAY ONLY.
 *
 *   npm run demo:consent
 *
 * /oauth/consent is the one screen in this product that cannot be reached by
 * clicking: it needs an authorization that only the authorization server can
 * create, and it refuses to render without one. That is correct — it is the
 * screen where somebody hands an assistant their leads — but it also meant
 * nobody could look at it while building it.
 *
 * This registers a throwaway OAuth client against the local Supabase, starts
 * an authorization with PKCE, and prints the URL the authorization server
 * redirects to, pointed at whichever port the dev server is on. Approving it
 * grants a client that does not exist access to a database full of invented
 * Belgians, which is the point.
 *
 * Requires `[auth.oauth_server] enabled = true` in supabase/config.toml, which
 * is why that is committed: without it the local stack answers "OAuth server
 * is disabled" and this screen stays unreachable in development.
 */

import { createHash, randomBytes } from "node:crypto";
import { readFileSync } from "node:fs";

const APP = process.env["DEMO_APP_URL"] || "http://127.0.0.1:5173";
const CLIENT_NAME = process.argv[2] || "Claude";

function localSupabase() {
  let url = process.env["VITE_SUPABASE_URL"] || process.env["SUPABASE_URL"];
  let key = process.env["VITE_SUPABASE_PUBLISHABLE_KEY"] || process.env["SUPABASE_PUBLISHABLE_KEY"];
  if (!url || !key) {
    try {
      for (const line of readFileSync(".env", "utf8").split("\n")) {
        const match = /^\s*([A-Z_]+)\s*=\s*(.*)\s*$/.exec(line);
        if (!match) continue;
        const [, name, value] = match;
        if (!url && name.endsWith("SUPABASE_URL")) url = value;
        if (!key && name.endsWith("SUPABASE_PUBLISHABLE_KEY")) key = value;
      }
    } catch {
      /* reported below */
    }
  }
  if (!url || !key) throw new Error("no local Supabase configuration found in env or .env");
  const host = new URL(url).hostname;
  if (!["127.0.0.1", "localhost", "::1", "[::1]"].includes(host))
    throw new Error(`refusing to register an OAuth client against ${host}`);
  return { url, key };
}

const base64url = (buffer) => buffer.toString("base64url");

const { url, key } = localSupabase();
const auth = `${url.replace(/\/$/, "")}/auth/v1`;

const registration = await fetch(`${auth}/oauth/clients/register`, {
  method: "POST",
  headers: { "Content-Type": "application/json", apikey: key },
  body: JSON.stringify({
    client_name: CLIENT_NAME,
    // Nothing listens here. The screen is the point, not the token exchange.
    redirect_uris: [`${APP}/oauth/callback`],
    grant_types: ["authorization_code"],
    response_types: ["code"],
    token_endpoint_auth_method: "none",
  }),
});
if (!registration.ok) {
  const body = await registration.text();
  throw new Error(
    registration.status === 404
      ? "the authorization server is off: check [auth.oauth_server] in supabase/config.toml, then `npx supabase stop && npx supabase start`"
      : `could not register a client (${registration.status}): ${body.slice(0, 300)}`,
  );
}
const { client_id: clientId } = await registration.json();

const verifier = base64url(randomBytes(48));
const challenge = base64url(createHash("sha256").update(verifier).digest());
const query = new URLSearchParams({
  client_id: clientId,
  redirect_uri: `${APP}/oauth/callback`,
  response_type: "code",
  scope: "openid",
  state: base64url(randomBytes(9)),
  code_challenge: challenge,
  code_challenge_method: "S256",
  apikey: key,
});

const started = await fetch(`${auth}/oauth/authorize?${query}`, { redirect: "manual" });
const location = started.headers.get("location");
if (!location) throw new Error(`no redirect from the authorization server (${started.status})`);

const redirect = new URL(location);
const authorizationId = redirect.searchParams.get("authorization_id");
if (!authorizationId) {
  throw new Error(`the authorization server refused this request: ${redirect.search}`);
}

// The server redirects to its own configured site URL; point it at the app.
process.stdout.write(
  `Open this while signed in, to see the consent screen as ${CLIENT_NAME}:\n\n` +
    `  ${APP}/oauth/consent?authorization_id=${authorizationId}\n\n` +
    `Approving it redirects to ${APP}/oauth/callback with a code, which nothing\n` +
    `is listening for — a 404 there means the whole round trip worked.\n`,
);
