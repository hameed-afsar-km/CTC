"use client";

import { useState, useRef } from "react";
import { ArrowUpRight, Sparkles, Send } from "lucide-react";
import { ShinyButton } from "@/components/ui/shiny-button";

const TAGLINE_WORDS = [
  { text: "THINK", desc: "Dream & Discover" },
  { text: "IDEATE", desc: "Architect & Design" },
  { text: "COLLABORATE", desc: "Build & Ship" },
];

export default function HomeFooter() {
  const [mousePos, setMousePos] = useState({ x: 50, y: 50 });
  const [hoveredWord, setHoveredWord] = useState<number | null>(null);
  const [isMarqueeHovered, setIsMarqueeHovered] = useState(false);
  const containerRef = useRef<HTMLElement>(null);

  // Interactive Mouse Spotlight
  const handleMouseMove = (e: React.MouseEvent) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    setMousePos({ x, y });
  };

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleContactClick = () => {
    window.location.href = "mailto:contact@crescenttechnocrats.club?subject=Inquiry%20from%20Website";
  };

  return (
    <footer
      ref={containerRef}
      onMouseMove={handleMouseMove}
      className="h-screen min-h-screen w-full relative overflow-hidden bg-[#030907] text-[#ecfdf5] flex flex-col justify-between p-4 sm:p-8 md:p-10 font-sans select-none border-t border-[#174630]/40 group"
      data-section-theme="dark"
    >
      {/* ── Dynamic Liquid Gradient Mesh & Dot Matrix Background ── */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute -top-32 -left-32 w-[65vw] h-[65vw] max-w-[800px] max-h-[800px] rounded-full bg-gradient-to-br from-emerald-500/20 via-teal-500/10 to-transparent blur-[160px] animate-liquid-orb-1" />
        <div className="absolute -bottom-32 -right-32 w-[65vw] h-[65vw] max-w-[800px] max-h-[800px] rounded-full bg-gradient-to-tl from-cyan-500/20 via-emerald-600/10 to-transparent blur-[160px] animate-liquid-orb-2" />
        <div className="absolute top-1/2 left-1/3 -translate-x-1/2 -translate-y-1/2 w-[55vw] h-[55vw] max-w-[600px] max-h-[600px] rounded-full bg-emerald-400/10 blur-[200px] animate-pulse" />

        {/* Diagonal Micro-Dot Matrix Pattern */}
        <div className="absolute inset-0 bg-[radial-gradient(rgba(52,211,153,0.12)_1px,transparent_1px)] [background-size:32px_32px] opacity-40" />

        {/* Interactive Mouse Spotlight Radial Glow */}
        <div
          className="absolute inset-0 transition-opacity duration-700 opacity-80"
          style={{
            background: `radial-gradient(750px circle at ${mousePos.x}% ${mousePos.y}%, rgba(52, 211, 153, 0.16), transparent 80%)`,
          }}
        />

        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-[0.03] mix-blend-overlay" />
      </div>

      {/* ── TOP SECTION: Header Bar ── */}
      <div className="relative z-10 w-full flex items-center justify-end pb-3 border-b border-[#174630]/40 shrink-0">
        <button
          onClick={scrollToTop}
          className="group flex items-center gap-1.5 sm:gap-2 px-4 py-2 rounded-full bg-[#0c1f17]/80 backdrop-blur-md hover:bg-[#133326] border border-[#174630] hover:border-[#34d399]/50 text-[#ecfdf5] transition-all cursor-pointer shadow-md text-xs"
        >
          <span className="font-medium uppercase tracking-wider">Top</span>
          <ArrowUpRight className="w-3.5 h-3.5 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 transition-transform text-[#6ee7b7]" />
        </button>
      </div>

      {/* ── CENTER SECTION: Large Three Typography Stack ── */}
      <div className="relative z-10 pt-2 pb-4 sm:pb-6 w-full flex flex-col items-center text-center justify-center max-w-full overflow-hidden shrink-0 translate-y-[-10px] sm:translate-y-[-20px]">
        
        {/* Large Three Typography Stack */}
        <div className="flex flex-col items-center justify-center w-full space-y-0 sm:-space-y-1 md:-space-y-2 max-w-full">
          
          {/* Line 1: CRESCENT (Outlined) */}
          <h1 className="text-4xl sm:text-6xl md:text-7xl lg:text-8xl xl:text-9xl font-black uppercase tracking-tighter leading-tight sm:leading-none text-transparent stroke-outline-text hover:scale-[1.02] transition-transform duration-300">
            CRESCENT
          </h1>

          {/* Line 2: TECHNOCRATS (Animated Gradient) */}
          <h2 className="text-3xl sm:text-5xl md:text-6xl lg:text-7xl xl:text-8xl font-black uppercase tracking-tighter leading-tight sm:leading-none text-transparent bg-clip-text bg-[linear-gradient(90deg,#6ee7b7,#34d399,#60a5fa,#a7f3d0,#34d399,#6ee7b7)] bg-[length:200%_auto] animate-gradient-flow hover:scale-[1.02] transition-transform duration-300">
            TECHNOCRATS
          </h2>

          {/* Line 3: CLUB (White) */}
          <h3 className="text-4xl sm:text-6xl md:text-7xl lg:text-8xl xl:text-9xl font-black uppercase tracking-tighter leading-tight sm:leading-none text-white hover:scale-[1.02] transition-transform duration-300">
            CLUB
          </h3>

        </div>

        {/* ── NEW REDESIGNED TAGLINE ANIMATION: Continuous Laser Beam Wave & Interactive Word Pillars ── */}
        <div className="mt-6 sm:mt-8 flex flex-col items-center w-full max-w-2xl px-4">
          <div className="flex items-center justify-center gap-6 sm:gap-12 w-full relative">
            {TAGLINE_WORDS.map((item, idx) => (
              <div
                key={item.text}
                onMouseEnter={() => setHoveredWord(idx)}
                onMouseLeave={() => setHoveredWord(null)}
                className="group flex flex-col items-center cursor-pointer transition-all duration-300"
              >
                <span
                  className={`text-sm sm:text-lg md:text-xl font-black tracking-[0.25em] uppercase transition-all duration-300 ${
                    hoveredWord === idx
                      ? "text-white scale-110 drop-shadow-[0_0_15px_rgba(52,211,153,0.8)]"
                      : "text-[#a7f3d0]/80 group-hover:text-white"
                  }`}
                >
                  {item.text}
                </span>
                
                {/* Micro subtitle indicator */}
                <span className="text-[10px] text-[#34d399] opacity-0 group-hover:opacity-100 transition-opacity duration-300 font-mono mt-0.5">
                  {item.desc}
                </span>
              </div>
            ))}
          </div>

          {/* Continuous Scanning Laser Beam Underline */}
          <div className="w-full max-w-md h-[2px] bg-[#174630]/60 mt-3 relative overflow-hidden rounded-full">
            <div className="absolute top-0 bottom-0 w-24 bg-gradient-to-r from-transparent via-[#34d399] to-transparent animate-laser-scan shadow-[0_0_12px_#34d399]" />
          </div>
        </div>

        {/* Shiny Button Contact CTA */}
        <div className="mt-6 sm:mt-8">
          <ShinyButton onClick={handleContactClick}>
            <Sparkles className="w-4 h-4 text-[#34d399] inline-block mr-1.5" />
            <span>Need Help? Contact Now!</span>
            <Send className="w-4 h-4 text-[#6ee7b7] inline-block ml-1.5" />
          </ShinyButton>
        </div>

      </div>

      {/* ── NEW REDESIGNED FOOTER MARQUEE: Sleek Graphic Design Marquee Track ── */}
      <div
        className="relative z-10 w-full py-3.5 border-t border-[#174630]/60 overflow-hidden shrink-0 bg-[#040d09]/90 backdrop-blur-md"
        onMouseEnter={() => setIsMarqueeHovered(true)}
        onMouseLeave={() => setIsMarqueeHovered(false)}
      >
        <div className="flex whitespace-nowrap w-full">
          <div
            className="flex items-center gap-10 text-xs sm:text-sm font-extrabold tracking-[0.2em] uppercase text-[#a7f3d0]"
            style={{
              animation: "marquee-smooth 25s linear infinite",
              animationPlayState: isMarqueeHovered ? "paused" : "running",
            }}
          >
            {[...Array(6)].map((_, i) => (
              <div key={i} className="flex items-center gap-10 shrink-0">
                <span className="text-white hover:text-[#34d399] transition-colors">
                  CRESCENT TECHNOCRATS CLUB
                </span>
                <span className="w-2 h-2 rounded-full bg-[#34d399] shadow-[0_0_10px_#34d399]" />
                <span className="text-[#6ee7b7] hover:text-white transition-colors">
                  DESIGNED BY HAMEED AFSAR KM
                </span>
                <span className="w-2 h-2 rounded-full bg-[#34d399] shadow-[0_0_10px_#34d399]" />
              </div>
            ))}
          </div>

          <div
            className="flex items-center gap-10 text-xs sm:text-sm font-extrabold tracking-[0.2em] uppercase text-[#a7f3d0]"
            aria-hidden="true"
            style={{
              animation: "marquee-smooth 25s linear infinite",
              animationPlayState: isMarqueeHovered ? "paused" : "running",
            }}
          >
            {[...Array(6)].map((_, i) => (
              <div key={i} className="flex items-center gap-10 shrink-0">
                <span className="text-white hover:text-[#34d399] transition-colors">
                  CRESCENT TECHNOCRATS CLUB
                </span>
                <span className="w-2 h-2 rounded-full bg-[#34d399] shadow-[0_0_10px_#34d399]" />
                <span className="text-[#6ee7b7] hover:text-white transition-colors">
                  DESIGNED BY HAMEED AFSAR KM
                </span>
                <span className="w-2 h-2 rounded-full bg-[#34d399] shadow-[0_0_10px_#34d399]" />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Internal CSS Animations */}
      <style dangerouslySetInnerHTML={{ __html: `
        .stroke-outline-text {
          -webkit-text-stroke: 1.5px #ecfdf5;
        }
        @media (min-width: 640px) {
          .stroke-outline-text {
            -webkit-text-stroke: 2px #ecfdf5;
          }
        }
        @keyframes gradient-flow {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
        .animate-gradient-flow {
          animation: gradient-flow 6s ease infinite;
        }
        @keyframes laser-scan {
          0% { left: -25%; }
          100% { left: 100%; }
        }
        .animate-laser-scan {
          animation: laser-scan 3s ease-in-out infinite alternate;
        }
        @keyframes marquee-smooth {
          0% { transform: translateX(0%); }
          100% { transform: translateX(-50%); }
        }
        @keyframes liquid-orb-1 {
          0%, 100% { transform: translate(0, 0) scale(1); }
          50% { transform: translate(80px, 50px) scale(1.12); }
        }
        @keyframes liquid-orb-2 {
          0%, 100% { transform: translate(0, 0) scale(1); }
          50% { transform: translate(-70px, -50px) scale(1.1); }
        }
        .animate-liquid-orb-1 {
          animation: liquid-orb-1 16s ease-in-out infinite;
        }
        .animate-liquid-orb-2 {
          animation: liquid-orb-2 20s ease-in-out infinite;
        }
      `}} />
    </footer>
  );
}
