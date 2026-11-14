import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { TEMPLATES, TEMPLATE_DIR, PUBLIC_DIR, render } from "../scripts/build-auth-templates.mjs";

const config = readFileSync(join(TEMPLATE_DIR, "..", "config.toml"), "utf8");
const committed = Object.fromEntries(
  Object.entries(TEMPLATES).map(([key, template]) => [
    key,
    readFileSync(join(TEMPLATE_DIR, template.file), "utf8"),
  ]),
);

test("the committed HTML is what the generator produces", () => {
  for (const [key, template] of Object.entries(TEMPLATES)) {
    assert.equal(
      committed[key],
      render(template),
      `supabase/templates/${template.file} is stale. Run \`npm run mail:build\` and commit it.`,
    );
  }
});

test("the same files are served over HTTP for a self-hosted GoTrue", () => {
  for (const [key, template] of Object.entries(TEMPLATES)) {
    assert.equal(
      readFileSync(join(PUBLIC_DIR, template.file), "utf8"),
      committed[key],
      `public/auth-mail/${template.file} differs from supabase/templates/. Run \`npm run mail:build\`.`,
    );
  }
});

test("config.toml points the local stack at every template", () => {
  for (const [key, template] of Object.entries(TEMPLATES)) {
    assert.match(config, new RegExp(`\\[auth\\.email\\.template\\.${key}\\]`));
    assert.ok(
      config.includes(`./supabase/templates/${template.file}`),
      `config.toml does not reference ${template.file}`,
    );
  }
});

test("every link in every e-mail is the one Supabase generates", () => {
  for (const [key, html] of Object.entries(committed)) {
    assert.ok(
      html.includes('href="{{ .ConfirmationURL }}"'),
      `${key} has no button pointing at the generated link`,
    );
    // The whole reason these templates exist: a confirmation mail that sent
    // someone to a development address. A literal host in here is that bug
    // written down. The only absolute URL allowed is the public site.
    for (const href of html.matchAll(/href="([^"]+)"/g)) {
      const url = href[1];
      assert.ok(
        url === "{{ .ConfirmationURL }}" || url === "https://verkoop.studio",
        `${key} links to ${url}`,
      );
    }
  }
});

test("nothing is shipped in one language only", () => {
  for (const [key, html] of Object.entries(committed)) {
    // Every piece of prose is wrapped in the same two-armed branch, so the
    // count of branches is the count of translated slots, and both arms of
    // each one carry text.
    const branches = [
      ...html.matchAll(/\{\{ if eq \$lang "en" \}\}(.*?)\{\{ else \}\}(.*?)\{\{ end \}\}/gs),
    ];
    assert.ok(branches.length >= 7, `${key} has only ${branches.length} translated slots`);
    for (const [, english, dutch] of branches) {
      assert.ok(english.trim().length > 0, `${key} has an empty English arm`);
      assert.ok(dutch.trim().length > 0, `${key} has an empty Dutch arm`);
      assert.notEqual(english, dutch, `${key} branches on a slot that does not differ`);
    }
  }
});

test("the language lookup cannot break an e-mail that has no language", () => {
  for (const [key, html] of Object.entries(committed)) {
    // An account made before the sign-up form started writing `language` has
    // no such key. In a Go template `index` on a missing key gives nil, and
    // comparing nil with a string is an error — which means gotrue renders
    // nothing and sends nothing. Going through printf keeps the comparison
    // string against string, so those accounts quietly get Dutch.
    assert.ok(
      html.startsWith('{{ $lang := "nl" }}{{ if eq (printf "%v" (index .Data "language")) "en" }}'),
      `${key} compares .Data.language without printf, so an older account gets no e-mail at all`,
    );
  }
});
