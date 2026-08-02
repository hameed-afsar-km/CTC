"use client";

import { useEffect, useRef, useState } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { ArrowRight } from "lucide-react";
import Link from "next/link";

if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger);
}

const LOOP_TEXTS = ["Workshops", "Hackathons", "Seminars", "Tech Talks"];

export default function HostItSection() {
  const containerRef = useRef<HTMLDivElement>(null);
  const pinnedRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const stage1Ref = useRef<HTMLDivElement>(null);
  const stage2Ref = useRef<HTMLDivElement>(null);
  const stage3Ref = useRef<HTMLDivElement>(null);
  const stage4Ref = useRef<HTMLDivElement>(null);

  const fill1Ref = useRef<HTMLDivElement>(null);
  const fill2Ref = useRef<HTMLDivElement>(null);
  const fill3Ref = useRef<HTMLDivElement>(null);

  const [loopIndex, setLoopIndex] = useState(0);

  // Auto word switcher for Stage 4
  useEffect(() => {
    const timer = setInterval(() => {
      setLoopIndex((prev) => (prev + 1) % LOOP_TEXTS.length);
    }, 2200);
    return () => clearInterval(timer);
  }, []);

  // 3D Chromatic Grid Canvas Render Loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
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
    };
  }, []);

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

      // Master Scroll Scrub Timeline
      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: containerRef.current,
          start: "top top",
          end: "+=2000",
          pin: pinnedRef.current,
          scrub: 1.0,
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
      tl.to(stage4Ref.current, {
        opacity: 1,
        scale: 1,
        pointerEvents: "auto",
        duration: 1.5,
        ease: "power3.out",
      })
      .to(stage4Ref.current, {
        duration: 5 // Hold stage 4 firmly at the end of the scroll container
      });

    }, containerRef);

    return () => ctx.revert();
  }, []);

  return (
    <section
      ref={containerRef}
      id="hostit"
      className="relative z-50 w-full select-none bg-[#080c0b] text-[#ecfdf5]"
    >
      {/* Scroll frame wrapper */}
      <div
        ref={pinnedRef}
        className="h-screen w-full flex items-center justify-center overflow-hidden relative"
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

          {/* STAGE 4 — Cinematic Centerpiece */}
          <div
            ref={stage4Ref}
            className="absolute inset-0 flex flex-col items-center justify-center w-full h-full select-none overflow-hidden"
          >
            <style>{`
              @keyframes s4pop {
                0%   { transform: translateY(20px) scale(0.9); opacity: 0; filter: blur(8px); }
                15%  { transform: translateY(0) scale(1);    opacity: 1; filter: blur(0); }
                85%  { transform: translateY(0) scale(1);    opacity: 1; filter: blur(0); }
                100% { transform: translateY(-20px) scale(1.05); opacity: 0; filter: blur(8px); }
              }
            `}</style>

            {/* ── Background Core Glow ── */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] h-[300px] sm:w-[500px] sm:h-[500px] bg-emerald-500/15 rounded-full blur-[100px] pointer-events-none" />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[200px] h-[200px] bg-cyan-400/10 rounded-full blur-[60px] pointer-events-none mix-blend-screen" />

            {/* ── Overline ── */}
            <div className="flex items-center gap-4 mb-6 sm:mb-8 relative z-10">
              <div className="h-[1px] w-8 sm:w-16 bg-gradient-to-r from-transparent to-emerald-400/50" />
              <span className="font-mono text-[9px] sm:text-[10px] tracking-[0.5em] uppercase text-emerald-400 font-bold drop-shadow-[0_0_10px_rgba(52,211,153,0.8)]">
                04 / LAUNCHPAD
              </span>
              <div className="h-[1px] w-8 sm:w-16 bg-gradient-to-l from-transparent to-emerald-400/50" />
            </div>

            {/* ── Central Typography Stack ── */}
            <h2 className="flex flex-col items-center gap-0 relative z-10">
              <span 
                className="font-sans font-black uppercase leading-[0.85] tracking-tighter"
                style={{
                  fontSize: "clamp(5rem, 15vw, 9rem)",
                  WebkitTextStroke: "1.5px rgba(255,255,255,0.1)",
                  color: "transparent",
                }}
              >
                HOST
              </span>
              <span 
                className="font-sans font-black uppercase leading-[0.85] tracking-tighter"
                style={{
                  fontSize: "clamp(5rem, 15vw, 9rem)",
                  WebkitTextStroke: "1.5px rgba(255,255,255,0.25)",
                  color: "transparent",
                }}
              >
                YOURS
              </span>
              <div 
                style={{ filter: "drop-shadow(0 0 40px rgba(52,211,153,0.4)) drop-shadow(0 0 80px rgba(8,145,178,0.2))" }}
              >
                <span 
                  className="block font-sans font-black uppercase leading-[0.85] tracking-tighter text-transparent bg-clip-text bg-gradient-to-b from-white via-emerald-200 to-cyan-400"
                  style={{ fontSize: "clamp(5.5rem, 16vw, 10rem)" }}
                >
                  NOW!
                </span>
              </div>
            </h2>

            {/* ── Ticker & Info ── */}
            <div className="mt-8 sm:mt-10 flex flex-col items-center gap-5 relative z-10 px-6">
              
              <div className="flex items-center gap-2 text-lg sm:text-2xl font-sans font-medium text-slate-400">
                <span>Bring your</span>
                <div className="relative h-8 sm:h-10 w-[140px] sm:w-[190px] overflow-hidden flex items-center justify-center">
                  <div
                    key={loopIndex}
                    className="absolute font-black uppercase tracking-wide text-emerald-300"
                    style={{ animation: "s4pop 2.2s cubic-bezier(0.16,1,0.3,1) infinite" }}
                  >
                    {LOOP_TEXTS[loopIndex]}
                  </div>
                </div>
                <span>to life.</span>
              </div>

              <p className="font-sans text-xs sm:text-sm text-slate-500 max-w-sm text-center leading-relaxed">
                Venue, audience, logistics & tech — covered by the{" "}
                <span className="text-emerald-400/80 font-bold">Crescent Technocrats Club</span>.
              </p>
            </div>

            {/* ── CTA Button ── */}
            <div className="mt-8 sm:mt-12 relative z-10">
              <Link
                href="/hostit"
                className="group relative inline-flex items-center gap-3 px-8 sm:px-10 py-4 sm:py-5 rounded-full bg-emerald-500/10 border border-emerald-400/30 backdrop-blur-md hover:bg-emerald-400 hover:border-emerald-400 text-emerald-300 hover:text-slate-950 font-sans text-xs sm:text-sm font-black tracking-widest uppercase transition-all duration-500 hover:scale-110 shadow-[0_0_30px_rgba(52,211,153,0.15)] hover:shadow-[0_0_60px_rgba(52,211,153,0.5)]"
              >
                <span className="relative z-10">Launch Event</span>
                <ArrowRight className="relative z-10 w-4 h-4 sm:w-5 sm:h-5 group-hover:translate-x-1.5 transition-transform duration-300" />
                {/* Subtle pulse ring behind */}
                <div className="absolute inset-0 rounded-full border border-emerald-400/50 scale-100 group-hover:animate-ping opacity-0 group-hover:opacity-20 transition-opacity duration-300" />
              </Link>
            </div>

          </div>

        </div>

      </div>
    </section>
  );
}
