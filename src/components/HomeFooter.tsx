"use client";

import { useState, useEffect, useRef } from "react";
import { ArrowUpRight } from "lucide-react";
import { ShinyButton } from "@/components/ui/shiny-button";
import { useSmoothScroll } from "@/components/SmoothScroll";

/* ─── Flip panel data ──────────────────────────────────── */
const PANELS = [
  { a: "CRESCENT",    b: "THINK",       colorA: "#ecfdf5", colorB: "#8b5cf6", fontSize: "clamp(2.6rem, 16vw, 14.5rem)"  },
  { a: "TECHNOCRATS", b: "IDEATE",      colorA: "#ecfdf5", colorB: "#22d3ee", fontSize: "clamp(1.8rem, 12vw, 11rem)"    },
  { a: "CLUB",        b: "COLLABORATE", colorA: "#ecfdf5", colorB: "#34d399", fontSize: "clamp(1.8rem, 12vw, 11rem)"    },
] as const;

const NAV = [
  { label: "Events",  href: "#events"  },
  { label: "About",   href: "#about"   },
  { label: "Team",    href: "#team"    },
  { label: "Gallery", href: "#gallery" },
  { label: "Host'IT", href: "#hostit"  },
] as const;

/* ─── Single flip panel ────────────────────────────────── */
function FlipPanel({
  a, b, colorA, colorB, baseDelay, fontSize,
}: {
  a: string; b: string; colorA: string; colorB: string; baseDelay: number; fontSize: string;
}) {
  const [face,  setFace ] = useState<"a" | "b">("a");
  const [anim,  setAnim ] = useState<"in" | "out" | "idle">("idle");

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;

    const doFlip = () => {
      setAnim("out");
      timer = setTimeout(() => {
        setFace((f) => (f === "a" ? "b" : "a"));
        setAnim("in");
        timer = setTimeout(() => setAnim("idle"), 420);
      }, 380);
    };

    // Initial delay so panels stagger
    const init = setTimeout(() => {
      doFlip();
      // After the stagger, settle into a regular cycle
      const interval = setInterval(doFlip, 3600);
      timer = interval as unknown as ReturnType<typeof setTimeout>;
    }, baseDelay);

    return () => {
      clearTimeout(init);
      clearTimeout(timer);
    };
  }, [baseDelay]);

  const text  = face === "a" ? a : b;
  const color = face === "a" ? colorA : colorB;

  return (
    <div
      className="w-full flex items-center justify-start overflow-hidden px-5 sm:px-10"
      style={{ perspective: "900px", flex: "1 1 0%", minHeight: 0 }}
    >
      <span
        className="block font-black uppercase tracking-tighter select-none rgb-hover-glow"
        style={{
          fontSize,
          lineHeight: 0.76,
          color: "transparent",
          WebkitTextStroke: `clamp(0.5px, 0.06vw, 1.0px) ${color}`,
          textShadow: face === "b" ? `0 0 60px ${color}44` : "none",
          transformOrigin: "left center",
          animation:
            anim === "out" ? "panel-flip-out 0.38s cubic-bezier(0.5,0,1,0.5) forwards" :
            anim === "in"  ? "panel-flip-in  0.42s cubic-bezier(0,0.5,0.5,1) forwards" :
            "none",
          transition: "text-shadow 0.3s",
        }}
      >
        {text}
      </span>
    </div>
  );
}

