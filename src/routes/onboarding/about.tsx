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
import { readDraft, sellingOutcome, writeDraft, type SellingAnswers } from "@/lib/onboarding";
import { trialSchedule } from "@/lib/billing";

export const Route = createFileRoute("/onboarding/about")({
  head: () => ({ meta: [{ title: "How you sell | Sales" }] }),
  component: About,
});

type Question = {
  field: "size" | "kills" | "want";
  multi: boolean;
  title: string;
  why: string;
  options: [string, string][];
};

const QUESTIONS: Question[] = [
  {
    field: "size",
    multi: false,
    title: "How many deals are open at once?",
    why: "Under fifty and a list beats a board. Over it, you want the board.",
    options: [
      ["20", "Fewer than 20"],
      ["50", "20 to 50"],
      ["200", "50 to 200"],
      ["lots", "More than 200"],
    ],
  },
  {
    field: "kills",
    multi: true,
    title: "What usually kills a deal here?",
    why: "Whatever you pick is what we will nudge you about, and nothing else.",
    options: [
      ["quiet", "They go quiet on us"],
      ["slow", "We follow up too late"],
      ["price", "We lose on price"],
      ["boss", "We never reach the decision maker"],
      ["forget", "It falls off the list entirely"],
    ],
  },
  {
    field: "want",
    multi: true,
    title: "What would make this worth keeping?",
    why: "This decides what sits at the top of your dashboard.",
    options: [
      ["forget", "Stop forgetting follow-ups"],
      ["worth", "Know what the pipeline is worth"],
      ["channel", "See which channel brings the good ones"],
      ["handover", "Hand a deal over without losing the thread"],
      ["quotes", "Get quotes out faster"],
    ],
  },
];

/*
 * Step 4. Three questions, one at a time, inside the same page.
 *
 * Chips only, never an open text field: nobody types a paragraph about how
 * they sell, and nothing downstream could read it if they did. The answers
 * decide which screen you land on and what the dashboard leads with, and the
 * line under the card says so as you tap.
 */
