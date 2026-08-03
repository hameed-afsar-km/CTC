"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import CountdownTimer from "./CountdownTimer";
import { defaultEvents, type ClubEvent } from "@/lib/events";
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

  const nextEvent = useMemo(() => sortUpcoming(events, now)[0], [events, now]);

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

        // Mac Window glides directly upward from its hero peek to the landing spot
        gsap.fromTo(
          macWindow,
          { y: 0, scale: 0.95 },
          {
            y: 300,
            scale: 1,
            ease: "none",
            force3D: true,
            scrollTrigger: {
              trigger: section,
              start: "top bottom",
              end: "top top",
              scrub: 1.2,
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
      className="relative z-40 w-full min-h-screen h-screen max-h-screen flex flex-col items-center justify-start px-4 sm:px-6 overflow-visible select-none pt-12 sm:pt-16 snap-start"
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

        {/* Mac UI Flex Centering Wrapper — anchors Mac header in the hero bottom edge on desktop, flows naturally on mobile */}
        <div className="relative md:absolute top-0 md:-top-32 inset-x-0 w-full flex justify-center z-45 pointer-events-none px-4 sm:px-6 mb-2 md:mb-0">
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

              {/* Hero / Landing Card Interior */}
              {nextEvent && (
                <div className="relative min-h-[300px] sm:min-h-[400px] text-white overflow-hidden">
                  {/* Full-bleed backdrop image */}
                  <img
                    src={nextEvent.image}
                    alt=""
                    loading="lazy"
                    decoding="async"
                    className="absolute inset-0 w-full h-full object-cover transition-transform duration-[1500ms] group-hover:scale-105"
                    draggable={false}
                  />
                  <div className="absolute inset-0 bg-[#05080a]/80" />
                  <div className="absolute inset-0 bg-gradient-to-b from-[#05080a]/90 via-[#05080a]/75 to-[#0b0f14]/95" />
                  <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(70%_55%_at_50%_38%,rgba(52,211,153,0.14),transparent_72%)]" />

                  {/* Centered landing content */}
                  <div className="relative h-full min-h-[300px] sm:min-h-[400px] flex flex-col items-center justify-center text-center px-6 sm:px-10 py-3 sm:py-6">
                    {/* Badge row */}
                    <div className="flex flex-wrap items-center justify-center gap-2 mb-2.5">
                      <span className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-gradient-to-r from-emerald-400 to-cyan-300 text-black font-mono text-[11px] font-black uppercase tracking-wider shadow-[0_0_18px_rgba(52,211,153,0.45)] transition-transform duration-300 hover:scale-105 cursor-default">
                        {nextEvent.category}
                      </span>
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-400/10 text-emerald-300 font-mono text-[11px] font-bold uppercase border border-emerald-400/30 shadow-[0_0_12px_rgba(52,211,153,0.15)] transition-all duration-300 hover:scale-105 hover:shadow-[0_0_16px_rgba(52,211,153,0.3)] cursor-default">
                        <Sparkles className="w-3.5 h-3.5" /> CTC Feature Event
                      </span>
                    </div>

                    {/* Headline */}
                    <h3 className="group/title max-w-2xl text-3xl sm:text-5xl md:text-6xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-white via-emerald-50 to-emerald-300 tracking-tight leading-[1.05] drop-shadow-[0_2px_24px_rgba(52,211,153,0.25)] transition-all duration-500 group-hover/title:from-emerald-50 group-hover/title:via-emerald-200 group-hover/title:to-white">
                      {nextEvent.title}
                    </h3>

                    {/* Tagline / description */}
                    <p className="mt-2.5 max-w-xl text-[13px] sm:text-base text-slate-300 leading-snug sm:leading-relaxed transition-colors duration-300 hover:text-white cursor-default">
                      {nextEvent.description}
                    </p>

                    {/* Meta pills */}
                    <div className="mt-2.5 flex flex-wrap items-center justify-center gap-2.5 text-xs font-mono text-emerald-300 font-semibold">
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

                    {/* CTA row */}
                    <div className="mt-3 flex flex-wrap items-center justify-center gap-3">
                      <a
                        href={nextEvent.registerUrl}
                        target={nextEvent.registerUrl.startsWith("http") ? "_blank" : undefined}
                        rel="noreferrer"
                        className="inline-flex items-center gap-2 px-6 py-2.5 sm:px-8 sm:py-3.5 rounded-full bg-gradient-to-r from-emerald-400 to-teal-300 hover:from-emerald-300 hover:to-teal-200 text-black font-bold text-xs sm:text-sm uppercase tracking-wider shadow-[0_0_32px_rgba(52,211,153,0.5)] hover:shadow-[0_0_48px_rgba(52,211,153,0.75)] hover:scale-105 active:scale-95 transition-all duration-300"
                      >
                        Register Now
                        <ExternalLink className="w-4 h-4 transition-transform duration-300 group-hover:rotate-45" />
                      </a>
                      <a
                        href="/events"
                        className="inline-flex items-center gap-1.5 px-5 py-2.5 sm:px-6 sm:py-3.5 rounded-full bg-white/5 hover:bg-white/10 border border-white/15 text-white font-semibold text-xs sm:text-sm hover:border-white/30 hover:-translate-y-0.5 active:translate-y-0 transition-all duration-300"
                      >
                        See More Events
                        <ArrowRight className="w-4 h-4 transition-transform duration-300 hover:translate-x-1" />
                      </a>
                    </div>

                    {/* Stat strip */}
                    <div className="mt-3 w-full max-w-md grid grid-cols-3 divide-x divide-white/10 rounded-full border border-white/10 bg-black/40 backdrop-blur-sm overflow-hidden">
                      <div className="group/stat flex flex-col items-center gap-1 py-2 transition-colors duration-300 hover:bg-emerald-400/10 cursor-default">
                        <Users className="w-4 h-4 text-emerald-400 transition-transform duration-300 group-hover/stat:scale-125" />
                        <span className="text-[10px] font-mono text-emerald-300 font-bold uppercase tracking-wider">Free Entry</span>
                      </div>
                      <div className="group/stat flex flex-col items-center gap-1 py-2 transition-colors duration-300 hover:bg-emerald-400/10 cursor-default">
                        <Trophy className="w-4 h-4 text-amber-400 transition-transform duration-300 group-hover/stat:scale-125" />
                        <span className="text-[10px] font-mono text-amber-300 font-bold uppercase tracking-wider">Prizes</span>
                      </div>
                      <div className="group/stat flex flex-col items-center gap-1 py-2 transition-colors duration-300 hover:bg-emerald-400/10 cursor-default">
                        <ShieldCheck className="w-4 h-4 text-cyan-400 transition-transform duration-300 group-hover/stat:scale-125" />
                        <span className="text-[10px] font-mono text-cyan-300 font-bold uppercase tracking-wider">Certified</span>
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
    </section>
  );
}
