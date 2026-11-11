#!/usr/bin/env node
/*
 * Demo data for a LOCAL, THROWAWAY database. Never for a real workspace.
 *
 * Writes SQL to stdout. See scripts/README.md for how to load it.
 *
 * Why a generator and not a .sql file: most of what makes these screens worth
 * looking at is *when* a lead arrived and *when* it was last touched. The
 * dashboard buckets leads into the last eight calendar weeks and calls a lead
 * stale after seven quiet days, so a fixed file would drift out of shape by
 * the following Monday. This script computes every timestamp against the hour
 * it runs, and asserts at the end that the numbers it produced are the ones
 * the design boards were drawn with.
 *
 * The figures below come from .design-boards/ — the dashboard, Leads and
 * Prospectflow boards all quote the same sample company, so loading this makes
 * the running app directly comparable with the drawings:
 *
 *   184 leads · 96 open · 38 won · 50 lost · win rate 43%
 *   open stages      New 28 · Contacted 24 · Engaged 21 · Meeting 14 · Closing 9
 *   open pipeline    €412.500 with 31 not yet valued
 *   per stage        €22.000 / €58.500 / €96.000 / €129.500 / €106.500
 *   Tanguy's slice   39 open, €191.500
 *   inflow           9, 14, 11, 16, 12, 19, 12, 17 over the last eight weeks
 *   needs follow-up  23 · first contact 11 · closing gone quiet 4
 *   team load        81 / 62 / 41 accounts
 *
 * Names here are invented for this file. The sample names on the design boards
 * are design data and are deliberately not reproduced.
 */

const PASSWORD = process.env["DEMO_PASSWORD"] || "demo-only-password";

/* ------------------------------------------------------------------ ids */

const CO = {
  main: "aaaaaaaa-0000-4000-8000-000000000001",
  second: "bbbbbbbb-0000-4000-8000-000000000002",
  empty: "cccccccc-0000-4000-8000-000000000003",
};
const CO_NAME = {
  main: "Hanssens Keukens",
  second: "Velden Fietsen",
  // Long on purpose: the switcher, the sidebar tile and the page header all
  // have to cope with a name nobody would shorten for them.
  empty: "Vanden Broucke Interieurbouw en Keukenrenovatie",
};

const U = {
  tanguy: "10000000-0000-4000-8000-000000000001",
  sofie: "10000000-0000-4000-8000-000000000002",
  jens: "10000000-0000-4000-8000-000000000003",
  ruben: "10000000-0000-4000-8000-000000000004",
  najat: "10000000-0000-4000-8000-000000000005",
};
const PEOPLE = [
  { id: U.tanguy, email: "tanguy@verkoopstudio.test", name: "Tanguy De Brabandere" },
  { id: U.sofie, email: "sofie@verkoopstudio.test", name: "Sofie Mertens" },
  { id: U.jens, email: "jens@verkoopstudio.test", name: "Jens Peeters" },
  // Asked for an account and is still waiting — the Settings badge needs this.
  { id: U.ruben, email: "ruben@verkoopstudio.test", name: "Ruben Decock" },
  { id: U.najat, email: "najat@verkoopstudio.test", name: "Najat Bourhim" },
];

/* --------------------------------------------------------------- random */

