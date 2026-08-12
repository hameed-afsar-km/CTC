"use client";

import { useEffect, useRef, useState } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { ScrollToPlugin } from "gsap/ScrollToPlugin";
import { ChevronLeft, ChevronRight, Sparkles } from "lucide-react";
import { DitheringShader } from "@/components/ui/dithering-shader";
import { useSmoothScroll } from "@/components/SmoothScroll";

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
  { id: 1, name: "Dr. Karthikeyan Ramalingam", role: "Dean of Student Affairs", designation: "DEAN", bio: "Guiding CTC with academic leadership and a student-first vision — mentoring the core team and championing innovation across campus.", image: "/assets/Dr. Karthikeyan Ramalingam DEAN - Student Affairs.png" },
  { id: 2, name: "Dr. Aisha Banu", role: "Head of Department, CSE", designation: "HOD", bio: "Driving excellence in Computer Science education and steering the club's technical initiatives with passion, rigour, and precision.", image: "/assets/Dr. Aisha Banu HOD - CSE.png" },
  { id: 3, name: "Hameed Afsar KM", role: "Chief Executive Officer", designation: "CEO", bio: "Leading CTC's vision and strategy — connecting members with opportunities and steering every initiative toward real impact.", image: "/assets/Hameed Afsar KM CEO.png" },
  { id: 4, name: "Mehar Basha N", role: "Chief Operating Officer", designation: "COO", bio: "Keeping the club's engine running — operations, planning, and execution that make every event and program seamless.", image: "/assets/Mehar Basha N COO.png" },
  { id: 5, name: "Merfin Hanson", role: "Chief Technology Officer", designation: "CTO", bio: "Architecting the club's technical backbone, mentoring developers, and turning ambitious ideas into shipped products.", image: "/assets/Merfin Hanson CTO.png" },
  { id: 6, name: "Your Name Could Be Here", role: "Chief Marketing Officer", designation: "CMO", bio: "This seat is open — a visionary marketer could shape how CTC is seen, heard, and remembered.", image: "" },
  { id: 7, name: "Your Name Could Be Here", role: "Chief Financial Officer", designation: "CFO", bio: "This seat is open — a strategic mind could steward the resources that fuel every CTC ambition.", image: "" },
  { id: 8, name: "Your Name Could Be Here", role: "Chief Creative Officer", designation: "CCO", bio: "This seat is open — a bold creative could design the experiences the whole club is known for.", image: "" },
  { id: 9, name: "Your Name Could Be Here", role: "Chief Human Resources Officer", designation: "CHRO", bio: "This seat is open — a people-first leader could grow the community that makes CTC thrive.", image: "" },
  { id: 10, name: "Your Name Could Be Here", role: "Chief Strategy Officer", designation: "CSO", bio: "This seat is open — a long-term thinker could chart the roadmap for everything CTC does next.", image: "" },
];

const teaserWords = ["MEET THE", "MINDS", "BEHIND", "CTC"];
const memberStart = 1.65;
const memberTransitionDuration = 1.05;
const totalDuration = memberStart + (teamMembers.length - 1) * memberTransitionDuration;
const introScrollLength = 45;
const memberScrollLength = 38;

// Mirrors the `md:` Tailwind breakpoint. Used to skip the WebGL shader on
// Android/mobile, where it is the single biggest GPU/memory consumer.
function useIsMobile() {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 767px)");
    const t = window.setTimeout(() => setIsMobile(mq.matches), 0);
    const onChange = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mq.addEventListener("change", onChange);
    return () => {
      window.clearTimeout(t);
      mq.removeEventListener("change", onChange);
    };
  }, []);

  return isMobile;
}

