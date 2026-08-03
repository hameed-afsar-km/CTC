"use client";

import { useEffect, useRef } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useInView } from "@/hooks/useInView";

gsap.registerPlugin(ScrollTrigger);

const PHRASE = [
  { text: "Great", accent: false, outline: false },
  { text: "Ideas", accent: false, outline: true },
  { text: "Don't", accent: false, outline: false },
  { text: "Belong", accent: false, outline: false },
  { text: "to", accent: false, outline: false },
  { text: "One", accent: false, outline: false },
  { text: "Department.", accent: true, outline: false },
];

export default function IdeasMarquee() {
  const sectionRef = useRef<HTMLElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const [inViewRef, inView] = useInView<HTMLElement>();

  useEffect(() => {
    const section = sectionRef.current;
    const track = trackRef.current;
    if (!section || !track) return;

    const words = track.querySelectorAll<HTMLElement>("[data-ideas-word]");
    if (!words.length) return;

      const ctx = gsap.context(() => {
        gsap.set(words, { y: 90, opacity: 0 });

        const tl = gsap.timeline({
          scrollTrigger: {
            trigger: section,
            start: "top top",
            end: "bottom bottom",
            scrub: 1,
            invalidateOnRefresh: true,
          },
        });

        // Words fade in + slide up one-by-one with a very slight delay so the
        // "coming up" animation is clearly visible, all revealed by mid-scroll
        tl.to(words, {
          y: 0,
          opacity: 1,
          duration: 0.1,
          stagger: 0.06,
          ease: "power2.out",
        }, 0.05);

        // The line drifts left across the full text width, finishing before
        // the scroll ends so the ENTIRE phrase — including the last word —
        // stays fully visible while the section winds down
        tl.to(track, {
          x: () => -(track.scrollWidth - window.innerWidth),
          duration: 0.5,
          ease: "none",
        }, 0.15);
      }, section);

    return () => ctx.revert();
  }, []);

  return (
    <section
      ref={(node) => {
        sectionRef.current = node;
        inViewRef.current = node;
      }}
      id="ideas-marquee"
      className={`relative z-50 text-[#101418] ${inView ? "" : "pause-animations"}`}
    >
      {/* Smooth gradient background */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute inset-0 bg-[linear-gradient(165deg,#f8f5ef_0%,#f0eae0_45%,#e6dfcf_100%)]" />
        <div className="absolute -top-24 -left-24 h-[42vw] w-[42vw] rounded-full bg-emerald-200/50 blur-3xl animate-float-slow" />
        <div className="absolute -bottom-32 -right-20 h-[38vw] w-[38vw] rounded-full bg-cyan-200/40 blur-3xl animate-float-reverse" />
        <div className="absolute top-1/3 right-[12%] h-[26vw] w-[26vw] rounded-full bg-amber-100/70 blur-3xl animate-float-slow" />
        <div className="absolute bottom-1/4 left-[8%] h-[20vw] w-[20vw] rounded-full bg-rose-100/50 blur-3xl animate-float-reverse" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_45%,rgba(120,110,90,0.09)_100%)]" />
      </div>

      <div className="relative h-[220vh]">
        <div className="sticky top-0 flex h-screen flex-col justify-center overflow-hidden">
          {/* Top label */}
          <div className="absolute top-8 left-6 sm:left-12 flex items-center gap-3 font-mono text-[10px] sm:text-xs uppercase tracking-[0.3em] text-neutral-500">
            <span className="inline-block h-px w-8 bg-neutral-400" />
            Cross-department collaboration
          </div>

          {/* Right vertical label */}
          <div className="absolute right-6 sm:right-10 top-1/2 -translate-y-1/2 rotate-90 origin-center font-mono text-[10px] sm:text-xs uppercase tracking-[0.3em] text-neutral-400">
            No boundaries · One club
          </div>

          {/* Huge single-line text track */}
          <div
            ref={trackRef}
            className="flex items-center whitespace-nowrap will-change-transform pl-[4vw] pr-[12vw]"
          >
            {PHRASE.map(({ text, accent, outline }, i) => (
              <span
                key={i}
                data-ideas-word
                className={`mr-[0.4em] font-sans font-black uppercase tracking-tight leading-[0.95] text-[clamp(2.6rem,11vw,9rem)] ${
                  outline
                    ? "text-transparent [-webkit-text-stroke:2px_rgba(16,20,24,0.85)]"
                    : accent
                      ? "italic text-emerald-600"
                      : "text-[#101418]"
                }`}
              >
                {text}
              </span>
            ))}
            <span className="ml-[0.2em] inline-block">
              <span className="block h-4 w-4 rounded-full bg-emerald-500 shadow-[0_0_18px_rgba(16,185,129,0.6)]" />
            </span>
          </div>

          {/* Bottom caption */}
          <div className="absolute bottom-8 left-6 sm:left-12 font-mono text-[10px] sm:text-xs uppercase tracking-[0.25em] text-neutral-400">
            Every department. One idea.
          </div>
        </div>
      </div>
    </section>
  );
}