/* ─── Main component ───────────────────────────────────── */
export default function HomeFooter() {
  const lenis = useSmoothScroll();
  const [showContactModal, setShowContactModal] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const toTop  = () => {
    if (lenis) lenis.scrollTo(0);
    else window.scrollTo({ top: 0, behavior: "smooth" });
  };
  const mailto = () => { window.location.href = "mailto:technocratsclub@crescent.education"; };

  /* ── Floating geometric shapes + grid ──────── */
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    type ShapeType = "rect" | "triangle" | "circle" | "diamond" | "hexagon";

    interface Shape {
      x: number; y: number;
      vx: number; vy: number;
      size: number;
      rotation: number;
      rotSpeed: number;
      type: ShapeType;
      color: number[];
      alpha: number;
      strokeWidth: number;
    }

    const palette = [
      [139, 92, 246],  // purple
      [34, 211, 238],  // cyan
      [52, 211, 153],  // green
      [96, 165, 250],  // blue
      [167, 139, 250], // light purple
    ];

    const types: ShapeType[] = ["rect", "triangle", "circle", "diamond", "hexagon"];

    let shapes: Shape[] = [];
    const GRID_SIZE = 36;

    const init = () => {
      const w = canvas.getBoundingClientRect().width;
      const h = canvas.getBoundingClientRect().height;
      shapes = Array.from({ length: 14 }, () => ({
        x: Math.random() * w,
        y: Math.random() * h,
        vx: (Math.random() - 0.5) * 0.35,
        vy: (Math.random() - 0.5) * 0.25,
        size: 16 + Math.random() * 28,
        rotation: Math.random() * Math.PI * 2,
        rotSpeed: (Math.random() - 0.5) * 0.008,
        type: types[Math.floor(Math.random() * types.length)],
        color: palette[Math.floor(Math.random() * palette.length)],
        alpha: 0.15 + Math.random() * 0.2,
        strokeWidth: 1 + Math.random() * 0.8,
      }));
    };

    const resize = () => {
      const dpr = window.devicePixelRatio || 1;
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      if (shapes.length === 0) init();
    };
    resize();
    window.addEventListener("resize", resize);

    const drawShape = (s: Shape) => {
      ctx.save();
      ctx.translate(s.x, s.y);
      ctx.rotate(s.rotation);
      const [r, g, b] = s.color;

      ctx.strokeStyle = `rgba(${r},${g},${b},${s.alpha})`;
      ctx.lineWidth = s.strokeWidth;

      switch (s.type) {
        case "rect":
          ctx.strokeRect(-s.size / 2, -s.size / 2, s.size, s.size);
          break;
        case "diamond":
          ctx.beginPath();
          ctx.moveTo(0, -s.size / 2);
          ctx.lineTo(s.size / 2, 0);
          ctx.lineTo(0, s.size / 2);
          ctx.lineTo(-s.size / 2, 0);
          ctx.closePath();
          ctx.stroke();
          break;
        case "triangle":
          ctx.beginPath();
          ctx.moveTo(0, -s.size / 2);
          ctx.lineTo(s.size / 2, s.size / 2);
          ctx.lineTo(-s.size / 2, s.size / 2);
          ctx.closePath();
          ctx.stroke();
          break;
        case "circle":
          ctx.beginPath();
          ctx.arc(0, 0, s.size / 2, 0, Math.PI * 2);
          ctx.stroke();
          break;
        case "hexagon":
          ctx.beginPath();
          for (let i = 0; i < 6; i++) {
            const angle = (Math.PI / 3) * i - Math.PI / 6;
            const px = (s.size / 2) * Math.cos(angle);
            const py = (s.size / 2) * Math.sin(angle);
            if (i === 0) ctx.moveTo(px, py);
            else ctx.lineTo(px, py);
          }
          ctx.closePath();
          ctx.stroke();
          break;
      }

      ctx.restore();
    };

    let raf: number;
    let frame = 0;
    const draw = () => {
      const w = canvas.getBoundingClientRect().width;
      const h = canvas.getBoundingClientRect().height;
      ctx.clearRect(0, 0, w, h);

      // ── Subtle dot grid ──
      ctx.fillStyle = "rgba(139,92,246,0.06)";
      for (let x = GRID_SIZE; x < w; x += GRID_SIZE) {
        for (let y = GRID_SIZE; y < h; y += GRID_SIZE) {
          ctx.beginPath();
          ctx.arc(x, y, 1, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      // ── Floating shapes ──
      for (const s of shapes) {
        s.x += s.vx;
        s.y += s.vy;
        s.rotation += s.rotSpeed;

        // Wrap around
        const margin = s.size;
        if (s.x < -margin) s.x = w + margin;
        if (s.x > w + margin) s.x = -margin;
        if (s.y < -margin) s.y = h + margin;
        if (s.y > h + margin) s.y = -margin;

        drawShape(s);
      }

      frame++;
      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return (
    <footer
      className="h-screen w-full overflow-hidden relative flex flex-col bg-[#030907] text-[#ecfdf5] select-none border-t border-[#0f1f14]"
      data-section-theme="dark"
    >
      {/* ── Background ──────────────────────────── */}
      <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
        {/* Floating shapes + grid canvas */}
        <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />
      </div>

      {/* ══════════════════════════════════════════ */}
      {/* TOP BAR — 44 px                           */}
      {/* ══════════════════════════════════════════ */}
      <div className="relative z-10 h-11 shrink-0 flex items-center justify-between px-5 sm:px-10 border-b border-[#0f1f14]">
        <span className="text-[10px] font-bold tracking-[0.28em] uppercase text-[#1e3a2f]">
          Crescent Technocrats Club
        </span>
        <button onClick={toTop}
          className="group flex items-center gap-1 text-[10px] text-[#1e3a2f] hover:text-[#a78bfa] transition-colors">
          Back to top
          <ArrowUpRight className="w-3 h-3 group-hover:-translate-y-px group-hover:translate-x-px transition-transform" />
        </button>
      </div>

      {/* ─── FLIP PANELS — flex-[5] ─── */}
      <div className="relative z-10 flex flex-col justify-center items-stretch px-4 sm:px-8 -space-y-8 sm:-space-y-16" style={{ flex: "5 1 0%", minHeight: 0 }}>
        {PANELS.map(({ a, b, colorA, colorB, fontSize }, i) => (
          <FlipPanel key={a} a={a} b={b} colorA={colorA} colorB={colorB} baseDelay={i * 900} fontSize={fontSize} />
        ))}
      </div>

      {/* ══════════════════════════════════════════ */}
      {/* CTA ROW — shrink-0                        */}
      {/* ══════════════════════════════════════════ */}
      <div className="relative z-10 shrink-0 flex items-center justify-center gap-4 px-5 py-4 border-t border-[#0f1f14]">
        <ShinyButton onClick={() => setShowContactModal(true)}>
          Get In Touch
        </ShinyButton>

        <a href="/join" className="group">
          <ShinyButton className="border-[#1e293b]">
            <span className="flex items-center gap-1">
              Join Us <ArrowUpRight className="w-3.5 h-3.5 transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
            </span>
          </ShinyButton>
        </a>
      </div>

      {/* ══════════════════════════════════════════ */}
      {/* BOTTOM BAR — email + credits              */}
      {/* ══════════════════════════════════════════ */}
      <div className="relative z-10 shrink-0 flex flex-col items-center border-t border-white/10">
        <button onClick={mailto}
          className="w-full text-center px-4 py-2.5 text-[10px] sm:text-[11px] text-[#1e3a2f] hover:text-[#a78bfa] transition-colors tracking-wider font-mono border-b border-white/10">
          technocratsclub@crescent.education
        </button>
        <div className="w-full flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-6 px-5 sm:px-10 py-3"
          style={{ background: "linear-gradient(90deg,#040610,#030812,#040610)" }}>
          <span className="text-[10px] sm:text-sm tracking-[0.3em] uppercase text-neutral-500 whitespace-nowrap">
            &copy; {new Date().getFullYear()}{" "}
            <span className="text-shine-violet-3d font-bold">Crescent Technocrats Club</span>
          </span>
          <span className="hidden sm:inline text-[#8b5cf6]/60 text-xs">✦</span>
          <span className="text-[10px] sm:text-sm tracking-[0.3em] uppercase text-neutral-500 whitespace-nowrap">
            Designed by <span className="text-shine-violet-3d font-bold">Hameed Afsar KM</span>
          </span>
        </div>
      </div>

      {/* ══════════════════════════════════════════ */}
      {/* GET IN TOUCH MODAL OVERLAY                 */}
      {/* ══════════════════════════════════════════ */}
      {showContactModal && (
        <div 
          className="fixed inset-0 z-[250] flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-fade-in"
          onClick={() => setShowContactModal(false)}
        >
          <div 
            className="w-full max-w-sm rounded-3xl bg-[#030907]/90 border border-emerald-500/20 p-6 sm:p-8 relative shadow-[0_0_50px_rgba(52,211,153,0.15)] animate-scale-up"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close Button */}
            <button 
              onClick={() => setShowContactModal(false)}
              className="absolute top-4 right-4 text-emerald-500/40 hover:text-emerald-400 text-lg transition-colors w-8 h-8 flex items-center justify-center rounded-full bg-[#0a140f] border border-emerald-500/10"
            >
              ✕
            </button>

            <h3 className="font-black text-white text-xl sm:text-2xl tracking-tight mb-1">
              Get In Touch
            </h3>
            <p className="text-[11px] uppercase tracking-widest text-emerald-400/70 font-semibold mb-6">
              Connect with CTC
            </p>

            <div className="flex flex-col gap-3">
              {/* Mail Link */}
              <a 
                href="mailto:technocratsclub@crescent.education"
                className="flex items-center gap-4 p-3 rounded-2xl bg-[#07130d] border border-emerald-500/10 hover:border-emerald-500/30 transition-all group"
              >
                <div className="w-9 h-9 rounded-xl bg-purple-500/10 flex items-center justify-center text-purple-400 group-hover:scale-110 transition-transform">
                  <svg className="w-4.5 h-4.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="text-[10px] uppercase font-bold tracking-wider text-neutral-500">Email Address</span>
                  <span className="text-xs text-emerald-100 font-mono truncate">technocratsclub@crescent.education</span>
                </div>
              </a>

              {/* Instagram Link */}
              <a 
                href="https://www.instagram.com/crescent_technocrats/" 
                target="_blank" 
                rel="noopener noreferrer"
                className="flex items-center gap-4 p-3 rounded-2xl bg-[#07130d] border border-emerald-500/10 hover:border-emerald-500/30 transition-all group"
              >
                <div className="w-9 h-9 rounded-xl bg-cyan-500/10 flex items-center justify-center text-cyan-400 group-hover:scale-110 transition-transform">
                  <svg className="w-4.5 h-4.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                    <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
                    <circle cx="12" cy="12" r="4" />
                    <circle cx="17.5" cy="6.5" r="0.5" fill="currentColor" />
                  </svg>
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="text-[10px] uppercase font-bold tracking-wider text-neutral-500">Instagram</span>
                  <span className="text-xs text-emerald-100 font-mono">@crescent_technocrats</span>
                </div>
              </a>

              {/* LinkedIn Link */}
              <a 
                href="https://www.linkedin.com/company/crescent-technocrats-club/" 
                target="_blank" 
                rel="noopener noreferrer"
                className="flex items-center gap-4 p-3 rounded-2xl bg-[#07130d] border border-emerald-500/10 hover:border-emerald-500/30 transition-all group"
              >
                <div className="w-9 h-9 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-400 group-hover:scale-110 transition-transform">
                  <svg className="w-4.5 h-4.5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.779-1.75-1.75s.784-1.75 1.75-1.75 1.75.779 1.75 1.75-.784 1.75-1.75 1.75zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z"/>
                  </svg>
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="text-[10px] uppercase font-bold tracking-wider text-neutral-500">LinkedIn</span>
                  <span className="text-xs text-emerald-100 font-mono">Crescent Technocrats Club</span>
                </div>
              </a>
            </div>
          </div>
        </div>
      )}

      {/* ── CSS ─────────────────────────────────── */}
      <style dangerouslySetInnerHTML={{ __html: `
        /* Modal animations */
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes scaleUp {
          from { transform: scale(0.95); opacity: 0; }
          to { transform: scale(1); opacity: 1; }
        }
        .animate-fade-in { animation: fadeIn 0.2s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
        .animate-scale-up { animation: scaleUp 0.3s cubic-bezier(0.34, 1.56, 0.64, 1) forwards; }

        /* 3-D panel flip — exit upward */
        @keyframes panel-flip-out {
          0%   { transform: rotateX(0deg);    opacity: 1; }
          100% { transform: rotateX(-88deg);  opacity: 0; }
        }
        /* 3-D panel flip — enter from below */
        @keyframes panel-flip-in {
          0%   { transform: rotateX(88deg);   opacity: 0; }
          100% { transform: rotateX(0deg);    opacity: 1; }
        }

        /* Hover RGB Outline Glow Cycle */
        @keyframes rgb-glow-cycle {
          0%, 100% {
            WebkitTextStroke-color: #8b5cf6;
            filter: drop-shadow(0 0 10px rgba(139, 92, 246, 0.6)) drop-shadow(0 0 30px rgba(139, 92, 246, 0.4));
          }
          33% {
            WebkitTextStroke-color: #22d3ee;
            filter: drop-shadow(0 0 10px rgba(34, 211, 238, 0.6)) drop-shadow(0 0 30px rgba(34, 211, 238, 0.4));
          }
          66% {
            WebkitTextStroke-color: #34d399;
            filter: drop-shadow(0 0 10px rgba(52, 211, 153, 0.6)) drop-shadow(0 0 30px rgba(52, 211, 153, 0.4));
          }
        }
        .rgb-hover-glow {
          transition: filter 0.3s ease, WebkitTextStroke 0.3s ease;
        }
        .rgb-hover-glow:hover {
          animation: rgb-glow-cycle 3s linear infinite;
        }

        @media (prefers-reduced-motion: reduce) {
          /* Canvas animation still runs — bokeh is non-distracting */
        }
      `}} />
    </footer>
  );
}
