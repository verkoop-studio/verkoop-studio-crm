/*
 * Dutch for the redesigned screens.
 *
 * The product's language mechanism is a dictionary keyed on the English text
 * node, so everything written in English in a component gets its Dutch here.
 * The register is the one the rest of the app already uses: "je", short
 * sentences, no marketing voice.
 *
 * PATTERNS carry the lines with a figure in them, because those cannot be
 * looked up as a fixed string.
 */
export const SALES_NL: Record<string, string> = {
  /*
   * Strings added with the empty states, the bin and the refresh notice.
   * This dictionary is keyed on the exact English text node, so anything new
   * on a screen is simply left in English for a Dutch reader until it appears
   * here — which is how these came to be missing: they were written and
   * checked with the interface in English.
   */
  "Clear the search": "Wis de zoekopdracht",
  "(you)": "(jij)",
  "Loading…": "Laden…",
  "Role for": "Rol voor",
  "Clear the filters": "Wis de filters",
  "The bin is empty.": "De prullenbak is leeg.",
  "Show everything": "Toon alles",
  "No quotes filed yet.": "Nog geen offertes bewaard.",
  "No contracts filed yet.": "Nog geen contracten bewaard.",
  "No leads in this workspace yet, so there is nothing to file against.":
    "Nog geen leads in deze werkruimte, dus er valt nog niets bij te bewaren.",
  "Could not refresh just now, so this is the last data that loaded.":
    "Kon net niet verversen, dus dit zijn de laatst geladen gegevens.",
  "counting…": "tellen…",

  // The country a company bills from, on the second onboarding step.
  "Belgium, EUR, 21% VAT": "Belgi\u00eb, EUR, 21% btw",
  "Netherlands, EUR, 21% VAT": "Nederland, EUR, 21% btw",
  "France, EUR, 20% VAT": "Frankrijk, EUR, 20% btw",
  "Germany, EUR, 19% VAT": "Duitsland, EUR, 19% btw",
  "Luxembourg, EUR, 17% VAT": "Luxemburg, EUR, 17% btw",

  // The outcome lines on the fourth step change with the answers.
  "At that volume you will live on the Prospectflow board rather than the list, so we will make that your landing screen.":
    "Bij dat aantal zit je eerder op het Prospectflow-bord dan in de lijst, dus maken we dat je startscherm.",
  "Open pipeline goes to the top of your dashboard, and we will keep asking for a value on leads that do not have one, because an unvalued deal makes that number a lie.":
    "Open pipeline komt bovenaan je dashboard, en we blijven om een bedrag vragen bij leads die er geen hebben, want een lead zonder waarde maakt dat getal een leugen.",
  "Under fifty open deals, the list is faster than a board, so we will start you on Leads and leave the board a click away.":
    "Onder vijftig open deals is de lijst sneller dan een bord, dus starten we je op Leads en blijft het bord \u00e9\u00e9n klik ver.",
  "Your dashboard leads with where leads come from, and winning a deal sends its value back to Performance so the ad that started it gets the credit.":
    "Je dashboard begint bij waar leads vandaan komen, en een gewonnen deal stuurt zijn waarde terug naar Performance, zodat de advertentie die hem startte de eer krijgt.",

  // The three panels on the company step: their bodies had no Dutch.
  "Drop the file in and we show you its first row, so you can say which column is the company and which is the email. Map it once and we remember it for the next list. Duplicates are matched on email and skipped unless you say otherwise.":
    "Sleep het bestand erin en we tonen de eerste rij, zodat je kan zeggen welke kolom het bedrijf is en welke het e-mailadres. Je koppelt het \u00e9\u00e9n keer en we onthouden het voor de volgende lijst. Dubbels worden op e-mailadres herkend en overgeslagen, tenzij je iets anders zegt.",
  "You get a snippet to paste on your site, or a hosted page if you would rather not touch the code. Every submission becomes a lead in New, tagged with the page it came from, and whoever is on duty gets an email.":
    "Je krijgt een stukje code om op je site te plakken, of een pagina bij ons als je liever niet aan de code komt. Elke inzending wordt een lead in Nieuw, met de pagina erbij waar hij vandaan komt, en wie van wacht is krijgt een mail.",
  "Fair enough. The list starts empty and you add the first company yourself, which takes about thirty seconds. Most people start here and import something later once they trust it.":
    "Ook goed. De lijst begint leeg en je voegt het eerste bedrijf zelf toe, wat ongeveer dertig seconden duurt. De meesten beginnen hier en importeren later iets, als ze het vertrouwen.",

  // A sentence wrapped around an inline link arrives in three pieces; the
  // trailing one needs its own entry or half the line stays English.
  "instead, or open the invitation they sent you.":
    "in plaats daarvan, of open de uitnodiging die ze je stuurden.",

  // Page titles. The tab says the same thing as the page.
  "Create your workspace | Sales": "Maak je werkruimte | Sales",
  "Your company | Sales": "Je bedrijf | Sales",
  "Your team | Sales": "Je team | Sales",
  "How you sell | Sales": "Hoe je verkoopt | Sales",
  "Setting up your workspace | Sales": "Je werkruimte wordt klaargezet | Sales",

  /* ── Chrome ──────────────────────────────────────────────────────────── */
  Sales: "Sales",
  Dashboard: "Dashboard",
  Leads: "Leads",
  Prospectflow: "Prospectflow",
  "Quotes and contracts": "Offertes en contracten",
  Quotes: "Offertes",
  "Switch company": "Ander bedrijf",
  Settings: "Instellingen",
  "Sign out": "Afmelden",
  Sidebar: "Zijbalk",
  Sections: "Onderdelen",
  "Verkoop Studio Sales": "Verkoop Studio Sales",

  /* ── Dashboard ───────────────────────────────────────────────────────── */
  "Which leads": "Welke leads",
  Everyone: "Iedereen",
  Mine: "Van mij",
  "Refreshed just now": "Net ververst",
  "Refreshing…": "Verversen…",
  "Manage leads": "Leads beheren",
  "New this week": "Nieuw deze week",
  "Open pipeline (estimated)": "Open pipeline (geschat)",
  "Win rate": "Winpercentage",
  "Needs follow-up": "Opvolging nodig",
  "7+ days without contact": "7+ dagen zonder contact",
  "New leads per week": "Nieuwe leads per week",
  "last 8 weeks": "laatste 8 weken",
  "Where are your prospects?": "Waar staan je prospects?",
  "Won and lost are not counted here.": "Gewonnen en verloren tellen hier niet mee.",
  "Next step": "Volgende stap",
  "Keep things moving.": "Pak deze kansen op.",
  "Suggested from last contact, stage and value. None of it happens on its own: it is what you could do today.":
    "Voorgesteld op basis van laatste contact, fase en waarde. Niets hiervan gebeurt vanzelf: dit is wat je vandaag kan doen.",
  "Make first contact": "Leg het eerste contact",
  "5+ days in New, nobody reached out": "5+ dagen in Nieuw, niemand belde",
  "Add an estimated value": "Voeg een waardeschatting toe",
  "open prospects with no amount": "open prospects zonder bedrag",
  "Follow up on the proposal": "Volg het voorstel op",
  "in Closing, quiet for a week": "in Voorstel, een week stil",
  "Loading dashboard…": "Dashboard laden…",
  "Could not load data.": "Gegevens laden mislukt.",
  Retry: "Opnieuw proberen",

  /* ── First run ───────────────────────────────────────────────────────── */
  "Set-up": "Instellen",
  "Workspace is live": "Werkruimte staat klaar",
  "Empty, which is exactly how it should look right now.":
    "Leeg, en zo hoort het er nu ook uit te zien.",
  "Three things turn this into something you open every morning. The first one takes thirty seconds.":
    "Met drie dingen wordt dit iets wat je elke ochtend opent. Het eerste kost dertig seconden.",
  "Workspace created": "Werkruimte aangemaakt",
  "Import your list": "Importeer je lijst",
  "a CSV from a trade show, LinkedIn or your old spreadsheet":
    "een CSV van een beurs, LinkedIn of je oude rekenblad",
  "the list you said you had when you signed up":
    "de lijst waarvan je zei dat je ze had bij het aanmelden",
  "Invite your team": "Nodig je team uit",
  "everyone is included in the price, so this costs nothing":
    "iedereen zit in de prijs, dus dit kost niets",
  "Put the form on your site": "Zet het formulier op je site",
  "leads that arrive while you sleep": "leads die binnenkomen terwijl je slaapt",
  Import: "Importeren",
  Invite: "Uitnodigen",
  "Get it": "Ophalen",
  Done: "Klaar",
  "Nothing has come in yet. Add one and this starts counting.":
    "Er is nog niets binnengekomen. Voeg er een toe en dit begint te tellen.",
  "Open pipeline": "Open pipeline",
  "Needs leads with a value on them. The value is yours to estimate, not ours.":
    "Heeft leads met een waarde nodig. Die schatting is aan jou, niet aan ons.",
  "Only means something once you have won or lost a few. Weeks away, not minutes.":
    "Zegt pas iets als je er een paar gewonnen of verloren hebt. Weken ver, geen minuten.",
  "Nobody is waiting on you. That is the good kind of empty.":
    "Niemand wacht op jou. Dat is de goede soort leegte.",
  "Add a lead": "Lead toevoegen",
  "Nothing to do": "Niets te doen",
  "Your leads": "Jouw leads",
  "none yet": "nog geen",
  "Three ways to fill this, in order of effort.":
    "Drie manieren om dit te vullen, van minste naar meeste moeite.",
  "Typing one in is the fastest way to see how it works. Importing is the fastest way to get your real work in here. The form is the one that keeps working after you close the laptop.":
    "Er zelf een intypen is de snelste manier om te zien hoe het werkt. Importeren is de snelste manier om je echte werk hier te krijgen. Het formulier blijft werken als de laptop dicht is.",
  "CSV or Excel, map it once": "CSV of Excel, één keer koppelen",
  "Add one by hand": "Zelf een toevoegen",
  "about thirty seconds": "ongeveer dertig seconden",
  "Put a form on your site": "Zet een formulier op je site",
  "and they arrive on their own": "en ze komen vanzelf binnen",
  "Every empty panel here says which of the three it is: your move, a matter of time, or nothing to do. A screen that says “no data” four times teaches nobody anything.":
    "Elk leeg paneel hier zegt welke van de drie het is: jouw beurt, een kwestie van tijd, of niets te doen. Een scherm dat vier keer “geen gegevens” zegt, leert niemand iets.",

  /* ── Leads ───────────────────────────────────────────────────────────── */
  "Search leads": "Leads zoeken",
  "Company, contact or email": "Bedrijf, contactpersoon of e-mail",
  "Owner: everyone": "Eigenaar: iedereen",
  "Owner: me": "Eigenaar: ik",
  "Owner: nobody yet": "Eigenaar: nog niemand",
  "All channels": "Alle kanalen",
  "Import a list": "Lijst importeren",
  "New lead": "Nieuwe lead",
  "All open and closed": "Alles, open en afgesloten",
  "Everything in the bin": "Alles in de prullenbak",
  New: "Nieuw",
  Contacted: "Gecontacteerd",
  Engaged: "Interesse",
  "Meeting booked": "Afspraak",
  Closing: "Voorstel",
  Won: "Gewonnen",
  Lost: "Verloren",
  Company: "Bedrijf",
  Contact: "Contactpersoon",
  Via: "Via",
  Stage: "Fase",
  Value: "Waarde",
  "Last touch": "Laatste contact",
  Owner: "Eigenaar",
  "Select all": "Alles selecteren",
  "Move stage": "Fase wijzigen",
  "Assign owner": "Eigenaar toewijzen",
  Export: "Exporteren",
  Clear: "Wissen",
  Nobody: "Niemand",
  "Not valued": "Geen waarde",
  Today: "Vandaag",
  Yesterday: "Gisteren",
  Never: "Nooit",
  Previous: "Vorige",
  Next: "Volgende",
  "Log a call": "Gesprek loggen",
  "Open the lead": "Lead openen",
  "Loading leads…": "Leads laden…",
  "Could not load leads.": "Leads laden mislukt.",
  "Nothing matches these filters.": "Niets voldoet aan deze filters.",
  "Your move: no leads yet. Import a list or add the first one.":
    "Jouw beurt: nog geen leads. Importeer een lijst of voeg de eerste toe.",
  "Back to the live leads": "Terug naar de actieve leads",
  "A lead with no estimated value is not counted in the open pipeline figure on the dashboard. Value, owner and stage are the three fields the rest of the product reads, so they sit in the table rather than one level down.":
    "Een lead zonder waardeschatting telt niet mee in de open pipeline op het dashboard. Waarde, eigenaar en fase zijn de drie velden die de rest van het programma leest, dus staan ze in de tabel en niet een niveau dieper.",
  "A company from any channel. You become the owner.":
    "Een bedrijf uit eender welk kanaal. Jij wordt de eigenaar.",
  "Contact name": "Naam contactpersoon",
  "Job title": "Functie",
  Email: "E-mail",
  Phone: "Telefoon",
  City: "Stad",
  Campaign: "Campagne",
  "Where it lands": "Waar het terechtkomt",
  "Save lead": "Lead opslaan",
  "Saving…": "Opslaan…",
  Cancel: "Annuleren",
  "Lead added": "Lead toegevoegd",

  /* ── One lead ────────────────────────────────────────────────────────── */
  "Deal value": "Dealwaarde",
  "your estimate": "jouw schatting",
  "nobody has put a number on this yet": "niemand zette hier al een bedrag op",
  "an estimate, owner unknown": "een schatting, eigenaar onbekend",
  Save: "Opslaan",
  "Leave it empty to unset it.": "Laat leeg om de waarde te wissen.",
  "Enter a non-negative amount with up to 2 decimals, without thousands separators.":
    "Vul 0 of een positief bedrag in met maximaal 2 decimalen, zonder duizendtalscheiding.",
  "Move this lead to another stage": "Deze lead naar een andere fase verplaatsen",
  "Mark won": "Markeer gewonnen",
  "Mark lost": "Markeer verloren",
  "Marked won": "Gewonnen",
  "Marked lost": "Verloren",
  "Log what just happened": "Log wat er net gebeurde",
  "Kind of contact": "Soort contact",
  "What happened": "Wat er gebeurde",
  Call: "Gesprek",
  LinkedIn: "LinkedIn",
  Meeting: "Afspraak",
  "Ads or inbound": "Advertenties of aanvraag",
  Note: "Notitie",
  "Log it": "Loggen",
  "Logging…": "Loggen…",
  "Logging a contact sets the last touch to today, which is what takes this lead off the follow-up list.":
    "Een contact loggen zet het laatste contact op vandaag, en dat haalt deze lead van de opvolglijst.",
  "What did they actually say?": "Wat zeiden ze precies?",
  "What did you send them?": "Wat heb je hen gestuurd?",
  "Connected, or sent a note about what?": "Verbonden, of een bericht gestuurd waarover?",
  "When is it, where, and who is coming?": "Wanneer, waar, en wie komt er?",
  "What did they come back to the site for?": "Waarvoor kwamen ze terug naar de site?",
  "Something worth remembering next time.": "Iets om de volgende keer te onthouden.",
  "Who they are": "Wie ze zijn",
  Website: "Website",
  Country: "Land",
  Channel: "Kanaal",
  "Anything else worth knowing": "Nog iets wat het weten waard is",
  "What came in with them, what they asked for, what to watch out for.":
    "Wat er met hen binnenkwam, wat ze vroegen, waar je op moet letten.",
  Quote: "Offerte",
  Contract: "Contract",
  "What kind of document": "Soort document",
  "Upload a file": "Bestand uploaden",
  "Uploading…": "Uploaden…",
  "PDF or Word. It shows up on the Quotes and contracts page too.":
    "PDF of Word. Het verschijnt ook op de pagina Offertes en contracten.",
  "Document uploaded": "Document geüpload",
  "Upload failed. PDF, Word or an image, up to 20 MB.":
    "Upload mislukt. PDF, Word of een afbeelding, tot 20 MB.",
  "Allow pop-ups to open the document.": "Sta pop-ups toe om het document te openen.",
  "Could not open document.": "Document openen mislukt.",
  "Everything that happened": "Alles wat er gebeurde",
  "nothing logged yet": "nog niets gelogd",
  "Your move. Log the first call, email or note above and it starts here.":
    "Jouw beurt. Log hierboven het eerste gesprek, de eerste mail of een notitie en het begint hier.",
  "Nothing here is deleted. A lead you drop goes to the bin and can come back with its whole history.":
    "Hier wordt niets verwijderd. Een lead die je laat vallen gaat naar de prullenbak en kan met zijn hele geschiedenis terugkomen.",
  "Move to the bin": "Naar de prullenbak",
  "Take it out of the bin": "Uit de prullenbak halen",
  "Lead restored": "Lead hersteld",
  "Moved to the bin": "Naar de prullenbak verplaatst",
  Close: "Sluiten",
  "Nobody yet": "Nog niemand",
  Logged: "Gelogd",

  /* ── Prospect flow ───────────────────────────────────────────────────── */
  "Prospect flow": "Prospectflow",
  Show: "Tonen",
  "See them as a list": "Bekijk ze als lijst",
  "Loading prospects…": "Prospects laden…",
  "Loading failed.": "Laden mislukt.",
  "all valued": "alles gewaardeerd",
  "No contact yet": "Nog geen contactpersoon",
  "Nothing here. Drop a card in, or move one along from the left.":
    "Niets hier. Sleep er een kaart in, of schuif er een door van links.",
  "Won and lost sit outside the flow": "Gewonnen en verloren staan buiten de flow",
  "a finished deal is an outcome, not a column you drag through":
    "een afgeronde deal is een uitkomst, geen kolom waar je doorheen sleept",
  "Back to the dashboard": "Terug naar het dashboard",
  "Move failed. Please try again.": "Verplaatsen mislukt. Probeer opnieuw.",

  /* ── Quotes and contracts ────────────────────────────────────────────── */
  "Search company or document": "Zoek bedrijf of document",
  "Document type": "Documenttype",
  Everything: "Alles",
  Contracts: "Contracten",
  "Company A to Z": "Bedrijf A tot Z",
  "Company Z to A": "Bedrijf Z tot A",
  "Upload to a lead": "Upload bij een lead",
  "Companies with paperwork": "Bedrijven met papierwerk",
  "sent, across every stage": "verstuurd, over alle fases heen",
  "Everything, by company": "Alles, per bedrijf",
  "Loading documents…": "Documenten laden…",
  "The document library could not be loaded in full.":
    "Het documentenoverzicht kon niet volledig worden geladen.",
  "Nothing matches that search.": "Niets voldoet aan die zoekopdracht.",
  "Your move: nothing is filed yet. Open a lead and upload its quote, and it appears here.":
    "Jouw beurt: er is nog niets opgeborgen. Open een lead, upload de offerte, en ze verschijnt hier.",
  Open: "Openen",
  "A document belongs to a lead, not to this page. Upload it on the lead and it appears here; there is no second filing system to keep in step.":
    "Een document hoort bij een lead, niet bij deze pagina. Upload het op de lead en het verschijnt hier; er is geen tweede archief dat je moet bijhouden.",

  /* ── Settings ────────────────────────────────────────────────────────── */
  "Settings and team": "Instellingen en team",
  "Company name": "Bedrijfsnaam",
  "shown on quotes, invites and the website form":
    "staat op offertes, uitnodigingen en het websiteformulier",
  "Company name saved": "Bedrijfsnaam opgeslagen",
  Language: "Taal",
  "yours only, it does not change what your team sees":
    "alleen voor jou, je team ziet er niets van",
  "Website request form": "Websiteformulier",
  "a form on your site that drops straight into New":
    "een formulier op je site dat meteen in Nieuw terechtkomt",
  "Copy the snippet": "Kopieer de code",
  "Snippet copied": "Code gekopieerd",
  "Show the token": "Token tonen",
  "Hide the token": "Token verbergen",
  "No token yet": "Nog geen token",
  "Rotate it": "Vernieuwen",
  "Rotating…": "Vernieuwen…",
  "New token created": "Nieuw token aangemaakt",
  "The token goes in the snippet’s header. Rotating it stops the old one working, so replace the snippet on your site at the same time.":
    "Het token staat in de header van de code. Vernieuwen zet het oude buiten werking, dus vervang tegelijk de code op je site.",
  "won deal values go back to the ad reports, so a lead becomes revenue there":
    "gewonnen dealwaarden gaan terug naar de advertentierapporten, zodat een lead daar omzet wordt",
  Connected: "Verbonden",
  "Not connected": "Niet verbonden",
  Manage: "Beheren",
  "New reporting token created": "Nieuw rapporteringstoken aangemaakt",
  Plan: "Abonnement",
  "Show me where they came from": "Laat zien waar ze vandaan komen",
  "They came from an ad or your site in the last 30 days. This app cannot tell you which ad, post or search brought them. Verkoop Studio Performance can.":
    "Ze kwamen de laatste 30 dagen van een advertentie of van je site. Deze app kan je niet zeggen welke advertentie, post of zoekopdracht hen bracht. Verkoop Studio Performance wel.",
  "counting your leads…": "je leads tellen…",
  "Everyone in the company is included, however many people you invite. Nothing locks, goes read-only or stops working when the count moves.":
    "Iedereen in het bedrijf zit erbij, hoeveel mensen je ook uitnodigt. Er gaat niets op slot, niets wordt alleen-lezen en niets stopt wanneer het aantal verandert.",
  "Free, for the whole company": "Gratis, voor het hele bedrijf",
  People: "Mensen",
  Admin: "Beheerder",
  "Team leader": "Teamleider",
  "Sales rep": "Verkoper",
  "Everything, including roles, imports, the website form and removing the company.":
    "Alles, inclusief rollen, imports, het websiteformulier en het bedrijf verwijderen.",
  "Sees and edits the whole team's leads, assigns owners, imports lists.":
    "Ziet en bewerkt de leads van het hele team, wijst eigenaars toe, importeert lijsten.",
  "Works their own leads, and can read the rest without changing them.":
    "Werkt de eigen leads, en kan de rest lezen zonder ze te wijzigen.",
  "A role is not a wall between people. Everyone sees the same pipeline; the role decides who can change a stage on someone else’s lead, invite people, and import a list.":
    "Een rol is geen muur tussen mensen. Iedereen ziet dezelfde pipeline; de rol bepaalt wie een fase mag wijzigen op andermans lead, wie mensen uitnodigt en wie een lijst importeert.",
  "Role updated": "Rol aangepast",
  "You cannot remove yourself": "Je kan jezelf niet verwijderen",
  "Remove this person?": "Deze persoon verwijderen?",
  "Remove them": "Verwijderen",
  "Removing…": "Verwijderen…",
  "Member removed from this company": "Persoon verwijderd uit dit bedrijf",
  Decline: "Weigeren",
  "Review them": "Bekijken",
  "Give them an account": "Geef ze een account",
  "Name not given": "Naam niet opgegeven",
  "Decline them all": "Allemaal weigeren",
  "Declining…": "Weigeren…",
  "Account approved": "Account goedgekeurd",
  "Account declined": "Account geweigerd",
  "All requests declined": "Alle aanvragen geweigerd",
  "Invite someone": "Iemand uitnodigen",
  "they get an email, or you copy the link and send it yourself":
    "ze krijgen een e-mail, of je kopieert de link en stuurt ze zelf",
  "Their name": "Hun naam",
  "Email address": "E-mailadres",
  "Their role": "Hun rol",
  "Send the invite": "Uitnodiging versturen",
  "Sending…": "Versturen…",
  "Invitation sent by email": "Uitnodiging per e-mail verstuurd",
  "Email sending could not be confirmed. Copy the link below instead.":
    "De e-mailverzending kon niet worden bevestigd. Kopieer hieronder de link.",
  "Invitation link": "Uitnodigingslink",
  "Copy the link": "Link kopiëren",
  "Link copied": "Link gekopieerd",
  "Select and copy the link above.": "Selecteer en kopieer de link hierboven.",
  "nothing happens to them until they open the link":
    "er gebeurt niets met hen tot ze de link openen",
  "Take it back": "Intrekken",
  "Invitation taken back": "Uitnodiging ingetrokken",
  "expired, invite them again": "verlopen, nodig ze opnieuw uit",
  Assistants: "Assistenten",
  "ChatGPT, Claude and other clients": "ChatGPT, Claude en andere clients",
  "they can read and update leads for you, under your own permissions":
    "ze kunnen leads voor jou lezen en bijwerken, met jouw eigen rechten",
  "Connect another": "Nog een koppelen",
  "Address copied": "Adres gekopieerd",
  "What they are allowed to do": "Wat ze mogen doen",
  "an assistant never gets more than the person who connected it":
    "een assistent krijgt nooit meer dan de persoon die hem koppelde",
  "Read leads": "Leads lezen",
  "Add and update leads": "Leads toevoegen en bijwerken",
  "Log what happened": "Loggen wat er gebeurde",
  "Open documents": "Documenten openen",
  "Remove this company": "Dit bedrijf verwijderen",
  "Team used to be its own page. It is one group in this list now, because a company with three people does not need a second screen to manage them, and the app still redirects the old link here.":
    "Team was vroeger een eigen pagina. Het is nu één groep in deze lijst, want een bedrijf met drie mensen heeft geen tweede scherm nodig om ze te beheren, en de app stuurt de oude link hierheen door.",

  /* ── Import ──────────────────────────────────────────────────────────── */
  "Back to leads": "Terug naar leads",
  "A CSV from a trade show, LinkedIn or a scraper. Map it once and we remember the mapping for next time.":
    "Een CSV van een beurs, LinkedIn of een scraper. Koppel ze één keer en we onthouden de koppeling voor de volgende keer.",
  "No file chosen yet": "Nog geen bestand gekozen",
  "A CSV export, up to a few thousand rows at a time.":
    "Een CSV-export, tot een paar duizend rijen per keer.",
  "Choose a file": "Kies een bestand",
  "Choose another file": "Kies een ander bestand",
  "That file has no data rows.": "Dat bestand bevat geen gegevensrijen.",
  "Which column is what": "Welke kolom is wat",
  "Column in your file": "Kolom in je bestand",
  "First row says": "Eerste rij zegt",
  "Goes into": "Wordt",
  "Leave it out": "Laat weg",
  needed: "nodig",
  "What happens to them": "Wat er met ze gebeurt",
  "Who owns them": "Wie ze krijgt",
  "one person, or split evenly across the team": "één persoon, of gelijk verdeeld over het team",
  "Split across the team": "Verdeel over het team",
  "Where they land": "Waar ze terechtkomen",
  "every imported lead starts in the same stage": "elke geïmporteerde lead begint in dezelfde fase",
  "Call the list something": "Geef de lijst een naam",
  "it becomes their campaign, so you can filter on it later":
    "het wordt hun campagne, zodat je er later op kan filteren",
  "Trade show list": "Beurslijst",
  "Skip the ones you already have": "Sla over wat je al hebt",
  "matched on email first, then on LinkedIn, then on company and contact":
    "eerst op e-mail, dan op LinkedIn, dan op bedrijf en contactpersoon",
  "Before you press it": "Voor je op de knop duwt",
  "new leads": "nieuwe leads",
  "Rows in the file": "Rijen in het bestand",
  "Already in your leads": "Zit al in je leads",
  "Missing a company name": "Zonder bedrijfsnaam",
  "Importing…": "Importeren…",
  "Say which column is the company first.": "Zeg eerst welke kolom het bedrijf is.",
  "Nothing new to import.": "Niets nieuws om te importeren.",
  "Could not start the import": "De import kon niet starten",
  "What you imported before": "Wat je eerder importeerde",
  "Undo this import": "Deze import ongedaan maken",
  "Undoing…": "Ongedaan maken…",
  "Move every lead this import created to the bin":
    "Zet elke lead uit deze import in de prullenbak",
  today: "vandaag",
  yesterday: "gisteren",

  /* ── Signing in ──────────────────────────────────────────────────────── */
  "From first hello to closed deal.": "Van eerste contact tot getekende deal.",
  "A form on your site, at 23:40": "Een formulier op je site, om 23.40 uur",
  "lands in New, with the campaign it came from":
    "komt in Nieuw terecht, met de campagne waar het vandaan kwam",
  "You call them on Tuesday": "Je belt ze dinsdag",
  "logged in one tap, the follow-up clock resets":
    "met één tik gelogd, de opvolgklok begint opnieuw",
  "The quote goes out": "De offerte gaat buiten",
  "the file lives on the lead, not in your mailbox":
    "het bestand hoort bij de lead, niet bij je mailbox",
  "Won, and the deal has a value": "Gewonnen, en de deal heeft een waarde",
  "Welcome back.": "Welkom terug.",
  "Sign in to the Verkoop Studio sales workspace.":
    "Meld je aan bij de salesworkspace van Verkoop Studio.",
  "Continue with Google": "Doorgaan met Google",
  or: "of",
  "Work email": "Werkmail",
  Password: "Wachtwoord",
  "Your password": "Je wachtwoord",
  "Forgot it?": "Vergeten?",
  "Sign in": "Aanmelden",
  "Signing in…": "Aanmelden…",
  "Show password": "Wachtwoord tonen",
  "Hide password": "Wachtwoord verbergen",
  "You only see the companies you were given access to. Switching between them never mixes their leads.":
    "Je ziet alleen de bedrijven waartoe je toegang kreeg. Wisselen tussen bedrijven vermengt hun leads nooit.",
  "Ask them for an account": "Vraag hen een account",
  "Nobody here uses it yet?": "Gebruikt hier nog niemand dit?",
  "Put your work email in first, then press Forgot it.":
    "Vul eerst je werkmail in en druk dan op Vergeten.",
  "Check your email. The link in it lets you choose a new password.":
    "Kijk in je mailbox. Met de link daarin kies je een nieuw wachtwoord.",
  "Google sign-in failed. Try your email instead.":
    "Aanmelden met Google is mislukt. Probeer je e-mailadres.",
  "This workspace is still being set up": "Deze werkruimte wordt nog klaargezet",
  "No database is configured for this build, so there is nothing to sign in to yet. Once it is connected, this is where you come in.":
    "Er is geen database ingesteld voor deze build, dus er is nog niets om je bij aan te melden. Zodra ze verbonden is, kom je hier binnen.",

  /* ── Asking for an account ───────────────────────────────────────────── */
  "Accounts are given out by your own team.": "Accounts worden door je eigen team gegeven.",
  "Nobody buys a seat here and nobody signs up into an empty workspace. You ask, an admin at your company says yes, and you land in their leads with the access they gave you.":
    "Niemand koopt hier een plaats en niemand meldt zich aan in een lege werkruimte. Jij vraagt, een beheerder bij jouw bedrijf zegt ja, en je komt in hun leads met de toegang die ze je geven.",
  "You send this": "Jij stuurt dit",
  "name, work email, a password you choose": "naam, werkmail, een wachtwoord dat je zelf kiest",
  "An admin sees it in Settings": "Een beheerder ziet het bij Instellingen",
  "they approve it and pick what you may do": "ze keuren het goed en kiezen wat je mag doen",
  "You get an email and sign in": "Je krijgt een mail en meldt je aan",
  "straight into their leads, nothing to set up": "meteen in hun leads, niets in te stellen",
  "Already been sent an invitation? Open the link in that email instead. It skips all of this and puts you straight into the right company.":
    "Al een uitnodiging gekregen? Open dan de link in die mail. Dat slaat dit alles over en zet je meteen in het juiste bedrijf.",
  "Ask for an account.": "Vraag een account.",
  "Use your work address, so the admin recognises you.":
    "Gebruik je werkadres, zodat de beheerder je herkent.",
  "Ask with Google": "Vragen met Google",
  "Your name": "Je naam",
  "Your full name": "Je volledige naam",
  "At least 15 characters": "Minstens 15 tekens",
  "We match the domain to a company, so an admin there gets the request.":
    "We koppelen het domein aan een bedrijf, zodat een beheerder daar de aanvraag krijgt.",
  "Send my request": "Mijn aanvraag versturen",
  "You cannot sign in until someone approves this. We will email you the moment they do, usually the same day.":
    "Je kan je pas aanmelden als iemand dit goedkeurt. We mailen je zodra dat gebeurt, meestal dezelfde dag.",
  "I already have an account": "Ik heb al een account",
  "Set it up yourself": "Zet het zelf op",
  "Your request has been sent.": "Je aanvraag is verstuurd.",
  "Account created. Confirm it from your email, then come back and sign in.":
    "Account aangemaakt. Bevestig via je e-mail en meld je daarna hier aan.",
  "Google sign-in failed. Use your email instead.":
    "Aanmelden met Google is mislukt. Gebruik je e-mailadres.",
  "Not taking requests yet": "Nog geen aanvragen mogelijk",
  "No database is configured for this build, so there is nobody to send a request to.":
    "Er is geen database ingesteld voor deze build, dus er is niemand om een aanvraag naar te sturen.",
  Good: "Goed",
  Strong: "Sterk",
  "Too short": "Te kort",

  /* ── A new password ──────────────────────────────────────────────────── */
  "Choose a new password.": "Kies een nieuw wachtwoord.",
  "New password": "Nieuw wachtwoord",
  "Pick something you have not used anywhere else. You stay signed in afterwards.":
    "Kies iets dat je nergens anders gebruikt. Je blijft daarna aangemeld.",
  "This link has expired or was already used. Ask for a new one from the sign-in page.":
    "Deze link is verlopen of al gebruikt. Vraag een nieuwe aan op de aanmeldpagina.",
  "Save it and go in": "Opslaan en naar binnen",
  "Back to signing in": "Terug naar aanmelden",
  "New password saved.": "Nieuw wachtwoord opgeslagen.",

  /* ── Letting an assistant in ─────────────────────────────────────────── */
  "It will act as you, inside one company, and only within what this page lists.":
    "Hij handelt als jou, binnen één bedrijf, en alleen binnen wat op deze pagina staat.",
  "Which company": "Welk bedrijf",
  "the one whose connection address you gave it": "het bedrijf waarvan je het koppeladres gaf",
  "What it may do": "Wat hij mag doen",
  "What it can never do": "Wat hij nooit kan",
  "always on": "altijd aan",
  included: "inbegrepen",
  "Read your leads": "Je leads lezen",
  "Company, contact, stage, value and the outreach history, for one company only.":
    "Bedrijf, contactpersoon, fase, waarde en de contacthistoriek, voor één bedrijf.",
  "Add leads and move them along": "Leads toevoegen en vooruit helpen",
  "Create a lead, change a stage, log a call. Everything it writes lands in the lead's history.":
    "Een lead aanmaken, een fase wijzigen, een gesprek loggen. Alles wat hij schrijft komt in de geschiedenis van de lead.",
  "Open quotes and contracts": "Offertes en contracten openen",
  "Read the files attached to a lead, because it signs in with your own access to them.":
    "De bestanden bij een lead lezen, want hij meldt zich aan met jouw eigen toegang.",
  "See who is on your team": "Zien wie er in je team zit",
  "Names and roles, so it can tell you who owns a lead.":
    "Namen en rollen, zodat hij kan zeggen wie een lead beheert.",
  "Reach a company you were not given access to":
    "Een bedrijf bereiken waartoe je geen toegang kreeg",
  "Delete a lead, a document or a company": "Een lead, document of bedrijf verwijderen",
  "Invite anyone, change a role, or sign in as you anywhere else":
    "Iemand uitnodigen, een rol wijzigen, of zich elders als jou aanmelden",
  "Not now": "Nu niet",
  "One moment…": "Een ogenblik…",
  "This assistant": "Deze assistent",
  "No redirect returned by the authorization server.":
    "De autorisatieserver gaf geen doorverwijzing terug.",

  /* ── Signing up on your own ──────────────────────────────────────────── */
  Account: "Account",
  Team: "Team",
  You: "Jij",
  "Stop losing deals in a spreadsheet.": "Verlies geen deals meer in een rekenblad.",
  "No card needed": "Geen kaart nodig",
  Free: "Gratis",
  "Open my workspace": "Open mijn werkruimte",
  "Every lead, every stage, in one list": "Elke lead, elke fase, in één lijst",
  "Unlimited people, one price for the company":
    "Onbeperkt aantal mensen, één prijs voor het bedrijf",
  "Quotes and contracts on the lead, not in a mailbox":
    "Offertes en contracten bij de lead, niet in een mailbox",
  "Create your workspace.": "Maak je werkruimte.",
  "Two minutes. Your first lead is in before the end of it.":
    "Twee minuten. Je eerste lead staat er voor het einde in.",
  "Setting it up…": "Klaarzetten…",
  "No database is configured for this build.": "Er is geen database ingesteld voor deze build.",
  "By continuing you agree to the terms and the privacy statement. Your leads are yours: export them whenever you like, and we never sell or share them.":
    "Door verder te gaan ga je akkoord met de voorwaarden en de privacyverklaring. Je leads zijn van jou: exporteer ze wanneer je wil, en wij verkopen of delen ze nooit.",
  "Joining a company that already uses this? Do not start here.":
    "Sluit je aan bij een bedrijf dat dit al gebruikt? Begin dan niet hier.",
  "Whose leads are these?": "Wiens leads zijn dit?",
  "A workspace holds one company. You can add more later and they never mix.":
    "Een werkruimte bevat één bedrijf. Je kan er later meer toevoegen en ze vermengen nooit.",
  "it goes on quotes, invitations and the website form":
    "het staat op offertes, uitnodigingen en het websiteformulier",
  "Your company": "Je bedrijf",
  "sets your currency and the VAT on your invoice": "bepaalt je munt en de btw op je factuur",
  "How should we fill it?": "Hoe vullen we ze?",
  "Pick one for now. The others are a click away once you are in.":
    "Kies er nu één. De andere zijn één klik ver zodra je binnen bent.",
  "I have a list already": "Ik heb al een lijst",
  "Put a form on my website": "Zet een formulier op mijn website",
  "anyone who fills it in lands in New, with the campaign attached":
    "wie het invult komt in Nieuw terecht, met de campagne erbij",
  "I will add them myself": "Ik voeg ze zelf toe",
  "start empty and type the first one in a minute":
    "begin leeg en typ de eerste er binnen een minuut in",
  "You will land on the import screen": "Je komt op het importscherm terecht",
  "The snippet is waiting in Settings": "De code staat klaar bij Instellingen",
  "You will land on an empty list": "Je komt op een lege lijst terecht",
  "CSV or Excel, up to a few thousand rows at a time.":
    "CSV of Excel, tot een paar duizend rijen per keer.",
  "Two minutes, and your developer can do it without us.":
    "Twee minuten, en je ontwikkelaar kan het zonder ons.",
  "You can still import or add the form at any point.":
    "Je kan nog altijd importeren of het formulier later toevoegen.",
  Continue: "Verder",
  "Nothing here is permanent. The company name, the country and how leads arrive are all in Settings afterwards.":
    "Niets hiervan ligt vast. De bedrijfsnaam, het land en hoe leads binnenkomen staan daarna allemaal bij Instellingen.",
  Skip: "Overslaan",
  "Who else sells here?": "Wie verkoopt hier nog?",
  "Everyone is included, whatever the workspace costs. People are never charged for here, so the only reason to wait is that you are not sure yet.":
    "Iedereen zit erbij, wat de werkruimte ook kost. Mensen kosten hier nooit iets, dus de enige reden om te wachten is dat je het nog niet zeker weet.",
  "Add another": "Nog iemand",
  "Remove this row": "Deze rij verwijderen",
  "Plenty for now. The rest can come from Settings, in bulk if you like.":
    "Genoeg voor nu. De rest kan via Instellingen, in bulk als je wil.",
  "They get an email with a link. Nothing happens to them until they open it.":
    "Ze krijgen een mail met een link. Er gebeurt niets met hen tot ze die openen.",
  "What the three roles can do": "Wat de drie rollen kunnen",
  "Everything, including billing, roles, imports and removing the company.":
    "Alles, inclusief facturatie, rollen, imports en het bedrijf verwijderen.",
  "The invitations go out once your workspace is open, so they can start straight away.":
    "De uitnodigingen vertrekken zodra je werkruimte openstaat, zodat ze meteen kunnen beginnen.",
  "Alone is fine. You stay the only person in here until you invite someone from Settings.":
    "Alleen is prima. Je blijft hier de enige tot je iemand uitnodigt via Instellingen.",
  "Three questions. Nothing to type.": "Drie vragen. Niets te typen.",
  "How do you actually sell?": "Hoe verkoop je eigenlijk?",
  "This decides what the app nags you about, and which screen you land on. All of it is changeable later.":
    "Dit bepaalt waar de app je aan herinnert, en op welk scherm je landt. Alles is later aanpasbaar.",
  "How many deals are open at once?": "Hoeveel deals staan er tegelijk open?",
  "Under fifty and a list beats a board. Over it, you want the board.":
    "Onder de vijftig wint een lijst van een bord. Daarboven wil je het bord.",
  "Fewer than 20": "Minder dan 20",
  "20 to 50": "20 tot 50",
  "50 to 200": "50 tot 200",
  "More than 200": "Meer dan 200",
  "What usually kills a deal here?": "Waar loopt een deal hier meestal op stuk?",
  "Whatever you pick is what we will nudge you about, and nothing else.":
    "Waar je op tikt, daar porren we je aan. Verder nergens over.",
  "They go quiet on us": "Ze vallen stil",
  "We follow up too late": "We volgen te laat op",
  "We lose on price": "We verliezen op prijs",
  "We never reach the decision maker": "We bereiken de beslisser niet",
  "It falls off the list entirely": "Het valt helemaal van de lijst",
  "What would make this worth keeping?": "Wat maakt dit het bijhouden waard?",
  "This decides what sits at the top of your dashboard.":
    "Dit bepaalt wat bovenaan je dashboard staat.",
  "Stop forgetting follow-ups": "Geen opvolging meer vergeten",
  "Know what the pipeline is worth": "Weten wat de pipeline waard is",
  "See which channel brings the good ones": "Zien welk kanaal de goede binnenbrengt",
  "Hand a deal over without losing the thread": "Een deal doorgeven zonder de draad kwijt te raken",
  "Get quotes out faster": "Sneller offertes buiten krijgen",
  "Tap all that apply": "Tik alles aan wat klopt",
  "Tap one": "Tik er één aan",
  Back: "Terug",
  "Skip this one": "Deze overslaan",
  "Skip and finish": "Overslaan en afronden",
  "Nothing tapped yet": "Nog niets aangetikt",
  "Set up my workspace": "Zet mijn werkruimte op",
  "Skip the lot if you like. We will pick sensible defaults and you can change them in Settings once you have used it for a week.":
    "Sla alles over als je wil. Wij kiezen verstandige standaardinstellingen en je past ze aan bij Instellingen zodra je het een week gebruikt hebt.",
  "Building your workspace": "We zetten je werkruimte klaar",
  "Watch this while we set it up.": "Kijk dit even terwijl we alles klaarzetten.",
  "45 seconds, and you will know how a lead gets from first hello to a signed contract.":
    "45 seconden, en je weet hoe een lead van eerste contact tot getekend contract komt.",
  "No need to wait. The rest keeps running after you click on.":
    "Je hoeft niet te wachten. De rest loopt door, ook als je doorklikt.",
  "The film is not in this build yet. Everything else carries on regardless.":
    "De film staat nog niet in deze build. De rest loopt gewoon door.",
  "Play the 45 second explainer": "Speel de uitleg van 45 seconden af",
};