// Lightweight CSS-only animated background for the team section on Android.
// Pure transform/opacity keyframe animations (no WebGL, no canvas, no filter
// blur) so it stays cheap on low-end devices while the heavier DitheringShader
// is desktop-only. Glows are pre-blurred radial gradients instead of blurred
// solid layers — visually similar but far cheaper to composite.
function MobileAuroraBackground() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden contain-paint" aria-hidden="true">
      {/* Base gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#0d2b1d] via-[#081a12] to-[#123629]" />

      {/* Slow drifting glow blobs — pre-blurred radial gradients, small layers */}
      <div
        className="animate-aurora-blob absolute -left-20 -top-20 h-64 w-64 will-change-transform"
        style={{ background: "radial-gradient(circle, rgba(52,211,153,0.26) 0%, rgba(52,211,153,0.1) 45%, transparent 70%)" }}
      />
      <div
        className="animate-aurora-blob animation-delay-4000 absolute -right-16 top-1/3 h-56 w-56 will-change-transform"
        style={{ background: "radial-gradient(circle, rgba(45,212,191,0.2) 0%, rgba(45,212,191,0.08) 45%, transparent 70%)" }}
      />
      <div
        className="animate-aurora-blob animation-delay-6000 absolute -bottom-16 left-1/4 h-60 w-60 will-change-transform"
        style={{ background: "radial-gradient(circle, rgba(163,230,53,0.14) 0%, rgba(163,230,53,0.06) 45%, transparent 70%)" }}
      />
    </div>
  );
}

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

