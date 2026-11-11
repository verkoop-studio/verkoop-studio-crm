import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import {
  Arrow,
  OnboardingBar,
  OnboardingBody,
  OnboardingPage,
  stepButtonClass,
  stepButtonStyle,
} from "@/components/Onboarding";
import { Panel, euroCents, initialsOf } from "@/components/sales-ui";
import { ROLES, type Role } from "@/lib/sales";
import { PLAN, trialSchedule } from "@/lib/billing";
import { readDraft, writeDraft, type Invite } from "@/lib/onboarding";

export const Route = createFileRoute("/onboarding/team")({
  head: () => ({ meta: [{ title: "Your team | Sales" }] }),
  component: Team,
});

const ROLE_DUTIES: Record<Role, string> = {
  admin: "Everything, including billing, roles, imports and removing the company.",
  team_leader: "Sees and edits the whole team's leads, assigns owners, imports lists.",
  rep: "Works their own leads, and can read the rest without changing them.",
};

/* Step 3. Everyone is included in the price, so the only reason to wait is doubt. */
function Team() {
  const navigate = useNavigate();
  const draft = readDraft();
  const day = draft.startedAt ? trialSchedule(draft.startedAt).dayOfTrial : 1;
  const [people, setPeople] = useState<Invite[]>(
    draft.invites?.length ? draft.invites : [{ email: "", role: "team_leader" }],
  );

  const filled = people.filter((person) => person.email.trim()).length;

  const go = () => {
    writeDraft({ invites: people.filter((person) => person.email.trim()) });
    navigate({ to: "/onboarding/about" });
  };

  const patch = (index: number, change: Partial<Invite>) =>
    setPeople(people.map((person, i) => (i === index ? { ...person, ...change } : person)));

  return (
    <OnboardingPage>
      <OnboardingBar
        step={3}
        day={day}
        aside={
          <>
            <span>Day {day} of 14 free</span>
            <Link to="/onboarding/about" className="text-[12px] font-semibold">
              Skip
            </Link>
          </>
        }
      />
      <OnboardingBody>
        <div className="flex flex-col gap-1.5">
          <h1 className="m-0 text-[26px] font-bold tracking-[-0.055em] text-ink-strong">
            Who else sells here?
          </h1>
          <p className="m-0 text-[14px] text-body-quiet">
            {`Everyone is included in the ${euroCents(
              PLAN.monthlyExclVat,
            )}. Adding people costs nothing, so the only reason to wait is that you are not sure yet.`}
          </p>
        </div>

        <Panel className="flex flex-col">
          <div className="flex flex-wrap items-center gap-3.5 bg-panel-quiet px-[18px] py-3.5">
            <span
              aria-hidden="true"
              className="flex size-8 shrink-0 items-center justify-center rounded-full bg-chip text-[11px] font-bold text-accent-ink"
            >
              {initialsOf(draft.fullName, "YOU")}
            </span>
            <span className="flex min-w-0 flex-[1_1_200px] flex-col">
              <span className="text-[13px] font-semibold text-ink">
                {draft.fullName ? `${draft.fullName} (you)` : "You"}
              </span>
              <span className="truncate text-[11px] text-caption">{draft.email ?? ""}</span>
            </span>
            <span className="rounded-pill bg-accent-tint px-[11px] py-[5px] text-[12px] font-semibold text-accent-ink">
              Admin
            </span>
          </div>

          {people.map((person, index) => (
            <div
              key={index}
              className="flex flex-wrap items-center gap-3 border-t border-hairline px-[18px] py-3"
            >
              <label htmlFor={`inv-${index}`} className="sr-only">
                Email address for person {index + 1}
              </label>
              <input
                id={`inv-${index}`}
                type="email"
                value={person.email}
                onChange={(event) => patch(index, { email: event.target.value })}
                placeholder="name@yourcompany.be"
                className="min-h-11 min-w-0 flex-[1_1_220px] rounded-control border border-border-control bg-panel px-[13px] text-[14px] text-ink"
              />
              <label htmlFor={`inv-${index}-role`} className="sr-only">
                Role for person {index + 1}
              </label>
              <select
                id={`inv-${index}-role`}
                value={person.role}
                onChange={(event) => patch(index, { role: event.target.value as Invite["role"] })}
                className="min-h-11 flex-[0_1_170px] rounded-control border border-border-control bg-panel pl-[13px] pr-9 text-[14px] text-ink"
              >
                {ROLES.map((role) => (
                  <option key={role.value} value={role.value}>
                    {role.label}
                  </option>
                ))}
              </select>
              <button
                type="button"
                aria-label="Remove this row"
                title="Remove this row"
                onClick={() => setPeople(people.filter((_, i) => i !== index))}
                className="flex size-9 shrink-0 items-center justify-center rounded-control border border-border-control bg-panel text-body-quiet"
              >
                <svg
                  width="15"
                  height="15"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                  aria-hidden="true"
                >
                  <path d="M6 6l12 12M18 6 6 18" />
                </svg>
              </button>
            </div>
          ))}

          <div className="flex flex-wrap items-center gap-3 border-t border-hairline px-[18px] py-3">
            <button
              type="button"
              onClick={() => setPeople([...people, { email: "", role: "rep" }])}
              className="flex min-h-[42px] items-center gap-2.5 rounded-control border border-border-control bg-panel px-[15px] text-[13px] font-semibold text-ink"
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.4"
                strokeLinecap="round"
                aria-hidden="true"
              >
                <path d="M12 5v14M5 12h14" />
              </svg>
              Add another
            </button>
            <span className="min-w-0 flex-[1_1_240px] text-[11px] text-caption">
              {people.length >= 6
                ? "Plenty for now. The rest can come from Settings, in bulk if you like."
                : "They get an email with a link. Nothing happens to them until they open it."}
            </span>
          </div>
        </Panel>

        <Panel className="flex flex-col">
          <span className="block border-b border-hairline px-[18px] pb-[11px] pt-[13px] text-[13px] font-semibold tracking-[-0.02em]">
            What the three roles can do
          </span>
          {ROLES.map((role) => (
            <span
              key={role.value}
              className="flex flex-wrap items-baseline gap-3 border-b border-hairline px-[18px] py-2.5"
            >
              <span className="w-24 shrink-0 text-[13px] font-semibold text-ink">{role.label}</span>
              <span className="min-w-0 flex-[1_1_300px] text-[12px] leading-[1.55] text-body-quiet">
                {ROLE_DUTIES[role.value]}
              </span>
            </span>
          ))}
          <span className="bg-panel-quiet px-[18px] py-3 text-[11px] leading-[1.6] text-caption">
            A role is not a wall between people. Everyone sees the same pipeline; the role decides
            who can change a stage on someone else&rsquo;s lead, invite people, and import a list.
          </span>
        </Panel>

        <div className="flex flex-wrap items-center gap-4">
          <button type="button" onClick={go} className={stepButtonClass} style={stepButtonStyle}>
            {filled > 0 ? `Invite ${filled} ${filled === 1 ? "person" : "people"}` : "Continue"}
            <Arrow />
          </button>
          <span className="min-w-0 flex-[1_1_240px] text-[12px] leading-[1.6] text-caption">
            {filled > 0
              ? "The invitations go out once your workspace is open, so they can start straight away."
              : "Alone is fine. You stay the only person in here until you invite someone from Settings."}
          </span>
        </div>
      </OnboardingBody>
    </OnboardingPage>
  );
}