function About() {
  const navigate = useNavigate();
  const draft = readDraft();
  const day = draft.startedAt ? trialSchedule(draft.startedAt).dayOfTrial : 1;

  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<SellingAnswers>(draft.answers ?? { kills: [], want: [] });

  const question = QUESTIONS[step]!;
  const last = step === QUESTIONS.length - 1;

  const isOn = (key: string) =>
    question.multi
      ? (answers[question.field as "kills" | "want"] ?? []).includes(key)
      : answers.size === key;

  const toggle = (key: string) => {
    if (!question.multi) {
      setAnswers({ ...answers, size: key });
      return;
    }
    const field = question.field as "kills" | "want";
    const current = answers[field] ?? [];
    setAnswers({
      ...answers,
      [field]: current.includes(key) ? current.filter((value) => value !== key) : [...current, key],
    });
  };

  const picked = question.options.filter(([key]) => isOn(key)).length;

  const finish = () => {
    writeDraft({ answers });
    navigate({ to: "/onboarding/video" });
  };

  const segment = (index: number) =>
    index < step ? "#5ea87f" : index === step ? "var(--vsp-accent)" : "var(--vsp-border)";

  return (
    <OnboardingPage>
      <OnboardingBar step={4} day={day} aside={<span>Three questions. Nothing to type.</span>} />
      <OnboardingBody width={700}>
        <div className="flex flex-col gap-1.5">
          <h1 className="m-0 text-[26px] font-bold tracking-[-0.055em] text-ink-strong">
            How do you actually sell?
          </h1>
          <p className="m-0 text-[14px] text-body-quiet">
            This decides what the app nags you about, and which screen you land on. All of it is
            changeable later.
          </p>
        </div>

        <Panel className="flex flex-col">
          <div className="flex flex-wrap items-center gap-3 border-b border-hairline px-[22px] pb-3 pt-[15px]">
            <span className="text-[12px] font-semibold text-body vsp-nums">
              {`Question ${step + 1} of ${QUESTIONS.length}`}
            </span>
            <span className="flex gap-1.5">
              {QUESTIONS.map((_, index) => (
                <span
                  key={index}
                  aria-hidden="true"
                  className="h-1 w-[34px] rounded-sm"
                  style={{ background: segment(index) }}
                />
              ))}
            </span>
            <span className="ml-auto flex items-center gap-[7px] rounded-pill bg-accent-tint px-[11px] py-1">
              <svg
                width="13"
                height="13"
                viewBox="0 0 24 24"
                fill="none"
                stroke="var(--vsp-accent-ink)"
                strokeWidth="2.4"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="m5 13 4 4L19 7" />
              </svg>
              <span className="text-[11px] font-semibold text-accent-ink">
                {question.multi ? "Tap all that apply" : "Tap one"}
              </span>
            </span>
          </div>

          <div className="flex flex-col gap-4 p-[22px]">
            <span className="flex flex-col gap-1">
              <span className="text-balance text-[20px] font-semibold tracking-[-0.035em] text-ink-strong">
                {question.title}
              </span>
              <span className="text-[13px] text-caption">{question.why}</span>
            </span>

            <div
              role="group"
              aria-label={question.title}
              className="flex min-h-[230px] flex-wrap content-start gap-2.5"
            >
              {question.options.map(([key, label]) => {
                const on = isOn(key);
                return (
                  <button
                    key={key}
                    type="button"
                    aria-pressed={on}
                    onClick={() => toggle(key)}
                    className="flex min-h-14 flex-[1_1_280px] items-center gap-3 rounded-card border-[1.5px] px-4 py-3.5 text-left text-[14px]"
                    style={{
                      background: on ? "var(--vsp-accent-tint)" : "var(--vsp-panel)",
                      borderColor: on ? "var(--vsp-accent)" : "#dfe3f1",
                      color: on ? "var(--vsp-accent-ink)" : "var(--vsp-ink)",
                      fontWeight: on ? 600 : 500,
                    }}
                  >
                    <span
                      aria-hidden="true"
                      className="flex size-[22px] shrink-0 items-center justify-center border-2"
                      style={{
                        borderRadius: question.multi ? 6 : "50%",
                        borderColor: on ? "var(--vsp-accent)" : "#c4cbe2",
                        background: on ? "var(--vsp-accent)" : "var(--vsp-panel)",
                      }}
                    >
                      <svg
                        width="13"
                        height="13"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="#ffffff"
                        strokeWidth="3.6"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        style={{ opacity: on ? 1 : 0 }}
                      >
                        <path d="m5 13 4 4L19 7" />
                      </svg>
                    </span>
                    <span className="min-w-0 flex-1">{label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 border-t border-hairline bg-panel-quiet px-[22px] py-[15px]">
            <button
              type="button"
              disabled={step === 0}
              onClick={() => setStep(step - 1)}
              className="flex min-h-11 items-center gap-2 px-3.5 text-[13px] font-semibold disabled:cursor-default"
              style={{ color: step === 0 ? "#c4c8d6" : "var(--vsp-text)" }}
            >
              <svg
                width="15"
                height="15"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M19 12H6M11 18l-6-6 6-6" />
              </svg>
              Back
            </button>
            <button
              type="button"
              onClick={() => (last ? finish() : setStep(step + 1))}
              className="min-h-11 rounded-control border border-border-control bg-panel px-[15px] text-[13px] font-semibold text-body"
            >
              {last ? "Skip and finish" : "Skip this one"}
            </button>
            <span className="text-[12px] text-caption">
              {question.multi ? (picked === 0 ? "Nothing tapped yet" : `${picked} selected`) : ""}
            </span>
            <button
              type="button"
              onClick={() => (last ? finish() : setStep(step + 1))}
              className="ml-auto flex min-h-12 items-center gap-2.5 rounded-control px-5 py-[13px] text-[14px] font-semibold text-white shadow-raised"
              style={{ background: "var(--vsp-accent)" }}
            >
              {last ? "Set up my workspace" : "Next"}
              <Arrow />
            </button>
          </div>
        </Panel>

        <div className="flex flex-wrap items-center gap-3.5 rounded-panel-inner bg-accent-tint px-[18px] py-4">
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="var(--vsp-accent-ink)"
            strokeWidth="1.9"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
            className="shrink-0"
          >
            <path d="M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A6 6 0 0 0 6 8c0 1 .2 2.2 1.5 3.5.7.7 1.3 1.5 1.5 2.5" />
            <path d="M9 18h6" />
            <path d="M10 22h4" />
          </svg>
          <span className="min-w-0 flex-[1_1_280px] text-[13px] leading-[1.6] text-accent-ink">
            {sellingOutcome(answers)}
          </span>
        </div>

        <span className="text-[12px] text-caption">
          Skip the lot if you like. We will pick sensible defaults and you can change them in
          Settings once you have used it for a week.
        </span>
      </OnboardingBody>
    </OnboardingPage>
  );
}
