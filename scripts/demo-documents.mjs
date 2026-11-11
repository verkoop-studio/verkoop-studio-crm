#!/usr/bin/env node
/*
 * Quotes and contracts for the demo database. LOCAL, THROWAWAY ONLY.
 *
 * Run scripts/demo-data.mjs first, then this. See scripts/README.md.
 *
 * Documents are not rows, they are objects in the `lead-documents` bucket, and
 * the bucket's read policy is `owner_id = auth.uid()`. So this signs in as a
 * demo user over the ordinary auth endpoint and uploads through the same
 * storage call the app uses, rather than writing storage.objects directly:
 * data put in by hand would be invisible to the very screen it is meant for.
 *
 * The Quotes and contracts board asks for 41 quotes and 18 contracts spread
 * over 24 companies, with twelve of the contracts signed. That shape is what
 * this produces, and it is why the board's "Show the other 20 companies" has
 * something behind it.
 */

import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";

const PASSWORD = process.env["DEMO_PASSWORD"] || "demo-only-password";
const MAIN_COMPANY = "aaaaaaaa-0000-4000-8000-000000000001";

/* --------------------------------------------------- local config only */

function env() {
  const read = (name) => process.env[name];
  let url = read("VITE_SUPABASE_URL") || read("SUPABASE_URL");
  let key = read("VITE_SUPABASE_PUBLISHABLE_KEY") || read("SUPABASE_PUBLISHABLE_KEY");
  if (!url || !key) {
    // Fall back to the gitignored .env the local stack writes.
    try {
      for (const line of readFileSync(".env", "utf8").split("\n")) {
        const match = /^\s*([A-Z_]+)\s*=\s*(.*)\s*$/.exec(line);
        if (!match) continue;
        const [, name, value] = match;
        if (!url && (name === "VITE_SUPABASE_URL" || name === "SUPABASE_URL")) url = value;
        if (
          !key &&
          (name === "VITE_SUPABASE_PUBLISHABLE_KEY" || name === "SUPABASE_PUBLISHABLE_KEY")
        )
          key = value;
      }
    } catch {
      /* no .env: the check below reports it */
    }
  }
  if (!url || !key) throw new Error("set VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY");
  const host = new URL(url).hostname;
  if (!["127.0.0.1", "localhost", "::1", "[::1]"].includes(host))
    throw new Error(`refusing to touch ${host}: this script is for a local database only`);
  return { url, key };
}

/* ------------------------------------------------------------ the files */

/** A real, openable PDF of roughly `kb` kilobytes. */
function pdf(title, kb) {
  const body = `1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj
2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj
3 0 obj<</Type/Page/Parent 2 0 R/MediaBox[0 0 595 842]/Contents 4 0 R/Resources<</Font<</F1 5 0 R>>>>>>endobj
4 0 obj<</Length 90>>stream
BT /F1 16 Tf 60 760 Td (${title.replace(/[()\\]/g, " ")}) Tj ET
endstream endobj
5 0 obj<</Type/Font/Subtype/Type1/BaseFont/Helvetica>>endobj
`;
  const head = "%PDF-1.4\n";
  const tail = `trailer<</Root 1 0 R/Size 6>>\n%%EOF\n`;
  const padding = Math.max(0, kb * 1024 - (head.length + body.length + tail.length + 40));
  const filler = `% demo padding ${"x".repeat(60)}\n`;
  const pad = filler.repeat(Math.ceil(padding / filler.length)).slice(0, padding);
  return new Blob([head + body + pad + tail], { type: "application/pdf" });
}

function mulberry32(a) {
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/* ------------------------------------------------------------------ run */

const { url, key } = env();
// Which workspace a request belongs to travels in a header, the same way the
// app sends it; without it the row-level policies see no company and no leads.
const supabase = createClient(url, key, {
  auth: { persistSession: false },
  global: { headers: { "x-crm-company-id": MAIN_COMPANY } },
});

const signIn = await supabase.auth.signInWithPassword({
  email: "tanguy@verkoopstudio.test",
  password: PASSWORD,
});
if (signIn.error) throw new Error(`could not sign in: ${signIn.error.message}`);

/*
 * Which leads get paperwork. The boards put it on the deals furthest along, so
 * take Closing and Meeting first, then Won, then whatever else is needed to
 * reach twenty-four companies.
 */
const { data: leads, error } = await supabase
  .from("leads")
  .select("id, company, stage")
  .eq("company_id", MAIN_COMPANY)
  .order("stage")
  .order("id");
if (error) throw error;

const rank = { proposal: 0, meeting: 1, won: 2, engaged: 3, contacted: 4, lost: 5, new: 6 };
const chosen = [...leads].sort((a, b) => rank[a.stage] - rank[b.stage] || a.id.localeCompare(b.id));
const WITH_PAPERWORK = chosen.slice(0, 24);
if (WITH_PAPERWORK.length < 24) throw new Error("need 24 leads; run scripts/demo-data.mjs first");

/*
 * 41 quotes and 18 contracts over 24 companies. Spread so that the first few
 * groups the screen shows are not all the same shape: one with a single quote,
 * one with a revision, one with both, one already signed.
 */
const SHAPE = [
  [2, 1],
  [2, 1],
  [1, 1],
  [3, 1],
  [2, 1],
  [1, 1],
  [2, 1],
  [2, 1],
  [1, 1],
  [2, 1],
  [2, 1],
  [2, 1],
  [2, 1],
  [2, 1],
  [2, 1],
  [2, 1],
  [2, 1],
  [2, 1],
  [1, 0],
  [1, 0],
  [1, 0],
  [2, 0],
  [1, 0],
  [1, 0],
];
const quotes = SHAPE.reduce((t, s) => t + s[0], 0);
const contracts = SHAPE.reduce((t, s) => t + s[1], 0);
if (quotes !== 41 || contracts !== 18)
  throw new Error(`the boards say 41 quotes and 18 contracts, this is ${quotes} and ${contracts}`);

const rnd = mulberry32(20261111);
const short = (name) => name.replace(/[^\p{L}\p{N}]+/gu, "-").replace(/^-|-$/g, "");

let uploaded = 0;
let skipped = 0;
for (const [index, lead] of WITH_PAPERWORK.entries()) {
  const [nQuotes, nContracts] = SHAPE[index];
  const files = [];
  for (let i = 0; i < nQuotes; i += 1) {
    const label = i === 0 ? "" : i === 1 ? "-herzien" : `-v${i + 1}`;
    files.push([
      "quote",
      `Offerte-${short(lead.company)}${label}.pdf`,
      280 + Math.floor(rnd() * 320),
    ]);
  }
  for (let i = 0; i < nContracts; i += 1) {
    // Twelve of the eighteen contracts are signed, the way the board counts.
    const signed = index < 12 ? "-getekend" : "";
    files.push([
      "contract",
      `Contract-${short(lead.company)}${signed}.pdf`,
      260 + Math.floor(rnd() * 700),
    ]);
  }
  for (const [category, name, kb] of files) {
    const path = `${lead.id}/${category}/${crypto.randomUUID()}__${name}`;
    const { error: upload } = await supabase.storage
      .from("lead-documents")
      .upload(path, pdf(name, kb), { contentType: "application/pdf", upsert: false });
    if (upload) {
      skipped += 1;
      process.stderr.write(`could not upload ${name}: ${upload.message}\n`);
    } else {
      uploaded += 1;
    }
  }
}

process.stdout.write(
  `${uploaded} documents on ${WITH_PAPERWORK.length} companies` +
    (skipped ? `, ${skipped} failed` : "") +
    "\n",
);
await supabase.auth.signOut();
