"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import CountdownTimer from "./CountdownTimer";
import { defaultEvents, eventCtaHref, hasCtaLink, type ClubEvent } from "@/lib/events";
import { useInView } from "@/hooks/useInView";
import {
  Calendar,
  MapPin,
  ExternalLink,
  ArrowRight,
  Sparkles,
  ShieldCheck,
  Zap,
  ChevronLeft,
  ChevronRight,
  RotateCw,
  Star,
  Search,
  Trophy,
  Users,
  IndianRupee,
  Award,
  Utensils,
} from "lucide-react";

gsap.registerPlugin(ScrollTrigger);

const INITIAL_NOW = Date.now();

function sortUpcoming(list: ClubEvent[], now: number) {
  const sorted = list
    .filter((e) => new Date(e.date).getTime() > now)
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  return sorted.length > 0 ? sorted : list;
}

function formatDate(dateStr: string) {
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatTime(dateStr: string) {
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function EventsShowcase() {
  const sectionRef = useRef<HTMLElement>(null);
  const [inViewRef, inView] = useInView<HTMLElement>();
  const bgRef = useRef<HTMLDivElement>(null);
  const timerWrapperRef = useRef<HTMLDivElement>(null);
  const macWindowRef = useRef<HTMLDivElement>(null);

  const [events, setEvents] = useState<ClubEvent[]>(defaultEvents);
  const [now, setNow] = useState(INITIAL_NOW);

  // Only events flagged as "featured" in the admin dashboard drive the home
  // page events section. Falls back to all events if none are featured yet.
  const featuredEvents = useMemo(() => {
    const featured = events.filter((e) => e.featured === true);
    return featured.length > 0 ? featured : events;
  }, [events]);

  const nextEvent = useMemo(() => sortUpcoming(featuredEvents, now)[0], [featuredEvents, now]);

  // Periodic clock used to keep upcoming-event sorting fresh — paused while the
  // section is off-screen.
  useEffect(() => {
    if (!inView) return;
    const id = setInterval(() => setNow(Date.now()), 30000);
    return () => clearInterval(id);
  }, [inView]);

  // Sync with Admin Dashboard live endpoint — polling is suspended while the
  // tab is hidden or the section is off-screen to cut idle network traffic.
  useEffect(() => {
    let alive = true;
    let id: ReturnType<typeof setInterval> | null = null;
    const loadEvents = async () => {
      try {
        const res = await fetch("/api/events", { cache: "no-store" });
        const data = await res.json();
        if (!alive || !Array.isArray(data.events) || data.events.length === 0) return;
        setEvents(data.events);
      } catch {
        // Fallback
      }
    };
    const schedule = () => {
      if (!alive) return;
      if (id) {
        clearInterval(id);
        id = null;
      }
      if (inView && !document.hidden) {
        loadEvents();
        id = setInterval(loadEvents, 5000);
      }
    };
    const onVisibility = () => schedule();
    document.addEventListener("visibilitychange", onVisibility);
    schedule();
    return () => {
      alive = false;
      if (id) clearInterval(id);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [inView]);

  // GSAP Scroll Animations:
  // 1. Timer fades in & scales as the section slides up over the hero
  // 2. Mac Window peeks into the hero bottom, then settles further down as the section rises
  useEffect(() => {
    const section = sectionRef.current;
    const bg = bgRef.current;
    const timerWrapper = timerWrapperRef.current;
    const macWindow = macWindowRef.current;
    if (!section || !timerWrapper || !bg || !macWindow) return;

      const ctx = gsap.context(() => {
      const mm = gsap.matchMedia();

      // Desktop Animations
      mm.add("(min-width: 768px)", () => {
        // Pure Timer smooth fade in above Mac UI
        gsap.fromTo(
          timerWrapper,
          { opacity: 0, y: -25, scale: 0.9 },
          {
            opacity: 1,
            y: 0,
            scale: 1,
            ease: "power2.out",
            force3D: true,
            scrollTrigger: {
              trigger: section,
              start: "top 65%",
              end: "top 20%",
              scrub: 1,
            },
          }
        );

        // Mac Window subtle scale — section is now auto-height so avoid large y translation that would overlap the See More pill
        gsap.fromTo(
          macWindow,
          { scale: 0.95 },
          {
            scale: 1,
            ease: "none",
            force3D: true,
            scrollTrigger: {
              trigger: section,
              start: "top bottom",
              end: "top center",
              scrub: 1,
            },
          }
        );
      });

      // Mobile Animations
      mm.add("(max-width: 767px)", () => {
        // Timer fades in below Mac UI
        gsap.fromTo(
          timerWrapper,
          { opacity: 0, y: 20, scale: 0.95 },
          {
            opacity: 1,
            y: 0,
            scale: 1,
            ease: "power2.out",
            force3D: true,
            scrollTrigger: {
              trigger: section,
              start: "top 40%",
              end: "top 10%",
              scrub: 1,
            },
          }
        );

        // Mac Window subtle scale (no huge y movement since it flows naturally)
        gsap.fromTo(
          macWindow,
          { scale: 0.95 },
          {
            scale: 1,
            ease: "none",
            force3D: true,
            scrollTrigger: {
              trigger: section,
              start: "top bottom",
              end: "top center",
              scrub: 1,
            },
          }
        );
      });
    }, section);

    return () => ctx.revert();
  }, [nextEvent?.id]);

  return (
    <section
      id="events"
      ref={(node) => {
        sectionRef.current = node;
        inViewRef.current = node;
      }}
      className="relative z-40 w-full min-h-screen flex flex-col items-center justify-start px-4 sm:px-6 overflow-visible select-none pt-12 sm:pt-16 pb-24 sm:pb-28 snap-start"
      data-section-theme="dark"
    >
      {/* Background dark overlay — Fades in as user scrolls into section */}
      <div ref={bgRef} className="absolute inset-0 bg-[#05080a] pointer-events-none z-0">
        <div className="absolute inset-0 bg-cyber-grid opacity-30 pointer-events-none" />
        <div className="absolute inset-0 bg-grain opacity-40 pointer-events-none" />
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              "radial-gradient(60% 45% at 50% 30%, rgba(52, 211, 153, 0.18), transparent 80%)",
          }}
        />
      </div>

      <div className="max-w-5xl w-full flex flex-col items-center relative z-20">
        {/* Pure Floating Timer — spaced between navbar and Mac UI on mobile */}
        <div ref={timerWrapperRef} className="w-full mt-24 md:mt-10 mb-8 md:mb-4 text-center shrink-0 opacity-0 relative z-20">
          <CountdownTimer target={nextEvent?.date ?? ""} />
        </div>

        {/* Mac UI Flex Centering Wrapper — in-flow on all viewports so the section height grows with long titles/descriptions */}
        <div className="relative w-full flex justify-center z-40 pointer-events-none px-0 sm:px-6 mb-0">
          <div
            ref={macWindowRef}
            data-mac-ui
            className="w-full max-w-5xl pointer-events-auto will-change-transform"
          >
            {/* Pristine High-Contrast Mac Window Frame */}
            <div className="relative rounded-2xl sm:rounded-3xl overflow-hidden bg-[#0d1117] border border-white/20">
              {/* Mac Browser Header Bar */}
              <div className="bg-[#161b22] border-b border-white/10 px-4 py-2.5 flex items-center justify-between select-none shadow-md">
                {/* Left Side: Traffic Light Dots */}
                <div className="flex items-center gap-2">
                  <span className="w-3.5 h-3.5 rounded-full bg-[#ff5f56] shadow-[0_0_8px_rgba(255,95,86,0.8)] cursor-pointer transition-all duration-300 hover:scale-125 hover:brightness-125 hover:shadow-[0_0_14px_rgba(255,95,86,1)]" />
                  <span className="w-3.5 h-3.5 rounded-full bg-[#ffbd2e] shadow-[0_0_8px_rgba(255,189,46,0.8)] cursor-pointer transition-all duration-300 hover:scale-125 hover:brightness-125 hover:shadow-[0_0_14px_rgba(255,189,46,1)]" />
                  <span className="w-3.5 h-3.5 rounded-full bg-[#27c93f] shadow-[0_0_8px_rgba(39,201,63,0.8)] cursor-pointer transition-all duration-300 hover:scale-125 hover:brightness-125 hover:shadow-[0_0_14px_rgba(39,201,63,1)]" />
                </div>

                {/* Middle: Address Bar */}
                <div className="flex-1 flex items-center justify-center max-w-xl mx-4">
                  <div className="flex items-center gap-2 text-gray-400 mr-2 shrink-0">
                    <ChevronLeft className="w-4 h-4 cursor-pointer hover:text-white transition-colors" />
                    <ChevronRight className="w-4 h-4 cursor-pointer hover:text-white transition-colors" />
                    <RotateCw className="w-3.5 h-3.5 cursor-pointer hover:text-white transition-colors ml-0.5" />
                  </div>

                  <div className="w-full bg-[#0d1117] border border-white/15 rounded-lg px-3 py-1 flex items-center justify-between text-xs font-mono text-gray-200 shadow-inner transition-colors duration-300 hover:border-emerald-400/40 hover:bg-[#10171c]">
                    <div className="flex items-center gap-2 overflow-hidden">
                      <Search className="w-3.5 h-3.5 text-gray-400 shrink-0 transition-colors duration-300 hover:text-emerald-400" />
                      <span className="truncate text-emerald-400 font-semibold">ctc://events/upcoming-event</span>
                    </div>
                    <Star className="w-3.5 h-3.5 text-amber-400 shrink-0 ml-2 cursor-pointer transition-all duration-300 hover:scale-125 hover:text-amber-300" />
                  </div>
                </div>

                {/* Right Side: Status Badge */}
                <div className="hidden sm:flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-950/80 border border-emerald-500/40 text-[10px] font-mono text-emerald-400 uppercase tracking-wider font-bold cursor-pointer transition-all duration-300 hover:scale-105 hover:bg-emerald-900/80 hover:border-emerald-400/70 hover:shadow-[0_0_16px_rgba(52,211,153,0.4)]">
                  <Zap className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
                  <span>UPCOMING EVENT</span>
                </div>
              </div>

              {/* Redesign: Poster left / Content right — mac chrome unchanged */}
              {nextEvent && (
                <div className="relative bg-[#070c10] text-white overflow-hidden flex flex-col md:flex-row items-stretch min-h-[380px] sm:min-h-[420px]">
                  {/* Left — Poster image in poster ratio */}
                  <div className="relative w-full md:w-[360px] lg:w-[400px] shrink-0 bg-black overflow-hidden flex md:border-r border-white/10">
                    {/* Poster ratio container: aspect-[3/4] on mobile, stretch to match content height on md+ */}
                    <div className="relative w-full aspect-[3/4] max-h-[420px] md:max-h-none md:aspect-auto md:min-h-full md:flex-1 overflow-hidden">
                      <img
                        src={nextEvent.image}
                        alt={nextEvent.title}
                        loading="lazy"
                        decoding="async"
                        className="absolute inset-0 w-full h-full object-cover transition-transform duration-[1500ms] hover:scale-[1.03]"
                        draggable={false}
                      />
                      {/* Subtle gradient for poster depth — keeps image legible but not overlaying text */}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-black/10 to-transparent pointer-events-none md:bg-gradient-to-r md:from-transparent md:via-transparent md:to-black/20" />
                      <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(80%_60%_at_50%_35%,rgba(52,211,153,0.12),transparent_70%)]" />
                      {/* Mobile badge overlay on poster bottom (optional polish, hidden on md) */}
                      <div className="absolute bottom-3 left-3 md:hidden">
                        <span className="inline-flex items-center px-3 py-1 rounded-full bg-gradient-to-r from-emerald-400 to-cyan-300 text-black font-mono text-[10px] font-black uppercase tracking-wider shadow-lg">
                          {nextEvent.category}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Right — Title / Description / CTA */}
                  <div className="relative flex-1 flex flex-col justify-center px-6 sm:px-8 lg:px-10 py-6 sm:py-8 lg:py-9 bg-[#0a1210] overflow-hidden">
                    {/* Subtle background glow behind content */}
                    <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(70%_65%_at_30%_25%,rgba(52,211,153,0.10),transparent_70%)]" />
                    <div className="absolute inset-0 pointer-events-none bg-gradient-to-br from-emerald-500/[0.03] via-transparent to-transparent" />

                    <div className="relative flex flex-col items-start text-left w-full">
                      {/* Badge row */}
                      <div className="flex flex-wrap items-center gap-2 mb-3">
                        <span className="hidden md:inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-gradient-to-r from-emerald-400 to-cyan-300 text-black font-mono text-[11px] font-black uppercase tracking-wider shadow-[0_0_18px_rgba(52,211,153,0.45)] transition-transform duration-300 hover:scale-105 cursor-default">
                          {nextEvent.category}
                        </span>
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-400/10 text-emerald-300 font-mono text-[11px] font-bold uppercase border border-emerald-400/30 shadow-[0_0_12px_rgba(52,211,153,0.15)] transition-all duration-300 hover:scale-105 hover:shadow-[0_0_16px_rgba(52,211,153,0.3)] cursor-default">
                          <Sparkles className="w-3.5 h-3.5" /> CTC Feature Event
                        </span>
                      </div>

                      {/* Headline — left aligned on md, still centered on very small? Now left for poster layout */}
                      <h3 className="group/title w-full max-w-xl text-[26px] sm:text-3xl lg:text-[40px] font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-white via-emerald-50 to-emerald-300 tracking-tight leading-[1.05] drop-shadow-[0_2px_24px_rgba(52,211,153,0.25)] transition-all duration-500 group-hover/title:from-emerald-50 group-hover/title:via-emerald-200 group-hover/title:to-white break-words [overflow-wrap:anywhere]">
                        {nextEvent.title}
                      </h3>

                      {/* Tagline / description */}
                      <p className="mt-3 w-full max-w-xl text-[13px] sm:text-[15px] text-slate-300 leading-relaxed transition-colors duration-300 hover:text-white cursor-default break-words [overflow-wrap:anywhere] line-clamp-none">
                        {nextEvent.description}
                      </p>

                      {/* Meta pills */}
                      <div className="mt-4 flex flex-wrap items-center gap-2.5 text-xs font-mono text-emerald-300 font-semibold">
                        <span className="inline-flex items-center gap-1.5 bg-black/50 border border-emerald-500/25 px-3 py-1.5 rounded-full backdrop-blur-sm transition-all duration-300 hover:border-emerald-400/60 hover:bg-emerald-400/10 hover:-translate-y-0.5 cursor-pointer">
                          <Calendar className="w-3.5 h-3.5 text-emerald-400" />
                          {formatDate(nextEvent.date)}
                          {formatTime(nextEvent.date) ? ` • ${formatTime(nextEvent.date)}` : ""}
                        </span>
                        <span className="inline-flex items-center gap-1.5 bg-black/50 border border-emerald-500/25 px-3 py-1.5 rounded-full backdrop-blur-sm transition-all duration-300 hover:border-emerald-400/60 hover:bg-emerald-400/10 hover:-translate-y-0.5 cursor-pointer">
                          <MapPin className="w-3.5 h-3.5 text-emerald-400" />
                          {nextEvent.venue}
                        </span>
                      </div>

                      {/* CTA row — left aligned to match poster layout */}
                      <div className="mt-5 flex flex-wrap items-center gap-3">
                        {nextEvent.registrationsOpen !== false && new Date(nextEvent.date).getTime() > Date.now() ? (
                          <a
                            href={eventCtaHref(nextEvent.registerUrl)}
                            target={hasCtaLink(nextEvent.registerUrl) ? "_blank" : undefined}
                            rel={hasCtaLink(nextEvent.registerUrl) ? "noreferrer" : undefined}
                            className="inline-flex items-center gap-2 px-6 py-2.5 sm:px-7 sm:py-3 rounded-full bg-gradient-to-r from-emerald-400 to-teal-300 hover:from-emerald-300 hover:to-teal-200 text-black font-bold text-xs sm:text-sm uppercase tracking-wider shadow-[0_0_32px_rgba(52,211,153,0.5)] hover:shadow-[0_0_48px_rgba(52,211,153,0.75)] hover:scale-105 active:scale-95 transition-all duration-300"
                          >
                            Register Now
                            <ExternalLink className="w-4 h-4 transition-transform duration-300 group-hover:rotate-45" />
                          </a>
                        ) : (
                          <span className="inline-flex items-center gap-2 px-6 py-2.5 sm:px-7 sm:py-3 rounded-full bg-white/10 border border-white/10 text-white/50 font-bold text-xs sm:text-sm uppercase tracking-wider cursor-not-allowed">
                            Registration Closed
                          </span>
                        )}
                        <Link
                          href={`/events?event=${nextEvent.id}`}
                          className="inline-flex items-center gap-1.5 px-5 py-2.5 sm:px-6 sm:py-3 rounded-full bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-400/40 text-emerald-200 font-semibold text-xs sm:text-sm hover:border-emerald-300/70 hover:-translate-y-0.5 active:translate-y-0 transition-all duration-300"
                        >
                          View Details
                          <ArrowRight className="w-4 h-4 transition-transform duration-300 group-hover:translate-x-1" />
                        </Link>
                      </div>

                      {/* Stat strip — only enabled perks (fee always shown, others only if enabled) */}
                      <div className="mt-6 w-full max-w-md flex divide-x divide-white/10 rounded-2xl border border-white/10 bg-black/40 backdrop-blur-sm overflow-hidden">
                        {/* Fee — always shown as Free vs Paid */}
                        <div className={`group/stat flex flex-1 flex-col items-center gap-1 py-2.5 cursor-default ${nextEvent.registrationFeeEnabled ? "bg-amber-500/5" : "hover:bg-emerald-400/10"}`}>
                          <IndianRupee className={`w-4 h-4 transition-transform duration-300 group-hover/stat:scale-125 ${nextEvent.registrationFeeEnabled ? "text-amber-400" : "text-emerald-400"}`} />
                          <span className={`text-[10px] font-mono font-bold uppercase tracking-wider text-center px-1 ${nextEvent.registrationFeeEnabled ? "text-amber-300" : "text-emerald-300"}`}>
                            {nextEvent.registrationFeeEnabled ? (nextEvent.registrationFeeAmount?.trim() ? `₹${nextEvent.registrationFeeAmount.trim().replace(/^₹/, "")}` : "Paid") : "Free"}
                          </span>
                        </div>
                        {/* Prize — only if enabled */}
                        {nextEvent.prizeEnabled && (
                          <div className="group/stat flex flex-1 flex-col items-center gap-1 py-2.5 cursor-default bg-fuchsia-500/5">
                            <Trophy className="w-4 h-4 text-amber-400 transition-transform duration-300 group-hover/stat:scale-125" />
                            <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-center leading-tight px-1 text-amber-300">
                              {nextEvent.prizeAmount?.trim() ? nextEvent.prizeAmount.trim() : "Prizes"}
                            </span>
                          </div>
                        )}
                        {/* Certificate — only if enabled (enabled by default) */}
                        {nextEvent.certificateEnabled !== false && (
                          <div className="group/stat flex flex-1 flex-col items-center gap-1 py-2.5 cursor-default hover:bg-sky-400/10">
                            <Award className="w-4 h-4 text-sky-400 transition-transform duration-300 group-hover/stat:scale-125" />
                            <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-center leading-tight px-1 text-sky-300">
                              {nextEvent.certificateType === "certificate" ? "Certificate" : nextEvent.certificateType === "both" ? "Both Certs" : "E-Cert"}
                            </span>
                          </div>
                        )}
                        {/* Appetizers / Refreshments — only if enabled */}
                        {nextEvent.appetizersEnabled && (
                          <div className="group/stat flex flex-1 flex-col items-center gap-1 py-2.5 cursor-default bg-emerald-500/5">
                            <Utensils className="w-4 h-4 text-emerald-400 transition-transform duration-300 group-hover/stat:scale-125" />
                            <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-center leading-tight px-1 text-emerald-300">
                              {nextEvent.appetizersNote?.trim() || "Refreshments"}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Ambient Glow */}
              <div className="absolute inset-0 pointer-events-none bg-gradient-to-tr from-emerald-500/5 via-transparent to-white/5" />
            </div>
          </div>
        </div>
      </div>

      {/* See More Events — in-flow below the card so it never overlaps the CTA when the card grows */}
      <div className="relative mt-10 sm:mt-12 z-20 flex justify-center w-full">
        {/* Pulsing mint halo behind the pill */}
        <div
          aria-hidden
          className="pointer-events-none absolute -inset-3 rounded-full bg-[radial-gradient(60%_60%_at_50%_50%,rgba(52,211,153,0.4),transparent_75%)] blur-xl animate-pulse-glow"
        />
        <Link
          href="/events"
          className="group relative inline-flex items-center gap-3.5 pl-5 sm:pl-6 pr-2 py-2 rounded-full border border-emerald-300/30 bg-white/[0.06] backdrop-blur-xl text-emerald-50 shadow-[0_8px_32px_rgba(0,0,0,0.45),inset_0_1px_0_rgba(255,255,255,0.12)] hover:border-emerald-300/60 hover:bg-white/[0.1] hover:shadow-[0_0_44px_rgba(52,211,153,0.4),inset_0_1px_0_rgba(255,255,255,0.18)] hover:scale-[1.03] active:scale-95 transition-all duration-300"
        >
          {/* Live status dot */}
          <span className="relative flex h-2.5 w-2.5 shrink-0">
            <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75 animate-ping" />
            <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.9)]" />
          </span>

          <span className="flex flex-col items-start leading-none">
            <span className="text-[9px] sm:text-[10px] font-mono font-black uppercase tracking-[0.24em] text-emerald-300/80 group-hover:text-emerald-200 transition-colors duration-300">
              Full Calendar
            </span>
            <span className="mt-1.5 text-sm sm:text-base font-extrabold uppercase tracking-wide group-hover:text-white transition-colors duration-300">
              See More Events
            </span>
          </span>

          <span className="inline-flex items-center justify-center w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-gradient-to-br from-emerald-400/20 to-teal-400/10 border border-emerald-300/40 text-emerald-200 backdrop-blur-md transition-all duration-300 group-hover:from-emerald-400 group-hover:to-teal-300 group-hover:text-emerald-950 group-hover:border-transparent group-hover:scale-105 group-hover:shadow-[0_0_22px_rgba(52,211,153,0.6)]">
            <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5 transition-transform duration-300 group-hover:translate-x-0.5" />
          </span>
        </Link>
      </div>
    </section>
  );
}
