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
  const [mouse, setMouse] = useState({ x: 50, y: 50 });
  const [showContactModal, setShowContactModal] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mouseRef = useRef({ x: 0, y: 0 });

  const toTop  = () => {
    if (lenis) lenis.scrollTo(0);
    else window.scrollTo({ top: 0, behavior: "smooth" });
  };
  const mailto = () => { window.location.href = "mailto:contact@crescenttechnocrats.club"; };

  /* ── Radar canvas animation ──────────────────── */
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const resize = () => {
      const dpr = window.devicePixelRatio || 1;
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    window.addEventListener("resize", resize);

    const rect = canvas.getBoundingClientRect();
    const cx = () => canvas.getBoundingClientRect().width / 2;
    const cy = () => canvas.getBoundingClientRect().height / 2;
    const maxR = () => Math.max(canvas.getBoundingClientRect().width, canvas.getBoundingClientRect().height) * 0.7;

    // Rings that expand outward
    interface Ring { r: number; alpha: number; speed: number; color: number[] }
    const rings: Ring[] = [];
    const spawnRing = () => {
      const colors = [
        [139, 92, 246],   // purple
        [34, 211, 238],   // cyan
        [52, 211, 153],   // green
      ];
      const c = colors[Math.floor(Math.random() * colors.length)];
      rings.push({ r: 0, alpha: 0.6, speed: 0.4 + Math.random() * 0.3, color: c });
    };

    // Blips — random dots that appear and fade
    interface Blip { x: number; y: number; alpha: number; life: number; color: number[][]; ring: number }
    const blips: Blip[] = [];
    const spawnBlip = () => {
      const angle = Math.random() * Math.PI * 2;
      const dist = Math.random() * maxR() * 0.9;
      const colorSets = [
        [[139, 92, 246], [96, 165, 250]],
        [[34, 211, 238], [96, 165, 250]],
        [[52, 211, 153], [34, 211, 238]],
      ];
      blips.push({
        x: cx() + Math.cos(angle) * dist,
        y: cy() + Math.sin(angle) * dist,
        alpha: 1,
        life: 120 + Math.random() * 180,
        color: colorSets[Math.floor(Math.random() * colorSets.length)],
        ring: Math.floor(dist / (maxR() * 0.9) * 4) + 1,
      });
    };

    // Scan beam angle
    let scanAngle = 0;
    let frame = 0;

    let raf: number;
    const draw = () => {
      const w = canvas.getBoundingClientRect().width;
      const h = canvas.getBoundingClientRect().height;
      const x = cx();
      const y = cy();
      const R = maxR();

      ctx.clearRect(0, 0, w, h);

      // ── Grid lines ──
      ctx.strokeStyle = "rgba(139,92,246,0.06)";
      ctx.lineWidth = 1;
      // Horizontal
      for (let i = 0; i < 12; i++) {
        const gy = (h / 12) * i;
        ctx.beginPath();
        ctx.moveTo(0, gy);
        ctx.lineTo(w, gy);
        ctx.stroke();
      }
      // Vertical
      for (let i = 0; i < 16; i++) {
        const gx = (w / 16) * i;
        ctx.beginPath();
        ctx.moveTo(gx, 0);
        ctx.lineTo(gx, h);
        ctx.stroke();
      }

      // ── Concentric rings (static) ──
      for (let i = 1; i <= 5; i++) {
        ctx.beginPath();
        ctx.arc(x, y, (R / 5) * i, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(139,92,246,${0.08 + i * 0.02})`;
        ctx.lineWidth = 0.8;
        ctx.stroke();
      }

      // ── Cross hairs ──
      ctx.strokeStyle = "rgba(139,92,246,0.07)";
      ctx.lineWidth = 0.6;
      ctx.beginPath();
      ctx.moveTo(x - R, y);
      ctx.lineTo(x + R, y);
      ctx.moveTo(x, y - R);
      ctx.lineTo(x, y + R);
      ctx.stroke();

      // ── Diagonal lines ──
      ctx.strokeStyle = "rgba(139,92,246,0.04)";
      ctx.beginPath();
      ctx.moveTo(x - R * 0.707, y - R * 0.707);
      ctx.lineTo(x + R * 0.707, y + R * 0.707);
      ctx.moveTo(x + R * 0.707, y - R * 0.707);
      ctx.lineTo(x - R * 0.707, y + R * 0.707);
      ctx.stroke();

      // ── Pulsing expanding rings ──
      if (frame % 90 === 0) spawnRing();
      for (let i = rings.length - 1; i >= 0; i--) {
        const ring = rings[i];
        ring.r += ring.speed;
        ring.alpha -= 0.003;
        if (ring.alpha <= 0 || ring.r > R) {
          rings.splice(i, 1);
          continue;
        }
        ctx.beginPath();
        ctx.arc(x, y, ring.r, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(${ring.color[0]},${ring.color[1]},${ring.color[2]},${ring.alpha * 0.6})`;
        ctx.lineWidth = 1.5;
        ctx.stroke();
      }

      // ── Scan beam ──
      scanAngle += 0.012;
      const beamLen = R;
      const bx = x + Math.cos(scanAngle) * beamLen;
      const by = y + Math.sin(scanAngle) * beamLen;

      // Beam gradient (wedge)
      const grad = ctx.createConicGradient(scanAngle - 0.4, x, y);
      if (grad) {
        grad.addColorStop(0, "rgba(52,211,153,0)");
        grad.addColorStop(0.06, "rgba(52,211,153,0.08)");
        grad.addColorStop(0.08, "rgba(52,211,153,0)");
        grad.addColorStop(1, "rgba(52,211,153,0)");
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(x, y, beamLen, 0, Math.PI * 2);
        ctx.fill();
      }

      // Beam line
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(bx, by);
      ctx.strokeStyle = "rgba(52,211,153,0.45)";
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // Beam glow at tip
      ctx.beginPath();
      ctx.arc(bx, by, 4, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(52,211,153,0.5)";
      ctx.fill();

      // ── Blips ──
      if (frame % 40 === 0 && blips.length < 20) spawnBlip();
      for (let i = blips.length - 1; i >= 0; i--) {
        const b = blips[i];
        b.life--;
        if (b.life <= 0) {
          blips.splice(i, 1);
          continue;
        }
        const fade = b.life < 30 ? b.life / 30 : 1;
        const pulse = 0.7 + 0.3 * Math.sin(frame * 0.08 + i);
        const a = b.alpha * fade * pulse;

        // Blip glow
        ctx.beginPath();
        ctx.arc(b.x, b.y, 8, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${b.color[0][0]},${b.color[0][1]},${b.color[0][2]},${a * 0.2})`;
        ctx.fill();

        // Blip core
        ctx.beginPath();
        ctx.arc(b.x, b.y, 2.5, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${b.color[1][0]},${b.color[1][1]},${b.color[1][2]},${a})`;
        ctx.fill();

        // Ring label near blip
        if (fade > 0.5) {
          ctx.font = "8px monospace";
          ctx.fillStyle = `rgba(${b.color[0][0]},${b.color[0][1]},${b.color[0][2]},${a * 0.4})`;
          ctx.fillText(`R${b.ring}`, b.x + 8, b.y - 6);
        }
      }

      // ── Center dot ──
      ctx.beginPath();
      ctx.arc(x, y, 3, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(52,211,153,0.7)";
      ctx.fill();
      ctx.beginPath();
      ctx.arc(x, y, 8, 0, Math.PI * 2);
      ctx.strokeStyle = "rgba(52,211,153,0.2)";
      ctx.lineWidth = 0.8;
      ctx.stroke();

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
      onMouseMove={(e) => {
        const r = e.currentTarget.getBoundingClientRect();
        const x = e.clientX - r.left;
        const y = e.clientY - r.top;
        setMouse({ x: (x / r.width) * 100, y: (y / r.height) * 100 });
        mouseRef.current = { x, y };
      }}
      className="h-screen w-full overflow-hidden relative flex flex-col bg-[#030907] text-[#ecfdf5] select-none border-t border-[#0f1f14]"
      data-section-theme="dark"
    >
      {/* ── Background ──────────────────────────── */}
      <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
        {/* Radar canvas */}
        <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />

        {/* Dot grid — boosted */}
        <div className="absolute inset-0 opacity-[0.08]"
          style={{ backgroundImage: "radial-gradient(rgba(139,92,246,0.9) 1px,transparent 1px)", backgroundSize: "40px 40px" }} />

        {/* Mouse spotlight — boosted */}
        <div className="absolute inset-0"
          style={{ background: `radial-gradient(500px circle at ${mouse.x}% ${mouse.y}%, rgba(139,92,246,0.18), transparent 60%)` }} />

        {/* Vignette */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_40%,#030907_100%)]" />
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
          contact@crescenttechnocrats.club
        </button>
        <div className="w-full flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-6 px-5 sm:px-10 py-3"
          style={{ background: "linear-gradient(90deg,#040610,#030812,#040610)" }}>
          <span className="text-[9px] tracking-[0.3em] uppercase text-neutral-500 whitespace-nowrap">
            &copy; {new Date().getFullYear()}{" "}
            <span className="text-shine-violet-3d font-bold">Crescent Technocrats Club</span>
          </span>
          <span className="hidden sm:inline text-[#8b5cf6]/60 text-[10px]">✦</span>
          <span className="text-[9px] tracking-[0.3em] uppercase text-neutral-500 whitespace-nowrap">
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
                href="mailto:contact@crescenttechnocrats.club"
                className="flex items-center gap-4 p-3 rounded-2xl bg-[#07130d] border border-emerald-500/10 hover:border-emerald-500/30 transition-all group"
              >
                <div className="w-9 h-9 rounded-xl bg-purple-500/10 flex items-center justify-center text-purple-400 group-hover:scale-110 transition-transform">
                  <svg className="w-4.5 h-4.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="text-[10px] uppercase font-bold tracking-wider text-neutral-500">Email Address</span>
                  <span className="text-xs text-emerald-100 font-mono truncate">contact@crescenttechnocrats.club</span>
                </div>
              </a>

              {/* Instagram Link */}
              <a 
                href="https://instagram.com" 
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
                  <span className="text-xs text-emerald-100 font-mono">@crescenttechnocrats</span>
                </div>
              </a>

              {/* LinkedIn Link */}
              <a 
                href="https://linkedin.com" 
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
                  <span className="text-xs text-emerald-100 font-mono">Crescent Technocrats</span>
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
          /* Canvas animation still runs — radar is non-distracting enough */
        }
      `}} />
    </footer>
  );
}
