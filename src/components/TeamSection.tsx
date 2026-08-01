"use client";

import { useEffect, useRef, useState } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { ArrowUpRight, ChevronLeft, ChevronRight, Sparkles } from "lucide-react";

gsap.registerPlugin(ScrollTrigger);

interface TeamMember {
  id: number;
  name: string;
  role: string;
  bio: string;
  image: string;
  github?: string;
  linkedin?: string;
  twitter?: string;
}

const teamMembers: TeamMember[] = [
  { id: 1, name: "Alex Vance", role: "Club President", bio: "Pioneering community growth, strategic vision, and technical excellence across all club initiatives.", image: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=800", github: "https://github.com", linkedin: "https://linkedin.com", twitter: "https://twitter.com" },
  { id: 2, name: "Sarah Chen", role: "Vice President", bio: "Overseeing operations, inter-departmental synergy, and scaling technical workshop programs.", image: "https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&q=80&w=800", github: "https://github.com", linkedin: "https://linkedin.com" },
  { id: 3, name: "Marcus Brody", role: "Head of Web Dev", bio: "Architecting web platforms, modern UI systems, and guiding members through frontend mastery.", image: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=800", github: "https://github.com", twitter: "https://twitter.com" },
  { id: 4, name: "Elena Rostova", role: "Head of AI & ML", bio: "Leading deep learning research, intelligent automation projects, and AI hackathon tracks.", image: "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&q=80&w=800", linkedin: "https://linkedin.com" },
  { id: 5, name: "David Kim", role: "Head of UI/UX Design", bio: "Designing slick user experiences, modern visual identities, and interactive motion systems.", image: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&q=80&w=800", twitter: "https://twitter.com" },
  { id: 6, name: "Priya Sharma", role: "Secretary General", bio: "Managing club logistics, official communications, and external partnerships with industry leaders.", image: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80&w=800", linkedin: "https://linkedin.com" },
  { id: 7, name: "Lucas Thorne", role: "Competitive Prog Lead", bio: "Mentoring students in algorithmic problem solving, data structures, and ICPC competitions.", image: "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&q=80&w=800", github: "https://github.com" },
  { id: 8, name: "Aria Sterling", role: "Events Director", bio: "Orchestrating flagship hackathons, tech symposiums, and seamless event experiences.", image: "https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?auto=format&fit=crop&q=80&w=800", linkedin: "https://linkedin.com" },
  { id: 9, name: "Julian Rivera", role: "Public Relations Head", bio: "Building brand awareness, media outreach, and connecting members with global tech ecosystems.", image: "https://images.unsplash.com/photo-1501196354995-cbb51c65aaea?auto=format&fit=crop&q=80&w=800", twitter: "https://twitter.com" },
  { id: 10, name: "Nadia Patel", role: "Head of Logistics", bio: "Sourcing resources, venue management, and ensuring flawless execution for every club event.", image: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&q=80&w=800", linkedin: "https://linkedin.com" },
];

const teaserWords = ["MEET THE", "MINDS", "BEHIND", "CTC"];
const memberStart = 1.65;
const memberTransitionDuration = 1.05;
const totalDuration = memberStart + (teamMembers.length - 1) * memberTransitionDuration;
const introScrollLength = 45;
const memberScrollLength = 38;

function TeamHeader({
  activeIndex,
  onPrevious,
  onNext,
}: {
  activeIndex: number;
  onPrevious?: () => void;
  onNext?: () => void;
}) {
  return (
    <div className="relative z-30 mx-auto flex w-full max-w-6xl items-center justify-between">
      <div className="inline-flex items-center gap-2 rounded-full border border-[#1d4f3a]/15 bg-[#c9e6d2] px-3.5 py-1.5 font-mono text-[10px] font-bold uppercase tracking-[0.18em] text-[#174630] sm:text-xs">
        <Sparkles className="h-3.5 w-3.5 text-[#28704d]" />
        <span>Core leadership</span>
      </div>
      <div className="flex items-center gap-3">
        <span className="font-mono text-xs font-bold tracking-[0.18em] text-[#1f4937]/75 sm:text-sm">
          {String(activeIndex + 1).padStart(2, "0")} <span className="text-[#1f4937]/30">/</span> {String(teamMembers.length).padStart(2, "0")}
        </span>
        {onPrevious && onNext && (
          <div className="flex items-center gap-1 border-l border-[#1f4937]/15 pl-3">
            <button type="button" aria-label="Previous team member" onClick={onPrevious} disabled={activeIndex === 0} className="grid h-8 w-8 place-items-center rounded-full border border-[#1f4937]/15 text-[#1f4937] transition hover:border-[#1f4937] hover:bg-[#1f4937] hover:text-white disabled:pointer-events-none disabled:opacity-30">
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button type="button" aria-label="Next team member" onClick={onNext} disabled={activeIndex === teamMembers.length - 1} className="grid h-8 w-8 place-items-center rounded-full border border-[#1f4937]/15 text-[#1f4937] transition hover:border-[#1f4937] hover:bg-[#1f4937] hover:text-white disabled:pointer-events-none disabled:opacity-30">
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function ProgressDots({ activeIndex }: { activeIndex: number }) {
  return (
    <div className="relative z-30 mx-auto flex w-full max-w-6xl items-center justify-center gap-1.5 pb-1">
      {teamMembers.map((_, index) => (
        <span key={index} className={`h-1 rounded-full transition-all duration-500 ${index === activeIndex ? "w-7 bg-[#28704d]" : "w-2 bg-[#1f4937]/15"}`} />
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
    <article className="relative h-full overflow-hidden rounded-[1.5rem] border border-white/10 bg-[#10231b] shadow-[0_28px_100px_rgba(7,22,15,0.34)]">
      <div className="absolute inset-0 bg-[linear-gradient(110deg,rgba(199,231,208,0.1),transparent_40%),radial-gradient(circle_at_10%_90%,rgba(163,210,108,0.18),transparent_24%)]" />
      <div className="relative grid h-full grid-cols-1 lg:grid-cols-12">
        <div className="relative flex min-h-0 flex-col justify-between p-6 sm:p-8 lg:col-span-5 lg:p-10">
          <div>
            <div className="mb-6 flex items-center gap-3 font-mono text-[10px] font-bold uppercase tracking-[0.16em] text-emerald-100/55 sm:text-xs">
              <span>{String(member.id).padStart(2, "0")}</span><span className="h-px w-8 bg-emerald-100/25" /><span>Leadership dossier</span>
            </div>
            <h3 className="max-w-xl font-syne text-4xl font-black leading-[0.9] tracking-[-0.06em] text-[#f6f7ef] sm:text-5xl lg:text-6xl">{member.name}</h3>
            <p className="mt-5 inline-flex rounded-sm border border-lime-200/20 bg-lime-200 px-3 py-1.5 font-mono text-[10px] font-bold uppercase tracking-[0.17em] text-[#163325] sm:mt-7 sm:text-xs">{member.role}</p>
            <p className="mt-5 max-w-sm border-l-2 border-lime-200/70 pl-4 text-sm leading-relaxed text-emerald-50/65 sm:text-base">{member.bio}</p>
          </div>
          <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-white/10 pt-4 sm:mt-8 sm:pt-5">
            <span className="font-mono text-[10px] uppercase tracking-[0.17em] text-emerald-50/35">Computing Tech Club</span>
            {socialLinks.length > 0 && (
              <div className="flex items-center gap-2">
                {socialLinks.map((link) => (
                  <a key={link.label} href={link.href} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 rounded-sm border border-white/15 px-2.5 py-1.5 font-mono text-[10px] font-bold uppercase tracking-wider text-emerald-50/70 transition-colors hover:border-lime-200 hover:bg-lime-200 hover:text-[#10231b]">
                    {link.label}<ArrowUpRight className="h-3 w-3" />
                  </a>
                ))}
              </div>
            )}
          </div>
        </div>
        <div className="relative order-first min-h-[230px] overflow-hidden p-4 lg:order-last lg:col-span-7 lg:min-h-0 lg:p-7">
          <div className="absolute bottom-0 right-0 h-[72%] w-[72%] border-l border-t border-lime-200/25" />
          <div className="absolute left-7 top-7 font-mono text-[10px] font-bold tracking-[0.2em] text-[#10231b]/60">MEMBER // {String(member.id).padStart(2, "0")}</div>
          <div className="relative h-full overflow-hidden rounded-[1rem] border border-white/50 shadow-[0_22px_50px_rgba(0,0,0,0.23)]">
            <img src={member.image} alt={member.name} className="h-full w-full object-cover transition-transform duration-700 hover:scale-105" />
            <div className="absolute inset-0 bg-gradient-to-t from-[#10231b]/55 via-transparent to-transparent" />
          </div>
          <div className="absolute bottom-7 left-7 grid h-12 w-12 place-items-center rounded-sm bg-lime-200 font-mono text-xs font-bold tracking-wider text-[#10231b] shadow-lg sm:h-14 sm:w-14">{String(member.id).padStart(2, "0")}</div>
          <div className="absolute right-7 top-7 inline-flex items-center gap-2 rounded-sm border border-white/50 bg-white/80 px-3 py-1.5 font-mono text-[10px] font-bold tracking-[0.18em] text-[#10231b] backdrop-blur-md">
            <span className="h-1.5 w-1.5 rounded-full bg-[#28704d]" /> CTC
          </div>
        </div>
      </div>
    </article>
  );
}

export default function TeamSection() {
  const [activeIndex, setActiveIndex] = useState(0);
  const introRef = useRef<HTMLDivElement>(null);
  const headlineRef = useRef<HTMLDivElement>(null);
  const showcaseRef = useRef<HTMLDivElement>(null);
  const wordsRef = useRef<(HTMLSpanElement | null)[]>([]);
  const circleMaskRef = useRef<HTMLDivElement>(null);
  const memberCardsRef = useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() => {
    const context = gsap.context(() => {
      if (!showcaseRef.current) return;

      const timeline = gsap.timeline({
        scrollTrigger: {
          id: "team-showcase",
          trigger: showcaseRef.current,
          start: "top top",
          end: `+=${introScrollLength + (teamMembers.length - 1) * memberScrollLength}%`,
          pin: true,
          scrub: 0.8,
          onUpdate: (self) => {
            const elapsed = self.progress * totalDuration;
            const index = elapsed < memberStart ? 0 : Math.min(teamMembers.length - 1, Math.floor((elapsed - memberStart) / memberTransitionDuration) + 1);
            setActiveIndex(index);
          },
        },
      });

      timeline.fromTo(wordsRef.current, { opacity: 0, filter: "blur(12px)", y: 45, rotateX: -28 }, { opacity: 1, filter: "blur(0px)", y: 0, rotateX: 0, stagger: 0.08, duration: 0.58, ease: "power3.out" }, 0);
      timeline.to(headlineRef.current, { y: -56, scale: 1.06, filter: "blur(8px)", opacity: 0.2, duration: 0.55, ease: "power2.in" }, 0.7);
      timeline.fromTo(circleMaskRef.current, { clipPath: "circle(0% at 50% 50%)", opacity: 1 }, { clipPath: "circle(150% at 50% 50%)", duration: 0.65, ease: "power2.inOut" }, 0.72);
      timeline.to(introRef.current, { autoAlpha: 0, duration: 0.12, ease: "none" }, 1.3);
      timeline.to(circleMaskRef.current, { autoAlpha: 0, duration: 0.12, ease: "none" }, 1.42);

      for (let index = 1; index < teamMembers.length; index++) {
        const card = memberCardsRef.current[index];
        if (card) {
          timeline.fromTo(card, { clipPath: "polygon(140% -20%, 140% -20%, 140% 120%, 140% 120%)" }, { clipPath: "polygon(-40% -20%, 140% -20%, 140% 120%, -40% 120%)", duration: memberTransitionDuration, ease: "none" }, memberStart + (index - 1) * memberTransitionDuration);
        }
      }
    }, showcaseRef);

    return () => context.revert();
  }, []);

  const navigateToMember = (nextIndex: number) => {
    const index = Math.max(0, Math.min(teamMembers.length - 1, nextIndex));
    const trigger = ScrollTrigger.getById("team-showcase");
    if (!trigger) return;

    const timelinePoint = memberStart + Math.max(0, index - 0.1) * memberTransitionDuration;
    const targetScroll = trigger.start + ((trigger.end - trigger.start) * timelinePoint) / totalDuration;
    setActiveIndex(index);
    window.scrollTo({ top: targetScroll, behavior: "smooth" });
  };

  return (
    <section id="team" className="relative z-50 w-full bg-[#e8eee8]">
      <div ref={showcaseRef} className="relative flex h-screen w-full select-none flex-col justify-between overflow-hidden bg-[#e8eee8] px-4 py-6 text-[#153525] sm:px-6 sm:py-8 lg:px-12">
        <div className="pointer-events-none absolute inset-0 opacity-60 [background-image:linear-gradient(rgba(31,73,55,0.07)_1px,transparent_1px),linear-gradient(90deg,rgba(31,73,55,0.07)_1px,transparent_1px)] [background-size:36px_36px]" />
        <TeamHeader activeIndex={activeIndex} onPrevious={() => navigateToMember(activeIndex - 1)} onNext={() => navigateToMember(activeIndex + 1)} />
        <div className="relative z-20 mx-auto my-auto flex h-[510px] w-full max-w-6xl items-center justify-center sm:h-[530px] lg:h-[540px]">
          {teamMembers.map((member, index) => (
            <div key={member.id} ref={(element) => { memberCardsRef.current[index] = element; }} className="absolute inset-0 h-full w-full overflow-hidden" style={{ zIndex: index + 1, clipPath: index === 0 ? "polygon(-40% -20%, 140% -20%, 140% 120%, -40% 120%)" : "polygon(140% -20%, 140% -20%, 140% 120%, 140% 120%)" }}>
              <MemberCard member={member} />
            </div>
          ))}
        </div>
        <ProgressDots activeIndex={activeIndex} />

        <div ref={introRef} className="absolute inset-0 z-40 flex items-center justify-center bg-[#030504] px-6">
          <div ref={headlineRef} className="flex w-full max-w-5xl flex-col items-center text-center font-syne font-black uppercase leading-[0.8] tracking-[-0.07em] text-white">
            <span ref={(element) => { wordsRef.current[0] = element; }} className="text-[clamp(1.5rem,5vw,4rem)] tracking-[-0.045em] text-white/75">{teaserWords[0]}</span>
            <span ref={(element) => { wordsRef.current[1] = element; }} className="mt-1 text-[clamp(5.5rem,17vw,13rem)] text-transparent [-webkit-text-stroke:1px_rgba(255,255,255,0.8)]">{teaserWords[1]}</span>
            <span className="mt-3 flex items-baseline gap-x-3 text-[clamp(2rem,7vw,5.8rem)] sm:gap-x-5">
              <span ref={(element) => { wordsRef.current[2] = element; }} className="text-white/75">{teaserWords[2]}</span>
              <span ref={(element) => { wordsRef.current[3] = element; }} className="bg-gradient-to-r from-lime-300 via-emerald-300 to-teal-200 bg-clip-text text-transparent">{teaserWords[3]}</span>
            </span>
          </div>
        </div>

        <div ref={circleMaskRef} className="pointer-events-none absolute inset-0 z-50 flex flex-col justify-between bg-[#e8eee8] px-4 py-6 sm:px-6 sm:py-8 lg:px-12" style={{ clipPath: "circle(0% at 50% 50%)" }}>
          <div className="pointer-events-none absolute inset-0 opacity-60 [background-image:linear-gradient(rgba(31,73,55,0.07)_1px,transparent_1px),linear-gradient(90deg,rgba(31,73,55,0.07)_1px,transparent_1px)] [background-size:36px_36px]" />
          <TeamHeader activeIndex={0} />
          <div className="relative z-20 mx-auto my-auto h-[510px] w-full max-w-6xl sm:h-[530px] lg:h-[540px]"><MemberCard member={teamMembers[0]} /></div>
          <ProgressDots activeIndex={0} />
        </div>
      </div>
    </section>
  );
}
