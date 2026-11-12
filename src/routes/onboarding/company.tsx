import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import {
  Arrow,
  OnboardingBar,
  OnboardingBody,
  OnboardingPage,
  stepButtonClass,
  stepButtonStyle,
} from "@/components/Onboarding";
import { Panel } from "@/components/sales-ui";
import { readDraft, writeDraft, type FillWith } from "@/lib/onboarding";

export const Route = createFileRoute("/onboarding/company")({
  head: () => ({ meta: [{ title: "Your company | Sales" }] }),
  component: Company,
});

const COUNTRIES = [
  "Belgium, EUR, 21% VAT",
  "Netherlands, EUR, 21% VAT",
  "France, EUR, 20% VAT",
  "Germany, EUR, 19% VAT",
  "Luxembourg, EUR, 17% VAT",
];

const OPTIONS: {
  key: FillWith;
  name: string;
  what: string;
  icon: string;
  tileBg: string;
  tileInk: string;
}[] = [
  {
    key: "csv",
    name: "I have a list already",
    what: "a CSV from a trade show, LinkedIn or your old spreadsheet",
    icon: "M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8zM14 2v6h6M8 13h8M8 17h5",
    tileBg: "var(--vsp-good-bg)",
    tileInk: "var(--vsp-good)",
  },
  {
    key: "form",
    name: "Put a form on my website",
    what: "anyone who fills it in lands in New, with the campaign attached",
    icon: "M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20M2 12h20M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20",
    tileBg: "var(--vsp-accent-tint)",
    tileInk: "var(--vsp-accent-ink)",
  },
  {
    key: "hand",
    name: "I will add them myself",
    what: "start empty and type the first one in a minute",
    icon: "M12 5v14M5 12h14",
    tileBg: "var(--vsp-chip-quiet)",
    tileInk: "var(--vsp-text)",
  },
];

const PANELS: Record<FillWith, { body: string; cta: string; icon: string; note: string }> = {
  csv: {
    body: "Drop the file in and we show you its first row, so you can say which column is the company and which is the email. Map it once and we remember it for the next list. Duplicates are matched on email and skipped unless you say otherwise.",
    cta: "You will land on the import screen",
    icon: "M12 19V7M7 12l5-5 5 5M4 21h16",
    note: "CSV or Excel, up to a few thousand rows at a time.",
  },
  form: {
    body: "You get a snippet to paste on your site, or a hosted page if you would rather not touch the code. Every submission becomes a lead in New, tagged with the page it came from, and whoever is on duty gets an email.",
    cta: "The snippet is waiting in Settings",
    icon: "m9 18-6-6 6-6M15 6l6 6-6 6",
    note: "Two minutes, and your developer can do it without us.",
  },
  hand: {
    body: "Fair enough. The list starts empty and you add the first company yourself, which takes about thirty seconds. Most people start here and import something later once they trust it.",
    cta: "You will land on an empty list",
    icon: "M12 5v14M5 12h14",
    note: "You can still import or add the form at any point.",
  },
};

