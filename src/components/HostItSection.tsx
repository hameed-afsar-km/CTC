"use client";

import { useEffect, useRef } from "react";
import { useInView } from "@/hooks/useInView";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { ArrowRight, ChevronDown, Code2, Wrench, Presentation, MessagesSquare } from "lucide-react";
import Link from "next/link";

if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger);
}

const MARQUEE_WORDS = [
  { word: "Hackathons", Icon: Code2 },
  { word: "Workshops", Icon: Wrench },
  { word: "Seminars", Icon: Presentation },
  { word: "Tech Talks", Icon: MessagesSquare },
];

function MarqueeTrack({ reverse = false }: { reverse?: boolean }) {
  return (
    <div
      className={`flex flex-col items-center ${
        reverse ? "animate-marquee-vertical-reverse" : "animate-marquee-vertical"
      }`}
    >
      {[
        ...MARQUEE_WORDS,
        ...MARQUEE_WORDS,
        ...MARQUEE_WORDS,
        ...MARQUEE_WORDS,
      ].map(({ word, Icon }, i) => (
        <div
          key={i}
          className="flex flex-col items-center justify-center gap-6 h-40"
        >
          <span
            className="font-sans font-black uppercase text-lg sm:text-xl md:text-2xl tracking-wide whitespace-nowrap text-transparent"
            style={{ WebkitTextStroke: "1px rgba(255, 255, 255, 0.14)" }}
          >
            {word}
          </span>
          <Icon className="w-5 h-5 text-emerald-400/40" />
        </div>
      ))}
    </div>
  );
}

