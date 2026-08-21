"use client";

import { useEffect } from "react";
import { ArrowRight, X } from "lucide-react";

type OverlayVariant = "member" | "role-new" | "role-switch";

interface OverlaySegment {
  text: string;
  highlight?: boolean;
}

// Each variant's lines appear one after another (2s apart). The last line of
// every variant is the call-to-action link.
const LINES: Record<OverlayVariant, OverlaySegment[][]> = {
  member: [
    [
      { text: "Congratulations", highlight: true },
      { text: " Joining Us!" },
    ],
    [
      { text: "Next Step is " },
      { text: "Collaborating", highlight: true },
      { text: "!" },
    ],
    [
      { text: "Click The Link & " },
      { text: "Let's Go!", highlight: true },
    ],
  ],
  "role-new": [
    [
      { text: "Congratulations", highlight: true },
      { text: " on Joining Us!" },
    ],
    [
      { text: "A Quick " },
      { text: "Onboarding Interview", highlight: true },
      { text: " will be Taken Soon!" },
    ],
    [
      { text: "Click the Link and " },
      { text: "Collaborate Now!", highlight: true },
    ],
  ],
  "role-switch": [
    [
      { text: "Another " },
      { text: "Great Role", highlight: true },
      { text: "?" },
    ],
    [
      { text: "That's What " },
      { text: "This Club", highlight: true },
      { text: " Looks For!" },
    ],
    [
      { text: "A Quick " },
      { text: "Interview", highlight: true },
      { text: " will Be Taken Shortly!" },
    ],
    [
      { text: "Click the Link And " },
      { text: "Join Us!", highlight: true },
    ],
  ],
};

const LINE_STAGGER_MS = 2000;

export default function JoinSuccessOverlay({
  variant,
  ctaHref,
  onClose,
}: {
  variant: OverlayVariant;
  ctaHref?: string;
  onClose: () => void;
}) {
  // Scroll lock + Escape to dismiss while the celebration is up.
  useEffect(() => {
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKey);
    };
  }, [onClose]);

  const lines = LINES[variant];
  const href = ctaHref && ctaHref.trim() ? ctaHref.trim() : "/";
  const external = href.startsWith("http");
  const ctaIndex = lines.length - 1;

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 sm:p-6 bg-black/85 backdrop-blur-md animate-fade-in">
      {/* Close / skip */}
      <button
        type="button"
        onClick={onClose}
        aria-label="Skip"
        className="absolute top-5 right-5 z-10 flex items-center justify-center w-10 h-10 rounded-full border border-white/15 bg-black/50 text-white/60 hover:text-white hover:border-mint/40 transition-all duration-300"
      >
        <X className="w-4 h-4" />
      </button>

      <div className="relative w-full max-w-xl text-center px-2">
        {/* Sparkles */}
        <span className="absolute -top-6 left-6 sm:left-10 text-mint/70 animate-pulse select-none">✦</span>
        <span
          className="absolute top-8 right-4 sm:right-8 text-emerald-400/60 animate-pulse select-none"
          style={{ animationDelay: "0.9s" }}
        >
          ✦
        </span>
        <span
          className="absolute bottom-2 left-2 sm:left-6 text-cyan-400/50 animate-pulse select-none"
          style={{ animationDelay: "1.7s" }}
        >
          ✦
        </span>

        {lines.map((segments, i) => {
          const isCta = i === ctaIndex;

          if (isCta) {
            return (
              <div key={i} className="celebrate-line mt-12" style={{ animationDelay: `${i * LINE_STAGGER_MS}ms` }}>
                <a
                  href={href}
                  target={external ? "_blank" : undefined}
                  rel={external ? "noopener noreferrer" : undefined}
                  onClick={onClose}
                  className="group inline-flex flex-wrap items-center justify-center gap-x-2 gap-y-1 font-syne text-xl sm:text-3xl font-black tracking-tight text-white/80 hover:text-white transition-colors duration-500"
                >
                  {segments.map((seg, j) =>
                    seg.highlight ? (
                      <span key={j} className="gradient-word">
                        {seg.text}
                      </span>
                    ) : (
                      <span key={j}>{seg.text}</span>
                    )
                  )}
                  <ArrowRight className="w-6 h-6 sm:w-8 sm:h-8 text-mint transition-transform duration-300 group-hover:translate-x-1.5" />
                </a>
              </div>
            );
          }

          return (
            <p
              key={i}
              className={`celebrate-line font-syne font-black tracking-tight leading-snug ${
                i === 0 ? "text-3xl sm:text-5xl text-white" : "mt-6 text-xl sm:text-3xl text-white/85"
              }`}
              style={{ animationDelay: `${i * LINE_STAGGER_MS}ms` }}
            >
              {segments.map((seg, j) =>
                seg.highlight ? (
                  <span key={j} className="gradient-word">
                    {seg.text}
                  </span>
                ) : (
                  <span key={j}>{seg.text}</span>
                )
              )}
            </p>
          );
        })}
      </div>
    </div>
  );
}
