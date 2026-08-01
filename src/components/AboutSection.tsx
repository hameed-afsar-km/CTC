"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowUpRight } from "lucide-react";

interface AboutCardData {
  id: string;
  num: string;
  code: string;
  title: string;
  description: string;
}

const aboutCards: AboutCardData[] = [
  {
    id: "why-we-exist",
    num: "01",
    code: "01 / PURPOSE",
    title: "WHY WE EXIST",
    description:
      "We empower students to learn, innovate, and solve real-world challenges through technology, collaboration, and hands-on experiences beyond the classroom.",
  },
  {
    id: "what-we-do",
    num: "02",
    code: "02 / ACTIVITIES",
    title: "WHAT WE DO",
    description:
      "We organize hackathons, workshops, technical talks, projects, competitions, and networking events that help students build practical skills and industry exposure.",
  },
  {
    id: "how-we-grow",
    num: "03",
    code: "03 / COMMUNITY",
    title: "HOW WE GROW",
    description:
      "By fostering teamwork, creativity, leadership, and continuous learning, we create opportunities for every member to explore, build, and excel together.",
  },
  {
    id: "our-vision",
    num: "04",
    code: "04 / VISION",
    title: "OUR VISION",
    description:
      "To build a thriving community of future innovators, engineers, and leaders who use technology to create meaningful impact in society.",
  },
];

interface LaserRipple {
  x: number;
  y: number;
  r: number;
  maxR: number;
  alpha: number;
  speed: number;
}