/** The channel marks, as the lead sheet writes them mid-sentence. */
const CHANNEL_NL: Record<string, string> = {
  "email outreach": "e-mailcontact",
  linkedin: "LinkedIn",
  "ads and inbound": "advertenties of een aanvraag",
  referral: "een doorverwijzing",
  "website request": "het websiteformulier",
  "csv import": "een CSV-import",
};

const age = (value: string) => {
  const days = value.match(/^(\d+) days ago$/);
  if (days) return `${days[1]} dagen geleden`;
  if (value === "today") return "vandaag";
  if (value === "yesterday") return "gisteren";
  if (value === "never") return "nooit";
  return value;
};

/** The lines that carry a figure, so a fixed lookup cannot reach them. */
export const SALES_PATTERNS: [RegExp, (match: RegExpMatchArray) => string][] = [
  // Onboarding. Each of these is one text node now: a sentence split across a
  // JSX interpolation never reaches the translator, because it arrives as two.
  [/^Question (\d+) of (\d+)$/, (m) => `Vraag ${m[1]} van ${m[2]}`],
  [/^Free until (\d+) leads$/, (m) => `Gratis tot ${m[1]} leads`],
  [
    /^(\d+) (?:lead|leads) with no campaign on them$/,
    (m) => `${m[1]} ${m[1] === "1" ? "lead" : "leads"} zonder campagne erbij`,
  ],
  [/^(.+) a month, for the whole company$/, (m) => `${m[1]} per maand, voor het hele bedrijf`],
  [
    /^(\d+) of (\d+) leads\. (\d+) more and it becomes (.+) a month, excl\. VAT\.$/,
    (m) => `${m[1]} van ${m[2]} leads. Nog ${m[3]} en het wordt ${m[4]} per maand, excl. btw.`,
  ],
  [
    /^(\d+) leads\. This is the top tier; the price does not go up again\.$/,
    (m) => `${m[1]} leads. Dit is de hoogste trap; de prijs gaat niet meer omhoog.`,
  ],
  [/^Free up to (\d+) leads$/, (m) => `Gratis tot ${m[1]} leads`],
  [
    /^Start a company, free up to (\d+) leads$/,
    (m) => `Start een bedrijf, gratis tot ${m[1]} leads`,
  ],
  [/^instead, free up to (\d+) leads\.$/, (m) => `in de plaats, gratis tot ${m[1]} leads.`],
  [/^Nothing to pay until lead (\d+)$/, (m) => `Niets te betalen tot lead ${m[1]}`],
  [/^Free · (\d+) of (\d+) leads left$/, (m) => `Gratis · nog ${m[1]} van ${m[2]} leads`],
  [
    /^Free up to (\d+) leads, then (.+) a month, and (.+) over (\d+) leads\. For the whole company, excl\. VAT\. Never per person\.$/,
    (m) =>
      `Gratis tot ${m[1]} leads, daarna ${m[2]} per maand, en ${m[3]} boven ${m[4]} leads. Voor het hele bedrijf, excl. btw. Nooit per persoon.`,
  ],
  [
    /^No card, and nothing counting down\. Nothing is charged until your contact base passes (\d+) leads\.$/,
    (m) =>
      `Geen kaart, en niets dat aftelt. Er wordt niets aangerekend tot je contactenbestand voorbij ${m[1]} leads gaat.`,
  ],
  [
    /^(.+), (\d+) (?:person|people)$/,
    (m) => `${m[1]}, ${m[2]} ${m[2] === "1" ? "persoon" : "personen"}`,
  ],
  // The search term is the reader's own word; only the sentence around it moves.
  [/^Nothing matches (.+)\.$/, (m) => `Niets komt overeen met ${m[1] ?? ""}.`],
  [
    /^(\d+) more in (.+)$/,
    (m) => {
      const stage = m[2] ?? "";
      return `nog ${m[1]} in ${SALES_NL[stage] ?? stage}`;
    },
  ],
  [/^on (\d+) companies$/, (m) => `bij ${m[1]} bedrijven`],
  [/^Role for (.+)$/, (m) => `Rol voor ${m[1] ?? ""}`],
  // "uploaded by Tanguy, today, 412 kB" — the date is handled by the rule below.
  [/^uploaded by (.+)$/, (m) => `geüpload door ${m[1] ?? ""}`],
  [/^came in through (.+)$/, (m) => `kwam binnen via ${CHANNEL_NL[m[1] ?? ""] ?? m[1] ?? ""}`],
  [/^(today|yesterday|never|\d+ days ago), (.+)$/, (m) => `${age(m[1] ?? "")}, ${m[2]}`],
  [
    /^Last touch (today|yesterday|never|\d+ days ago)$/,
    (m) => `Laatste contact ${age(m[1] ?? "")}`,
  ],
  [/^Refreshed (\d+) min ago$/, (m) => `${m[1]} min geleden ververst`],
  [
    /^Everything about (.+), in one list\. Nothing is hidden behind a tab\.$/,
    (m) => `Alles over ${m[1]}, in één lijst. Niets zit verstopt achter een tab.`,
  ],
  [/^(\d+) accounts? · (.+) open$/, (m) => `${m[1]} accounts · ${m[2]} open`],
  [
    /^(\d+) leads?, every document and the whole outreach history go with it\. This one cannot be undone\.$/,
    (m) =>
      `${m[1]} leads, elk document en de hele contacthistoriek gaan mee. Dit kan niet ongedaan gemaakt worden.`,
  ],
  [
    /^(\d+) open prospects, (.+) estimated\. Drag a card to move it\.$/,
    (m) => `${m[1]} open prospects, ${m[2]} geschat. Sleep een kaart om ze te verplaatsen.`,
  ],
  [
    /^(\d+) of your own, (.+) estimated\. Drag a card to move it\.$/,
    (m) => `${m[1]} van jezelf, ${m[2]} geschat. Sleep een kaart om ze te verplaatsen.`,
  ],
  [/^(.+) · all valued$/, (m) => `${m[1]} · alles gewaardeerd`],
  [/^(.+) · (\d+) not valued$/, (m) => `${m[1]} · ${m[2]} zonder waarde`],
  [/^(.+), you are the admin$/, (m) => `${m[1]}, jij bent de beheerder`],
  [
    /^(\d+) rows, (\d+) columns, separated by (.+)$/,
    (m) =>
      `${m[1]} rijen, ${m[2]} kolommen, gescheiden door ${
        { semicolons: "puntkomma's", commas: "komma's", tabs: "tabs" }[m[3] ?? ""] ?? m[3] ?? ""
      }`,
  ],
  [
    /^(.+), (\d+) (?:person|people)$/,
    (m) => `${m[1]}, ${m[2]} ${Number(m[2]) === 1 ? "persoon" : "personen"}`,
  ],
  [/^(\d+) imported · (.+)$/, (m) => `${m[1]} geïmporteerd · ${m[2]}`],
  [
    /^Nothing is charged today\. We ask for a card so it does not stop working on day (\d+)\.$/,
    (m) =>
      `Vandaag wordt er niets aangerekend. We vragen een kaart zodat het op dag ${m[1]} niet stopt.`,
  ],
  [
    /^No card now\. Nothing is charged before (.+), and you can stop in one click\.$/,
    (m) =>
      `Nu geen kaart. Er wordt niets aangerekend voor ${m[1]}, en je kan met één klik stoppen.`,
  ],
  [
    /^Everyone is included in the (.+)\. Adding people costs nothing, so the only reason to wait is that you are not sure yet\.$/,
    (m) =>
      `Iedereen zit in de ${m[1]}. Mensen toevoegen kost niets, dus de enige reden om te wachten is dat je het nog niet zeker weet.`,
  ],
  [/^Nobody at your company uses this yet\?$/, () => "Gebruikt er bij jou nog niemand dit?"],
  [/^Allow pop-ups to open the document\.$/, () => "Sta pop-ups toe om het document te openen."],
  [/^(\d+) last full week$/, (m) => `${m[1]} de vorige volledige week`],
  [/^(\d+) active · (\d+) not yet valued$/, (m) => `${m[1]} actief · ${m[2]} nog zonder waarde`],
  [/^(\d+) won \/ (\d+) closed$/, (m) => `${m[1]} gewonnen / ${m[2]} afgesloten`],
  [
    /^(\d+) this week, against (\d+) the last full week\.$/,
    (m) => `${m[1]} deze week, tegen ${m[2]} de vorige volledige week.`,
  ],
  [/^(\d+) open$/, (m) => `${m[1]} open`],
  [/^(\d+) selected$/, (m) => `${m[1]} geselecteerd`],
  [/^Select all (\d+)$/, (m) => `Selecteer alle ${m[1]}`],
  [/^Select (.+)$/, (m) => `Selecteer ${m[1]}`],
  [/^(\d+) days ago$/, (m) => `${m[1]} dagen geleden`],
  [/^Show the other (\d+)$/, (m) => `Toon de andere ${m[1]}`],
  [/^Show the other (\d+) companies$/, (m) => `Toon de andere ${m[1]} bedrijven`],
  [/^(\d+) more in (.+)$/, (m) => `${m[1]} meer in ${m[2]}`],
  [/^(\d+) not valued$/, (m) => `${m[1]} zonder waarde`],
  [/^(\d+) of (\d+)$/, (m) => `${m[1]} van ${m[2]}`],
  [/^(\d+) of 5$/, (m) => `${m[1]} van 5`],
  [/^The bin holds (\d+)$/, (m) => `De prullenbak bevat er ${m[1]}`],
  [
    /^Showing (\d+) of (\d+) (.+), newest touch first$/,
    (m) => `${m[1]} van ${m[2]} ${m[3]} getoond, laatste contact eerst`,
  ],
  [/^(\d+) files? across (\d+) companies$/, (m) => `${m[1]} bestanden bij ${m[2]} bedrijven`],
  [/^(\d+) shown, filtered to (.+)$/, (m) => `${m[1]} getoond, gefilterd op ${m[2]}`],
  [/^of (\d+) leads$/, (m) => `van ${m[1]} leads`],
  [/^on (\d+) companies$/, (m) => `bij ${m[1]} bedrijven`],
  [/^(\d+) quotes?$/, (m) => `${m[1]} ${Number(m[1]) === 1 ? "offerte" : "offertes"}`],
  [/^(\d+) contracts?$/, (m) => `${m[1]} ${Number(m[1]) === 1 ? "contract" : "contracten"}`],
  [/^(\d+) quotes? and (\d+) contracts?$/, (m) => `${m[1]} offerte(s) en ${m[2]} contract(en)`],
  [/^(\d+) files?$/, (m) => `${m[1]} ${Number(m[1]) === 1 ? "bestand" : "bestanden"}`],
  [/^(\d+) accounts?$/, (m) => `${m[1]} ${Number(m[1]) === 1 ? "account" : "accounts"}`],
  [/^Question (\d+) of (\d+)$/, (m) => `Vraag ${m[1]} van ${m[2]}`],
  [/^Import (\d+) leads$/, (m) => `Importeer ${m[1]} leads`],
  [/^(\d+) of (\d+) columns mapped$/, (m) => `${m[1]} van ${m[2]} kolommen gekoppeld`],
  [/^, (\d+) left out$/, (m) => `, ${m[1]} weggelaten`],
  [/^(\d+) skipped$/, (m) => `${m[1]} overgeslagen`],
  [/^(\d+) imported again$/, (m) => `${m[1]} opnieuw geïmporteerd`],
  [/^(\d+) imported$/, (m) => `${m[1]} geïmporteerd`],
  [
    /^(\d+) leads imported\. You can undo this for (\d+) days\.$/,
    (m) => `${m[1]} leads geïmporteerd. Je kan dit ${m[2]} dagen ongedaan maken.`,
  ],
  [
    /^(\d+) leads moved to the bin\. Their history went with them\.$/,
    (m) => `${m[1]} leads naar de prullenbak. Hun geschiedenis ging mee.`,
  ],
  [/^(\d+) leads updated$/, (m) => `${m[1]} leads bijgewerkt`],
  [/^(\d+) leads exported$/, (m) => `${m[1]} leads geëxporteerd`],
  [/^Moved to (.+)$/, (m) => `Verplaatst naar ${m[1]}`],
  [
    /^(\d+) (?:person is|people are) waiting for an account$/,
    (m) => `${m[1]} ${Number(m[1]) === 1 ? "persoon wacht" : "mensen wachten"} op een account`,
  ],
  [
    /^(\d+) (?:person|people) asked for an account$/,
    (m) => `${m[1]} ${Number(m[1]) === 1 ? "persoon vroeg" : "mensen vroegen"} een account`,
  ],
  [
    /^(\d+) (?:invitation|invitations) still open$/,
    (m) => `${m[1]} ${Number(m[1]) === 1 ? "uitnodiging" : "uitnodigingen"} nog open`,
  ],
  [/^Decline all (\d+)\?$/, (m) => `Alle ${m[1]} weigeren?`],
  [/^Remove (.+)\?$/, (m) => `${m[1]} verwijderen?`],
  [/^Remove (.+)$/, (m) => `${m[1]} verwijderen`],
  [/^Allow (.+) in$/, (m) => `Laat ${m[1]} binnen`],
  [/^Signed in as (.+)$/, (m) => `Aangemeld als ${m[1]}`],
  [/^(.+) wants to work with your leads$/, (m) => `${m[1]} wil met je leads werken`],
  [
    /^Invite (\d+) (?:person|people)$/,
    (m) => `Nodig ${m[1]} ${Number(m[1]) === 1 ? "persoon" : "mensen"} uit`,
  ],
  [
    /^Stop before day (\d+) and you are never charged$/,
    (m) => `Stop voor dag ${m[1]} en er wordt nooit iets aangerekend`,
  ],
];
