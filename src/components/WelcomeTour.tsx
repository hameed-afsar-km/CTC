"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  UserPlus,
  Megaphone,
  CalendarDays,
  Images,
  Users,
  LifeBuoy,
  ChevronLeft,
  ChevronRight,
  ArrowUpRight,
  HelpCircle,
  X,
} from "lucide-react";
import { useSmoothScroll } from "@/components/SmoothScroll";

interface TourContact {
  label: string;
  value: string;
  href: string;
}

interface TourSlide {
  icon: typeof UserPlus;
  eyebrow: string;
  title: string;
  description: string;
  points?: string[];
  contacts?: TourContact[];
  cta?: { label: string; href: string };
}

const SLIDES: TourSlide[] = [
  {
    icon: UserPlus,
    eyebrow: "Join Us",
    title: "Become a Technocrat",
    description:
      "Want in on CTC? Fill one short form — tell us about yourself and pick the role that fits you best. We review every application and let you know the outcome.",
    points: [
      "One quick form — basics, interests & skills",
      "Choose the role you want to start with",
      "Apply once and track your status anytime",
    ],
    cta: { label: "Apply Now", href: "/join" },
  },
  {
    icon: Megaphone,
    eyebrow: "Host'It",
    title: "Got an Event Idea?",
    description:
      "Propose your own seminar, workshop or tech talk — the club helps you plan it and pull it off.",
    points: [
      "Pick a type — Seminar, Workshop, Tech Talk or Community Event",
      "Describe it — what, when & expected attendees",
      "Submit and the team reviews your proposal shortly",
    ],
    cta: { label: "Propose an Event", href: "/hostit" },
  },
  {
    icon: CalendarDays,
    eyebrow: "Events",
    title: "Never Miss What's On",
    description:
      "Everything CTC is running lives here — workshops, seminars, tech talks and community meetups. Open any event for full details.",
    cta: { label: "View Events", href: "/events" },
  },
  {
    icon: Images,
    eyebrow: "Gallery",
    title: "Relive the Moments",
    description:
      "Photos from our events, sessions and everything in between. Tap any shot for a full-screen look.",
    cta: { label: "Explore Gallery", href: "/gallery" },
  },
  {
    icon: Users,
    eyebrow: "The Team",
    title: "Meet the People",
    description:
      "The folks who plan, build and run everything you just saw. Take a look at who's behind CTC.",
    cta: { label: "Look at the Team", href: "#team" },
  },
  {
    icon: LifeBuoy,
    eyebrow: "Need Help?",
    title: "We're Here for You",
    description:
      "Questions, ideas or feedback — reach out anytime and we'll get back to you.",
    contacts: [
      {
        label: "Email",
        value: "technocratsclub@crescent.education",
        href: "mailto:technocratsclub@crescent.education",
      },
      {
        label: "Instagram",
        value: "@crescent_technocrats",
        href: "https://www.instagram.com/crescent_technocrats/",
      },
      {
        label: "LinkedIn",
        value: "Crescent Technocrats Club",
        href: "https://www.linkedin.com/company/crescent-technocrats-club/",
      },
    ],
    cta: { label: "Contact Us", href: "mailto:technocratsclub@crescent.education" },
  },
];