/* Step 2. One workspace holds one company. */
function Company() {
  const navigate = useNavigate();
  const draft = readDraft();
  const [name, setName] = useState(draft.companyName ?? "");
  const [country, setCountry] = useState(draft.country ?? COUNTRIES[0]!);
  const [pick, setPick] = useState<FillWith>(draft.fillWith ?? "csv");
  const panel = PANELS[pick];

  const next = () => {
    writeDraft({ companyName: name.trim(), country, fillWith: pick });
    navigate({ to: "/onboarding/team" });
  };

  return (
    <OnboardingPage>
      <OnboardingBar step={2} />
      <OnboardingBody>
        <div className="flex flex-col gap-1.5">
          <h1 className="m-0 text-[26px] font-bold tracking-[-0.055em] text-ink-strong">
            Whose leads are these?
          </h1>
          <p className="m-0 text-[14px] text-body-quiet">
            A workspace holds one company. You can add more later and they never mix.
          </p>
        </div>

        <Panel className="flex flex-col">
          <div className="flex flex-wrap items-center gap-3.5 px-[18px] py-3.5">
            <span className="flex min-w-0 flex-[1_1_200px] flex-col">
              <span className="text-[13px] font-semibold text-ink">Company name</span>
              <span className="text-[11px] text-caption">
                it goes on quotes, invitations and the website form
              </span>
            </span>
            <label htmlFor="oc-name" className="sr-only">
              Company name
            </label>
            <input
              id="oc-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Your company"
              maxLength={200}
              className="min-h-11 flex-[0_1_260px] rounded-control border border-border-control bg-panel px-[13px] text-[14px] text-ink"
            />
          </div>

          <div className="flex flex-wrap items-center gap-3.5 border-t border-hairline px-[18px] py-3.5">
            <span className="flex min-w-0 flex-[1_1_200px] flex-col">
              <span className="text-[13px] font-semibold text-ink">Country</span>
              <span className="text-[11px] text-caption">
                sets your currency and the VAT on your invoice
              </span>
            </span>
            <label htmlFor="oc-country" className="sr-only">
              Country
            </label>
            <select
              id="oc-country"
              value={country}
              onChange={(event) => setCountry(event.target.value)}
              className="min-h-11 flex-[0_1_260px] rounded-control border border-border-control bg-panel pl-[13px] pr-9 text-[14px] text-ink"
            >
              {COUNTRIES.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </div>
        </Panel>

        <div className="flex flex-col gap-1.5 pt-1">
          <span className="text-[15px] font-semibold tracking-[-0.025em] text-ink-strong">
            How should we fill it?
          </span>
          <span className="text-[13px] text-body-quiet">
            Pick one for now. The others are a click away once you are in.
          </span>
        </div>

        <div className="flex flex-col gap-2.5">
          {OPTIONS.map((option) => {
            const on = pick === option.key;
            return (
              <button
                key={option.key}
                type="button"
                aria-pressed={on}
                onClick={() => setPick(option.key)}
                className="flex w-full items-center gap-3.5 rounded-panel border bg-panel px-[18px] py-[15px] text-left"
                style={{
                  borderColor: on ? "var(--vsp-accent)" : "var(--vsp-border)",
                  boxShadow: on ? "0 0 0 1px var(--vsp-accent)" : "none",
                }}
              >
                <span
                  aria-hidden="true"
                  className="flex size-[38px] shrink-0 items-center justify-center rounded-[11px]"
                  style={{ background: option.tileBg, color: option.tileInk }}
                >
                  <svg
                    width="19"
                    height="19"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.9"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d={option.icon} />
                  </svg>
                </span>
                <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <span className="text-[15px] font-semibold tracking-[-0.02em] text-ink">
                    {option.name}
                  </span>
                  <span className="text-[12px] text-body-quiet">{option.what}</span>
                </span>
                <span
                  aria-hidden="true"
                  className="flex size-5 shrink-0 items-center justify-center rounded-full border-[1.5px]"
                  style={{
                    borderColor: on ? "var(--vsp-accent)" : "#cfd5e8",
                    background: on ? "var(--vsp-accent)" : "var(--vsp-panel)",
                  }}
                >
                  <svg
                    width="12"
                    height="12"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="#ffffff"
                    strokeWidth="3.2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    style={{ opacity: on ? 1 : 0 }}
                  >
                    <path d="m5 13 4 4L19 7" />
                  </svg>
                </span>
              </button>
            );
          })}
        </div>

        <div className="flex flex-col gap-3.5 rounded-panel border border-border bg-panel px-5 py-[18px]">
          <p className="m-0 text-[13px] leading-[1.65] text-body">{panel.body}</p>
          <span className="flex flex-wrap items-center gap-3">
            <span className="flex min-h-[42px] items-center gap-2.5 rounded-control border border-border-control bg-panel px-4 text-[13px] font-semibold text-ink">
              <svg
                width="15"
                height="15"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.9"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d={panel.icon} />
              </svg>
              {panel.cta}
            </span>
            <span className="text-[11px] text-caption">{panel.note}</span>
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-4">
          <button
            type="button"
            onClick={next}
            disabled={!name.trim()}
            className={`${stepButtonClass} disabled:opacity-50`}
            style={stepButtonStyle}
          >
            Continue
            <Arrow />
          </button>
          <span className="min-w-0 flex-[1_1_240px] text-[12px] leading-[1.6] text-caption">
            Nothing here is permanent. The company name, the country and how leads arrive are all in
            Settings afterwards.
          </span>
        </div>
      </OnboardingBody>
    </OnboardingPage>
  );
}
