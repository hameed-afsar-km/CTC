"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { gsap } from "gsap";
import Link from "next/link";
import { ArrowLeft, CheckCircle2, Volume2, VolumeX, Shield, Zap, Flame } from "lucide-react";

type Difficulty = "easy" | "normal" | "hard";

const DIFFICULTY_CONFIGS: Record<
  Difficulty,
  { name: string; aiSpeed: number; puckSpeed: number; color: string }
> = {
  easy: { name: "EASY 🟢", aiSpeed: 3.0, puckSpeed: 4.5, color: "text-emerald-400 border-emerald-500/30 bg-emerald-500/10" },
  normal: { name: "NORMAL ⚡", aiSpeed: 5.0, puckSpeed: 6.0, color: "text-cyan-400 border-cyan-500/30 bg-cyan-500/10" },
  hard: { name: "CYBER HARD 💀", aiSpeed: 7.8, puckSpeed: 8.2, color: "text-rose-400 border-rose-500/30 bg-rose-500/10" },
};

export default function DeclinedPage() {
  // Difficulty & Scoreboard State
  const [difficulty, setDifficulty] = useState<Difficulty>("normal");
  const [playerScore, setPlayerScore] = useState(0);
  const [aiScore, setAiScore] = useState(0);

  // Sound FX toggle
  const [soundEnabled, setSoundEnabled] = useState(true);
  const audioCtxRef = useRef<AudioContext | null>(null);

  // Sound generator helper
  const playSound = useCallback(
    (freq = 440, type: OscillatorType = "sine", duration = 0.08) => {
      if (!soundEnabled) return;
      try {
        if (!audioCtxRef.current) {
          const AudioContextClass =
            window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
          audioCtxRef.current = new AudioContextClass();
        }
        const ctx = audioCtxRef.current;
        if (ctx.state === "suspended") {
          ctx.resume();
        }
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = type;
        osc.frequency.setValueAtTime(freq, ctx.currentTime);
        gain.gain.setValueAtTime(0.08, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start();
        osc.stop(ctx.currentTime + duration);
      } catch {
        // Audio fallback
      }
    },
    [soundEnabled]
  );

  // ── Cyber Pong vs AI Engine ──
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animId: number;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const config = DIFFICULTY_CONFIGS[difficulty];

    // Player Paddle (Bottom)
    const player = {
      width: Math.min(140, width * 0.26),
      height: 16,
      x: width / 2 - 70,
      y: height - 110,
      targetX: width / 2 - 70,
      hitFlash: 0,
    };

    // AI Paddle (Top)
    const ai = {
      width: Math.min(140, width * 0.26),
      height: 16,
      x: width / 2 - 70,
      y: 90,
      speed: config.aiSpeed,
      hitFlash: 0,
    };

    // Energy Ball (Puck)
    const puck = {
      x: width / 2,
      y: height / 2,
      radius: 11,
      vx: config.puckSpeed * (Math.random() > 0.5 ? 1 : -1),
      vy: config.puckSpeed * (Math.random() > 0.5 ? 1 : -1),
      trail: [] as { x: number; y: number; alpha: number }[],
    };

    const particles: { x: number; y: number; vx: number; vy: number; alpha: number; color: string }[] = [];
    const shockwaves: { x: number; y: number; radius: number; maxRadius: number; alpha: number; color: string }[] = [];

    const resetPuck = (towardsPlayer = false) => {
      puck.x = width / 2;
      puck.y = height / 2;
      puck.trail = [];
      const spd = DIFFICULTY_CONFIGS[difficulty].puckSpeed;
      puck.vx = (Math.random() > 0.5 ? spd : -spd);
      puck.vy = towardsPlayer ? spd : -spd;
    };

    const handleResize = () => {
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
      player.width = Math.min(140, width * 0.26);
      ai.width = Math.min(140, width * 0.26);
      player.y = height - 110;
    };

    const handleMouseMove = (e: MouseEvent) => {
      player.targetX = e.clientX - player.width / 2;
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (e.touches[0]) {
        player.targetX = e.touches[0].clientX - player.width / 2;
      }
    };

    // Keyboard controls
    const keys: Record<string, boolean> = {};
    const handleKeyDown = (e: KeyboardEvent) => {
      keys[e.key] = true;
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      keys[e.key] = false;
    };

    window.addEventListener("resize", handleResize);
    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("touchmove", handleTouchMove);
    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);

    const spawnSparks = (x: number, y: number, color: string) => {
      for (let p = 0; p < 18; p++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = Math.random() * 5 + 1.5;
        particles.push({
          x,
          y,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          alpha: 1,
          color,
        });
      }
      shockwaves.push({
        x,
        y,
        radius: 5,
        maxRadius: 35,
        alpha: 1,
        color,
      });
    };

    let frameCount = 0;

    const render = () => {
      ctx.clearRect(0, 0, width, height);
      frameCount++;

      // Keyboard player paddle movement
      if (keys["ArrowLeft"] || keys["a"]) player.targetX -= 12;
      if (keys["ArrowRight"] || keys["d"]) player.targetX += 12;

      // Keep player paddle in bounds
      player.targetX = Math.max(10, Math.min(width - player.width - 10, player.targetX));
      player.x += (player.targetX - player.x) * 0.25;

      // AI Paddle Movement
      const aiTarget = puck.x - ai.width / 2;
      const aiDiff = aiTarget - ai.x;
      ai.x += Math.max(-ai.speed, Math.min(ai.speed, aiDiff * 0.14));
      ai.x = Math.max(10, Math.min(width - ai.width - 10, ai.x));

      // Decrement hit flashes
      if (player.hitFlash > 0) player.hitFlash--;
      if (ai.hitFlash > 0) ai.hitFlash--;

      // Update Puck Trail
      puck.trail.unshift({ x: puck.x, y: puck.y, alpha: 1 });
      if (puck.trail.length > 12) puck.trail.pop();
      puck.trail.forEach((t) => (t.alpha -= 0.08));

      // Update Puck Position
      puck.x += puck.vx;
      puck.y += puck.vy;

      // Side Wall Collisions
      if (puck.x - puck.radius < 0) {
        puck.x = puck.radius;
        puck.vx *= -1;
        playSound(450, "sine", 0.04);
        spawnSparks(puck.x, puck.y, "#22d3ee");
      }
      if (puck.x + puck.radius > width) {
        puck.x = width - puck.radius;
        puck.vx *= -1;
        playSound(450, "sine", 0.04);
        spawnSparks(puck.x, puck.y, "#22d3ee");
      }

      // Player Paddle Collision (Bottom)
      if (
        puck.y + puck.radius >= player.y &&
        puck.y - puck.radius <= player.y + player.height &&
        puck.x >= player.x &&
        puck.x <= player.x + player.width
      ) {
        puck.vy = -Math.abs(puck.vy) * 1.03;
        const hitPoint = (puck.x - (player.x + player.width / 2)) / (player.width / 2);
        puck.vx = hitPoint * 7.5;
        player.hitFlash = 10;
        spawnSparks(puck.x, player.y, "#34d399");
        playSound(650, "sine", 0.06);
      }

      // AI Paddle Collision (Top)
      if (
        puck.y - puck.radius <= ai.y + ai.height &&
        puck.y + puck.radius >= ai.y &&
        puck.x >= ai.x &&
        puck.x <= ai.x + ai.width
      ) {
        puck.vy = Math.abs(puck.vy) * 1.03;
        const hitPoint = (puck.x - (ai.x + ai.width / 2)) / (ai.width / 2);
        puck.vx = hitPoint * 7.5;
        ai.hitFlash = 10;
        spawnSparks(puck.x, ai.y + ai.height, "#f43f5e");
        playSound(550, "sine", 0.06);
      }

      // Scoring: Player Scores
      if (puck.y - puck.radius < 0) {
        setPlayerScore((prev) => prev + 1);
        playSound(850, "triangle", 0.15);
        spawnSparks(puck.x, 20, "#34d399");
        resetPuck(true);
      }

      // Scoring: AI Scores
      if (puck.y + puck.radius > height) {
        setAiScore((prev) => prev + 1);
        playSound(220, "sawtooth", 0.15);
        spawnSparks(puck.x, height - 20, "#f43f5e");
        resetPuck(false);
      }

      // Draw Arena Center Dashed Line
      ctx.strokeStyle = "rgba(52, 211, 153, 0.15)";
      ctx.lineWidth = 2;
      ctx.setLineDash([12, 12]);
      ctx.beginPath();
      ctx.moveTo(0, height / 2);
      ctx.lineTo(width, height / 2);
      ctx.stroke();
      ctx.setLineDash([]);

      // ── Draw Shockwaves ──
      for (let i = shockwaves.length - 1; i >= 0; i--) {
        const sw = shockwaves[i];
        sw.radius += 2.2;
        sw.alpha -= 0.05;

        if (sw.alpha <= 0 || sw.radius >= sw.maxRadius) {
          shockwaves.splice(i, 1);
          continue;
        }

        ctx.strokeStyle = sw.color;
        ctx.globalAlpha = sw.alpha;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(sw.x, sw.y, sw.radius, 0, Math.PI * 2);
        ctx.stroke();
        ctx.globalAlpha = 1;
      }

      // ── Draw Spark Particles ──
      for (let i = particles.length - 1; i >= 0; i--) {
        const pt = particles[i];
        pt.x += pt.vx;
        pt.y += pt.vy;
        pt.alpha -= 0.03;

        if (pt.alpha <= 0) {
          particles.splice(i, 1);
          continue;
        }

        ctx.fillStyle = pt.color;
        ctx.globalAlpha = pt.alpha;
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, 3, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
      }

      // ── DRAW PADDLE (AI - TOP - ROSE NEON CAPSULE) ──
      const aiGrad = ctx.createLinearGradient(ai.x, ai.y, ai.x + ai.width, ai.y);
      if (ai.hitFlash > 0) {
        aiGrad.addColorStop(0, "#ffffff");
        aiGrad.addColorStop(0.5, "#f43f5e");
        aiGrad.addColorStop(1, "#ffffff");
      } else {
        aiGrad.addColorStop(0, "#f43f5e");
        aiGrad.addColorStop(0.5, "#fb7185");
        aiGrad.addColorStop(1, "#f43f5e");
      }

      ctx.fillStyle = aiGrad;
      ctx.shadowColor = "#f43f5e";
      ctx.shadowBlur = ai.hitFlash > 0 ? 30 : 18;
      ctx.beginPath();
      ctx.roundRect(ai.x, ai.y, ai.width, ai.height, 8);
      ctx.fill();

      // Metallic border
      ctx.strokeStyle = "rgba(255, 255, 255, 0.7)";
      ctx.lineWidth = 1.5;
      ctx.stroke();
      ctx.shadowBlur = 0;

      // Pulse LED Core Line
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(ai.x + 16, ai.y + ai.height / 2);
      ctx.lineTo(ai.x + ai.width - 16, ai.y + ai.height / 2);
      ctx.stroke();

      // Glowing Laser End-Caps
      ctx.fillStyle = "#ffffff";
      ctx.beginPath();
      ctx.arc(ai.x + 8, ai.y + ai.height / 2, 3, 0, Math.PI * 2);
      ctx.arc(ai.x + ai.width - 8, ai.y + ai.height / 2, 3, 0, Math.PI * 2);
      ctx.fill();

      // ── DRAW PADDLE (PLAYER - BOTTOM - MINT NEON CAPSULE) ──
      const playerGrad = ctx.createLinearGradient(player.x, player.y, player.x + player.width, player.y);
      if (player.hitFlash > 0) {
        playerGrad.addColorStop(0, "#ffffff");
        playerGrad.addColorStop(0.5, "#34d399");
        playerGrad.addColorStop(1, "#ffffff");
      } else {
        playerGrad.addColorStop(0, "#34d399");
        playerGrad.addColorStop(0.5, "#6ee7b7");
        playerGrad.addColorStop(1, "#34d399");
      }

      ctx.fillStyle = playerGrad;
      ctx.shadowColor = "#34d399";
      ctx.shadowBlur = player.hitFlash > 0 ? 30 : 18;
      ctx.beginPath();
      ctx.roundRect(player.x, player.y, player.width, player.height, 8);
      ctx.fill();

      // Metallic border
      ctx.strokeStyle = "rgba(255, 255, 255, 0.7)";
      ctx.lineWidth = 1.5;
      ctx.stroke();
      ctx.shadowBlur = 0;

      // Pulse LED Core Line
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(player.x + 16, player.y + player.height / 2);
      ctx.lineTo(player.x + player.width - 16, player.y + player.height / 2);
      ctx.stroke();

      // Glowing Laser End-Caps
      ctx.fillStyle = "#ffffff";
      ctx.beginPath();
      ctx.arc(player.x + 8, player.y + player.height / 2, 3, 0, Math.PI * 2);
      ctx.arc(player.x + player.width - 8, player.y + player.height / 2, 3, 0, Math.PI * 2);
      ctx.fill();

      // ── DRAW ENERGY BALL (COMET TRAIL + ORBITAL SPHERE) ──
      // 1. Comet Tail
      puck.trail.forEach((tr, index) => {
        if (tr.alpha <= 0) return;
        const trailRadius = puck.radius * (1 - index / 14);
        ctx.fillStyle = `rgba(34, 211, 238, ${tr.alpha * 0.45})`;
        ctx.shadowColor = "#22d3ee";
        ctx.shadowBlur = 10;
        ctx.beginPath();
        ctx.arc(tr.x, tr.y, Math.max(2, trailRadius), 0, Math.PI * 2);
        ctx.fill();
      });

      // 2. Rotating Orbital Energy Ring
      ctx.save();
      ctx.translate(puck.x, puck.y);
      ctx.rotate(frameCount * 0.06);
      ctx.strokeStyle = "rgba(255, 255, 255, 0.8)";
      ctx.lineWidth = 1.5;
      ctx.shadowColor = "#22d3ee";
      ctx.shadowBlur = 12;
      ctx.beginPath();
      ctx.ellipse(0, 0, puck.radius + 5, (puck.radius + 5) * 0.4, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();

      // 3. Main Outer Aura & Sphere Gradient
      const puckGrad = ctx.createRadialGradient(puck.x, puck.y, 1, puck.x, puck.y, puck.radius + 3);
      puckGrad.addColorStop(0, "#ffffff");
      puckGrad.addColorStop(0.4, "#22d3ee");
      puckGrad.addColorStop(1, "#0284c7");

      ctx.fillStyle = puckGrad;
      ctx.shadowColor = "#22d3ee";
      ctx.shadowBlur = 24;
      ctx.beginPath();
      ctx.arc(puck.x, puck.y, puck.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;

      // 4. White-Hot Core
      ctx.fillStyle = "#ffffff";
      ctx.beginPath();
      ctx.arc(puck.x, puck.y, 4, 0, Math.PI * 2);
      ctx.fill();

      animId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("touchmove", handleTouchMove);
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, [difficulty, playSound]);

  return (
    <main className="h-screen max-h-screen w-screen bg-[#030712] text-white flex flex-col justify-between p-4 sm:p-6 md:p-8 relative overflow-hidden font-sans select-none">
      {/* Cyber Pong Canvas Engine */}
      <canvas ref={canvasRef} className="fixed inset-0 w-full h-full cursor-none z-0" />

      {/* Ambient Radial Glow Background */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[350px] bg-rose-500/10 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute bottom-1/4 left-1/2 -translate-x-1/2 w-[500px] h-[300px] bg-emerald-500/10 rounded-full blur-[140px] pointer-events-none" />

      {/* ── Top Header Controls & Live Scoreboard ── */}
      <header className="relative z-20 w-full max-w-5xl mx-auto flex items-center justify-between py-1">
        {/* Live Scoreboard */}
        <div className="flex items-center gap-3 px-4 py-1.5 rounded-full bg-slate-900/90 border border-slate-800 backdrop-blur-md shadow-lg font-mono text-xs">
          <span className="text-emerald-400 font-bold">YOU: {playerScore}</span>
          <span className="text-slate-600">|</span>
          <span className="text-rose-400 font-bold">AI: {aiScore}</span>
        </div>

        {/* Difficulty Selector Bar */}
        <div className="flex items-center gap-1.5 p-1 rounded-full bg-slate-900/90 border border-slate-800 backdrop-blur-md">
          {(["easy", "normal", "hard"] as Difficulty[]).map((d) => (
            <button
              key={d}
              onClick={() => {
                setDifficulty(d);
                playSound(600, "sine", 0.05);
              }}
              className={`px-3 py-1 rounded-full font-mono text-[10px] uppercase font-bold transition-all ${
                difficulty === d
                  ? DIFFICULTY_CONFIGS[d].color + " shadow-md"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              {d.toUpperCase()}
            </button>
          ))}
        </div>

        {/* SFX Toggle */}
        <button
          onClick={() => {
            setSoundEnabled(!soundEnabled);
            playSound(500, "sine", 0.08);
          }}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-900/90 border border-slate-800 text-xs font-mono text-slate-300 hover:border-emerald-500/40 hover:text-emerald-400 transition-all backdrop-blur-md"
        >
          {soundEnabled ? <Volume2 className="w-3.5 h-3.5 text-emerald-400" /> : <VolumeX className="w-3.5 h-3.5 text-slate-500" />}
          <span className="hidden sm:inline">{soundEnabled ? "SFX ON" : "MUTED"}</span>
        </button>
      </header>

      {/* ── Main Headline (Strictly "YOU REJECTED, SO DID WE!") ── */}
      <header className="relative z-10 flex flex-col items-center text-center pointer-events-none my-auto">
        <h1 className="text-4xl sm:text-6xl md:text-8xl font-black uppercase tracking-tighter text-white drop-shadow-[0_0_35px_rgba(244,63,94,0.4)]">
          YOU REJECTED, <br />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-rose-500 via-amber-400 to-emerald-400">
            SO DID WE!
          </span>
        </h1>
      </header>

      {/* ── Cyber Neon CTA Buttons ── */}
      <footer className="relative z-20 w-full max-w-lg mx-auto mb-2">
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link
            href="/"
            className="group w-full sm:w-1/2 flex items-center justify-center gap-3 px-7 py-4 rounded-full bg-[#0a0f1d]/90 hover:bg-[#111827] text-cyan-300 hover:text-white font-mono text-xs font-bold uppercase tracking-widest border border-cyan-500/40 hover:border-cyan-400 backdrop-blur-xl shadow-[0_0_25px_rgba(34,211,238,0.2)] hover:shadow-[0_0_35px_rgba(34,211,238,0.45)] transition-all duration-300 hover:scale-105"
          >
            <ArrowLeft className="w-4 h-4 text-cyan-400 group-hover:-translate-x-1 transition-transform" />
            <span>Return to Home</span>
          </Link>

          <Link
            href="/hostit"
            className="group w-full sm:w-1/2 flex items-center justify-center gap-3 px-7 py-4 rounded-full bg-gradient-to-r from-emerald-500 via-teal-400 to-emerald-500 hover:from-emerald-400 hover:to-teal-300 text-slate-950 font-mono text-xs font-black uppercase tracking-widest shadow-[0_0_30px_rgba(52,211,153,0.5)] hover:shadow-[0_0_45px_rgba(52,211,153,0.85)] transition-all duration-300 hover:scale-105"
          >
            <CheckCircle2 className="w-4 h-4 text-slate-950 group-hover:scale-110 group-hover:rotate-12 transition-transform" />
            <span>Agree Again</span>
          </Link>
        </div>
      </footer>
    </main>
  );
}
