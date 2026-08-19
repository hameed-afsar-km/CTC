"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { gsap } from "gsap";
import { Camera, CalendarClock, Compass, Home } from "lucide-react";

const prefersReducedMotion = () =>
  typeof window !== "undefined" &&
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

export default function NotFound() {
  const cursorRef = useRef<HTMLDivElement>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const bgX = useRef(0);
  const bgY = useRef(0);
  const lastTrail = useRef(0);
  const trailCount = useRef(0);
  const [cursorVisible, setCursorVisible] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || prefersReducedMotion()) return;
    const ctx2d = canvas.getContext("2d");
    if (!ctx2d) return;

    const DPR = Math.min(window.devicePixelRatio || 1, 2);
    const mouse = { x: -9999, y: -9999 };
    let w = 0;
    let h = 0;
    let raf = 0;

    const resize = () => {
      w = canvas.offsetWidth;
      h = canvas.offsetHeight;
      canvas.width = w * DPR;
      canvas.height = h * DPR;
      ctx2d.setTransform(DPR, 0, 0, DPR, 0, 0);
    };

    const nodeCount = () =>
      Math.max(30, Math.min(80, Math.floor((w * h) / 20000)));

    const nodes = Array.from({ length: nodeCount() }, () => ({
      x: Math.random() * w,
      y: Math.random() * h,
      vx: (Math.random() - 0.5) * 0.3,
      vy: (Math.random() - 0.5) * 0.3,
      r: Math.random() * 1.6 + 0.8,
      mint: Math.random() > 0.45,
    }));

    const draw = () => {
      ctx2d.clearRect(0, 0, w, h);

      for (const n of nodes) {
        n.x += n.vx;
        n.y += n.vy;
        if (n.x < -12) n.x = w + 12;
        else if (n.x > w + 12) n.x = -12;
        if (n.y < -12) n.y = h + 12;
        else if (n.y > h + 12) n.y = -12;
      }

      const LINK = 130;
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const a = nodes[i];
          const b = nodes[j];
          const dx = a.x - b.x;
          const dy = a.y - b.y;
          const d2 = dx * dx + dy * dy;
          if (d2 < LINK * LINK) {
            const alpha = (1 - Math.sqrt(d2) / LINK) * 0.3;
            ctx2d.strokeStyle = `rgba(52,211,153,${alpha})`;
            ctx2d.lineWidth = 1;
            ctx2d.beginPath();
            ctx2d.moveTo(a.x, a.y);
            ctx2d.lineTo(b.x, b.y);
            ctx2d.stroke();
          }
        }
      }

      const R = 170;
      for (const n of nodes) {
        const dx = n.x - mouse.x;
        const dy = n.y - mouse.y;
        const d2 = dx * dx + dy * dy;
        if (d2 < R * R) {
          const d = Math.sqrt(d2);
          const alpha = (1 - d / R) * 0.55;
          ctx2d.strokeStyle = `rgba(110,231,183,${alpha})`;
          ctx2d.beginPath();
          ctx2d.moveTo(n.x, n.y);
          ctx2d.lineTo(mouse.x, mouse.y);
          ctx2d.stroke();
          n.x -= (dx / d) * 0.35;
          n.y -= (dy / d) * 0.35;
        }
      }

      for (const n of nodes) {
        ctx2d.fillStyle = n.mint
          ? "rgba(52,211,153,0.85)"
          : "rgba(129,140,248,0.8)";
        ctx2d.beginPath();
        ctx2d.arc(n.x, n.y, n.r, 0, Math.PI * 2);
        ctx2d.fill();
      }

      raf = requestAnimationFrame(draw);
    };

    resize();
    const onCanvasMouseMove = (e: MouseEvent) => {
      mouse.x = e.clientX;
      mouse.y = e.clientY;
    };
    const onResize = () => {
      resize();
      while (nodes.length < nodeCount()) {
        nodes.push({
          x: Math.random() * w,
          y: Math.random() * h,
          vx: (Math.random() - 0.5) * 0.3,
          vy: (Math.random() - 0.5) * 0.3,
          r: Math.random() * 1.6 + 0.8,
          mint: Math.random() > 0.45,
        });
      }
    };

    window.addEventListener("mousemove", onCanvasMouseMove);
    window.addEventListener("resize", onResize);
    raf = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("mousemove", onCanvasMouseMove);
      window.removeEventListener("resize", onResize);
    };
  }, []);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    const ctx = gsap.context(() => {
      gsap.fromTo(
        ".nf-zero",
        { y: 40, opacity: 0, rotateZ: -8 },
        {
          y: 0,
          opacity: 1,
          rotateZ: 0,
          duration: 1,
          stagger: 0.16,
          ease: "power3.out",
          delay: 0.15,
        }
      );
      gsap.fromTo(
        ".nf-fade",
        { y: 24, opacity: 0 },
        {
          y: 0,
          opacity: 1,
          duration: 0.8,
          stagger: 0.1,
          ease: "power3.out",
          delay: 0.6,
        }
      );
    }, root);

    const moveCursor = (e: MouseEvent) => {
      setCursorVisible(true);
      if (cursorRef.current && !prefersReducedMotion()) {
        gsap.to(cursorRef.current, {
          x: e.clientX - 20,
          y: e.clientY - 20,
          duration: 0.12,
          ease: "power2.out",
        });
      }
    };

    const spawnTrail = (x: number, y: number) => {
      if (trailCount.current > 26) return;
      const now = performance.now();
      if (now - lastTrail.current < 36) return;
      lastTrail.current = now;
      trailCount.current++;
      const size = 3 + Math.random() * 6;
      const dot = document.createElement("div");
      dot.className = "nf-trail-dot";
      dot.style.width = `${size}px`;
      dot.style.height = `${size}px`;
      dot.style.left = `${x - size / 2}px`;
      dot.style.top = `${y - size / 2}px`;
      root.appendChild(dot);
      const angle = Math.random() * Math.PI * 2;
      const dist = 18 + Math.random() * 55;
      gsap.to(dot, {
        x: Math.cos(angle) * dist,
        y: Math.sin(angle) * dist - 34,
        opacity: 0,
        scale: 0.35,
        duration: 0.7 + Math.random() * 0.5,
        ease: "power2.out",
        onComplete: () => {
          dot.remove();
          trailCount.current--;
        },
      });
    };

    const onMouseMove = (e: MouseEvent) => {
      bgX.current = e.clientX;
      bgY.current = e.clientY;
      if (!prefersReducedMotion() && root) {
        const w = root.offsetWidth;
        const h = root.offsetHeight;
        gsap.to(root.querySelector(".nf-spotlight"), {
          "--mouse-x": `${(bgX.current / w) * 100}%`,
          "--mouse-y": `${(bgY.current / h) * 100}%`,
          duration: 0.35,
          ease: "power2.out",
        });

        const cx = bgX.current / w - 0.5;
        const cy = bgY.current / h - 0.5;
        const depths = [1, 0.55, 1.4];
        gsap.utils.toArray<HTMLElement>(".nf-zero").forEach((digit, i) => {
          const d = depths[i % depths.length];
          gsap.to(digit, {
            x: cx * -26 * d,
            y: cy * -16 * d,
            duration: 0.7,
            ease: "power2.out",
          });
        });

        spawnTrail(e.clientX, e.clientY);
      }
    };

    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mousemove", moveCursor);
    return () => {
      ctx.revert();
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mousemove", moveCursor);
    };
  }, []);

  return (
    <div
      ref={rootRef}
      className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-[#040608] font-syne text-white select-none"
    >
      {/* Aurora / nebula background */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-1/3 left-1/4 h-[140vh] w-[180vw] -translate-x-1/2 rotate-[18deg] bg-gradient-to-b from-[#34d399]/8 via-[#2dd4bf]/4 to-transparent blur-[130px] nf-aurora" />
        <div className="absolute -bottom-1/3 right-1/4 h-[130vh] w-[160vw] translate-x-1/2 -rotate-[14deg] bg-gradient-to-t from-[#6366f1]/9 via-[#8b5cf6]/4 to-transparent blur-[130px] nf-aurora-alt" />
      </div>

      {/* Cyber grid */}
      <div className="bg-cyber-grid pointer-events-none absolute inset-0 opacity-60" />

      {/* Mouse spotlight */}
      <div className="hero-spotlight nf-spotlight pointer-events-none absolute inset-0" />

      {/* Interactive constellation */}
      <canvas
        ref={canvasRef}
        className="pointer-events-none absolute inset-0 z-[4] h-full w-full opacity-80"
        aria-hidden
      />

      {/* Scanline sweep */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-24 animate-scanline bg-gradient-to-b from-transparent via-[#34d399]/10 to-transparent" />

      {/* Content */}
      <div className="relative z-10 flex flex-col items-center px-6 text-center">
        <h1 className="nf-bob flex items-center gap-2 sm:gap-6">
          <span className="nf-zero nf-digit text-gradient-loop font-gameshow text-[clamp(6rem,24vw,15rem)] leading-none opacity-0">
            4
          </span>
          <span className="nf-zero nf-digit text-gradient-loop font-gameshow text-[clamp(6rem,24vw,15rem)] leading-none opacity-0">
            0
          </span>
          <span className="nf-zero nf-digit text-gradient-loop font-gameshow text-[clamp(6rem,24vw,15rem)] leading-none opacity-0">
            4
          </span>
        </h1>

        <h2 className="nf-fade mt-4 font-mono text-sm font-bold uppercase tracking-[0.5em] text-white/80 opacity-0 sm:text-lg">
          Page Not Found
        </h2>

        <p className="nf-fade mt-4 max-w-md text-sm leading-relaxed text-white/50 opacity-0 sm:text-base">
          Looks like you drifted off the grid. That link doesn&apos;t exist — or
          it hasn&apos;t been wired up yet.
        </p>

        <div className="nf-fade mt-10 flex flex-wrap items-center justify-center gap-3 opacity-0">
          <Link
            href="/"
            className="flex cursor-pointer items-center gap-2 rounded-full bg-emerald-500 px-6 py-3 font-mono text-xs font-bold uppercase tracking-widest text-black transition-all hover:scale-105 hover:bg-emerald-400 hover:shadow-[0_0_20px_rgba(52,211,153,0.5)]"
          >
            <Home className="h-4 w-4" aria-hidden />
            Back Home
          </Link>
          <Link
            href="/events"
            className="flex cursor-pointer items-center gap-2 rounded-full border border-white/25 bg-black/60 px-6 py-3 font-mono text-xs font-bold uppercase tracking-widest text-white backdrop-blur-xl transition-colors hover:bg-white hover:text-black"
          >
            <CalendarClock className="h-4 w-4" aria-hidden />
            Events
          </Link>
          <Link
            href="/gallery"
            className="flex cursor-pointer items-center gap-2 rounded-full border border-white/25 bg-black/60 px-6 py-3 font-mono text-xs font-bold uppercase tracking-widest text-white backdrop-blur-xl transition-colors hover:bg-white hover:text-black"
          >
            <Camera className="h-4 w-4" aria-hidden />
            Gallery
          </Link>
        </div>

        <p className="nf-fade mt-12 flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.3em] text-white/30 opacity-0">
          <Compass className="h-3.5 w-3.5" aria-hidden />
          Lost in the CTC nebula
        </p>
      </div>

      {/* Custom cursor */}
      <div
        ref={cursorRef}
        className="pointer-events-none fixed left-0 top-0 z-[9999] h-10 w-10"
        style={{ opacity: cursorVisible ? 0.9 : 0 }}
        aria-hidden
      >
        <Image
          src="/assets/cursor.png"
          alt=""
          width={48}
          height={48}
          className="h-full w-full object-contain"
          draggable={false}
          loading="eager"
        />
      </div>

      <style>{`
        @keyframes nf-aurora-move {
          0%, 100% {
            transform: translateX(-50%) rotate(18deg) translateY(0);
          }
          50% {
            transform: translateX(-50%) rotate(18deg) translateY(40px);
          }
        }
        @keyframes nf-aurora-alt-move {
          0%, 100% {
            transform: translateX(50%) rotate(-14deg) translateY(0);
          }
          50% {
            transform: translateX(50%) rotate(-14deg) translateY(-34px);
          }
        }
        @keyframes nf-bob-key {
          0%, 100% {
            transform: translateY(0);
          }
          50% {
            transform: translateY(-12px);
          }
        }
        .nf-bob {
          animation: nf-bob-key 3.2s ease-in-out infinite;
        }
        .nf-digit {
          transition: transform 0.35s cubic-bezier(0.16, 1, 0.3, 1), filter 0.35s ease;
        }
        .nf-digit:hover {
          transform: translateY(-16px) scale(1.14) rotate(-4deg) !important;
          filter: drop-shadow(0 0 26px rgba(52, 211, 153, 0.85)) brightness(1.15);
        }
        .nf-trail-dot {
          position: absolute;
          border-radius: 9999px;
          pointer-events: none;
          background: radial-gradient(circle, rgba(110, 231, 183, 0.9), rgba(52, 211, 153, 0.4) 60%, transparent);
          box-shadow: 0 0 8px rgba(52, 211, 153, 0.8);
          z-index: 5;
        }
        .nf-aurora {
          animation: nf-aurora-move 18s ease-in-out infinite;
        }
        .nf-aurora-alt {
          animation: nf-aurora-alt-move 22s ease-in-out infinite;
        }
        @media (prefers-reduced-motion: reduce) {
          .nf-aurora,
          .nf-aurora-alt,
          .nf-bob {
            animation: none;
          }
          .nf-digit {
            transition: none;
          }
        }
      `}</style>
    </div>
  );
}