// Card rendered for open roles (CMO, CFO, CCO, CHRO, CSO) where there is no
// member yet. Shows the role and a shimmering "Your Name Could Be Here" text
// with a CTA to the join page.
function PlaceholderMemberCard({ member }: { member: TeamMember }) {
  return (
    <article className="group relative mx-auto h-full w-[calc(100%-10px)] overflow-hidden rounded-[2rem] sm:rounded-[2.5rem] bg-[#f2f7f4] p-2.5 sm:p-5 shadow-[0_20px_60px_rgba(15,45,30,0.06)] border border-emerald-900/5 sm:w-full">
      {/* --------------------------------------------------------------- */}
      {/* MOBILE VIEW (< md)                                              */}
      {/* --------------------------------------------------------------- */}
      <div className="flex h-full min-h-0 flex-col items-center justify-between gap-2 overflow-hidden md:hidden">
        {/* Top: Placeholder "image" block */}
        <div className="relative flex-1 min-h-0 w-full">
          <div className="relative mx-auto aspect-[3/4] h-full max-w-full overflow-hidden rounded-[1.5rem] sm:rounded-[1.75rem] bg-emerald-950 shadow-[0_10px_25px_rgba(15,45,30,0.15)] border-2 border-white/80">
            <div className="absolute inset-0 animate-aurora-blob" style={{ background: "radial-gradient(circle at 30% 25%, rgba(52,211,153,0.35), transparent 55%)" }} />
            <div className="absolute inset-0 animate-aurora-blob animation-delay-4000" style={{ background: "radial-gradient(circle at 75% 70%, rgba(45,212,191,0.3), transparent 55%)" }} />
            <div className="absolute inset-0 opacity-60 [background-image:linear-gradient(rgba(134,239,172,0.12)_1px,transparent_1px),linear-gradient(90deg,rgba(134,239,172,0.12)_1px,transparent_1px)] [background-size:28px_28px]" />
            <div className="relative flex h-full w-full flex-col items-center justify-center gap-3 px-4 text-center">
              <span className="font-mono text-[10px] font-black uppercase tracking-[0.3em] text-emerald-300/90">{member.role}</span>
              <span className="text-shine font-syne text-6xl min-[400px]:text-7xl font-black leading-none tracking-tight">{member.designation}</span>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-300/40 bg-emerald-300/10 px-3 py-1 font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-emerald-200">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-300 animate-pulse" />
                Open Role
              </span>
            </div>
          </div>
        </div>

        {/* Middle: Shimmer name */}
        <div className="flex flex-col items-center text-center gap-1 px-2">
          <h3 className="text-shine font-syne text-2xl min-[400px]:text-3xl font-black leading-tight tracking-tight">
            {member.name}
          </h3>
          <span className="font-mono text-[10px] min-[400px]:text-[11px] font-black uppercase tracking-[0.2em] text-emerald-900/60">
            {member.designation} · Open for applications
          </span>
        </div>

        {/* Bottom: Bio & CTA */}
        <div className="flex w-full flex-col items-center gap-3 rounded-[1.25rem] bg-white/90 p-3 shadow-sm border border-slate-200/60 backdrop-blur-sm">
          <p className="text-center text-[11px] min-[400px]:text-xs font-medium leading-relaxed text-emerald-950/80">
            {member.bio}
          </p>
          <a href="/join" data-mac-ui className="inline-flex items-center gap-2 rounded-full bg-emerald-900 px-4 py-2 font-mono text-[10px] font-black uppercase tracking-[0.18em] text-emerald-50 transition active:scale-95 hover:bg-emerald-800">
            Claim this seat
            <Sparkles className="h-3 w-3" />
          </a>
        </div>
      </div>

      {/* --------------------------------------------------------------- */}
      {/* DESKTOP BENTO VIEW (md+)                                        */}
      {/* --------------------------------------------------------------- */}
      <div className="hidden md:grid h-full md:grid-cols-12 md:grid-rows-2 md:gap-4">
        {/* BENTO BLOCK 1: Placeholder "image" */}
        <div className="relative md:col-span-5 md:row-span-2 overflow-hidden rounded-[2rem] bg-emerald-950 flex items-center justify-center">
          <div className="absolute inset-0 animate-aurora-blob" style={{ background: "radial-gradient(circle at 30% 25%, rgba(52,211,153,0.35), transparent 55%)" }} />
          <div className="absolute inset-0 animate-aurora-blob animation-delay-4000" style={{ background: "radial-gradient(circle at 75% 70%, rgba(45,212,191,0.3), transparent 55%)" }} />
          <div className="absolute inset-0 opacity-60 [background-image:linear-gradient(rgba(134,239,172,0.12)_1px,transparent_1px),linear-gradient(90deg,rgba(134,239,172,0.12)_1px,transparent_1px)] [background-size:28px_28px]" />
          <div className="relative flex flex-col items-center gap-3 px-8 text-center">
            <span className="font-mono text-[10px] font-black uppercase tracking-[0.3em] text-emerald-300/90">{member.role}</span>
            <span className="text-shine font-syne text-7xl lg:text-8xl font-black leading-none tracking-tight">{member.designation}</span>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-300/40 bg-emerald-300/10 px-3 py-1 font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-emerald-200">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-300 animate-pulse" />
              Open Role
            </span>
          </div>
        </div>

        {/* BENTO BLOCK 2: Shimmer name */}
        <div className="relative flex flex-col justify-center rounded-[2rem] bg-white p-6 sm:p-8 md:col-span-7 md:row-span-1 shadow-sm border border-slate-100">
          <div className="flex flex-col gap-4">
            <div>
              <span className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-700/30 bg-transparent px-4 py-2 font-mono text-[10px] font-black uppercase tracking-[0.2em] text-emerald-800">
                <Sparkles className="h-3 w-3 text-emerald-500" />
                {member.role}
              </span>
            </div>

            <div>
              <h3 className="text-shine font-syne text-4xl font-black leading-none tracking-tight sm:text-5xl">
                {member.name}
              </h3>
              <span className="mt-4 inline-block font-mono text-sm font-black uppercase tracking-[0.25em] text-emerald-900/60">
                {member.designation} · Open for applications
              </span>
            </div>
          </div>
        </div>

        {/* BENTO BLOCK 3: Description & CTA */}
        <div className="relative flex flex-col justify-between rounded-[2rem] bg-emerald-900/5 p-6 sm:p-8 md:col-span-7 md:row-span-1 border border-emerald-900/5">
          <div className="max-w-xl">
            <p className="text-sm font-medium leading-relaxed text-emerald-950/80 sm:text-base lg:text-lg">
              {member.bio}
            </p>
          </div>

          <div className="mt-8">
            <a href="/join" data-mac-ui className="inline-flex items-center gap-2 rounded-full bg-emerald-900 px-5 py-3 font-mono text-xs font-black uppercase tracking-[0.18em] text-emerald-50 transition hover:-translate-y-1 hover:bg-emerald-800 hover:shadow-md">
              Claim this seat
              <Sparkles className="h-4 w-4" />
            </a>
          </div>
        </div>
      </div>
    </article>
  );
}

