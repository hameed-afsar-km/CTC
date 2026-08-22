"use client";

import { useEffect } from "react";
import { ArrowRight, Check, X } from "lucide-react";

type OverlayVariant = "member" | "role-new" | "role-switch";

interface OverlaySegment {
  text: string;
  highlight?: boolean;
}

interface VariantCopy {
  // Phrases revealed one after another inside a single flowing paragraph.
  phrases: OverlaySegment[][];
  // Contextual ending shown when the role has no group link.
  outro: OverlaySegment[];
}

const VARIANTS: Record<OverlayVariant, VariantCopy> = {
  member: {
    phrases: [
      [{ text: "Congratulations", highlight: true }, { text: " Joining Us!" }],
      [{ text: "Next Step is " }, { text: "Collaborating", highlight: true }, { text: "!" }],
    ],
    outro: [
      { text: "Our team will " },
      { text: "Reach Out Soon", highlight: true },
      { text: " at your college email with the next steps!" },
    ],
  },
  "role-new": {
    phrases: [
      [{ text: "Congratulations", highlight: true }, { text: " on Joining Us!" }],
      [{ text: "A Quick " }, { text: "Onboarding Interview", highlight: true }, { text: " will be Taken Soon!" }],
    ],
    outro: [
      { text: "Sit Tight — our team will " },
      { text: "Reach Out Soon", highlight: true },
      { text: " with your interview details!" },
    ],
  },
  "role-switch": {
    phrases: [
      [{ text: "Another " }, { text: "Great Role", highlight: true }, { text: "?" }],
      [{ text: "That's What " }, { text: "This Club", highlight: true }, { text: " Looks For!" }],
      [{ text: "A Quick " }, { text: "Interview", highlight: true }, { text: " will Be Taken Shortly!" }],
    ],
    outro: [
      { text: "Fingers Crossed — we'll " },
      { text: "See You Soon", highlight: true },
      { text: " at the interview!" },
    ],
  },
};

const PHRASE_STAGGER_MS = 850;

export default function JoinSuccessOverlay({
  variant,
  ctaHref,
  onOpenLink,
  onClose,
}: {
  variant: OverlayVariant;
  ctaHref?: string;
  onOpenLink?: () => void;
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

  const { phrases, outro } = VARIANTS[variant];
  const href = ctaHref?.trim() ?? "";
  const hasLink = /^https?:\/\//i.test(href);
  const endingDelay = phrases.length * PHRASE_STAGGER_MS + 350;

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

        {/* All phrases flow inline like a sentence and reveal sequentially. */}
        <p className="font-syne font-black tracking-tight leading-snug text-2xl sm:text-4xl text-white">
          {phrases.map((segments, i) => (
            <span
              key={i}
              className="celebrate-line"
              style={{ animationDelay: `${i * PHRASE_STAGGER_MS}ms` }}
            >
              {segments.map((seg, j) =>
                seg.highlight ? (
                  <span key={j} className="gradient-word">
                    {seg.text}
                  </span>
                ) : (
                  <span key={j}>{seg.text}</span>
                )
              )}{" "}
            </span>
          ))}
          {!hasLink && (
            <span
              className="celebrate-line text-white/85"
              style={{ animationDelay: `${phrases.length * PHRASE_STAGGER_MS}ms` }}
            >
              {outro.map((seg, j) =>
                seg.highlight ? (
                  <span key={j} className="gradient-word">
                    {seg.text}
                  </span>
                ) : (
                  <span key={j}>{seg.text}</span>
                )
              )}
            </span>
          )}
        </p>

        {/* The call-to-action pops in once the sentence completes. */}
        <div className="celebrate-pop mt-12" style={{ animationDelay: `${endingDelay}ms` }}>
          {hasLink ? (
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => {
                onOpenLink?.();
                onClose();
              }}
              className="group inline-flex items-center gap-3 px-8 py-4 rounded-2xl bg-mint hover:bg-mint-light text-black text-sm sm:text-base font-black uppercase tracking-widest shadow-[0_0_35px_rgba(52,211,153,0.45)] hover:shadow-[0_0_55px_rgba(52,211,153,0.65)] hover:-translate-y-0.5 transition-all duration-300"
            >
              Join the Group
              <ArrowRight className="w-5 h-5 transition-transform duration-300 group-hover:translate-x-1.5" />
            </a>
          ) : (
            <button
              type="button"
              onClick={onClose}
              className="inline-flex items-center gap-2 px-7 py-3 rounded-xl border border-white/15 bg-white/5 hover:bg-white/10 text-white/80 hover:text-white text-xs font-bold uppercase tracking-widest transition-all duration-300"
            >
              Done
              <Check className="w-4 h-4 text-mint" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
