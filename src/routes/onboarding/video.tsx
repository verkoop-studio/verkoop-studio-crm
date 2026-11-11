import { createFileRoute, Link } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { Mark } from "@/components/brand";
import { Arrow } from "@/components/Onboarding";
import { Segmented } from "@/components/sales-ui";
import { useLanguage } from "@/hooks/use-language";
import { readDraft } from "@/lib/onboarding";

export const Route = createFileRoute("/onboarding/video")({
  head: () => ({ meta: [{ title: "Setting up your workspace | Sales" }] }),
  component: Explainer,
});

/** One env var away from a real film; until then the poster carries the step. */
const FILM = import.meta.env["VITE_EXPLAINER_VIDEO_URL"] as string | undefined;

/*
 * The explainer, between the questions and the checkout.
 *
 * Full width, because it is the only thing on the page worth looking at, and
 * Continue sits at the bottom right where you leave. Nothing here blocks: the
 * rest of the set-up keeps running whether you watch it or not.
 */
function Explainer() {
  const { language, setLanguage } = useLanguage();
  const nl = language === "nl";
  const draft = readDraft();
  const video = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(false);

  const copy = nl
    ? {
        badge: "We zetten je werkruimte klaar",
        title: "Kijk dit even terwijl we alles klaarzetten.",
        sub: "45 seconden, en je weet hoe je een lead van eerste contact tot getekend contract krijgt.",
        cta: "Verder",
        ctaNote: "Je hoeft niet te wachten. De rest loopt door, ook als je doorklikt.",
        noFilm: "De film staat nog niet in deze build. De rest loopt gewoon door.",
      }
    : {
        badge: "Building your workspace",
        title: "Watch this while we set it up.",
        sub: "45 seconds, and you will know how a lead gets from first hello to a signed contract.",
        cta: "Continue",
        ctaNote: "No need to wait. The rest keeps running after you click on.",
        noFilm: "The film is not in this build yet. Everything else carries on regardless.",
      };

  const toggle = () => {
    const element = video.current;
    if (!element) return;
    if (element.paused) void element.play();
    else element.pause();
  };

  return (
    <div className="flex min-h-screen flex-col bg-page text-ink">
      <div className="flex flex-wrap items-center gap-4 border-b border-border bg-panel px-7 py-[18px]">
        <Link
          to="/auth"
          aria-label="Verkoop Studio Sales"
          className="flex items-center gap-2.5 no-underline"
        >
          <Mark size={27} />
          <span className="text-[16px] font-semibold tracking-[-0.04em] text-ink">Sales</span>
        </Link>
        <span className="flex items-center gap-2 rounded-pill bg-accent-tint px-3 py-[5px]">
          <span
            className="vsp-live relative size-[7px] rounded-full"
            aria-hidden="true"
            style={{ background: "var(--vsp-accent)", color: "var(--vsp-accent)" }}
          />
          <span className="text-[12px] font-semibold text-accent-ink">{copy.badge}</span>
        </span>
        <span className="ml-auto flex items-center gap-3">
          <Segmented<"nl" | "en">
            label="Language"
            value={language}
            onChange={setLanguage}
            options={[
              { value: "nl", label: "NL" },
              { value: "en", label: "EN" },
            ]}
          />
          <span className="text-[12px] text-body-quiet">{draft.companyName ?? ""}</span>
        </span>
      </div>

      <div className="flex flex-1 justify-center px-7 pb-10 pt-[30px]">
        <div className="flex w-full max-w-[1000px] flex-col gap-5">
          <div className="flex flex-col gap-1.5">
            <h1 className="m-0 text-balance text-[27px] font-bold tracking-[-0.055em] text-ink-strong">
              {copy.title}
            </h1>
            <p className="m-0 text-[14px] text-body-quiet">{copy.sub}</p>
          </div>

          <div className="relative flex aspect-video w-full items-center justify-center overflow-hidden rounded-[18px] bg-dark">
            {FILM ? (
              <video
                ref={video}
                src={FILM}
                className="absolute inset-0 size-full object-cover"
                onPlay={() => setPlaying(true)}
                onPause={() => setPlaying(false)}
                playsInline
                controls={playing}
              />
            ) : (
              <Poster />
            )}

            {!FILM && (
              <span
                aria-hidden="true"
                className="absolute inset-0"
                style={{
                  background: "linear-gradient(180deg, #14182700 0%, #141827b8 72%, #141827 100%)",
                }}
              />
            )}

            {FILM && !playing && (
              <button
                type="button"
                aria-label="Play the 45 second explainer"
                onClick={toggle}
                className="relative flex size-[88px] items-center justify-center rounded-full border-0 bg-white"
                style={{ boxShadow: "0 16px 42px #0b0f1c66" }}
              >
                <svg width="31" height="31" viewBox="0 0 24 24" fill="#141827" aria-hidden="true">
                  <path d="M8 5v14l11-7z" />
                </svg>
              </button>
            )}

            {!FILM && (
              <span className="relative max-w-[32ch] text-center text-[13px] leading-[1.6] text-dark-text">
                {copy.noFilm}
              </span>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-4">
            <span className="min-w-0 flex-[1_1_280px] text-[13px] leading-[1.6] text-caption">
              {copy.ctaNote}
            </span>
            <Link
              to="/onboarding/checkout"
              className="ml-auto flex min-h-11 items-center justify-center gap-2.5 rounded-control px-[18px] py-[11px] text-[14px] font-semibold text-white no-underline shadow-raised"
              style={{ background: "var(--vsp-accent)" }}
            >
              {copy.cta}
              <Arrow />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

/** The board behind the film: the product, drawn the way the canvas drew it. */
function Poster() {
  return (
    <svg
      viewBox="0 0 640 360"
      aria-hidden="true"
      className="absolute inset-0 size-full"
      style={{ opacity: 0.42 }}
    >
      <rect width="640" height="360" fill="#141827" />
      <rect x="40" y="34" width="150" height="10" rx="5" fill="#2a3148" />
      <g fill="#1b2033">
        <rect x="40" y="62" width="112" height="258" rx="10" />
        <rect x="168" y="62" width="112" height="258" rx="10" />
        <rect x="296" y="62" width="112" height="258" rx="10" />
        <rect x="424" y="62" width="112" height="258" rx="10" />
      </g>
      <g fill="#39415e">
        <rect x="52" y="78" width="60" height="8" rx="4" />
        <rect x="180" y="78" width="54" height="8" rx="4" />
        <rect x="308" y="78" width="66" height="8" rx="4" />
        <rect x="436" y="78" width="48" height="8" rx="4" />
      </g>
      <g fill="#252d49">
        <rect x="52" y="98" width="88" height="46" rx="8" />
        <rect x="52" y="152" width="88" height="46" rx="8" />
        <rect x="180" y="98" width="88" height="46" rx="8" />
        <rect x="308" y="98" width="88" height="46" rx="8" />
        <rect x="308" y="152" width="88" height="46" rx="8" />
      </g>
      <rect x="436" y="98" width="88" height="46" rx="8" fill="#0d5745" />
      <rect x="446" y="110" width="52" height="8" rx="4" fill="#5ee9b5" />
      <rect x="446" y="124" width="36" height="8" rx="4" fill="#5ee9b5" opacity=".6" />
      <g fill="#4265ff">
        <rect x="62" y="110" width="50" height="8" rx="4" />
        <rect x="62" y="124" width="32" height="8" rx="4" opacity=".6" />
        <rect x="190" y="110" width="56" height="8" rx="4" />
        <rect x="318" y="110" width="44" height="8" rx="4" />
      </g>
    </svg>
  );
}