/** Fixed seed: the same database twice, every time. */
function mulberry32(a) {
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rnd = mulberry32(20261111);
const pick = (list) => list[Math.floor(rnd() * list.length)];
const between = (lo, hi) => lo + Math.floor(rnd() * (hi - lo + 1));

/* ---------------------------------------------------------------- names */

const TRADE = [
  "Keukens",
  "Interieur",
  "Tuinen",
  "Ramen",
  "Dakwerken",
  "Sanitair",
  "Vloeren",
  "Schrijnwerk",
  "Zonwering",
  "Badkamers",
  "Trappen",
  "Verlichting",
  "Meubels",
  "Isolatie",
  "Terrassen",
  "Veranda",
];
const HOUSE = ["Atelier", "Bureau", "Studio", "Huis", "Werkplaats", "Hoeve", "Depot", "Kantoor"];
const SURNAME = [
  "Aerts",
  "Boone",
  "Claeys",
  "Dekker",
  "Everaert",
  "Fonteyne",
  "Goossens",
  "Haegeman",
  "Inghels",
  "Janssens",
  "Kemps",
  "Lammens",
  "Moens",
  "Naessens",
  "Ottevaere",
  "Praet",
  "Quintens",
  "Roelandt",
  "Steyaert",
  "Tillemans",
  "Uytterhoeven",
  "Vervoort",
  "Wauters",
  "Zegers",
  "Bogaert",
  "Cornelis",
  "Daenen",
  "Engels",
  "Feyaerts",
  "Gheysens",
  "Huyghe",
  "Impens",
  "Joris",
  "Keppens",
  "Lenaerts",
  "Mommaerts",
  "Nijs",
  "Opsomer",
  "Pauwelyn",
  "Reyns",
  "Saelens",
  "Thienpont",
  "Vandenbossche",
  "Willaert",
];
const FIRST = [
  "An",
  "Bram",
  "Céline",
  "Dirk",
  "Eva",
  "Frank",
  "Griet",
  "Hilde",
  "Ilse",
  "Joris",
  "Karel",
  "Lotte",
  "Maarten",
  "Nele",
  "Olivier",
  "Pieter",
  "Ruth",
  "Stijn",
  "Tine",
  "Ward",
  "Yasmine",
  "Zoë",
  "Mehdi",
  "Fatima",
  "Jonas",
  "Katrien",
  "Lars",
  "Mieke",
];
const CITY = [
  "Gent",
  "Brugge",
  "Antwerpen",
  "Leuven",
  "Hasselt",
  "Kortrijk",
  "Mechelen",
  "Oostende",
  "Aalst",
  "Genk",
  "Turnhout",
  "Roeselare",
  "Sint-Niklaas",
  "Deinze",
  "Lokeren",
  "Tielt",
];
const JOB = [
  "Zaakvoerder",
  "Eigenaar",
  "Projectleider",
  "Aankoper",
  "Ontwerper",
  "Office manager",
  "Technisch verantwoordelijke",
];
const CAMPAIGN = [
  "Keukenrenovatie najaar",
  "Doorverwijzing",
  "Koude mail Q4",
  "LinkedIn najaar",
  "Beurs 2026",
  "Tuin voorjaar",
  "Website",
  "Horeca advertenties",
];
const SOURCES = ["email", "linkedin", "ads", "referral", "website", "csv"];

const usedNames = new Set();
function companyName() {
  for (let i = 0; i < 500; i += 1) {
    const name =
      rnd() < 0.55 ? `${pick(SURNAME)} ${pick(TRADE)}` : `${pick(HOUSE)} ${pick(SURNAME)}`;
    if (!usedNames.has(name)) {
      usedNames.add(name);
      return name;
    }
  }
  throw new Error("ran out of company names");
}
const slug = (text) =>
  text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

/* ----------------------------------------------------------------- time */

const now = new Date();
/** Monday 00:00 of the current week, the same boundary the dashboard uses. */
const monday = (() => {
  const d = new Date(now);
  const back = (d.getDay() + 6) % 7;
  d.setDate(d.getDate() - back);
  d.setHours(0, 0, 0, 0);
  return d;
})();
const DAY = 86_400_000;
const daysIntoWeek = Math.floor((now.getTime() - monday.getTime()) / DAY);

/** A timestamp inside week `w` of the eight-week window (7 = this week). */
function inWeek(w, slot, total) {
  const start = monday.getTime() - (7 - w) * 7 * DAY;
  const span = w === 7 ? Math.max(1, now.getTime() - start - 60_000) : 7 * DAY;
  const offset = Math.floor(((slot + 0.5) / total) * span);
  return new Date(start + offset);
}
/** Somewhere between 8 and 40 weeks back, for the long tail of closed deals. */
function older(slot, total) {
  const oldest = monday.getTime() - 40 * 7 * DAY;
  const newest = monday.getTime() - 8 * 7 * DAY;
  const offset = Math.floor(((slot + 0.5) / total) * (newest - oldest));
  return new Date(oldest + offset);
}
const ageDays = (date) => (now.getTime() - date.getTime()) / DAY;
const iso = (date) => date.toISOString();

/* ------------------------------------------------------- the main company
 *
 * Built stage by stage so every total on the boards is hit exactly rather
 * than approached. Each entry below is read straight off a board.
 */

const OPEN_PLAN = {
  new: { total: 28, unvalued: 18, sum: 22_000, mine: 11, mineUnvalued: 7, mineSum: 9_000 },
  contacted: {
    total: 24,
    unvalued: 8,
    sum: 58_500,
    mine: 9,
    mineUnvalued: 3,
    mineSum: 22_000,
  },
  engaged: { total: 21, unvalued: 4, sum: 96_000, mine: 8, mineUnvalued: 2, mineSum: 41_000 },
  meeting: {
    total: 14,
    unvalued: 1,
    sum: 129_500,
    mine: 6,
    mineUnvalued: 0,
    mineSum: 58_000,
  },
  proposal: { total: 9, unvalued: 0, sum: 106_500, mine: 5, mineUnvalued: 0, mineSum: 61_500 },
};
const INFLOW = [9, 14, 11, 16, 12, 19, 12, 17];
/*
 * Of the 96 open leads, 23 have been quiet for seven days.
 *
 * New is not in this list because it cannot be: a lead nobody has reached out
 * to has no contact date, so its age alone decides, and the eleven waiting for
 * a first contact are all older than a week. That leaves twelve to place by
 * hand, four of which the dashboard calls out as proposals gone quiet.
 */
const STALE_PLAN = { new: 0, contacted: 3, engaged: 3, meeting: 2, proposal: 4 };
/** Waiting for a first contact: New, untouched, more than five days old. */
const FIRST_CONTACT = 11;
/** Won and lost, split the way the Settings board splits the team's load. */
const CLOSED_PLAN = {
  won: { [U.tanguy]: 18, [U.sofie]: 13, [U.jens]: 7 },
  lost: { [U.tanguy]: 24, [U.sofie]: 16, [U.jens]: 10 },
};

/**
 * `count` amounts, each a multiple of 500, adding up to exactly `sum`.
 * Deliberately lumpy: a couple of big ones per stage, so the money column is
 * not a row of near-identical numbers.
 */
function amounts(count, sum) {
  if (count === 0) {
    if (sum !== 0) throw new Error(`cannot spread ${sum} over no leads`);
    return [];
  }
  const unit = 500;
  const units = sum / unit;
  if (!Number.isInteger(units)) throw new Error(`${sum} is not a whole number of ${unit}s`);
  if (units < count) throw new Error(`${sum} cannot cover ${count} leads`);
  const share = Array(count).fill(1);
  let left = units - count;
  // Hand out the remainder in uneven helpings, biggest first.
  for (let i = 0; left > 0; i = (i + 1) % count) {
    const take = Math.min(left, Math.max(1, Math.round((left / count) * (0.4 + rnd() * 1.6))));
    share[i] += take;
    left -= take;
  }
  return share.map((u) => u * unit).sort((a, b) => b - a);
}

const leads = [];
let seq = 0;

function makeLead(fields) {
  seq += 1;
  const name = companyName();
  const person = `${pick(FIRST)} ${pick(SURNAME)}`;
  const domain = `${slug(name)}.test`;
  return {
    id: `0000${String(seq).padStart(4, "0")}-0000-4000-8000-000000000001`.replace(
      /^0000(\d{4})/,
      "$1beef",
    ),
    company_id: CO.main,
    company: name,
    contact_name: person,
    job_title: pick(JOB),
    email: `${slug(person.split(" ")[0])}@${domain}`,
    phone:
      rnd() < 0.8
        ? `+32 4${between(70, 79)} ${between(10, 99)} ${between(10, 99)} ${between(10, 99)}`
        : null,
    website: domain,
    city: pick(CITY),
    country: "Belgium",
    campaign: pick(CAMPAIGN),
    source: pick(SOURCES),
    priority: between(1, 5),
    ...fields,
  };
}

/* ---- open leads -------------------------------------------------------
 *
 * Week 7 (this week) is filled first and entirely with New, so that "11
 * leads waiting for a first contact" means exactly the leads older than five
 * days, and a lead nobody has touched yet never carries a contact date.
 */

const openSlots = [];
for (let w = 0; w < 8; w += 1) {
  for (let i = 0; i < INFLOW[w]; i += 1) openSlots.push({ w, i, total: INFLOW[w] });
}
// 110 arrived in the window; 96 of them are still open, 14 already closed.
const thisWeek = openSlots.filter((s) => s.w === 7);
const earlier = openSlots.filter((s) => s.w !== 7);
// The 14 closed-in-window leads are taken from the oldest weeks.
const closedInWindow = earlier.slice(0, 14);
const openEarlier = earlier.slice(14);

if (thisWeek.length !== 17) throw new Error("this week should hold 17 arrivals");
if (openEarlier.length !== 79) throw new Error("79 open leads should predate this week");

const openDates = [
  ...thisWeek.map((s) => inWeek(s.w, s.i, s.total)),
  ...openEarlier.map((s) => inWeek(s.w, s.i, s.total)),
];
// Newest first, so New gets this week's arrivals and Closing the old ones.
openDates.sort((a, b) => b.getTime() - a.getTime());

/*
 * Which arrival date belongs to which stage.
 *
 * New takes this week's seventeen arrivals plus eleven older ones — the pile
 * nobody has called yet, which is what "make first contact" counts. Picking
 * those eleven deliberately rather than taking whatever the ordering hands
 * over is the only way both that figure and "needs follow-up" land on the
 * numbers the dashboard was drawn with, on any day of the week.
 */
const freshest = openDates.slice(0, 17);
const remainder = openDates.slice(17);
const stalePool = remainder.filter((d) => ageDays(d) >= 8);
if (stalePool.length < FIRST_CONTACT)
  throw new Error("not enough old arrivals to leave eleven waiting for a first contact");
const waiting = Array.from(
  { length: FIRST_CONTACT },
  (_, i) => stalePool[Math.floor(((i + 0.5) / FIRST_CONTACT) * stalePool.length)],
);
const taken = new Set(waiting.map((d) => d.getTime()));
const STAGE_DATES = {
  new: [...freshest, ...waiting],
  rest: remainder.filter((d) => !taken.has(d.getTime())),
};
if (STAGE_DATES.new.length !== 28) throw new Error("New should hold 28 arrivals");
if (STAGE_DATES.rest.length !== 68) throw new Error("68 arrivals should be left over");

let dateCursor = 0;
let newCursor = 0;
const STAGE_ORDER = ["new", "contacted", "engaged", "meeting", "proposal"];

for (const stage of STAGE_ORDER) {
  const plan = OPEN_PLAN[stage];
  const valued = amounts(plan.total - plan.unvalued, plan.sum);
  const mineValued = amounts(plan.mine - plan.mineUnvalued, plan.mineSum);
  const theirsValued = (() => {
    // Whatever is left once Tanguy's share is taken out of the stage total.
    const rest = valued.length - mineValued.length;
    const restSum = plan.sum - plan.mineSum;
    return amounts(rest, restSum);
  })();

  // Who owns what. Tanguy first, then Sofie and Jens by the Settings split.
  const theirs = plan.total - plan.mine;
  const sofieShare = { new: 10, contacted: 9, engaged: 7, meeting: 5, proposal: 2 }[stage];
  const owners = [
    ...Array(plan.mine).fill(U.tanguy),
    ...Array(sofieShare).fill(U.sofie),
    ...Array(theirs - sofieShare).fill(U.jens),
  ];

  const mineAmounts = [...mineValued, ...Array(plan.mineUnvalued).fill(null)];
  const theirAmounts = [...theirsValued, ...Array(plan.unvalued - plan.mineUnvalued).fill(null)];

  let mineCursor = 0;
  let theirCursor = 0;
  const stageStale = STALE_PLAN[stage];
  let staleLeft = stageStale;

  for (let i = 0; i < plan.total; i += 1) {
    const owner = owners[i];
    const created = stage === "new" ? STAGE_DATES.new[newCursor++] : STAGE_DATES.rest[dateCursor++];
    const value = owner === U.tanguy ? mineAmounts[mineCursor++] : theirAmounts[theirCursor++];

    let lastTouch = null;
    if (stage === "new") {
      // Nobody has reached out: no contact date, so age decides staleness.
      lastTouch = null;
      // The 11 older-than-five-days New leads are the ones this stage
      // contributes to both "needs follow-up" and "make first contact".
    } else {
      const age = ageDays(created);
      const wantStale = staleLeft > 0 && age >= 8;
      if (wantStale) {
        staleLeft -= 1;
        const quiet = Math.min(age, 7 + rnd() * Math.min(21, age - 7));
        lastTouch = new Date(now.getTime() - quiet * DAY);
      } else {
        const quiet = Math.min(age, rnd() * 6);
        lastTouch = new Date(now.getTime() - quiet * DAY);
      }
    }
    leads.push(
      makeLead({
        stage,
        owner_id: owner,
        value_estimate: value,
        created_at: created,
        last_touch_at: lastTouch,
      }),
    );
  }
  if (stage !== "new" && staleLeft !== 0)
    throw new Error(`could not place ${staleLeft} stale ${stage} leads`);
}

/* ---- closed leads ----------------------------------------------------- */

const closedDates = [
  ...closedInWindow.map((s) => inWeek(s.w, s.i, s.total)),
  ...Array.from({ length: 74 }, (_, i) => older(i, 74)),
];
closedDates.sort((a, b) => b.getTime() - a.getTime());

const closedOwners = [];
for (const [outcome, split] of Object.entries(CLOSED_PLAN)) {
  for (const [owner, count] of Object.entries(split)) {
    for (let i = 0; i < count; i += 1) closedOwners.push({ outcome, owner });
  }
}
// Shuffle deterministically so won and lost interleave in the lists.
for (let i = closedOwners.length - 1; i > 0; i -= 1) {
  const j = Math.floor(rnd() * (i + 1));
  [closedOwners[i], closedOwners[j]] = [closedOwners[j], closedOwners[i]];
}

closedOwners.forEach(({ outcome, owner }, i) => {
  const created = closedDates[i];
  const age = ageDays(created);
  leads.push(
    makeLead({
      stage: outcome,
      owner_id: owner,
      // Won deals carry a number; lost ones mostly do not.
      value_estimate:
        outcome === "won" ? between(6, 64) * 500 : rnd() < 0.35 ? between(4, 40) * 500 : null,
      created_at: created,
      last_touch_at: new Date(now.getTime() - Math.min(age, 2 + rnd() * (age - 2)) * DAY),
    }),
  );
});

/* ------------------------------------------------- the second workspace
 *
 * Where the signed-in user is a sales rep and not an admin, and where the
 * awkward values live: a name that will not fit, a seven-figure deal, a lead
 * nobody owns. Keeping them out of the main company is what lets every figure
 * there stay equal to the board.
 */

const SECOND = [
  {
    company: "Koninklijke Maatschappij voor Tweewielers en Elektrische Mobiliteit Vlaanderen",
    contact_name: "Marie-Christine Vandenbroucke-De Clercq",
    job_title: "Gedelegeerd bestuurder en verantwoordelijke inkoop",
    stage: "proposal",
    value_estimate: 1_250_000,
    owner: U.tanguy,
    age: 3,
    touch: 1,
  },
  {
    company: "Velden Onderdelen",
    contact_name: "Bert Goossens",
    job_title: "Aankoper",
    stage: "meeting",
    value_estimate: 240_000,
    owner: U.sofie,
    age: 12,
    touch: 9,
  },
  {
    company: "Fietspunt Noord",
    contact_name: "Lien Praet",
    job_title: "Zaakvoerder",
    stage: "engaged",
    value_estimate: null,
    owner: null,
    age: 20,
    touch: null,
  },
  {
    company: "Bakfiets Depot",
    contact_name: "Omar Bourhim",
    job_title: "Eigenaar",
    stage: "contacted",
    value_estimate: 7_500,
    owner: null,
    age: 31,
    touch: 25,
  },
  {
    company: "Stadsfietsen Zuid",
    contact_name: "Eva Tillemans",
    job_title: "Office manager",
    stage: "new",
    value_estimate: null,
    owner: U.tanguy,
    age: 1,
    touch: null,
  },
  {
    company: "Koerier Collectief",
    contact_name: "Stijn Moens",
    job_title: "Projectleider",
    stage: "won",
    value_estimate: 96_000,
    owner: U.tanguy,
    age: 64,
    touch: 40,
  },
  {
    company: "Elektrisch Rijden Kempen",
    contact_name: "Najat Bourhim",
    job_title: "Technisch verantwoordelijke",
    stage: "lost",
    value_estimate: null,
    owner: U.sofie,
    age: 90,
    touch: 70,
  },
];

const secondLeads = SECOND.map((row, i) => ({
  id: `beef${String(1000 + i)}-0000-4000-8000-000000000002`,
  company_id: CO.second,
  company: row.company,
  contact_name: row.contact_name,
  job_title: row.job_title,
  email: `${slug(row.contact_name.split(" ")[0])}@${slug(row.company).slice(0, 40)}.test`,
  phone: `+32 4${between(70, 79)} ${between(10, 99)} ${between(10, 99)} ${between(10, 99)}`,
  website: `${slug(row.company).slice(0, 40)}.test`,
  city: pick(CITY),
  country: "Belgium",
  campaign: pick(CAMPAIGN),
  source: pick(SOURCES),
  priority: between(1, 5),
  stage: row.stage,
  owner_id: row.owner,
  value_estimate: row.value_estimate,
  created_at: new Date(now.getTime() - row.age * DAY),
  last_touch_at: row.touch == null ? null : new Date(now.getTime() - row.touch * DAY),
}));

/* ---- the bin ----------------------------------------------------------
 *
 * Two leads somebody dropped. They are deliberately NOT part of the 184: a
 * soft-deleted lead is left out of the sidebar badge, the stage tabs and
 * every figure on the dashboard, so the boards' numbers still hold with these
 * in the database. Without them the bin, and the "the bin holds 2" link under
 * the table, are states nobody can reach.
 */
const BINNED = [
  {
    company: "Tuinhuis Waasland",
    contact: "Ilse Goossens",
    stage: "lost",
    value: null,
    age: 80,
    dropped: 21,
  },
  {
    company: "Raamdecoratie Pauwels",
    contact: "Geert Pauwels",
    stage: "new",
    value: 4_500,
    age: 34,
    dropped: 5,
  },
];
const binned = BINNED.map((row, i) => ({
  id: `dead${String(2000 + i)}-0000-4000-8000-000000000001`,
  company_id: CO.main,
  company: row.company,
  contact_name: row.contact,
  job_title: pick(JOB),
  email: `${slug(row.contact.split(" ")[0])}@${slug(row.company)}.test`,
  phone: null,
  website: `${slug(row.company)}.test`,
  city: pick(CITY),
  country: "Belgium",
  campaign: pick(CAMPAIGN),
  source: pick(SOURCES),
  priority: between(1, 3),
  stage: row.stage,
  owner_id: U.tanguy,
  value_estimate: row.value,
  created_at: new Date(now.getTime() - row.age * DAY),
  last_touch_at: new Date(now.getTime() - row.dropped * DAY),
  deleted_at: new Date(now.getTime() - row.dropped * DAY),
}));

/* ------------------------------------------------------------- checking
 *
 * The point of the whole file. If a change here stops matching the boards,
 * this fails loudly instead of quietly producing a database that looks right.
 */

const main = leads;
const open = main.filter((l) => !["won", "lost"].includes(l.stage));
const expect = (what, got, want) => {
  if (got !== want) throw new Error(`${what}: produced ${got}, the boards say ${want}`);
};
const sum = (list) => list.reduce((t, l) => t + (l.value_estimate ?? 0), 0);
const stale = (l) => (now.getTime() - (l.last_touch_at ?? l.created_at).getTime()) / DAY >= 7;

expect("leads", main.length, 184);
expect("open", open.length, 96);
expect("won", main.filter((l) => l.stage === "won").length, 38);
expect("lost", main.filter((l) => l.stage === "lost").length, 50);
expect("open pipeline", sum(open), 412_500);
expect("not yet valued", open.filter((l) => l.value_estimate == null).length, 31);
for (const [stage, plan] of Object.entries(OPEN_PLAN)) {
  const rows = open.filter((l) => l.stage === stage);
  expect(`${stage} count`, rows.length, plan.total);
  expect(`${stage} value`, sum(rows), plan.sum);
  expect(`${stage} unvalued`, rows.filter((l) => l.value_estimate == null).length, plan.unvalued);
  const mine = rows.filter((l) => l.owner_id === U.tanguy);
  expect(`${stage} mine`, mine.length, plan.mine);
  expect(`${stage} mine value`, sum(mine), plan.mineSum);
}
expect("mine open", open.filter((l) => l.owner_id === U.tanguy).length, 39);
expect("mine open value", sum(open.filter((l) => l.owner_id === U.tanguy)), 191_500);
expect("Tanguy's accounts", main.filter((l) => l.owner_id === U.tanguy).length, 81);
expect("Sofie's accounts", main.filter((l) => l.owner_id === U.sofie).length, 62);
expect("Jens's accounts", main.filter((l) => l.owner_id === U.jens).length, 41);
expect("needs follow-up", open.filter(stale).length, 23);
expect(
  "first contact",
  open.filter((l) => l.stage === "new" && !l.last_touch_at && ageDays(l.created_at) >= 5).length,
  11,
);
expect("closing gone quiet", open.filter((l) => l.stage === "proposal" && stale(l)).length, 4);
for (let w = 0; w < 8; w += 1) {
  const start = monday.getTime() - (7 - w) * 7 * DAY;
  const end = start + 7 * DAY;
  const got = main.filter(
    (l) => l.created_at.getTime() >= start && l.created_at.getTime() < end,
  ).length;
  expect(`week ${w} inflow`, got, INFLOW[w]);
}
if (daysIntoWeek < 1)
  process.stderr.write(
    "note: run on a Monday, so this week's 17 arrivals are squeezed into today.\n",
  );

/* ------------------------------------------------------------------ sql */

const q = (value) => {
  if (value == null) return "NULL";
  if (value instanceof Date) return `'${iso(value)}'`;
  if (typeof value === "number") return String(value);
  return `'${String(value).replace(/'/g, "''")}'`;
};

const out = [];
const w = (line = "") => out.push(line);

w("-- Generated by scripts/demo-data.mjs — do not edit by hand.");
w(`-- Generated ${iso(now)} for a local, throwaway database.`);
w("--");
w("-- Loading this into a database that holds real leads is refused below.");
w("");
w("\\set ON_ERROR_STOP on");
w("BEGIN;");
w("");
w("/*");
w(" * Refuse to run anywhere that holds anything real.");
w(" *");
w(" * The Verkoop Studio workspace row is created by the migrations themselves,");
w(" * so its presence proves nothing. What proves a database is in use is work");
w(" * attached to it: a lead, a membership or a person this file did not make.");
w(" */");
w("DO $guard$");
w("DECLARE");
w(`  demo uuid[] := ARRAY[${q(CO.main)}, ${q(CO.second)}, ${q(CO.empty)}]::uuid[];`);
w(`  mine uuid[] := ARRAY[${PEOPLE.map((p) => q(p.id)).join(", ")}]::uuid[];`);
w("BEGIN");
w("  IF EXISTS (SELECT 1 FROM public.leads WHERE NOT (company_id = ANY (demo))) THEN");
w(
  "    RAISE EXCEPTION 'This database holds leads outside the demo workspaces. Demo data belongs in a throwaway local database only.';",
);
w("  END IF;");
w("  IF EXISTS (SELECT 1 FROM public.user_roles WHERE NOT (company_id = ANY (demo))) THEN");
w(
  "    RAISE EXCEPTION 'This database has people in a workspace this file did not create. Demo data belongs in a throwaway local database only.';",
);
w("  END IF;");
w("  IF EXISTS (SELECT 1 FROM auth.users WHERE NOT (id = ANY (mine))) THEN");
w(
  "    RAISE EXCEPTION 'This database has accounts this file did not create. Demo data belongs in a throwaway local database only.';",
);
w("  END IF;");
w("END");
w("$guard$;");
w("");
w("-- Start from nothing, so re-running gives the same database.");
w(`DELETE FROM public.leads WHERE company_id IN (${q(CO.main)}, ${q(CO.second)}, ${q(CO.empty)});`);
w(`DELETE FROM public.import_batches WHERE company_id IN (${q(CO.main)}, ${q(CO.second)});`);
w(`DELETE FROM public.account_requests WHERE company_id IN (${q(CO.main)}, ${q(CO.second)});`);
w(`DELETE FROM public.company_invitations WHERE company_id IN (${q(CO.main)}, ${q(CO.second)});`);
w("");
w("-- People. The password is a local fixture, not a secret.");
for (const person of PEOPLE) {
  // The token columns have no default and the auth service reads them as
  // plain strings, so a NULL here makes every sign-in fail with a 500.
  w(`INSERT INTO auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
  confirmation_token, recovery_token, email_change, email_change_token_new)
VALUES ('00000000-0000-0000-0000-000000000000', ${q(person.id)}, 'authenticated',
  'authenticated', ${q(person.email)},
  extensions.crypt(${q(PASSWORD)}, extensions.gen_salt('bf')), now(),
  '{"provider":"email","providers":["email"]}'::jsonb,
  ${q(JSON.stringify({ full_name: person.name }))}::jsonb, now(), now(),
  '', '', '', '')
ON CONFLICT (id) DO UPDATE SET
  email = excluded.email,
  encrypted_password = excluded.encrypted_password,
  email_confirmed_at = excluded.email_confirmed_at,
  confirmation_token = '', recovery_token = '',
  email_change = '', email_change_token_new = '';`);
  w(`INSERT INTO auth.identities (provider_id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
VALUES (${q(person.id)}, ${q(person.id)},
  ${q(JSON.stringify({ sub: person.id, email: person.email, email_verified: true }))}::jsonb,
  'email', now(), now(), now())
ON CONFLICT (provider, provider_id) DO NOTHING;`);
  w(`INSERT INTO public.profiles (id, email, full_name)
VALUES (${q(person.id)}, ${q(person.email)}, ${q(person.name)})
ON CONFLICT (id) DO UPDATE SET email = excluded.email, full_name = excluded.full_name;`);
}
w("");
w("INSERT INTO crm_private.platform_admins(user_id)");
w(`VALUES (${q(U.tanguy)}) ON CONFLICT DO NOTHING;`);
w("");
w("-- Three workspaces: the one the boards were drawn from, one where the");
w("-- signed-in user is only a sales rep, and one with nothing in it at all.");
for (const key of ["main", "second", "empty"]) {
  w(
    `INSERT INTO public.companies(id, name, created_by, created_at) VALUES (${q(CO[key])}, ${q(CO_NAME[key])}, ${q(U.tanguy)}, now() - interval '${key === "empty" ? 2 : 400} days')
ON CONFLICT (id) DO UPDATE SET name = excluded.name;`,
  );
}
w("");
const ROLES = [
  [CO.main, U.tanguy, "admin"],
  [CO.main, U.sofie, "team_leader"],
  [CO.main, U.jens, "rep"],
  // Not an admin here on purpose.
  [CO.second, U.tanguy, "rep"],
  [CO.second, U.sofie, "admin"],
  [CO.empty, U.tanguy, "admin"],
];
for (const [company, user, role] of ROLES) {
  w(
    `INSERT INTO public.user_roles(company_id, user_id, role) VALUES (${q(company)}, ${q(user)}, ${q(role)}::public.app_role) ON CONFLICT DO NOTHING;`,
  );
}
w("");
w(`-- ${main.length + secondLeads.length} leads, plus ${binned.length} in the bin.`);
const COLUMNS = [
  "id",
  "company_id",
  "company",
  "contact_name",
  "job_title",
  "email",
  "phone",
  "website",
  "city",
  "country",
  "campaign",
  "source",
  "stage",
  "priority",
  "value_estimate",
  "owner_id",
  "created_by",
  "created_at",
  "last_touch_at",
  "deleted_at",
];
const rows = [...main, ...secondLeads, ...binned].map(
  (lead) =>
    `  (${COLUMNS.map((c) => {
      if (c === "created_by") return q(U.tanguy);
      if (c === "source") return `${q(lead.source)}::public.lead_source`;
      if (c === "stage") return `${q(lead.stage)}::public.lead_stage`;
      return q(lead[c]);
    }).join(", ")})`,
);
w(`INSERT INTO public.leads (${COLUMNS.join(", ")}) VALUES`);
w(`${rows.join(",\n")};`);
w("");

/* ---- a history worth opening ---- */

const openLead = main.find((l) => l.stage === "proposal");
const HISTORY = [
  [
    "call",
    "Offerte lijn per lijn doorgenomen. Ze wil eik in plaats van noten, dat is ongeveer 1.800 euro meer.",
    2,
  ],
  ["note", "Verplaatst naar Closing. Alles ligt op tafel, wachten op de laatste ja.", 3],
  ["email", "Eerste offerte verstuurd, inclusief plaatsing.", 4],
  ["meeting", "Bezoek in de toonzaal. Opgemeten en foto's genomen van de bestaande keuken.", 11],
  ["note", "Kwam binnen via het websiteformulier op een zondagavond. Budget rond 25k genoemd.", 12],
  ["email", "Herinnering gestuurd met de aangepaste prijs.", 6],
];
w("-- One lead with a history long enough to scroll.");
for (const [channel, body, age] of HISTORY) {
  w(
    `INSERT INTO public.activities (company_id, lead_id, user_id, channel, direction, body, occurred_at) VALUES (${q(CO.main)}, ${q(openLead.id)}, ${q(U.tanguy)}, ${q(channel)}::public.activity_channel, 'outbound', ${q(body)}, now() - interval '${age} days');`,
  );
}
w("");
w("-- A lead with exactly one entry, and one with none at all.");
const oneEntry = main.filter((l) => l.stage === "engaged")[0];
w(
  `INSERT INTO public.activities (company_id, lead_id, user_id, channel, direction, body, occurred_at) VALUES (${q(CO.main)}, ${q(oneEntry.id)}, ${q(U.sofie)}, 'linkedin'::public.activity_channel, 'outbound', 'Verbonden en een kort bericht gestuurd over de toonzaal.', now() - interval '3 days');`,
);
w("");
w("-- An import that already ran, for the history on the import screen.");
w(
  `INSERT INTO public.import_batches (company_id, file_name, source, campaign, row_count, imported_count, skipped_count, created_by, created_at) VALUES
  (${q(CO.main)}, 'prospecten-beurs-2026.csv', 'csv'::public.lead_source, 'Beurs 2026', 312, 298, 14, ${q(U.tanguy)}, now() - interval '6 days'),
  (${q(CO.main)}, 'linkedin-export-najaar.csv', 'linkedin'::public.lead_source, 'LinkedIn najaar', 64, 64, 0, ${q(U.sofie)}, now() - interval '19 days');`,
);
w("");
w("-- Two people waiting for an account, so the badge and the list are real.");
w(
  `INSERT INTO public.account_requests (company_id, user_id, email, full_name, status) VALUES
  (${q(CO.main)}, ${q(U.ruben)}, 'ruben@verkoopstudio.test', 'Ruben Decock', 'pending'),
  (${q(CO.main)}, ${q(U.najat)}, 'najat@verkoopstudio.test', 'Najat Bourhim', 'pending');`,
);
w("");
w("-- Invited last week and still not accepted.");
w(
  `INSERT INTO public.company_invitations (company_id, email, full_name, role, token_hash, invited_by, created_at, expires_at) VALUES
  (${q(CO.main)}, 'wouter@verkoopstudio.test', 'Wouter Claes', 'rep'::public.app_role, encode(extensions.digest('demo-invitation-not-a-real-token', 'sha256'), 'hex'), ${q(U.tanguy)}, now() - interval '2 days', now() + interval '5 days');`,
);
w("");
w("COMMIT;");
w("");
w("\\echo ''");
w(`\\echo 'Demo data loaded. Sign in as tanguy@verkoopstudio.test.'`);
w(`\\echo '${CO_NAME.main}: 184 leads, the company the design boards were drawn from.'`);
w(`\\echo '${CO_NAME.second}: you are a sales rep here, not an admin.'`);
w(`\\echo '${CO_NAME.empty}: empty, for the first-run screen.'`);

process.stdout.write(out.join("\n") + "\n");
