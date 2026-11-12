import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { Mark } from "@/components/brand";
import { FREE_LEADS } from "@/lib/billing";

/*
 * The stepper that runs through signing up on your own.
 *
 * 1 Account, 2 Company, 3 Team, 4 You — with the explainer video after 4,
 * where the workspace is opened, and the first-run dashboard after that.
 * There is no checkout step and no trial: the workspace is free until it
 * crosses the free ceiling, so nothing is asked for and nothing counts down.
 */
export const STEPS = ["Account", "Company", "Team", "You"] as const;

export function Stepper({ step }: { step: number }) {
  return (
    <>
      {/* A four-stop rail does not fit a phone; the same fact, in words. */}
      <span className="text-[12px] font-semibold text-accent-ink sm:hidden">
        {`Step ${step} of ${STEPS.length} · ${STEPS[step - 1]}`}
      </span>
      <div className="hidden min-w-0 max-w-[560px] flex-none items-center gap-[7px] sm:flex">
        {STEPS.map((label, index) => {
          const number = index + 1;
          const done = number < step;
          const here = number === step;
          return (
            <span key={label} className="contents">
              {index > 0 && (
                <span
                  aria-hidden="true"
                  className="h-px flex-1"
                  style={{ background: done || here ? "#cfd5e8" : "var(--vsp-border)" }}
                />
              )}
              {done ? (
                <span className="flex items-center gap-1.5 text-[12px] text-good">
                  <svg
                    width="15"
                    height="15"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.6"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <circle cx="12" cy="12" r="9.5" strokeWidth="1.6" />
                    <path d="m7.6 12.3 2.9 2.9 5.9-6.4" />
                  </svg>
                  {label}
                </span>
              ) : here ? (
                <span
                  aria-current="step"
                  className="flex items-center gap-[7px] rounded-pill bg-accent-tint py-1 pl-[5px] pr-[11px]"
                >
                  <span
                    aria-hidden="true"
                    className="flex size-[18px] items-center justify-center rounded-full text-[11px] font-bold text-white"
                    style={{ background: "var(--vsp-accent)" }}
                  >
                    {number}
                  </span>
                  <span className="text-[12px] font-semibold text-accent-ink">{label}</span>
                </span>
              ) : (
                <span className="text-[12px] text-caption">
                  {number} {label}
                </span>
              )}
            </span>
          );
        })}
      </div>
    </>
  );
}

export function OnboardingBar({ step, aside }: { step: number; aside?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-center gap-4 border-b border-border bg-panel px-7 py-[18px]">
      <Link
        to="/auth"
        aria-label="Verkoop Studio Sales"
        className="flex items-center gap-2.5 no-underline"
      >
        <Mark size={27} />
        <span className="text-[16px] font-semibold tracking-[-0.04em] text-ink">Sales</span>
      </Link>
      <Stepper step={step} />
      <span className="ml-auto flex items-center gap-3.5 text-[12px] text-body-quiet">
        {aside ?? <span>{`Free until ${FREE_LEADS} leads`}</span>}
      </span>
    </div>
  );
}

export function OnboardingBody({ children, width = 680 }: { children: ReactNode; width?: number }) {
  return (
    <div className="flex flex-1 justify-center px-7 pb-11 pt-9">
      <div className="flex w-full flex-col gap-5" style={{ maxWidth: width }}>
        {children}
      </div>
    </div>
  );
}

export function OnboardingPage({ children }: { children: ReactNode }) {
  return <div className="flex min-h-screen flex-col bg-page text-ink">{children}</div>;
}

/** The dark "Continue" the canvas uses inside the flow, not the blue one. */
export const stepButtonClass =
  "flex min-h-12 items-center gap-2.5 rounded-control px-5 py-[13px] text-[14px] font-semibold text-white no-underline";

export const stepButtonStyle = {
  background: "var(--vsp-ink)",
  boxShadow: "0 4px 12px #13182b18",
} as const;

export function Arrow() {
  return (
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
      <path d="M5 12h13M13 6l6 6-6 6" />
    </svg>
  );
}