export default function AboutSection() {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mouseRef = useRef({
    x: -1000,
    y: -1000,
    prevX: -1000,
    prevY: -1000,
    speed: 0,
  });

  // Bento Holographic Wavefront Canvas with Interactive Cursor Speed Ripples
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animationFrameId: number;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const ripples: LaserRipple[] = [];

    const handleMouseMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      const m = mouseRef.current;
      const currentX = e.clientX - rect.left;
      const currentY = e.clientY - rect.top;

      if (m.prevX > 0) {
        const dx = currentX - m.prevX;
        const dy = currentY - m.prevY;
        m.speed = Math.hypot(dx, dy);

        // Spawn interactive laser ripple if cursor is moving
        if (m.speed > 5 && ripples.length < 25) {
          ripples.push({
            x: currentX,
            y: currentY,
            r: 5,
            maxR: Math.min(250, m.speed * 8 + 60),
            alpha: 0.6,
            speed: Math.max(1.5, m.speed * 0.1),
          });
        }
      }

      m.x = currentX;
      m.y = currentY;
      m.prevX = currentX;
      m.prevY = currentY;
    };

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("resize", handleResize);

    // Floating particles inside wave mesh
    const particleCount = 45;
    const particles = Array.from({ length: particleCount }, () => ({
      x: Math.random() * width,
      y: Math.random() * height,
      r: Math.random() * 2.5 + 1,
      vx: (Math.random() - 0.5) * 0.5,
      vy: (Math.random() - 0.5) * 0.5,
      alpha: Math.random() * 0.5 + 0.2,
    }));

    let t = 0;

    const animate = () => {
      ctx.clearRect(0, 0, width, height);
      t += 0.012;

      // 1. Draw Bento Holographic Wavefront (3 Layered Undulating Sine Waves)
      const waveCount = 5;
      for (let i = 0; i < waveCount; i++) {
        ctx.beginPath();
        const baseAlpha = 0.15 - i * 0.025;
        ctx.strokeStyle = `rgba(52, 211, 153, ${baseAlpha})`;
        ctx.lineWidth = 1.5;

        const freq = 0.003 + i * 0.0008;
        const speed = t * (1 + i * 0.2);
        const yOffset = height * (0.35 + i * 0.08);

        for (let x = 0; x <= width; x += 20) {
          const y =
            yOffset +
            Math.sin(x * freq + speed) * 45 +
            Math.cos(x * 0.002 - speed * 0.5) * 25;
          if (x === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.stroke();
      }

      // 2. Draw & Update Interactive Cursor Speed Laser Ripples
      for (let i = ripples.length - 1; i >= 0; i--) {
        const r = ripples[i];
        r.r += r.speed;
        r.alpha *= 0.95;

        ctx.save();
        ctx.strokeStyle = `rgba(52, 211, 153, ${r.alpha})`;
        ctx.lineWidth = 1.5;
        ctx.shadowColor = "rgba(52, 211, 153, 0.8)";
        ctx.shadowBlur = 10;

        ctx.beginPath();
        ctx.arc(r.x, r.y, r.r, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();

        if (r.alpha < 0.02 || r.r > r.maxR) {
          ripples.splice(i, 1);
        }
      }

      // 3. Floating Particles inside Wavefront
      particles.forEach((p) => {
        p.x += p.vx;
        p.y += p.vy;

        if (p.x < 0) p.x = width;
        if (p.x > width) p.x = 0;
        if (p.y < 0) p.y = height;
        if (p.y > height) p.y = 0;

        ctx.fillStyle = `rgba(16, 185, 129, ${p.alpha})`;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fill();
      });

      // 4. Live Holographic Wavefront Metadata Tag
      const m = mouseRef.current;
      ctx.fillStyle = "rgba(16, 185, 129, 0.35)";
      ctx.font = "bold 11px monospace";
      ctx.fillText(
        `[HOLO_WAVEFRONT_ACTIVE // VELOCITY: ${m.speed.toFixed(1)}PX/S]`,
        40,
        height - 70
      );
      ctx.fillText(`[RIPPLE_INSTANCES: ${ripples.length}]`, 40, height - 50);

      animationFrameId = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("resize", handleResize);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  // Compute CSS Grid Template columns/rows for the 8x8 dynamic ratio grid
  const getGridTemplate = () => {
    if (hoveredIndex === null) {
      return {
        gridTemplateColumns: "1fr 1fr",
        gridTemplateRows: "1fr 1fr",
      };
    }
    const cols = hoveredIndex === 0 || hoveredIndex === 2 ? "3fr 1fr" : "1fr 3fr";
    const rows = hoveredIndex === 0 || hoveredIndex === 1 ? "3fr 1fr" : "1fr 3fr";

    return {
      gridTemplateColumns: cols,
      gridTemplateRows: rows,
    };
  };

  return (
    <section
      id="about"
      className="relative z-50 w-full min-h-screen py-20 px-4 sm:px-6 lg:px-8 bg-[#f6fcf8] text-slate-900 overflow-hidden select-none flex flex-col items-center justify-center border-t border-emerald-900/10"
    >
      {/* Bento Holographic Wavefront & Interactive Ripple Canvas */}
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full pointer-events-none z-0" />

      {/* Grid Pattern Overlay */}
      <div
        className="absolute inset-0 pointer-events-none opacity-25 z-0"
        style={{
          backgroundImage:
            "linear-gradient(to right, rgba(16,185,129,0.1) 1px, transparent 1px), linear-gradient(to bottom, rgba(16,185,129,0.1) 1px, transparent 1px)",
          backgroundSize: "36px 36px",
        }}
      />

      {/* Light Tagline ONLY above the box */}
      <div className="relative z-10 mb-8 text-center">
        <p className="font-mono text-xs sm:text-sm text-emerald-900/70 uppercase tracking-[0.35em] font-bold">
          <span className="sm:hidden">Click to Explore About Us</span>
          <span className="hidden sm:inline">Hover to Explore About Us</span>
        </p>
      </div>

      {/* Flush 8x8 Swiss Editorial Grid Box (0 Gap) */}
      <div className="relative z-10 w-full max-w-5xl">
        <div
          className="hidden md:grid gap-0 w-full h-[540px] lg:h-[600px] border border-emerald-900/20 bg-white/90 backdrop-blur-sm transition-all duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] overflow-hidden shadow-2xl shadow-emerald-950/10"
          style={getGridTemplate()}
        >
          {aboutCards.map((item, idx) => {
            const isHovered = hoveredIndex === idx;
            const isAnyHovered = hoveredIndex !== null;
            const isOtherHovered = isAnyHovered && !isHovered;

            // Shared internal borders for 2x2 flush grid layout
            const borderClasses =
              idx === 0
                ? "border-r border-b border-emerald-900/15"
                : idx === 1
                ? "border-b border-emerald-900/15"
                : idx === 2
                ? "border-r border-emerald-900/15"
                : "";

            return (
              <div
                key={item.id}
                onMouseEnter={() => setHoveredIndex(idx)}
                onMouseLeave={() => setHoveredIndex(null)}
                className={`relative flex flex-col justify-between p-8 lg:p-10 transition-all duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] cursor-pointer overflow-hidden ${borderClasses} ${
                  isHovered
                    ? "bg-[#eafbf2] text-slate-900"
                    : isOtherHovered
                    ? "bg-white/60 text-slate-400 opacity-60"
                    : "bg-white/90 text-slate-900"
                }`}
              >
                {/* Massive Typography Background Number */}
                <div
                  className={`absolute -right-4 -bottom-8 font-syne font-black transition-all duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] select-none pointer-events-none ${
                    isHovered
                      ? "text-[14rem] lg:text-[18rem] text-emerald-600/[0.12] translate-x-4 -translate-y-2"
                      : isOtherHovered
                      ? "text-[7rem] lg:text-[9rem] text-emerald-900/[0.04]"
                      : "text-[10rem] lg:text-[13rem] text-emerald-900/[0.07]"
                  }`}
                  style={{ lineHeight: 0.8 }}
                >
                  {item.num}
                </div>

                {/* Top Section: Index Code & Arrow */}
                <div className="relative z-10 flex items-center justify-between font-mono text-xs tracking-widest font-bold">
                  <span className={isHovered ? "text-emerald-700 font-extrabold" : "text-slate-400"}>
                    {item.code}
                  </span>
                  <div
                    className={`w-9 h-9 rounded-full flex items-center justify-center transition-all duration-500 ${
                      isHovered
                        ? "bg-emerald-600 text-white shadow-lg shadow-emerald-600/30 scale-105"
                        : "bg-slate-100/90 text-slate-400"
                    }`}
                  >
                    <ArrowUpRight
                      className={`w-4 h-4 transition-transform duration-500 ${
                        isHovered ? "rotate-45" : ""
                      }`}
                    />
                  </div>
                </div>

                {/* Main Content Area */}
                <div className="relative z-10 mt-auto">
                  {/* Title — Ultra-bold Swiss typography */}
                  <h3
                    className={`font-syne font-black tracking-tight uppercase transition-all duration-700 ${
                      isHovered
                        ? "text-3xl lg:text-5xl text-slate-950 mb-4"
                        : isOtherHovered
                        ? "text-lg lg:text-xl text-slate-400"
                        : "text-2xl lg:text-3xl text-slate-900"
                    }`}
                  >
                    {item.title}
                  </h3>

                  {/* Description Paragraph — Opened on hover with clean left border accent */}
                  <div
                    className={`overflow-hidden transition-all duration-700 ease-out ${
                      isHovered
                        ? "max-h-48 opacity-100 filter blur-0 translate-y-0"
                        : "max-h-0 opacity-0 filter blur-sm translate-y-3"
                    }`}
                  >
                    <p className="font-sans text-sm lg:text-base text-slate-700 font-medium leading-relaxed max-w-xl border-l-2 border-emerald-500 pl-4 py-1">
                      {item.description}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Mobile Layout (< md screens) — Swiss Editorial Card Stack */}
        <div className="flex md:hidden flex-col border border-emerald-900/20 bg-white">
          {aboutCards.map((item, idx) => {
            const isHovered = hoveredIndex === idx;

            return (
              <div
                key={item.id}
                onClick={() => setHoveredIndex(hoveredIndex === idx ? null : idx)}
                className={`p-6 transition-all duration-300 cursor-pointer relative ${
                  idx !== aboutCards.length - 1 ? "border-b border-emerald-900/15" : ""
                } ${isHovered ? "bg-[#eafbf2] text-slate-900" : "bg-white text-slate-900"}`}
              >
                <div className="flex items-center justify-between font-mono text-xs mb-2">
                  <span className="font-bold text-emerald-700">{item.code}</span>
                  <ArrowUpRight className={`w-4 h-4 ${isHovered ? "rotate-90 text-emerald-600" : "text-slate-400"}`} />
                </div>

                <h3 className="font-syne font-black text-2xl uppercase tracking-tight">
                  {item.title}
                </h3>

                <div
                  className={`transition-all duration-300 overflow-hidden ${
                    isHovered ? "max-h-40 opacity-100 mt-3 border-l-2 border-emerald-500 pl-3 py-1" : "max-h-0 opacity-0"
                  }`}
                >
                  <p className="font-sans text-sm leading-relaxed font-medium text-slate-700">
                    {item.description}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