function MemberCard({ member }: { member: TeamMember }) {
  if (!member.image) {
    return <PlaceholderMemberCard member={member} />;
  }

  const isLongName = member.name.length > 22;
  const nameSize = isLongName
    ? "text-3xl sm:text-4xl lg:text-5xl"
    : "text-4xl sm:text-5xl lg:text-6xl";

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
      <div className="flex h-full min-h-0 flex-col items-center justify-between gap-2 overflow-hidden md:hidden">
        {/* Top: Hero 3:4 Image Card */}
        <div className="relative flex-1 min-h-0 w-full">
          <div className="relative mx-auto aspect-[3/4] h-full max-w-full overflow-hidden rounded-[1.5rem] sm:rounded-[1.75rem] bg-emerald-950 shadow-[0_10px_25px_rgba(15,45,30,0.15)] border-2 border-white/80">
            <img
              src={member.image}
              alt={member.name}
              loading="lazy"
              decoding="async"
              className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-900/80 via-transparent to-transparent opacity-80" />
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

          <h3 className={`font-syne ${isLongName ? "text-lg min-[400px]:text-xl" : "text-xl min-[400px]:text-2xl"} font-black leading-tight tracking-tight text-slate-900`}>
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
                data-mac-ui
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
              <h3 className={`font-syne ${nameSize} font-black leading-none tracking-tight text-slate-900`}>
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
                data-mac-ui
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
  const isMobile = useIsMobile();
  const lenis = useSmoothScroll();
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

      const mm = gsap.matchMedia();

      // Desktop: pinned full-screen clip-path wipe (unchanged).
      mm.add("(min-width: 768px)", () => {
        const timeline = gsap.timeline({
          scrollTrigger: {
            id: "faculty-showcase",
            trigger: showcaseRef.current,
            start: "top top",
            end: `+=${introScrollLength + (totalSlides - 1) * memberScrollLength}%`,
            pin: true,
            invalidateOnRefresh: true,
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
      });

      // Mobile/Android: pinned transform card-stack — each new card rises over
      // the previous one, which recedes into a visible deck behind it. Pure
      // transforms (no clip-path compositing) and cheap on GPU.
      mm.add("(max-width: 767px)", () => {
        // Drop the clip-path wipe entirely on mobile: clear the inline hidden
        // polygon and start non-first cards hidden by opacity instead.
        memberCardsRef.current.forEach((card, i) => {
          if (card) gsap.set(card, { clipPath: "none", opacity: i === 0 ? 1 : 0 });
        });

        const timeline = gsap.timeline({
          scrollTrigger: {
            id: "faculty-showcase",
            trigger: showcaseRef.current,
            start: "top top",
            end: `+=${introScrollLength + (totalSlides - 1) * memberScrollLength}%`,
            pin: true,
            invalidateOnRefresh: true,
            scrub: 0.8,
            onUpdate: (self) => {
              const elapsed = self.progress * currentTotalDuration;
              const index = elapsed < memberStart ? 0 : Math.min(totalSlides - 1, Math.floor((elapsed - memberStart) / memberTransitionDuration) + 1);
              setActiveIndex(index);
            },
          },
        });

        timeline.fromTo(wordsRef.current, { opacity: 0, y: 24 }, { opacity: 1, y: 0, stagger: 0.07, duration: 0.5, ease: "power3.out" }, 0);
        timeline.to(headlineRef.current, { y: -40, opacity: 0, duration: 0.4, ease: "power2.in" }, 0.6);
        timeline.to(introRef.current, { yPercent: -100, duration: 0.5, ease: "power4.inOut" }, 0.7);
        timeline.fromTo(contentRef.current, { scale: 0.94, opacity: 0.6 }, { scale: 1, opacity: 1, duration: 0.45, ease: "power2.out" }, 0.85);

        for (let index = 1; index < totalSlides; index++) {
          const card = memberCardsRef.current[index];
          if (card) {
            timeline.fromTo(
              card,
              { yPercent: 100, opacity: 0 },
              { yPercent: 0, opacity: 1, duration: memberTransitionDuration, ease: "power2.out" },
              memberStart + (index - 1) * memberTransitionDuration
            );
          }
        }
      });
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
    scrollTweenRef.current = null;

    if (lenis) {
      lenis.scrollTo(targetScroll, { duration: 0.8 });
    } else {
      scrollTweenRef.current = gsap.to(window, {
        scrollTo: targetScroll,
        duration: 0.8,
        ease: "power2.inOut",
        overwrite: "auto",
        onComplete: () => {
          scrollTweenRef.current = null;
        },
      });
    }
  };

  return (
    <div ref={showcaseRef} className="relative           flex h-screen supports-[height:100dvh]:h-[100dvh] w-full select-none flex-col justify-between overflow-hidden bg-[#081a12] px-2 py-4 text-[#eaf6ef] sm:px-6 sm:py-8 lg:px-12">
      {/* Dithering shader on desktop; lightweight animated aurora on Android. */}
      <div className="absolute inset-0">
        {isMobile ? (
          <MobileAuroraBackground />
        ) : (
          <DitheringShader fill shape="swirl" type="4x4" colorBack="#081a12" colorFront="#6ee7b7" pxSize={4} speed={0.9} pixelRatio={0.5} />
        )}
      </div>
      <div className="pointer-events-none absolute inset-0 opacity-60 [background-image:linear-gradient(rgba(134,239,172,0.08)_1px,transparent_1px),linear-gradient(90deg,rgba(134,239,172,0.08)_1px,transparent_1px)] [background-size:36px_36px]" />
      <TeamHeader title="Core Leadership" activeIndex={activeIndex} totalSlides={totalSlides} onPrevious={() => navigateToMember(activeIndex - 1)} onNext={() => navigateToMember(activeIndex + 1)} />
      
      <div ref={contentRef} className="relative z-20 mx-auto grid min-h-0 flex-1 w-full max-w-6xl grid-cols-1 md:h-[560px] md:flex-none md:my-auto lg:h-[540px]">
        {members.map((member, index) => (
          <div key={member.id} ref={(element) => { memberCardsRef.current[index] = element; }} className="col-start-1 row-start-1 h-full w-full overflow-hidden" style={{ zIndex: index + 1, clipPath: index === 0 ? "polygon(-40% -20%, 140% -20%, 140% 120%, -40% 120%)" : "polygon(140% -20%, 140% -20%, 140% 120%, 140% 120%)" }}>
            <MemberCard member={member} />
          </div>
        ))}
      </div>
      
      <ProgressDots activeIndex={activeIndex} totalSlides={totalSlides} />

      <div ref={introRef} className="pointer-events-none absolute inset-0 z-40 flex items-center justify-center bg-[#030504] px-6">
        <div ref={headlineRef} className="flex w-full max-w-5xl flex-col items-center text-center font-syne font-black uppercase leading-[0.8] tracking-[-0.07em] text-white">
          <span ref={(element) => { wordsRef.current[0] = element; }} className="text-[clamp(1.5rem,5vw,4rem)] tracking-[-0.045em] text-white">{teaserWords[0]}</span>
          <span ref={(element) => { wordsRef.current[1] = element; }} className="mt-1 text-[clamp(4.25rem,17vw,13rem)] text-transparent [-webkit-text-stroke:1px_rgba(255,255,255,1)]">{teaserWords[1]}</span>
          <span className="mt-3 flex items-baseline gap-x-3 text-[clamp(2rem,7vw,5.8rem)] sm:gap-x-5">
            <span ref={(element) => { wordsRef.current[2] = element; }} className="text-white">{teaserWords[2]}</span>
            <span ref={(element) => { wordsRef.current[3] = element; }} className="bg-gradient-to-r from-lime-300 via-emerald-300 to-teal-200 bg-clip-text text-transparent">{teaserWords[3]}</span>
          </span>
        </div>
      </div>
    </div>
  );
}

function StudentShowcase({ members }: { members: TeamMember[] }) {
  const [activeIndex, setActiveIndex] = useState(0);
  const isMobile = useIsMobile();
  const lenis = useSmoothScroll();
  const showcaseRef = useRef<HTMLDivElement>(null);
  const memberCardsRef = useRef<(HTMLDivElement | null)[]>([]);
  const scrollTweenRef = useRef<gsap.core.Tween | null>(null);

  const totalSlides = members.length;
  const currentTotalDuration = (totalSlides - 1) * memberTransitionDuration;

  useEffect(() => {
    const context = gsap.context(() => {
      if (!showcaseRef.current) return;

      const mm = gsap.matchMedia();

      // Desktop: pinned full-screen clip-path wipe (unchanged).
      mm.add("(min-width: 768px)", () => {
        const timeline = gsap.timeline({
          scrollTrigger: {
            id: "student-showcase",
            trigger: showcaseRef.current,
            start: "top top",
            end: `+=${(totalSlides - 1) * memberScrollLength}%`,
            pin: true,
            invalidateOnRefresh: true,
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
      });

      // Mobile/Android: pinned transform card-stack — each new card rises over
      // the previous one, which recedes into a visible deck behind it. Pure
      // transforms (no clip-path compositing) and cheap on GPU.
      mm.add("(max-width: 767px)", () => {
        // Drop the clip-path wipe entirely on mobile: clear the inline hidden
        // polygon and start non-first cards hidden by opacity instead.
        memberCardsRef.current.forEach((card, i) => {
          if (card) gsap.set(card, { clipPath: "none", opacity: i === 0 ? 1 : 0 });
        });

        const timeline = gsap.timeline({
          scrollTrigger: {
            id: "student-showcase",
            trigger: showcaseRef.current,
            start: "top top",
            end: `+=${(totalSlides - 1) * memberScrollLength}%`,
            pin: true,
            invalidateOnRefresh: true,
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
              { yPercent: 100, opacity: 0 },
              { yPercent: 0, opacity: 1, duration: memberTransitionDuration, ease: "power2.out" },
              (index - 1) * memberTransitionDuration
            );
          }
        }
      });
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
    scrollTweenRef.current = null;

    if (lenis) {
      lenis.scrollTo(targetScroll, { duration: 0.8 });
    } else {
      scrollTweenRef.current = gsap.to(window, {
        scrollTo: targetScroll,
        duration: 0.8,
        ease: "power2.inOut",
        overwrite: "auto",
        onComplete: () => {
          scrollTweenRef.current = null;
        },
      });
    }
  };

  return (
    <div ref={showcaseRef} className="relative           flex h-screen supports-[height:100dvh]:h-[100dvh] w-full select-none flex-col justify-between overflow-hidden bg-[#081a12] px-2 py-4 text-[#eaf6ef] sm:px-6 sm:py-8 lg:px-12">
      {/* Dithering shader on desktop; lightweight animated aurora on Android. */}
      <div className="absolute inset-0">
        {isMobile ? (
          <MobileAuroraBackground />
        ) : (
          <DitheringShader fill shape="swirl" type="4x4" colorBack="#081a12" colorFront="#6ee7b7" pxSize={4} speed={0.9} pixelRatio={0.5} />
        )}
      </div>
      <div className="pointer-events-none absolute inset-0 opacity-60 [background-image:linear-gradient(rgba(134,239,172,0.08)_1px,transparent_1px),linear-gradient(90deg,rgba(134,239,172,0.08)_1px,transparent_1px)] [background-size:36px_36px]" />
      <TeamHeader title="Student Presidents" activeIndex={activeIndex} totalSlides={totalSlides} onPrevious={() => navigateToMember(activeIndex - 1)} onNext={() => navigateToMember(activeIndex + 1)} />
      
      <div className="relative z-20 mx-auto grid min-h-0 flex-1 w-full max-w-6xl grid-cols-1 md:h-[560px] md:flex-none md:my-auto lg:h-[540px]">
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
    <section id="team" className="relative z-50 w-full bg-[#081a12]" data-section-theme="dark">
      <FacultyShowcase members={facultyMembers} />
      {/* Spacer or visual break can go here if needed, but keeping it seamless looks great */}
      <StudentShowcase members={studentMembers} />
    </section>
  );
}
