"use client";

import { useEffect, useRef, useState } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { ScrollToPlugin } from "gsap/ScrollToPlugin";
import { ChevronLeft, ChevronRight, Sparkles } from "lucide-react";
import { DitheringShader } from "@/components/ui/dithering-shader";

gsap.registerPlugin(ScrollTrigger, ScrollToPlugin);

interface TeamMember {
  id: number;
  name: string;
  role: string;
  designation?: string;
  bio: string;
  image: string;
  email?: string;
  github?: string;
  linkedin?: string;
  twitter?: string;
}

const teamMembers: TeamMember[] = [
  { id: 1, name: "Alex Vance", role: "Club President", designation: "HOD CSE Department", bio: "Pioneering community growth, strategic vision, and technical excellence across all club initiatives.", image: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=800", email: "alex.vance@ctc.club", github: "https://github.com", linkedin: "https://linkedin.com", twitter: "https://twitter.com" },
  { id: 2, name: "Sarah Chen", role: "Vice President", designation: "Dean Student Affairs", bio: "Overseeing operations, inter-departmental synergy, and scaling technical workshop programs.", image: "https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&q=80&w=800", email: "sarah.chen@ctc.club", github: "https://github.com", linkedin: "https://linkedin.com" },
  { id: 3, name: "Marcus Brody", role: "Head of Web Dev", bio: "Architecting web platforms, modern UI systems, and guiding members through frontend mastery.", image: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=800", email: "marcus.brody@ctc.club", github: "https://github.com", twitter: "https://twitter.com" },
  { id: 4, name: "Elena Rostova", role: "Head of AI & ML", bio: "Leading deep learning research, intelligent automation projects, and AI hackathon tracks.", image: "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&q=80&w=800", email: "elena.rostova@ctc.club", linkedin: "https://linkedin.com" },
  { id: 5, name: "David Kim", role: "Head of UI/UX Design", bio: "Designing slick user experiences, modern visual identities, and interactive motion systems.", image: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&q=80&w=800", email: "david.kim@ctc.club", twitter: "https://twitter.com" },
  { id: 6, name: "Priya Sharma", role: "Secretary General", bio: "Managing club logistics, official communications, and external partnerships with industry leaders.", image: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80&w=800", email: "priya.sharma@ctc.club", linkedin: "https://linkedin.com" },
  { id: 7, name: "Lucas Thorne", role: "Competitive Prog Lead", bio: "Mentoring students in algorithmic problem solving, data structures, and ICPC competitions.", image: "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&q=80&w=800", email: "lucas.thorne@ctc.club", github: "https://github.com" },
  { id: 8, name: "Aria Sterling", role: "Events Director", bio: "Orchestrating flagship hackathons, tech symposiums, and seamless event experiences.", image: "https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?auto=format&fit=crop&q=80&w=800", email: "aria.sterling@ctc.club", linkedin: "https://linkedin.com" },
  { id: 9, name: "Julian Rivera", role: "Public Relations Head", bio: "Building brand awareness, media outreach, and connecting members with global tech ecosystems.", image: "https://images.unsplash.com/photo-1501196354995-cbb51c65aaea?auto=format&fit=crop&q=80&w=800", email: "julian.rivera@ctc.club", twitter: "https://twitter.com" },
  { id: 10, name: "Nadia Patel", role: "Head of Logistics", bio: "Sourcing resources, venue management, and ensuring flawless execution for every club event.", image: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&q=80&w=800", email: "nadia.patel@ctc.club", linkedin: "https://linkedin.com" },
];

const teaserWords = ["MEET THE", "MINDS", "BEHIND", "CTC"];
const memberStart = 1.65;
const memberTransitionDuration = 1.05;
const totalDuration = memberStart + (teamMembers.length - 1) * memberTransitionDuration;
const introScrollLength = 45;
const memberScrollLength = 38;

function TeamHeader({
  title = "",
  activeIndex,
  totalSlides,
  onPrevious,
  onNext,
}: {
  title?: string;
  activeIndex: number;
  totalSlides: number;
  onPrevious?: () => void;
  onNext?: () => void;
}) {
  return (
    <div className="relative z-30 mx-auto mt-24 flex w-full max-w-6xl items-center justify-between sm:mt-6 lg:mt-20">
      <div className="inline-flex items-center gap-2 rounded-full border border-[#1d4f3a]/15 bg-[#c9e6d2] px-3.5 py-1.5 font-mono text-[10px] font-bold uppercase tracking-[0.18em] text-[#174630] sm:text-xs">
        <Sparkles className="h-3.5 w-3.5 text-[#28704d]" />
        {title && <span>{title}</span>}
      </div>
      <div className="flex items-center gap-3">
        <span className="inline-flex items-center gap-1 rounded-full border border-white/20 bg-black/30 px-3 py-1.5 font-mono text-xs font-bold tracking-[0.18em] text-white sm:text-sm">
          {String(activeIndex + 1).padStart(2, "0")} <span className="text-emerald-300">/</span> {String(totalSlides).padStart(2, "0")}
        </span>
        {onPrevious && onNext && (
          <div className="flex items-center gap-1 border-l border-white/15 pl-3">
            <button type="button" aria-label="Previous team member" onClick={onPrevious} disabled={activeIndex === 0} className="grid h-8 w-8 place-items-center rounded-full bg-white text-emerald-700 shadow-lg shadow-black/25 transition hover:bg-emerald-100 hover:text-emerald-800 disabled:pointer-events-none disabled:opacity-40">
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button type="button" aria-label="Next team member" onClick={onNext} disabled={activeIndex === totalSlides - 1} className="grid h-8 w-8 place-items-center rounded-full bg-white text-emerald-700 shadow-lg shadow-black/25 transition hover:bg-emerald-100 hover:text-emerald-800 disabled:pointer-events-none disabled:opacity-40">
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function ProgressDots({ activeIndex, totalSlides }: { activeIndex: number; totalSlides: number }) {
  return (
    <div className="relative z-30 mx-auto flex w-full max-w-6xl items-center justify-center gap-1.5 pb-1">
      {Array.from({ length: totalSlides }).map((_, index) => (
        <span key={index} className={`h-1 rounded-full transition-all duration-500 ${index === activeIndex ? "w-7 bg-[#6ee7b7]" : "w-2 bg-white/20"}`} />
      ))}
    </div>
  );
}

function MemberCard({ member }: { member: TeamMember }) {
  const socialLinks = [
    member.github && { label: "GitHub", href: member.github },
    member.linkedin && { label: "LinkedIn", href: member.linkedin },
    member.twitter && { label: "X", href: member.twitter },
  ].filter((link): link is { label: string; href: string } => Boolean(link));

  return (
    <article className="group relative mx-auto h-full w-[calc(100%-10px)] overflow-hidden rounded-[2rem] sm:rounded-[2.5rem] bg-[#f2f7f4] p-2.5 sm:p-5 shadow-[0_20px_60px_rgba(15,45,30,0.06)] border border-emerald-900/5 sm:w-full">
      {/* --------------------------------------------------------------- */}
      {/* MOBILE / ANDROID EXCLUSIVE VIEW (< md)                          */}
      {/* --------------------------------------------------------------- */}
      <div className="flex h-full flex-col items-center justify-between gap-2 overflow-y-auto md:hidden">
        {/* Top: Hero 3:4 Image Card */}
        <div className="relative flex-shrink-0 w-[94%] min-[400px]:w-[86%] sm:w-[270px]">
          <div className="relative aspect-[3/4] w-full overflow-hidden rounded-[1.5rem] sm:rounded-[1.75rem] bg-emerald-950 shadow-[0_10px_25px_rgba(15,45,30,0.15)] border-2 border-white/80">
            <img
              src={member.image}
              alt={member.name}
              loading="lazy"
              decoding="async"
              className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-900/80 via-transparent to-transparent opacity-80" />
            
            {/* Watermark Badge */}
            <div className="absolute left-2.5 top-2.5 flex items-center gap-1.5 rounded-full bg-black/40 px-2.5 py-1 font-mono text-[9px] font-bold uppercase tracking-widest text-white backdrop-blur-md border border-white/15">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_8px_#34d399]" />
              No. {String(member.id).padStart(2, "0")}
            </div>
          </div>
        </div>

        {/* Middle: Role Badge & Member Name */}
        <div className="flex flex-col items-center text-center gap-1 px-2">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-700/30 bg-transparent px-3 py-0.5 font-mono text-[9px] min-[400px]:text-[10px] font-black uppercase tracking-widest text-emerald-900">
            <svg className="h-2.5 w-2.5 text-emerald-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            {member.role}
          </span>

          <h3 className="font-syne text-xl min-[400px]:text-2xl font-black leading-tight tracking-tight text-slate-900">
            {member.name}
          </h3>

          {member.designation && (
            <span className="bg-gradient-to-r from-lime-600 via-emerald-600 to-teal-500 bg-clip-text font-mono text-[10px] min-[400px]:text-[11px] font-black uppercase tracking-[0.2em] text-transparent">
              {member.designation}
            </span>
          )}
        </div>

        {/* Bottom: Glass Bio Card & Social Bar */}
        <div className="flex w-full flex-col items-center gap-2 rounded-[1.25rem] bg-white/90 p-3 shadow-sm border border-slate-200/60 backdrop-blur-sm">
          <p className="text-center text-[11px] min-[400px]:text-xs font-medium leading-relaxed text-emerald-950/80 line-clamp-3">
            {member.bio}
          </p>

          {/* Social Links Bar */}
          <div className="flex items-center gap-2 pt-0.5">
            {socialLinks.map((link) => (
              <a
                key={link.label}
                href={link.href}
                target="_blank"
                rel="noreferrer"
                className="inline-flex h-8 w-8 min-[400px]:h-8.5 min-[400px]:w-8.5 items-center justify-center rounded-xl border border-emerald-900/10 bg-emerald-50/60 text-emerald-800 transition-all active:scale-95 hover:bg-emerald-100 hover:text-emerald-900"
                title={link.label}
              >
                {link.label === "LinkedIn" && (
                  <svg className="h-3.5 w-3.5 fill-current" viewBox="0 0 24 24">
                    <path d="M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14m-.5 15.5v-5.3a3.26 3.26 0 0 0-3.26-3.26c-.85 0-1.84.52-2.28 1.3v-1.11h-2.79v8.37h2.79v-4.93c0-.77.62-1.4 1.39-1.4a1.4 1.4 0 0 1 1.4 1.4v4.93h2.75M6.46 10.9v8.37H9.25V10.9H6.46M7.86 6.74a1.6 1.6 0 1 0 0 3.2 1.6 1.6 0 0 0 0-3.2z" />
                  </svg>
                )}
                {link.label === "X" && (
                  <svg className="h-3 w-3 fill-current" viewBox="0 0 24 24">
                    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                  </svg>
                )}
                {link.label === "GitHub" && (
                  <svg className="h-3.5 w-3.5 fill-current" viewBox="0 0 24 24">
                    <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
                  </svg>
                )}
              </a>
            ))}
          </div>
        </div>
      </div>

      {/* --------------------------------------------------------------- */}
      {/* DESKTOP BENTO GRID VIEW (md+)                                    */}
      {/* --------------------------------------------------------------- */}
      <div className="hidden md:grid h-full md:grid-cols-12 md:grid-rows-2 md:gap-4">
        {/* BENTO BLOCK 1: IMAGE (Spans both rows on desktop) */}
        <div className="relative md:col-span-5 md:row-span-2 overflow-hidden rounded-[2rem] bg-emerald-950 flex items-center justify-center">
          <div className="relative aspect-[3/4] w-full h-full max-h-full max-w-full overflow-hidden rounded-[2rem]">
            <img
              src={member.image}
              alt={member.name}
              loading="lazy"
              decoding="async"
              className="h-full w-full object-cover transition-transform duration-1000 ease-[0.22,1,0.36,1] group-hover:scale-110"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-900/80 via-transparent to-transparent opacity-90 mix-blend-multiply" />
            
            <div className="absolute left-4 top-4 flex items-center gap-2 rounded-full bg-white/20 px-3.5 py-1.5 font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-white backdrop-blur-md border border-white/10">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_8px_#34d399]" />
              No. {String(member.id).padStart(2, "0")}
            </div>
          </div>
        </div>

        {/* BENTO BLOCK 2: HEADER (Name & Role) */}
        <div className="relative flex flex-col justify-center rounded-[2rem] bg-white p-6 sm:p-8 md:col-span-7 md:row-span-1 shadow-sm border border-slate-100">
          <div className="flex flex-col gap-4">
            <div>
              <span className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-700/30 bg-transparent px-4 py-2 font-mono text-[10px] font-black uppercase tracking-[0.2em] text-emerald-800">
                <svg className="h-3 w-3 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                {member.role}
              </span>
            </div>

            <div>
              <h3 className="font-syne text-4xl font-black leading-none tracking-tight text-slate-900 sm:text-5xl lg:text-6xl">
                {member.name}
              </h3>

              {member.designation && (
                <span className="mt-4 inline-block bg-gradient-to-r from-lime-600 via-emerald-600 to-teal-500 bg-clip-text font-mono text-sm font-black uppercase tracking-[0.25em] text-transparent">
                  {member.designation}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* BENTO BLOCK 3: DESCRIPTION & CTA */}
        <div className="relative flex flex-col justify-between rounded-[2rem] bg-emerald-900/5 p-6 sm:p-8 md:col-span-7 md:row-span-1 border border-emerald-900/5">
          <div className="max-w-xl">
            <p className="text-sm font-medium leading-relaxed text-emerald-950/80 sm:text-base lg:text-lg">
              {member.bio}
            </p>
          </div>

          <div className="mt-8 flex items-center gap-2">
            {socialLinks.map((link) => (
              <a
                key={link.label}
                href={link.href}
                target="_blank"
                rel="noreferrer"
                className="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-emerald-900/10 bg-white text-emerald-900/60 transition-all hover:-translate-y-1 hover:border-emerald-900/20 hover:text-emerald-700 hover:shadow-md"
                title={link.label}
              >
                {link.label === "LinkedIn" && (
                  <svg className="h-5 w-5 fill-current" viewBox="0 0 24 24">
                    <path d="M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14m-.5 15.5v-5.3a3.26 3.26 0 0 0-3.26-3.26c-.85 0-1.84.52-2.28 1.3v-1.11h-2.79v8.37h2.79v-4.93c0-.77.62-1.4 1.39-1.4a1.4 1.4 0 0 1 1.4 1.4v4.93h2.75M6.46 10.9v8.37H9.25V10.9H6.46M7.86 6.74a1.6 1.6 0 1 0 0 3.2 1.6 1.6 0 0 0 0-3.2z" />
                  </svg>
                )}
                {link.label === "X" && (
                  <svg className="h-4 w-4 fill-current" viewBox="0 0 24 24">
                    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                  </svg>
                )}
                {link.label === "GitHub" && (
                  <svg className="h-5 w-5 fill-current" viewBox="0 0 24 24">
                    <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
                  </svg>
                )}
              </a>
            ))}
          </div>
        </div>
      </div>
    </article>
  );
}

function FacultyShowcase({ members }: { members: TeamMember[] }) {
  const [activeIndex, setActiveIndex] = useState(0);
  const introRef = useRef<HTMLDivElement>(null);
  const headlineRef = useRef<HTMLDivElement>(null);
  const showcaseRef = useRef<HTMLDivElement>(null);
  const wordsRef = useRef<(HTMLSpanElement | null)[]>([]);
  const contentRef = useRef<HTMLDivElement>(null);
  const memberCardsRef = useRef<(HTMLDivElement | null)[]>([]);
  const scrollTweenRef = useRef<gsap.core.Tween | null>(null);

  const totalSlides = members.length;
  const currentTotalDuration = memberStart + (totalSlides - 1) * memberTransitionDuration;

  useEffect(() => {
    const context = gsap.context(() => {
      if (!showcaseRef.current) return;

      const timeline = gsap.timeline({
        scrollTrigger: {
          id: "faculty-showcase",
          trigger: showcaseRef.current,
          start: "top top",
          end: `+=${introScrollLength + (totalSlides - 1) * memberScrollLength}%`,
          pin: true,
          scrub: 0.8,
          onUpdate: (self) => {
            const elapsed = self.progress * currentTotalDuration;
            const index = elapsed < memberStart ? 0 : Math.min(totalSlides - 1, Math.floor((elapsed - memberStart) / memberTransitionDuration) + 1);
            setActiveIndex(index);
          },
        },
      });

      // Intro teaser words — plain opacity + translate (no blur/rotateX).
      timeline.fromTo(wordsRef.current, { opacity: 0, y: 24 }, { opacity: 1, y: 0, stagger: 0.07, duration: 0.5, ease: "power3.out" }, 0);
      timeline.to(headlineRef.current, { y: -40, opacity: 0, duration: 0.4, ease: "power2.in" }, 0.6);
      // Optimized reveal: the black panel wipes away with a pure-transform
      // curtain lift (compositor-friendly) instead of an expensive full-screen
      // clip-path circle + blur fade, then the member content scales in.
      timeline.to(introRef.current, { yPercent: -100, duration: 0.5, ease: "power4.inOut" }, 0.7);
      timeline.fromTo(contentRef.current, { scale: 0.94, opacity: 0.6 }, { scale: 1, opacity: 1, duration: 0.45, ease: "power2.out" }, 0.85);

      for (let index = 1; index < totalSlides; index++) {
        const card = memberCardsRef.current[index];
        if (card) {
          timeline.fromTo(card, { clipPath: "polygon(140% -20%, 140% -20%, 140% 120%, 140% 120%)" }, { clipPath: "polygon(-40% -20%, 140% -20%, 140% 120%, -40% 120%)", duration: memberTransitionDuration, ease: "none" }, memberStart + (index - 1) * memberTransitionDuration);
        }
      }
    }, showcaseRef);

    return () => context.revert();
  }, [totalSlides, currentTotalDuration]);

  const navigateToMember = (nextIndex: number) => {
    const index = Math.max(0, Math.min(totalSlides - 1, nextIndex));
    if (index === activeIndex) return;
    const trigger = ScrollTrigger.getById("faculty-showcase");
    if (!trigger) return;

    const timelinePoint = memberStart + Math.max(0, index - 0.1) * memberTransitionDuration;
    const targetScroll = trigger.start + ((trigger.end - trigger.start) * timelinePoint) / currentTotalDuration;
    setActiveIndex(index);

    if (scrollTweenRef.current) scrollTweenRef.current.kill();
    scrollTweenRef.current = gsap.to(window, {
      scrollTo: targetScroll,
      duration: 0.8,
      ease: "power2.inOut",
      overwrite: "auto",
      onComplete: () => {
        scrollTweenRef.current = null;
      },
    });
  };

  return (
    <div ref={showcaseRef} className="relative flex h-screen w-full select-none flex-col justify-between overflow-hidden bg-[#081a12] px-2 py-4 text-[#eaf6ef] sm:px-6 sm:py-8 lg:px-12">
      {/* Swirl Dithering Shader Background */}
      <div className="absolute inset-0">
        <DitheringShader fill shape="swirl" type="4x4" colorBack="#081a12" colorFront="#6ee7b7" pxSize={4} speed={0.9} pixelRatio={0.5} />
      </div>
      <div className="pointer-events-none absolute inset-0 opacity-60 [background-image:linear-gradient(rgba(134,239,172,0.08)_1px,transparent_1px),linear-gradient(90deg,rgba(134,239,172,0.08)_1px,transparent_1px)] [background-size:36px_36px]" />
      <TeamHeader title="Core Leadership" activeIndex={activeIndex} totalSlides={totalSlides} onPrevious={() => navigateToMember(activeIndex - 1)} onNext={() => navigateToMember(activeIndex + 1)} />
      
      <div ref={contentRef} className="relative z-20 mx-auto my-auto grid w-full max-w-6xl grid-cols-1 md:h-[560px] lg:h-[540px]">
        {members.map((member, index) => (
          <div key={member.id} ref={(element) => { memberCardsRef.current[index] = element; }} className="col-start-1 row-start-1 h-full w-full overflow-hidden" style={{ zIndex: index + 1, clipPath: index === 0 ? "polygon(-40% -20%, 140% -20%, 140% 120%, -40% 120%)" : "polygon(140% -20%, 140% -20%, 140% 120%, 140% 120%)" }}>
            <MemberCard member={member} />
          </div>
        ))}
      </div>
      
      <ProgressDots activeIndex={activeIndex} totalSlides={totalSlides} />

      <div ref={introRef} className="pointer-events-none absolute inset-0 z-40 flex items-center justify-center bg-[#030504] px-6">
        <div ref={headlineRef} className="flex w-full max-w-5xl flex-col items-center text-center font-syne font-black uppercase leading-[0.8] tracking-[-0.07em] text-white">
          <span ref={(element) => { wordsRef.current[0] = element; }} className="text-[clamp(1.5rem,5vw,4rem)] tracking-[-0.045em] text-white/75">{teaserWords[0]}</span>
          <span ref={(element) => { wordsRef.current[1] = element; }} className="mt-1 text-[clamp(4.25rem,17vw,13rem)] text-transparent [-webkit-text-stroke:1px_rgba(255,255,255,0.8)]">{teaserWords[1]}</span>
          <span className="mt-3 flex items-baseline gap-x-3 text-[clamp(2rem,7vw,5.8rem)] sm:gap-x-5">
            <span ref={(element) => { wordsRef.current[2] = element; }} className="text-white/75">{teaserWords[2]}</span>
            <span ref={(element) => { wordsRef.current[3] = element; }} className="bg-gradient-to-r from-lime-300 via-emerald-300 to-teal-200 bg-clip-text text-transparent">{teaserWords[3]}</span>
          </span>
        </div>
      </div>
    </div>
  );
}

function StudentShowcase({ members }: { members: TeamMember[] }) {
  const [activeIndex, setActiveIndex] = useState(0);
  const showcaseRef = useRef<HTMLDivElement>(null);
  const memberCardsRef = useRef<(HTMLDivElement | null)[]>([]);
  const scrollTweenRef = useRef<gsap.core.Tween | null>(null);

  const totalSlides = members.length;
  const currentTotalDuration = (totalSlides - 1) * memberTransitionDuration;

  useEffect(() => {
    const context = gsap.context(() => {
      if (!showcaseRef.current) return;

      const timeline = gsap.timeline({
        scrollTrigger: {
          id: "student-showcase",
          trigger: showcaseRef.current,
          start: "top top",
          end: `+=${(totalSlides - 1) * memberScrollLength}%`,
          pin: true,
          scrub: 0.8,
          onUpdate: (self) => {
            const elapsed = self.progress * currentTotalDuration;
            const index = Math.min(totalSlides - 1, Math.floor(elapsed / memberTransitionDuration));
            setActiveIndex(index);
          },
        },
      });

      for (let index = 1; index < totalSlides; index++) {
        const card = memberCardsRef.current[index];
        if (card) {
          timeline.fromTo(
            card,
            { clipPath: "polygon(140% -20%, 140% -20%, 140% 120%, 140% 120%)" },
            { clipPath: "polygon(-40% -20%, 140% -20%, 140% 120%, -40% 120%)", duration: memberTransitionDuration, ease: "none" },
            (index - 1) * memberTransitionDuration
          );
        }
      }
    }, showcaseRef);

    return () => context.revert();
  }, [totalSlides, currentTotalDuration]);

  const navigateToMember = (nextIndex: number) => {
    const index = Math.max(0, Math.min(totalSlides - 1, nextIndex));
    if (index === activeIndex) return;
    const trigger = ScrollTrigger.getById("student-showcase");
    if (!trigger) return;

    const timelinePoint = index * memberTransitionDuration + 0.08;
    const targetScroll = trigger.start + ((trigger.end - trigger.start) * timelinePoint) / currentTotalDuration;
    setActiveIndex(index);

    if (scrollTweenRef.current) scrollTweenRef.current.kill();
    scrollTweenRef.current = gsap.to(window, {
      scrollTo: targetScroll,
      duration: 0.8,
      ease: "power2.inOut",
      overwrite: "auto",
      onComplete: () => {
        scrollTweenRef.current = null;
      },
    });
  };

  return (
    <div ref={showcaseRef} className="relative flex h-screen w-full select-none flex-col justify-between overflow-hidden bg-[#081a12] px-2 py-4 text-[#eaf6ef] sm:px-6 sm:py-8 lg:px-12">
      {/* Swirl Dithering Shader Background */}
      <div className="absolute inset-0">
        <DitheringShader fill shape="swirl" type="4x4" colorBack="#081a12" colorFront="#6ee7b7" pxSize={4} speed={0.9} pixelRatio={0.5} />
      </div>
      <div className="pointer-events-none absolute inset-0 opacity-60 [background-image:linear-gradient(rgba(134,239,172,0.08)_1px,transparent_1px),linear-gradient(90deg,rgba(134,239,172,0.08)_1px,transparent_1px)] [background-size:36px_36px]" />
      <TeamHeader title="Student Presidents" activeIndex={activeIndex} totalSlides={totalSlides} onPrevious={() => navigateToMember(activeIndex - 1)} onNext={() => navigateToMember(activeIndex + 1)} />
      
      <div className="relative z-20 mx-auto my-auto grid w-full max-w-6xl grid-cols-1 md:h-[560px] lg:h-[540px]">
        {members.map((member, index) => (
          <div key={member.id} ref={(element) => { memberCardsRef.current[index] = element; }} className="col-start-1 row-start-1 h-full w-full overflow-hidden" style={{ zIndex: index + 1, clipPath: index === 0 ? "polygon(-40% -20%, 140% -20%, 140% 120%, -40% 120%)" : "polygon(140% -20%, 140% -20%, 140% 120%, 140% 120%)" }}>
            <MemberCard member={member} />
          </div>
        ))}
      </div>
      
      <ProgressDots activeIndex={activeIndex} totalSlides={totalSlides} />
    </div>
  );
}

export default function TeamSection() {
  const facultyMembers = teamMembers.slice(0, 2);
  const studentMembers = teamMembers.slice(2);

  return (
    <section id="team" className="relative z-50 w-full bg-[#081a12]">
      <FacultyShowcase members={facultyMembers} />
      {/* Spacer or visual break can go here if needed, but keeping it seamless looks great */}
      <StudentShowcase members={studentMembers} />
    </section>
  );
}