export default function HostItSection() {
  const containerRef = useRef<HTMLElement>(null);
  const [inViewRef, inView] = useInView<HTMLElement>();
  const pinnedRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const stage1Ref = useRef<HTMLDivElement>(null);
  const stage2Ref = useRef<HTMLDivElement>(null);
  const stage3Ref = useRef<HTMLDivElement>(null);
  const stage4Ref = useRef<HTMLDivElement>(null);
  const scrollHintRef = useRef<HTMLDivElement>(null);
  const marqueeLeftRef = useRef<HTMLDivElement>(null);
  const marqueeRightRef = useRef<HTMLDivElement>(null);

  const fill1Ref = useRef<HTMLDivElement>(null);
  const fill2Ref = useRef<HTMLDivElement>(null);
  const fill3Ref = useRef<HTMLDivElement>(null);

  // 3D Chromatic Grid Canvas Render Loop — runs only while the section is on
  // screen; leaving releases the canvas backing store.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !inView) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animId: number;
    let time = 0;

    // Grid config
    const cols = 26;
    const rows = 18;
    const focalLength = 320;
    
    // Performance optimization: render canvas at 0.5x scale
    const resScale = 0.5;
    let width = (canvas.width = window.innerWidth * resScale);
    let height = (canvas.height = window.innerHeight * resScale);

    let mouseX = width / 2;
    let mouseY = height / 2;

    const handleResize = () => {
      width = canvas.width = window.innerWidth * resScale;
      height = canvas.height = window.innerHeight * resScale;
    };

    const handleMouseMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      mouseX = (e.clientX - rect.left) * resScale;
      mouseY = (e.clientY - rect.top) * resScale;
    };

    window.addEventListener("resize", handleResize);
    window.addEventListener("mousemove", handleMouseMove);

    const render = () => {
      time += 0.012; // Static animation speed

      ctx.fillStyle = "#080c0b";
      ctx.fillRect(0, 0, width, height);

      // Rotate calculations based on time
      const rx = 1.1 + Math.sin(time * 0.1) * 0.05; // Pitch (pitch down)
      const ry = Math.sin(time * 0.15) * 0.1;       // Yaw

      const cosRx = Math.cos(rx);
      const sinRx = Math.sin(rx);
      const cosRy = Math.cos(ry);
      const sinRy = Math.sin(ry);

      const centerX = width / 2;
      const centerY = height * 0.45;

      // Project 3D points
      const points: { sx: number; sy: number; colorVal: number }[][] = [];

      for (let r = 0; r < rows; r++) {
        points[r] = [];
        for (let c = 0; c < cols; c++) {
          // Normal grid coordinates
          const px = ((c / (cols - 1)) - 0.5) * width * 1.6;
          const py = ((r / (rows - 1)) - 0.5) * height * 1.5;
          
          // Compute complex wave displacement for Z
          const wave1 = Math.sin(c * 0.25 + time * 1.2) * Math.cos(r * 0.25 - time * 0.8);
          const wave2 = Math.sin(r * 0.15 - time * 2.0) * 0.5;
          
          // Constant base height amplitude (unaffected by scroll)
          const baseHeight = 35;
          let pz = (wave1 + wave2) * baseHeight;

          // Mouse distortion interaction (Push grid upwards)
          const tempX = px * cosRy; 
          const tempY = py * cosRx;
          const distToMouse = Math.sqrt(Math.pow((centerX + tempX) - mouseX, 2) + Math.pow((centerY + tempY) - mouseY, 2));
          if (distToMouse < 220) {
            const pushFactor = (220 - distToMouse) / 220;
            pz += Math.sin(time * 6 + distToMouse * 0.1) * 20 * pushFactor;
          }

          // 3D rotation
          const y1 = py * cosRx - pz * sinRx;
          const z1 = py * sinRx + pz * cosRx;

          const x2 = px * cosRy + z1 * sinRy;
          const z2 = -px * sinRy + z1 * cosRy;

          // Projection
          const scale = focalLength / (focalLength + z2);
          const sx = centerX + x2 * scale;
          const sy = centerY + y1 * scale;

          points[r][c] = {
            sx,
            sy,
            colorVal: (c / cols) * 360 + time * 45
          };
        }
      }

      // Draw horizontal lines with multi-color HSL gradient strokes
      for (let r = 0; r < rows; r++) {
        ctx.beginPath();
        for (let c = 0; c < cols; c++) {
          const pt = points[r][c];
          if (c === 0) ctx.moveTo(pt.sx, pt.sy);
          else ctx.lineTo(pt.sx, pt.sy);
        }
        
        // Multi-color RGB gradient mapping
        const grad = ctx.createLinearGradient(0, 0, width, 0);
        grad.addColorStop(0, `hsla(${(r / rows) * 60 + time * 25}, 80%, 55%, 0.12)`);
        grad.addColorStop(0.3, `hsla(${(r / rows) * 60 + 120 + time * 25}, 80%, 55%, 0.22)`);
        grad.addColorStop(0.7, `hsla(${(r / rows) * 60 + 240 + time * 25}, 80%, 55%, 0.22)`);
        grad.addColorStop(1, `hsla(${(r / rows) * 60 + time * 25}, 80%, 55%, 0.12)`);

        ctx.strokeStyle = grad;
        ctx.lineWidth = 1.0;
        ctx.stroke();
      }

      // Draw vertical lines
      for (let c = 0; c < cols; c += 2) {
        ctx.beginPath();
        for (let r = 0; r < rows; r++) {
          const pt = points[r][c];
          if (r === 0) ctx.moveTo(pt.sx, pt.sy);
          else ctx.lineTo(pt.sx, pt.sy);
        }

        const grad = ctx.createLinearGradient(0, 0, 0, height);
        grad.addColorStop(0, `hsla(${(c / cols) * 120 + time * 20}, 75%, 60%, 0.05)`);
        grad.addColorStop(0.5, `hsla(${(c / cols) * 120 + 180 + time * 20}, 75%, 60%, 0.18)`);
        grad.addColorStop(1, `hsla(${(c / cols) * 120 + time * 20}, 75%, 60%, 0.05)`);

        ctx.strokeStyle = grad;
        ctx.lineWidth = 0.8;
        ctx.stroke();
      }

      animId = requestAnimationFrame(render);
    };

    render();

    return () => {
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("mousemove", handleMouseMove);
      cancelAnimationFrame(animId);
      canvas.width = 0;
      canvas.height = 0;
    };
  }, [inView]);

  // GSAP Scrub animation connecting outline and fill text
  useEffect(() => {
    if (!containerRef.current || !pinnedRef.current) return;

    const ctx = gsap.context(() => {
      // Set stages initial states
      gsap.set([stage1Ref.current, stage2Ref.current, stage3Ref.current], {
        opacity: 0,
        pointerEvents: "none",
      });
      gsap.set(stage4Ref.current, {
        opacity: 0,
        scale: 0.92,
        pointerEvents: "none",
      });
      gsap.set([marqueeLeftRef.current, marqueeRightRef.current], {
        opacity: 0,
      });
      gsap.set(marqueeLeftRef.current, { x: -36 });
      gsap.set(marqueeRightRef.current, { x: 36 });

      // Master Scroll Scrub Timeline
      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: containerRef.current,
          start: "top top",
          end: "+=2000",
          pin: pinnedRef.current,
          scrub: 1.0,
          invalidateOnRefresh: true,
        },
      });

      // ── STAGE 1 (Wipe & tracking compress) ──
      tl.to(stage1Ref.current, { opacity: 1, duration: 0.3 })
        .fromTo(
          fill1Ref.current,
          { clipPath: "inset(100% 0% 0% 0%)" },
          { clipPath: "inset(0% 0% 0% 0%)", duration: 1.5, ease: "power2.out" }
        )
        .fromTo(
          stage1Ref.current,
          { letterSpacing: "0.22em", scale: 0.96 },
          { letterSpacing: "-0.01em", scale: 1, duration: 1.5, ease: "power2.out" },
          "-=1.5"
        )
        .to(stage1Ref.current, { duration: 1.5 }) // Hold
        .to(stage1Ref.current, {
          opacity: 0,
          scale: 1.08,
          letterSpacing: "-0.03em",
          duration: 0.8,
          ease: "power2.in",
        });

      // ── STAGE 2 ──
      tl.to(stage2Ref.current, { opacity: 1, duration: 0.3 })
        .fromTo(
          fill2Ref.current,
          { clipPath: "inset(100% 0% 0% 0%)" },
          { clipPath: "inset(0% 0% 0% 0%)", duration: 1.5, ease: "power2.out" }
        )
        .fromTo(
          stage2Ref.current,
          { letterSpacing: "0.22em", scale: 0.96 },
          { letterSpacing: "-0.01em", scale: 1, duration: 1.5, ease: "power2.out" },
          "-=1.5"
        )
        .to(stage2Ref.current, { duration: 1.5 }) // Hold
        .to(stage2Ref.current, {
          opacity: 0,
          scale: 1.08,
          letterSpacing: "-0.03em",
          duration: 0.8,
          ease: "power2.in",
        });

      // ── STAGE 3 ──
      tl.to(stage3Ref.current, { opacity: 1, duration: 0.3 })
        .fromTo(
          fill3Ref.current,
          { clipPath: "inset(100% 0% 0% 0%)" },
          { clipPath: "inset(0% 0% 0% 0%)", duration: 1.5, ease: "power2.out" }
        )
        .fromTo(
          stage3Ref.current,
          { letterSpacing: "0.22em", scale: 0.96 },
          { letterSpacing: "-0.01em", scale: 1, duration: 1.5, ease: "power2.out" },
          "-=1.5"
        )
        .to(stage3Ref.current, { duration: 1.5 }) // Hold
        .to(stage3Ref.current, {
          opacity: 0,
          scale: 1.08,
          letterSpacing: "-0.03em",
          duration: 0.8,
          ease: "power2.in",
        });

      // ── STAGE 4 (Finale Card Reveal) ──
      tl.addLabel("finaleReveal")
        .to(stage4Ref.current, {
          opacity: 1,
          scale: 1,
          pointerEvents: "auto",
          duration: 1.5,
          ease: "power3.out",
        })
        .to(stage4Ref.current, {
          duration: 5 // Hold stage 4 firmly at the end of the scroll container
        });

      // ── SIDE MARQUEES — slide in after the final CTA is revealed ──
      tl.to(
        marqueeLeftRef.current,
        { opacity: 1, x: 0, duration: 0.8, ease: "power2.out" },
        "finaleReveal+=1.3"
      );
      tl.to(
        marqueeRightRef.current,
        { opacity: 1, x: 0, duration: 0.8, ease: "power2.out" },
        "finaleReveal+=1.3"
      );

      // ── SCROLL INDICATOR — blurs & fades away as soon as scrolling begins,
      //    revealing the STAGE 1 text underneath ──
      tl.to(scrollHintRef.current, {
        opacity: 0,
        filter: "blur(10px)",
        duration: 1.6,
        ease: "power2.in",
      }, 0);

    }, containerRef);

    return () => ctx.revert();
  }, []);

  return (
    <section
      ref={(node) => {
        containerRef.current = node;
        inViewRef.current = node;
      }}
      id="hostit"
      className={`relative z-50 w-full select-none bg-[#080c0b] text-[#ecfdf5] ${
        inView ? "" : "pause-animations"
      }`}
    >
      {/* Scroll frame wrapper */}
      <div
        ref={pinnedRef}
        className="h-screen supports-[height:100dvh]:h-[100dvh] w-full flex items-center justify-center overflow-hidden relative"
      >
        {/* Glowing 3D Grid Canvas Background */}
        <canvas
          ref={canvasRef}
          className="absolute inset-0 w-full h-full pointer-events-none scale-105"
        />

        {/* Diagonal Scanlines Overlays */}
        <div
          className="absolute inset-0 pointer-events-none opacity-[0.06] z-10"
          style={{
            backgroundImage: `
              linear-gradient(45deg, rgba(52, 211, 153, 0.15) 1px, transparent 1px),
              linear-gradient(-45deg, rgba(52, 211, 153, 0.15) 1px, transparent 1px)
            `,
            backgroundSize: "60px 60px",
          }}
        />

        <style>{`
          @keyframes scroll-chevron {
            0% { opacity: 0; transform: translateY(-8px); }
            40% { opacity: 1; }
            100% { opacity: 0; transform: translateY(8px); }
          }
          .animate-scroll-chevron {
            animation: scroll-chevron 1.4s ease-in-out infinite;
          }
          .animate-scroll-chevron-delay {
            animation: scroll-chevron 1.4s ease-in-out infinite;
            animation-delay: 0.7s;
          }
          @keyframes marquee-vertical {
            0% { transform: translateY(0); }
            100% { transform: translateY(-25%); }
          }
          @keyframes marquee-vertical-reverse {
            0% { transform: translateY(-25%); }
            100% { transform: translateY(0); }
          }
          .animate-marquee-vertical,
          .animate-marquee-vertical-reverse {
            animation-duration: 14s;
            animation-timing-function: linear;
            animation-iteration-count: infinite;
            will-change: transform;
          }
          .animate-marquee-vertical {
            animation-name: marquee-vertical;
          }
          .animate-marquee-vertical-reverse {
            animation-name: marquee-vertical-reverse;
          }
        `}</style>

        {/* Scroll Indicator — centered; blurs & fades as scrolling starts */}
        <div
          ref={scrollHintRef}
          className="absolute inset-0 z-30 flex items-center justify-center pointer-events-none select-none"
        >
          <div className="flex flex-col items-center gap-4">
            <span className="font-mono text-[9px] sm:text-[10px] tracking-[0.5em] uppercase text-emerald-400 font-bold drop-shadow-[0_0_8px_rgba(52,211,153,0.8)]">
              SCROLL
            </span>
            <div className="flex flex-col items-center -mt-1">
              <ChevronDown className="w-5 h-5 text-emerald-400 animate-scroll-chevron" />
              <ChevronDown className="w-5 h-5 -mt-3 text-emerald-400/80 animate-scroll-chevron-delay" />
            </div>
          </div>
        </div>

        {/* Side Marquee — left edge */}
        <div
          ref={marqueeLeftRef}
          className="hidden sm:flex absolute left-4 sm:left-8 top-0 bottom-0 z-10 flex-col items-center overflow-hidden pointer-events-none select-none"
        >
          <MarqueeTrack />
        </div>

        {/* Side Marquee — right edge */}
        <div
          ref={marqueeRightRef}
          className="hidden sm:flex absolute right-4 sm:right-8 top-0 bottom-0 z-10 flex-col items-center overflow-hidden pointer-events-none select-none"
        >
          <MarqueeTrack reverse />
        </div>

        {/* ── STAGE CONTAINER ── */}
        <div className="relative w-full max-w-6xl px-6 flex items-center justify-center h-full z-20">

          {/* STAGE 1 */}
          <div
            ref={stage1Ref}
            className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none select-none"
          >
            <div className="relative font-sans text-5xl sm:text-7xl md:text-[8rem] font-black leading-[0.95] tracking-tight">
              {/* Stroke Text */}
              <div
                className="text-transparent"
                style={{ WebkitTextStroke: "1px rgba(255, 255, 255, 0.15)" }}
              >
                EVERY
                <br />
                GREAT EVENT
              </div>
              {/* Fill Text */}
              <div
                ref={fill1Ref}
                className="absolute inset-0 text-white"
              >
                EVERY
                <br />
                GREAT{" "}
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-lime-300 via-emerald-300 to-cyan-300 animate-text-gradient">
                  EVENT
                </span>
              </div>
            </div>
          </div>

          {/* STAGE 2 */}
          <div
            ref={stage2Ref}
            className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none select-none"
          >
            <div className="relative font-sans text-5xl sm:text-7xl md:text-[8rem] font-black leading-[0.95] tracking-tight">
              {/* Stroke Text */}
              <div
                className="text-transparent"
                style={{ WebkitTextStroke: "1px rgba(255, 255, 255, 0.15)" }}
              >
                STARTS WITH
                <br />
                AN IDEA
              </div>
              {/* Fill Text */}
              <div
                ref={fill2Ref}
                className="absolute inset-0 text-white"
              >
                STARTS WITH
                <br />
                AN{" "}
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-300 via-sky-300 to-blue-300 animate-text-gradient">
                  IDEA
                </span>
              </div>
            </div>
          </div>

          {/* STAGE 3 */}
          <div
            ref={stage3Ref}
            className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none select-none"
          >
            <div className="relative font-sans text-6xl sm:text-8xl md:text-[9.5rem] font-black leading-[0.95] tracking-tight">
              {/* Stroke Text */}
              <div
                className="text-transparent"
                style={{ WebkitTextStroke: "1px rgba(255, 255, 255, 0.15)" }}
              >
                Have One?
              </div>
              {/* Fill Text */}
              <div
                ref={fill3Ref}
                className="absolute inset-0 text-white"
              >
                HAVE{" "}
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-pink-300 via-fuchsia-300 to-purple-300 animate-text-gradient">
                  ONE
                </span>
                ?
              </div>
            </div>
          </div>

          {/* STAGE 4 — Futuristic Radial HUD */}
          <div
            ref={stage4Ref}
            className="absolute inset-0 flex items-center justify-center w-full h-full select-none overflow-hidden"
          >
            <style>{`
              @keyframes hud-spin {
                100% { transform: rotate(360deg); }
              }
              @keyframes hud-spin-slow {
                100% { transform: rotate(-360deg); }
              }
              @keyframes hud-pulse {
                0%, 100% { opacity: 0.3; transform: scale(1); }
                50% { opacity: 0.8; transform: scale(1.05); }
              }
            `}</style>
            
            {/* ── Geometric Background Elements ── */}
            {/* Outer rotating dashed ring */}
            <div 
              className="absolute w-[320px] h-[320px] sm:w-[500px] sm:h-[500px] rounded-full border border-dashed border-emerald-500/30 pointer-events-none"
              style={{ animation: "hud-spin 40s linear infinite" }}
            />
            
            {/* Inner rotating solid ring with glowing nodes */}
            <div 
              className="absolute w-[300px] h-[300px] sm:w-[460px] sm:h-[460px] rounded-full border border-emerald-400/10 pointer-events-none"
              style={{ animation: "hud-spin-slow 25s linear infinite" }}
            >
              <div className="absolute top-0 left-1/2 w-2 h-2 -translate-x-1/2 -translate-y-1/2 bg-emerald-400 rounded-full shadow-[0_0_15px_#34d399]" />
              <div className="absolute bottom-0 left-1/2 w-2 h-2 -translate-x-1/2 translate-y-1/2 bg-cyan-400 rounded-full shadow-[0_0_15px_#22d3ee]" />
            </div>

            {/* Glowing core pulse */}
            <div 
              className="absolute w-[200px] h-[200px] sm:w-[350px] sm:h-[350px] rounded-full bg-emerald-500/10 blur-[50px] pointer-events-none"
              style={{ animation: "hud-pulse 4s ease-in-out infinite" }}
            />

            {/* ── Central Lockup ── */}
            <div className="relative z-10 flex flex-col items-center text-center mt-8">
              
              {/* Top Label */}
              <div className="flex items-center gap-3 mb-6">
                <span className="w-6 h-[1px] bg-emerald-400/50" />
                <span className="font-mono text-[9px] sm:text-[10px] tracking-[0.4em] uppercase text-emerald-400 font-bold drop-shadow-[0_0_8px_rgba(52,211,153,0.8)]">
                  EVENT PARTNERSHIP
                </span>
                <span className="w-6 h-[1px] bg-emerald-400/50" />
              </div>
              
              {/* Massive Title */}
              <h2 className="flex flex-col items-center leading-[0.85] tracking-tighter mb-12">
                <span className="font-sans font-black uppercase text-[4rem] sm:text-[6.5rem] text-white" style={{ WebkitTextStroke: "1px rgba(255,255,255,0.3)", color: "transparent" }}>
                  HOST
                </span>
                <span className="font-sans font-black uppercase text-[4rem] sm:text-[6.5rem] text-white" style={{ WebkitTextStroke: "1px rgba(255,255,255,0.65)", color: "transparent" }}>
                  YOURS
                </span>
                <span
                  className="font-sans font-black uppercase text-[4.5rem] sm:text-[7.5rem] text-transparent bg-clip-text animate-text-gradient"
                  style={{
                    backgroundImage:
                      "linear-gradient(90deg, #f87171, #fb923c, #facc15, #4ade80, #22d3ee, #818cf8, #e879f9, #f87171)",
                  }}
                >
                  NOW!
                </span>
              </h2>

              {/* Tactical Circular Button */}
              <Link
                href="/hostit"
                className="group relative flex items-center justify-center w-20 h-20 sm:w-24 sm:h-24 rounded-full border border-emerald-400/50 bg-slate-950/80 backdrop-blur-md hover:bg-emerald-400 transition-all duration-500 hover:scale-110 shadow-[0_0_30px_rgba(52,211,153,0.2)] hover:shadow-[0_0_50px_rgba(52,211,153,0.6)]"
              >
                <ArrowRight className="w-8 h-8 text-emerald-400 group-hover:text-slate-950 transition-colors duration-300" />
                
                {/* Rotating text track around button */}
                <div className="absolute inset-[-24px] pointer-events-none animate-[hud-spin_12s_linear_infinite]">
                  <svg viewBox="0 0 100 100" className="w-full h-full overflow-visible">
                    <path id="curve" d="M 50,50 m -45,0 a 45,45 0 1,1 90,0 a 45,45 0 1,1 -90,0" fill="transparent" />
                    <text className="font-mono text-[7px] font-bold uppercase tracking-[0.2em] fill-emerald-500/80">
                      <textPath href="#curve" startOffset="0%">
                        Host an Event • Host an Event • Host an Event • 
                      </textPath>
                    </text>
                  </svg>
                </div>
              </Link>
              
            </div>
          </div>

        </div>

      </div>
    </section>
  );
}
