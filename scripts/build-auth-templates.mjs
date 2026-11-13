// The five e-mails Supabase Auth sends on its own behalf, in our own chrome.
//
// Supabase renders a single static HTML file per e-mail type. There are no
// includes and no partials, so the alternative to generating them is five
// near-identical files that drift apart the first time someone changes a
// colour. One layout lives here; `npm run mail:build` writes the files, and
// tests/auth-templates.test.mjs fails if what is committed no longer matches.
//
// Colours and type come from src/styles.css, which is the agreed design
// language for the product. E-mail gets the subset that survives Outlook:
// tables, inline styles, no custom properties, no web fonts.
//
// The product reads as "Sales" in the app chrome (src/components/brand.tsx),
// and as the full name here, because an inbox has no sidebar to give context.

import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
export const TEMPLATE_DIR = join(here, "..", "supabase", "templates");

const COMPANY = "Verkoop Studio";
const PRODUCT = "Verkoop Studio Sales";

const C = {
  page: "#f4f5fb",
  panel: "#ffffff",
  border: "#e1e4ef",
  hairline: "#ebedfc",
  ink: "#10131c",
  text: "#505465",
  quiet: "#676d7e",
  caption: "#696f81",
  accent: "#254bfa",
  tint: "#eaf0ff",
  accentInk: "#2344ca",
};

// Inter is the brand typeface and no mail client will load it. Ask for it
// anyway: Apple Mail and Outlook on Windows have it, the rest fall back.
const FONT = "Inter,-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif";

/*
 * Language.
 *
 * Supabase templates are Go templates, and `.Data` is the user's
 * user_metadata. The sign-up form writes `language` into it, so the e-mail can
 * be in the language the person was reading when they typed their address.
 *
 * The comparison goes through printf so that it is always string against
 * string. An account made before this change — or any flow that writes no
 * metadata at all — has no `language` key; `index` on a missing key gives nil,
 * `eq nil "en"` is a template error, and a template error means no e-mail is
 * sent at all. `printf "%v"` of nil is the harmless string "<nil>", which is
 * not "en", so those accounts fall through to Dutch.
 */
const LANG = `{{ $lang := "nl" }}{{ if eq (printf "%v" (index .Data "language")) "en" }}{{ $lang = "en" }}{{ end }}`;

/** Pick the Dutch or the English copy at render time. */
const pick = (nl, en) => `{{ if eq $lang "en" }}${en}{{ else }}${nl}{{ end }}`;