export default function WelcomeTour({
  start,
  autoOpen,
  onActiveChange,
  onAutoOpen,
}: {
  /** Gates the toggle button in once the splash sequence has finished. */
  start?: boolean;
  /** Auto-open the tour overlay (used after music preference is resolved). */
  autoOpen?: boolean;
  /** Reports whether the tour overlay is currently open (used to pause other effects, e.g. the smudge cursor). */
  onActiveChange?: (open: boolean) => void;
  /** Called when auto-open triggers (so parent can reset the trigger). */
  onAutoOpen?: () => void;
}) {
  const lenis = useSmoothScroll();
  const [mounted, setMounted] = useState(false);
  const [open, setOpen] = useState(false);
  // True while the exit animation plays — the overlay unmounts once it finishes.
  const [closing, setClosing] = useState(false);
  const [index, setIndex] = useState(0);
  const touchX = useRef<number | null>(null);

  // Fade the help toggle in after the splash sequence has finished.
  useEffect(() => {
    if (!start) return;
    const t = window.setTimeout(() => setMounted(true), 600);
    return () => window.clearTimeout(t);
  }, [start]);

  // Auto-open the tour when autoOpen is triggered (after music preference resolved)
  // Only auto-open once per browser session — use sessionStorage so it won't
  // reappear when the user navigates away and comes back. Closing the tab
  // clears sessionStorage, so a fresh visit triggers the tour again.
  useEffect(() => {
    if (!autoOpen || !mounted || open) return;
    if (sessionStorage.getItem("welcomeTourShown")) return;
    const t = window.setTimeout(() => {
      sessionStorage.setItem("welcomeTourShown", "1");
      setOpen(true);
      onAutoOpen?.();
    }, 300);
    return () => window.clearTimeout(t);
  }, [autoOpen, mounted, open, onAutoOpen]);

  // Report open/close so the host page can react (pause the smudge cursor).
  useEffect(() => {
    onActiveChange?.(open);
  }, [open, onActiveChange]);

  const close = useCallback(() => {
    setClosing(true);
  }, []);

  const toggle = useCallback(() => {
    if (closing) return;
    if (open) setClosing(true);
    else setOpen(true);
  }, [open, closing]);

  // Unmount after the exit animation has played out (matches .animate-modal-out).
  useEffect(() => {
    if (!closing) return;
    const t = window.setTimeout(() => {
      setOpen(false);
      setClosing(false);
      setIndex(0);
    }, 380);
    return () => window.clearTimeout(t);
  }, [closing]);

  const go = useCallback((dir: number) => {
    setIndex((i) => Math.min(Math.max(i + dir, 0), SLIDES.length - 1));
  }, []);

  // Scroll lock + keyboard navigation while the tour is open.
  useEffect(() => {
    if (!open) return;
    document.body.style.overflow = "hidden";
    lenis?.stop();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
      else if (e.key === "ArrowRight") go(1);
      else if (e.key === "ArrowLeft") go(-1);
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = "";
      lenis?.start();
      window.removeEventListener("keydown", onKey);
    };
  }, [open, lenis, close, go]);

  if (!mounted) return null;

  const slide = SLIDES[index];
  const Icon = slide.icon;
  const isLast = index === SLIDES.length - 1;

  // Release the scroll lock before navigation so in-page anchors (#team)
  // smooth-scroll correctly through Lenis once the tour closes. The overlay
  // itself plays its exit animation on top of the page.
  const handleCtaClick = () => {
    document.body.style.overflow = "";
    lenis?.start();
    setClosing(true);
  };

  /* ── Shared slide-content fragments (styled per layout below) ─────────── */

  const pointsList = (large: boolean) =>
    slide.points && slide.points.length > 0 ? (
      <ul className={`text-left ${large ? "mt-6 space-y-3" : "mt-4 space-y-2"}`}>
        {slide.points.map((point) => (
          <li
            key={point}
            className={`flex items-start gap-2.5 rounded-xl bg-white/[0.03] border border-white/5 ${
              large ? "px-4 py-3" : "px-3.5 py-2.5"
            }`}
          >
            <span className={`${large ? "mt-2" : "mt-1.5"} h-1.5 w-1.5 shrink-0 rounded-full bg-mint`} />
            <span
              className={`leading-relaxed ${large ? "text-sm text-white/75" : "text-xs text-white/70"}`}
            >
              {point}
            </span>
          </li>
        ))}
      </ul>
    ) : null;

  const contactsList = (large: boolean) =>
    slide.contacts ? (
      <div className={`text-left ${large ? "mt-6 space-y-3" : "mt-4 space-y-2"}`}>
        {slide.contacts.map((c) => (
          <a
            key={c.label}
            href={c.href}
            target={c.href.startsWith("http") ? "_blank" : undefined}
            rel="noopener noreferrer"
            onClick={handleCtaClick}
            className={`group flex items-center gap-3 rounded-xl bg-white/[0.03] border border-white/5 hover:border-mint/30 transition-all duration-300 ${
              large ? "px-4 py-3" : "px-3.5 py-2.5"
            }`}
          >
            <span
              className={`shrink-0 uppercase font-bold tracking-wider text-neutral-500 ${
                large ? "w-20 text-[10px]" : "w-16 text-[9px]"
              }`}
            >
              {c.label}
            </span>
            <span className={`text-emerald-100 font-mono truncate ${large ? "text-sm" : "text-xs"}`}>
              {c.value}
            </span>
            <ArrowUpRight className="ml-auto w-3.5 h-3.5 shrink-0 text-mint/50 group-hover:text-mint transition-colors" />
          </a>
        ))}
      </div>
    ) : null;

  const ctaButton = (large: boolean) =>
    slide.cta ? (
      <a
        href={slide.cta.href}
        onClick={handleCtaClick}
        className={
          large
            ? "inline-flex items-center gap-2.5 px-8 py-3.5 rounded-full rgb-btn-surface text-black font-syne text-sm font-bold tracking-wider uppercase shadow-lg shadow-mint/25 hover:shadow-mint/50 hover:scale-[1.03] transition-all duration-300"
            : "mt-5 flex w-full items-center justify-center gap-2 px-5 py-3 rounded-full bg-mint text-black font-syne text-sm font-bold tracking-wider uppercase shadow-lg shadow-mint/20 hover:shadow-mint/40 hover:scale-[1.02] transition-all duration-300"
        }
      >
        {slide.cta.label}
        <ArrowUpRight className={large ? "w-4 h-4" : "w-4 h-4"} />
      </a>
    ) : null;

  return (
    <>
      {/* Question-mark toggle — bottom left. Same spot closes the tour. */}
      <button
        type="button"
        onClick={toggle}
        aria-label={open ? "Close welcome tour" : "Open welcome tour"}
        className={`fixed bottom-5 left-5 z-[98] flex items-center justify-center w-12 h-12 rounded-full border backdrop-blur-xl transition-all duration-300 animate-fade-in ${
          open
            ? "border-mint/60 bg-mint/15 text-white shadow-[0_0_40px_rgba(52,211,153,0.35)]"
            : "border-mint/30 bg-[#080c0b]/90 text-mint shadow-[0_0_30px_rgba(52,211,153,0.2)] hover:border-mint/60 hover:text-white hover:scale-105"
        }`}
      >
        <span className={`flex transition-transform duration-300 ${open ? "rotate-90" : ""}`}>
          {open ? <X className="w-5 h-5" /> : <HelpCircle className="w-5 h-5" />}
        </span>
      </button>

      {open && (
    <div
      className={`fixed inset-0 z-[97] flex items-center justify-center p-4 sm:p-6 bg-black/70 backdrop-blur-sm md:bg-[#06090c]/[0.93] md:backdrop-blur-xl ${
        closing ? "animate-backdrop-out" : "animate-fade-in"
      }`}
    >
      {/* Cinematic backdrop decoration — desktop only */}
      <div aria-hidden className="pointer-events-none absolute inset-0 hidden md:block overflow-hidden">
        <div
          className="absolute inset-0 opacity-40"
          style={{
            backgroundImage:
              "linear-gradient(to right,rgba(52,211,153,0.05) 1px,transparent 1px),linear-gradient(to bottom,rgba(52,211,153,0.05) 1px,transparent 1px)",
            backgroundSize: "44px 44px",
          }}
        />
        <div className="absolute -top-40 -left-40 w-[520px] h-[520px] rounded-full bg-mint/10 blur-[150px] animate-pulse" />
        <div
          className="absolute -bottom-48 -right-32 w-[460px] h-[460px] rounded-full bg-indigo-500/10 blur-[160px] animate-orb-hue"
          style={{ animationDelay: "1.6s" }}
        />
      </div>

      <div
        role="dialog"
        aria-modal="true"
        aria-label="Welcome tour"
        className="relative z-10 w-full max-w-md md:max-w-5xl"
        onTouchStart={(e) => {
          touchX.current = e.touches[0].clientX;
        }}
        onTouchEnd={(e) => {
          if (touchX.current === null) return;
          const dx = e.changedTouches[0].clientX - touchX.current;
          if (Math.abs(dx) > 48) go(dx < 0 ? 1 : -1);
          touchX.current = null;
        }}
      >
        {/* ══════════════════ MOBILE (< md) — unchanged card ══════════════════ */}
        <div
          className={`md:hidden rounded-3xl border border-mint/25 bg-[#080c0b]/95 backdrop-blur-xl shadow-[0_0_60px_rgba(52,211,153,0.15)] overflow-hidden ${
            closing ? "animate-slide-out" : "animate-slide-in"
          }`}
        >
          {/* Header — step counter + skip */}
          <div className="flex items-center justify-between px-6 pt-5">
            <span className="text-[10px] uppercase tracking-widest font-bold text-mint/70">
              {String(index + 1).padStart(2, "0")} / {String(SLIDES.length).padStart(2, "0")}
            </span>
            <button
              type="button"
              onClick={close}
              aria-label="Skip tour"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-white/10 text-white/50 hover:text-white hover:border-mint/40 text-[10px] font-bold uppercase tracking-widest transition-all duration-300"
            >
              Skip
              <X className="w-3 h-3" />
            </button>
          </div>

          {/* Slide content */}
          <div key={index} className="px-7 sm:px-8 pt-4 pb-2 text-center animate-modal-in">
            <div className="mx-auto mb-4 flex items-center justify-center w-14 h-14 rounded-2xl border border-mint/30 bg-mint/10">
              <Icon className="w-6 h-6 text-mint" />
            </div>
            <p className="text-[10px] uppercase tracking-widest font-bold text-emerald-400/80">
              {slide.eyebrow}
            </p>
            <h2 className="mt-1 font-syne text-2xl font-black tracking-tight text-white">
              {slide.title}
            </h2>
            <p className="mt-2 text-sm text-white/60 leading-relaxed">{slide.description}</p>

            {pointsList(false)}
            {contactsList(false)}
            <div className="mt-5">{ctaButton(false)}</div>
          </div>

          {/* Footer — dots + prev/next */}
          <div className="flex items-center justify-between px-6 pb-6 pt-3">
            <div className="flex items-center gap-1.5">
              {SLIDES.map((s, i) => (
                <button
                  key={s.eyebrow}
                  type="button"
                  aria-label={`Go to slide ${i + 1}`}
                  onClick={() => setIndex(i)}
                  className={`h-1.5 rounded-full transition-all duration-300 ${
                    i === index ? "w-6 bg-mint" : "w-1.5 bg-white/20 hover:bg-white/40"
                  }`}
                />
              ))}
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => go(-1)}
                disabled={index === 0}
                aria-label="Previous slide"
                className="flex items-center justify-center w-9 h-9 rounded-full border border-white/10 text-white/60 enabled:hover:border-mint/40 enabled:hover:text-white disabled:opacity-30 transition-all duration-300"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={isLast ? close : () => go(1)}
                aria-label={isLast ? "Finish tour" : "Next slide"}
                className={`flex items-center justify-center w-9 h-9 rounded-full font-syne text-xs font-black tracking-wider transition-all duration-300 ${
                  isLast
                    ? "bg-mint text-black shadow-lg shadow-mint/25 hover:shadow-mint/40 px-4 w-auto"
                    : "border border-mint/30 bg-mint/10 text-mint hover:bg-mint hover:text-black"
                }`}
              >
                {isLast ? "Done" : <ChevronRight className="w-4 h-4" />}
              </button>
            </div>
          </div>
        </div>

        {/* ══════════════════ DESKTOP (≥ md) — cinematic takeover ══════════════════ */}
        <div className={`hidden md:block rounded-[2rem] ${closing ? "animate-slide-out" : "animate-slide-in"}`}>
          <div className="relative rounded-[2rem] p-px animate-gradient-flow shadow-[0_0_120px_rgba(52,211,153,0.12)] overflow-hidden">
            <div className="relative rounded-[calc(2rem-1px)] bg-[#0a100e]/90 backdrop-blur-2xl overflow-hidden">
          {/* Top bar — brand line, counter, hints, skip */}
          <div className="flex items-center justify-between px-10 pt-7">
            <div className="flex items-center gap-4">
              <span className="font-mono text-[10px] uppercase tracking-[0.35em] font-bold text-mint/70">
                Welcome Tour
              </span>
              <span className="h-px w-14 animate-gradient-flow opacity-70" />
              <span className="font-mono text-xs text-white/40 tracking-widest">
                {String(index + 1).padStart(2, "0")}
                <span className="text-white/20"> / </span>
                {String(SLIDES.length).padStart(2, "0")}
              </span>
            </div>
            <div className="flex items-center gap-5">
              <span className="font-mono text-[10px] text-white/25 tracking-wider select-none">
                ←→ navigate&nbsp;&nbsp;·&nbsp;&nbsp;esc close
              </span>
              <button
                type="button"
                onClick={close}
                aria-label="Skip tour"
                className="flex items-center gap-1.5 px-4 py-1.5 rounded-full border border-white/10 text-white/50 hover:text-white hover:border-mint/40 text-[10px] font-bold uppercase tracking-widest transition-all duration-300"
              >
                Skip
                <X className="w-3 h-3" />
              </button>
            </div>
          </div>

          {/* Body — story column × visual stage */}
          <div className="grid grid-cols-[1.15fr_1fr] items-stretch gap-10 px-10 py-9">
            {/* Story column */}
            <div key={`story-${index}`} className="flex flex-col justify-center animate-modal-in">
              <div className="flex items-center gap-4 mb-5">
                <div className="flex items-center justify-center w-12 h-12 rounded-2xl border border-mint/30 bg-mint/10 shadow-[0_0_30px_rgba(52,211,153,0.15)]">
                  <Icon className="w-5 h-5 text-mint" />
                </div>
                <span className="font-mono text-[11px] uppercase tracking-[0.3em] font-bold text-emerald-400/90">
                  {slide.eyebrow}
                </span>
              </div>

              <h2 className="font-syne text-4xl xl:text-5xl font-black tracking-tight leading-[1.05] text-gradient-loop">
                {slide.title}
              </h2>
              <p className="mt-4 max-w-lg text-base text-white/60 leading-relaxed">
                {slide.description}
              </p>

              {pointsList(true)}
              {contactsList(true)}

              <div className="mt-8">{ctaButton(true)}</div>
            </div>

            {/* Visual stage — orbiting rings around the slide glyph */}
            <div className="relative flex items-center justify-center min-h-[380px]">
              {/* Giant ghost numeral */}
              <span
                key={`num-${index}`}
                aria-hidden
                className="absolute -bottom-6 -right-2 select-none pointer-events-none animate-modal-in"
              >
                <span className="block font-syne font-black text-[13rem] leading-none text-gradient-loop opacity-10">
                  {String(index + 1).padStart(2, "0")}
                </span>
              </span>

              {/* Orbit rings */}
              <div className="absolute w-[340px] h-[340px] rounded-full rgb-ring rgb-ring-spin" />
              <div className="absolute w-[240px] h-[240px] rounded-full border border-mint/10 animate-spin-slower-rev" />
              <div className="absolute w-[130px] h-[130px] rounded-full bg-mint/15 blur-2xl animate-pulse" />

              {/* Center glyph tile — floating RGB-rimmed tile */}
              <div key={`glyph-${index}`} className="relative z-10 animate-tour-float">
                <div className="p-[1.5px] rounded-[1.9rem] animate-gradient-flow shadow-[0_0_60px_rgba(52,211,153,0.25)]">
                  <div className="flex items-center justify-center w-28 h-28 rounded-[calc(1.9rem-1.5px)] bg-[#0b120f]/95 animate-modal-in">
                    <Icon className="w-11 h-11 text-mint" />
                  </div>
                </div>
              </div>

              {/* Sparks */}
              <span aria-hidden className="absolute top-10 right-16 text-mint/70 animate-pulse select-none">✦</span>
              <span
                aria-hidden
                className="absolute bottom-16 left-12 text-indigo-300/50 animate-pulse select-none"
                style={{ animationDelay: "1.2s" }}
              >
                ✦
              </span>
              <span
                aria-hidden
                className="absolute top-1/2 -translate-y-1/2 left-6 text-emerald-300/40 animate-pulse select-none"
                style={{ animationDelay: "2s" }}
              >
                ✦
              </span>
            </div>
          </div>

          {/* Bottom bar — progress dots + controls */}
          <div className="flex items-center justify-between px-10 pb-7 pt-5 border-t border-white/5">
            <div className="flex items-center gap-2">
              {SLIDES.map((s, i) => (
                <button
                  key={s.eyebrow}
                  type="button"
                  aria-label={`Go to slide ${i + 1}`}
                  onClick={() => setIndex(i)}
                  className={`h-1.5 rounded-full transition-all duration-300 ${
                    i === index ? "w-8 rgb-btn-surface" : "w-2 bg-white/15 hover:bg-white/35"
                  }`}
                />
              ))}
            </div>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => go(-1)}
                disabled={index === 0}
                aria-label="Previous slide"
                className="flex items-center justify-center w-11 h-11 rounded-full border border-white/10 text-white/60 enabled:hover:border-mint/40 enabled:hover:text-white disabled:opacity-30 transition-all duration-300"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <button
                type="button"
                onClick={isLast ? close : () => go(1)}
                aria-label={isLast ? "Finish tour" : "Next slide"}
                className={`flex items-center justify-center h-11 rounded-full font-syne text-xs font-black tracking-wider transition-all duration-300 ${
                  isLast
                    ? "rgb-btn-surface text-black shadow-lg shadow-mint/25 hover:shadow-mint/50 px-8 w-auto hover:scale-[1.03]"
                    : "border border-mint/30 bg-mint/10 text-mint hover:bg-mint hover:text-black w-11"
                }`}
              >
                {isLast ? "Done" : <ChevronRight className="w-5 h-5" />}
              </button>
            </div>
          </div>
            </div>
          </div>
        </div>
      </div>
    </div>
      )}
    </>
  );
}