const escape = (value) =>
  value.replace(
    /[&<>"']/g,
    (character) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[character],
  );

/**
 * The shared chrome: lavender page, white card, wordmark, button, footer.
 * `copy` holds one `{ nl, en }` pair per slot, so both languages get exactly
 * the same layout and nothing can be styled in one and forgotten in the other.
 */
function layout({ copy, url, button }) {
  const p = (slot, size = 15, colour = C.text, top = 16) =>
    `<p style="margin:${top}px 0 0;font-size:${size}px;line-height:1.65;color:${colour}">${pick(copy[slot].nl, copy[slot].en)}</p>`;

  return `<!doctype html>
<html lang="${pick("nl", "en")}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="light">
<title>${escape(PRODUCT)}</title>
</head>
<body style="margin:0;padding:0;background:${C.page};font-family:${FONT};-webkit-font-smoothing:antialiased">
<div style="display:none;max-height:0;overflow:hidden;opacity:0">${pick(copy.preview.nl, copy.preview.en)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${C.page}">
<tr><td align="center" style="padding:32px 16px">

<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:560px">

<!-- Wordmark. Text, not an image: a blocked image would leave the e-mail
     unsigned, and the mark is a word with a coloured dot in any case. -->
<tr><td style="padding:0 4px 18px">
<span style="font-size:19px;font-weight:700;letter-spacing:-0.045em;color:${C.ink}">verkoop<span style="color:${C.accent}">.</span>studio</span>
<span style="display:inline-block;margin-left:9px;padding:4px 9px;border:1px solid #e2e8fc;border-radius:30px;background:${C.tint};font-size:10px;font-weight:600;letter-spacing:0.1em;text-transform:uppercase;color:${C.accentInk}">Sales</span>
</td></tr>

<tr><td style="background:${C.panel};border:1px solid ${C.border};border-radius:20px;padding:36px 32px">
<h1 style="margin:0;font-size:25px;line-height:1.25;letter-spacing:-0.035em;font-weight:700;color:${C.ink}">${pick(copy.heading.nl, copy.heading.en)}</h1>
${p("intro", 15, C.text, 18)}

<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:26px 0 0"><tr><td style="border-radius:8px;background:${C.accent}">
<a href="${url}" style="display:inline-block;padding:14px 26px;font-family:${FONT};font-size:15px;font-weight:600;line-height:1;color:#ffffff;text-decoration:none;border-radius:8px">${pick(button.nl, button.en)}</a>
</td></tr></table>

${p("fallback", 13, C.quiet, 26)}
<p style="margin:6px 0 0;font-size:13px;line-height:1.5;word-break:break-all"><a href="${url}" style="color:${C.accent};text-decoration:underline">${url}</a></p>

<div style="height:1px;background:${C.hairline};margin:26px 0 0"></div>
${p("small", 13, C.quiet, 18)}
</td></tr>

<tr><td style="padding:18px 4px 0;font-size:12px;line-height:1.6;color:${C.caption}">
${pick(copy.reason.nl, copy.reason.en)}<br>
${escape(COMPANY)} · <a href="https://verkoop.studio" style="color:${C.caption};text-decoration:underline">verkoop.studio</a>
</td></tr>

</table>
</td></tr></table>
</body>
</html>
`;
}

const CONFIRMATION_URL = "{{ .ConfirmationURL }}";

/** One entry per Supabase e-mail type. The key is the config.toml key. */
export const TEMPLATES = {
  confirmation: {
    file: "confirm-signup.html",
    subject: { nl: "Bevestig je e-mailadres", en: "Confirm your email address" },
    url: CONFIRMATION_URL,
    button: { nl: "E-mailadres bevestigen", en: "Confirm my email address" },
    copy: {
      preview: {
        nl: `Eén klik en je werkruimte in ${PRODUCT} staat klaar.`,
        en: `One click and your ${PRODUCT} workspace is ready.`,
      },
      heading: { nl: "Bevestig je e-mailadres", en: "Confirm your email address" },
      intro: {
        nl: `Je maakte een account aan voor ${PRODUCT}. Bevestig dit adres, dan zetten we je werkruimte klaar en ga je verder waar je gebleven was.`,
        en: `You created an account for ${PRODUCT}. Confirm this address and we will open your workspace and put you back where you left off.`,
      },
      fallback: {
        nl: "Werkt de knop niet? Plak deze link in je browser:",
        en: "Button not working? Paste this link into your browser:",
      },
      small: {
        nl: "Deze link werkt één keer en verloopt na verloop van tijd. Maakte je zelf geen account aan? Negeer deze e-mail; er gebeurt dan niets.",
        en: "This link works once and expires after a while. Did you not create an account? Ignore this email and nothing happens.",
      },
      reason: {
        nl: "Je ontvangt deze e-mail omdat op dit adres een account werd aangemaakt.",
        en: "You are receiving this email because an account was created with this address.",
      },
    },
  },

  recovery: {
    file: "reset-password.html",
    subject: { nl: "Kies een nieuw wachtwoord", en: "Choose a new password" },
    url: CONFIRMATION_URL,
    button: { nl: "Nieuw wachtwoord kiezen", en: "Choose a new password" },
    copy: {
      preview: {
        nl: "Stel een nieuw wachtwoord in voor je account.",
        en: "Set a new password for your account.",
      },
      heading: { nl: "Kies een nieuw wachtwoord", en: "Choose a new password" },
      intro: {
        nl: `Je vroeg een nieuw wachtwoord aan voor ${PRODUCT}. Met de knop hieronder stel je er een in.`,
        en: `You asked for a new password for ${PRODUCT}. The button below lets you set one.`,
      },
      fallback: {
        nl: "Werkt de knop niet? Plak deze link in je browser:",
        en: "Button not working? Paste this link into your browser:",
      },
      small: {
        nl: "Deze link werkt één keer en verloopt na verloop van tijd. Vroeg je geen nieuw wachtwoord aan? Negeer deze e-mail; je huidige wachtwoord blijft gewoon werken.",
        en: "This link works once and expires after a while. Did you not ask for a new password? Ignore this email; your current password keeps working.",
      },
      reason: {
        nl: "Je ontvangt deze e-mail omdat er een nieuw wachtwoord is aangevraagd voor dit adres.",
        en: "You are receiving this email because a new password was requested for this address.",
      },
    },
  },

  magic_link: {
    file: "magic-link.html",
    subject: { nl: "Je aanmeldlink", en: "Your sign-in link" },
    url: CONFIRMATION_URL,
    button: { nl: "Aanmelden", en: "Sign in" },
    copy: {
      preview: {
        nl: "Meld je aan zonder wachtwoord.",
        en: "Sign in without a password.",
      },
      heading: { nl: "Je aanmeldlink", en: "Your sign-in link" },
      intro: {
        nl: `Met de knop hieronder meld je je aan bij ${PRODUCT}. Je hebt er geen wachtwoord voor nodig.`,
        en: `The button below signs you in to ${PRODUCT}. You do not need a password for it.`,
      },
      fallback: {
        nl: "Werkt de knop niet? Plak deze link in je browser:",
        en: "Button not working? Paste this link into your browser:",
      },
      small: {
        nl: "Deze link werkt één keer en verloopt na verloop van tijd. Vroeg je geen aanmeldlink aan? Negeer deze e-mail en deel hem met niemand.",
        en: "This link works once and expires after a while. Did you not ask to sign in? Ignore this email and share it with no one.",
      },
      reason: {
        nl: "Je ontvangt deze e-mail omdat er een aanmeldlink is aangevraagd voor dit adres.",
        en: "You are receiving this email because a sign-in link was requested for this address.",
      },
    },
  },

  invite: {
    file: "invite.html",
    subject: { nl: "Je bent uitgenodigd", en: "You have been invited" },
    url: CONFIRMATION_URL,
    button: { nl: "Uitnodiging accepteren", en: "Accept the invitation" },
    copy: {
      preview: {
        nl: `Maak je account aan voor ${PRODUCT}.`,
        en: `Create your account for ${PRODUCT}.`,
      },
      heading: { nl: "Je bent uitgenodigd", en: "You have been invited" },
      intro: {
        nl: `Je bent uitgenodigd voor ${PRODUCT}. Met de knop hieronder maak je je account aan en kies je je eigen wachtwoord.`,
        en: `You have been invited to ${PRODUCT}. The button below creates your account and lets you choose your own password.`,
      },
      fallback: {
        nl: "Werkt de knop niet? Plak deze link in je browser:",
        en: "Button not working? Paste this link into your browser:",
      },
      small: {
        nl: "Deze link werkt één keer en verloopt na verloop van tijd. Verwacht je deze uitnodiging niet? Negeer deze e-mail en deel de link met niemand.",
        en: "This link works once and expires after a while. Were you not expecting this invitation? Ignore this email and share the link with no one.",
      },
      reason: {
        nl: "Je ontvangt deze e-mail omdat iemand je op dit adres uitnodigde.",
        en: "You are receiving this email because someone invited you at this address.",
      },
    },
  },

  email_change: {
    file: "email-change.html",
    subject: { nl: "Bevestig je nieuwe e-mailadres", en: "Confirm your new email address" },
    url: CONFIRMATION_URL,
    button: { nl: "Nieuw adres bevestigen", en: "Confirm the new address" },
    copy: {
      preview: {
        nl: "Bevestig het nieuwe adres van je account.",
        en: "Confirm your account's new address.",
      },
      heading: { nl: "Bevestig je nieuwe e-mailadres", en: "Confirm your new email address" },
      intro: {
        nl: `Het e-mailadres van je ${PRODUCT}-account verandert naar {{ .NewEmail }}. Bevestig het met de knop hieronder.`,
        en: `The email address of your ${PRODUCT} account is changing to {{ .NewEmail }}. Confirm it with the button below.`,
      },
      fallback: {
        nl: "Werkt de knop niet? Plak deze link in je browser:",
        en: "Button not working? Paste this link into your browser:",
      },
      small: {
        nl: "Tot je bevestigt blijft je huidige adres werken. Wijzigde je dit niet zelf? Neem dan contact op met de beheerder van je werkruimte.",
        en: "Your current address keeps working until you confirm. Did you not make this change? Contact the administrator of your workspace.",
      },
      reason: {
        nl: "Je ontvangt deze e-mail omdat dit adres is opgegeven als nieuw adres voor een account.",
        en: "You are receiving this email because this address was given as the new address for an account.",
      },
    },
  },
};

/** The rendered file for one e-mail type, including the language preamble. */
export function render(template) {
  return LANG + layout(template);
}

/** The subject line, as a Go template, so it follows the same language. */
export function subject(template) {
  return LANG + pick(template.subject.nl, template.subject.en);
}

export function build() {
  mkdirSync(TEMPLATE_DIR, { recursive: true });
  const written = [];
  for (const template of Object.values(TEMPLATES)) {
    writeFileSync(join(TEMPLATE_DIR, template.file), render(template));
    written.push(template.file);
  }
  return written;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  for (const file of build()) console.log(`wrote supabase/templates/${file}`);
}
