"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { CustomEase } from "gsap/CustomEase";
import EventsShowcase from "@/components/EventsShowcase";
import AboutSection from "@/components/AboutSection";
import TeamSection from "@/components/TeamSection";
import HostItSection from "@/components/HostItSection";
import IdeasMarquee from "@/components/IdeasMarquee";
import HomeFooter from "@/components/HomeFooter";
import MusicToggle from "@/components/MusicToggle";
import WelcomeTour from "@/components/WelcomeTour";
import FocusTicker from "@/components/FocusTicker";
import LightBeamButton from "@/components/LightBeamButton";
import { useSmoothScroll } from "@/components/SmoothScroll";

gsap.registerPlugin(ScrollTrigger, CustomEase);

CustomEase.create("smooth", "0.43, 0.13, 0.23, 0.96");
CustomEase.create("smoothOut", "0.65, 0, 0.35, 1");

export default function Home() {
  const lenis = useSmoothScroll();
  const [splashDone, setSplashDone] = useState(false);
  const [musicResolved, setMusicResolved] = useState(false);
  const [showWelcomeTour, setShowWelcomeTour] = useState(false);
  const [splashReveal, setSplashReveal] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [focusTickerOn, setFocusTickerOn] = useState(false);

  const navRef = useRef<HTMLElement>(null);
  const navWrapRef = useRef<HTMLDivElement>(null);
  const pinRef = useRef<HTMLDivElement>(null);
  const textWrapRef = useRef<HTMLDivElement>(null);
  const crescentRef = useRef<HTMLHeadingElement>(null);
  const technocratsRef = useRef<HTMLHeadingElement>(null);
  const clubRef = useRef<HTMLHeadingElement>(null);
  const indicatorRef = useRef<HTMLDivElement>(null);
  const sparkleRef = useRef<HTMLDivElement>(null);
  const splashRef = useRef<HTMLDivElement>(null);
  const splashGlowRef = useRef<HTMLDivElement>(null);
  const splashTitleRef = useRef<HTMLHeadingElement>(null);
  const splashLaserRef = useRef<HTMLDivElement>(null);
  const splashCapsuleRef = useRef<HTMLDivElement>(null);
  const orbitalRingsRef = useRef<HTMLDivElement[]>([]);
  const heroParticlesRef = useRef<HTMLCanvasElement>(null);
  const heroGlowRef = useRef<HTMLDivElement>(null);
  const heroFxRef = useRef<{
    covered: boolean;
    setCovered: (c: boolean) => void;
    releaseBuffer: () => void;
    restoreBuffer: () => void;
  } | null>(null);
  const ringTweensRef = useRef<gsap.core.Tween[]>([]);

  // Orbital rings configuration
  const orbitalRings = useMemo(() => [
    { id: 0, size: 340, speed: 25, tiltX: 55, tiltY: 0, borderOpacity: 0.4, delay: 0 },
    { id: 1, size: 260, speed: -20, tiltX: 0, tiltY: 40, borderOpacity: 0.5, delay: 0.5 },
    { id: 2, size: 420, speed: 18, tiltX: 35, tiltY: 25, borderOpacity: 0.35, delay: 1.0 },
    { id: 3, size: 180, speed: -35, tiltX: 25, tiltY: -15, borderOpacity: 0.55, delay: 0.3 },
    { id: 4, size: 300, speed: 22, tiltX: 45, tiltY: -30, borderOpacity: 0.4, delay: 0.8 },
  ], []);

  const scrollToTop = (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    if (lenis) {
      lenis.scrollTo(0);
    } else {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  // Interactive Particle Constellation + Mouse Spotlight — drifting particles link into a constellation,
  // scatter away from the cursor, and a soft mint glow follows the mouse around the hero
  useEffect(() => {
    if (!splashDone) return;

    const canvas = heroParticlesRef.current;
    const glow = heroGlowRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const mouse = { x: -9999, y: -9999, active: false };
    let width = 0;
    let height = 0;
    let raf = 0;
    let particles: { x: number; y: number; vx: number; vy: number; r: number; o: number; tw: number }[] = [];

    const resize = () => {
      const parent = canvas.parentElement;
      if (!parent) return;
      width = parent.clientWidth;
      height = parent.clientHeight;
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    const makeParticles = () => {
      const count = Math.min(Math.round((width * height) / 16000), 90);
      particles = Array.from({ length: count }, () => ({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * 0.35,
        vy: (Math.random() - 0.5) * 0.35,
        r: Math.random() * 1.8 + 0.6,
        o: Math.random() * 0.35 + 0.08,
        tw: Math.random() * Math.PI * 2,
      }));
    };

    const onResize = () => {
      resize();
      makeParticles();
    };
    onResize();

    const onMouseMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      mouse.x = e.clientX - rect.left;
      mouse.y = e.clientY - rect.top;
      mouse.active = true;
      if (glow) {
        glow.style.setProperty("--mouse-x", `${mouse.x}px`);
        glow.style.setProperty("--mouse-y", `${mouse.y}px`);
      }
    };
    const onMouseLeave = () => {
      mouse.x = -9999;
      mouse.y = -9999;
      mouse.active = false;
    };

    const REPEL = 110;
    const LINK = 115;

    const render = () => {
      ctx.clearRect(0, 0, width, height);

      const links: { ax: number; ay: number; bx: number; by: number; a: number }[] = [];

      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        p.x += p.vx;
        p.y += p.vy;
        p.tw += 0.02;

        if (mouse.active) {
          const dx = p.x - mouse.x;
          const dy = p.y - mouse.y;
          const d2 = dx * dx + dy * dy;
          if (d2 < REPEL * REPEL && d2 > 0.0001) {
            const d = Math.sqrt(d2);
            const force = (REPEL - d) / REPEL;
            p.x += (dx / d) * force * 2.4;
            p.y += (dy / d) * force * 2.4;
          }
        }

        if (p.x < -10) p.x = width + 10;
        else if (p.x > width + 10) p.x = -10;
        if (p.y < -10) p.y = height + 10;
        else if (p.y > height + 10) p.y = -10;

        const alpha = p.o * (0.6 + 0.4 * Math.sin(p.tw));
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(16, 185, 129, ${alpha})`;
        ctx.fill();

        for (let j = i + 1; j < particles.length; j++) {
          const q = particles[j];
          const dx = p.x - q.x;
          const dy = p.y - q.y;
          const d2 = dx * dx + dy * dy;
          if (d2 < LINK * LINK) {
            links.push({
              ax: p.x,
              ay: p.y,
              bx: q.x,
              by: q.y,
              a: (1 - Math.sqrt(d2) / LINK) * 0.13,
            });
          }
        }
      }

      for (const l of links) {
        ctx.beginPath();
        ctx.moveTo(l.ax, l.ay);
        ctx.lineTo(l.bx, l.by);
        ctx.strokeStyle = `rgba(52, 211, 153, ${l.a})`;
        ctx.lineWidth = 1;
        ctx.stroke();
      }
    };

    const loop = () => {
      if (fx.covered) {
        raf = 0;
        return;
      }
      render();
      raf = requestAnimationFrame(loop);
    };

    const fx = {
      covered: false,
      bufferReleased: false,
      setCovered(covered: boolean) {
        fx.covered = covered;
        if (covered) {
          cancelAnimationFrame(raf);
          raf = 0;
        } else if (raf === 0) {
          raf = requestAnimationFrame(loop);
        }
      },
      releaseBuffer() {
        if (fx.bufferReleased) return;
        fx.bufferReleased = true;
        canvas.width = 0;
        canvas.height = 0;
      },
      restoreBuffer() {
        if (!fx.bufferReleased) return;
        fx.bufferReleased = false;
        resize();
        makeParticles();
        render();
      },
    };
    heroFxRef.current = fx;

    loop();

    window.addEventListener("resize", onResize);
    window.addEventListener("mousemove", onMouseMove);
    document.addEventListener("mouseleave", onMouseLeave);

    return () => {
      cancelAnimationFrame(raf);
      heroFxRef.current = null;
      window.removeEventListener("resize", onResize);
      window.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("mouseleave", onMouseLeave);
    };
  }, [splashDone]);

  // When the hero is scrolled fully out from under the opaque sections above it,
  // freeze its particle canvas + orbital rings and hide the canvas — the hero is
  // visually covered by every following section's opaque background, so nothing
  // user-visible changes. Once the second section (About) covers it, hide the
  // whole hero (keeps the 100vh layout slot — no scroll shift) and zero out the
  // particle canvas buffer to release its GPU backing memory. Restores as soon
  // as the user scrolls back up.
  useEffect(() => {
    if (!splashDone) return;

    const hero = pinRef.current;
    const canvas = heroParticlesRef.current;
    if (!hero) return;

    const freeze = () => {
      heroFxRef.current?.setCovered(true);
      ringTweensRef.current.forEach((t) => t.pause());
      if (canvas) canvas.style.visibility = "hidden";
    };

    const unfreeze = () => {
      heroFxRef.current?.setCovered(false);
      ringTweensRef.current.forEach((t) => t.resume());
      if (canvas) canvas.style.visibility = "visible";
    };

    const getCoveredAt = () => {
      const about = document.getElementById("about");
      return about ? about.offsetTop : hero.offsetHeight * 2;
    };

    let hidden = false;

    const update = () => {
      if (hero.offsetHeight <= 0) return;

      // Hide floating navbar when entering the footer
      const currentScroll = window.scrollY;
      const footerElement = document.querySelector("footer");
      const footerOffset = footerElement ? footerElement.offsetTop : document.documentElement.scrollHeight;
      
      // Threshold is when the top of the viewport reaches the top edge of the footer (or just slightly before it)
      const footerThreshold = footerOffset - 50; 

      if (navWrapRef.current) {
        if (currentScroll >= footerThreshold) {
          navWrapRef.current.classList.add("nav-hidden");
        } else {
          navWrapRef.current.classList.remove("nav-hidden");
        }
      }

      if (currentScroll >= getCoveredAt() - 2) {
        if (!hidden) {
          hidden = true;
          heroFxRef.current?.releaseBuffer();
          hero.style.visibility = "hidden";
        }
      } else if (hidden) {
        hidden = false;
        heroFxRef.current?.restoreBuffer();
        hero.style.visibility = "visible";
      }

      if (currentScroll >= hero.offsetHeight - 2) {
        freeze();
      } else {
        unfreeze();
      }
    };

    const onVisibility = () => {
      if (document.hidden) freeze();
      else update();
    };

    update();
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      window.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [splashDone]);

  // Splash Screen Timeline — Cyber Holographic Capsule Reveal
  useEffect(() => {
    if (!splashRef.current || !splashCapsuleRef.current) return;

    let tl: gsap.core.Timeline | null = null;
    let disposed = false;

    const build = () => {
      if (disposed) return;

      const splashTl = gsap.timeline({
        onComplete: () => {
          if (splashRef.current) splashRef.current.style.display = "none";
          setSplashDone(true);
        },
      });
      tl = splashTl;

      // 1. Glow & Laser beam line sweep horizontally
      if (splashGlowRef.current) {
        splashTl.fromTo(
          splashGlowRef.current,
          { scale: 0.3, opacity: 0 },
          { scale: 1.3, opacity: 1, duration: 1.6, ease: "power2.out" },
          0
        );
      }

      if (splashLaserRef.current) {
        splashTl.fromTo(
          splashLaserRef.current,
          { width: "0%" },
          { width: "80%", duration: 0.8, ease: "power3.inOut" },
          0.1
        );
        splashTl.to(
          splashLaserRef.current,
          { width: "100%", opacity: 0, duration: 0.5, ease: "power2.out" },
          0.9
        );
      }

      // 2. Holographic Capsule scale snap reveal
      splashTl.fromTo(
        splashCapsuleRef.current,
        { scale: 0.85, opacity: 0, filter: "blur(12px)" },
        { scale: 1, opacity: 1, filter: "blur(0px)", duration: 1.0, ease: "back.out(1.4)" },
        0.5
      );

      // 3. Hold beat
      splashTl.to({}, { duration: 1.0 });

      // 4. Exit dissolve & portal expand
      const exitTl = gsap.timeline();
      exitTl.call(() => setSplashReveal(true), [], 0);

      exitTl.to(
        splashCapsuleRef.current,
        { scale: 1.15, opacity: 0, filter: "blur(16px)", duration: 0.8, ease: "power2.in" },
        0
      );

      exitTl.to(
        splashRef.current,
        { opacity: 0, duration: 0.8, ease: "power2.inOut" },
        0.2
      );

      splashTl.add(exitTl);
    };

    build();

    return () => {
      disposed = true;
      if (tl) tl.kill();
    };
  }, []);

  // Hero Animations Timeline — runs as the splash mask-out begins so the hero is revealed beneath the closing mask
  useEffect(() => {
    if (!splashReveal) return;

    const ctx = gsap.context(() => {
      const entranceTl = gsap.timeline({
        defaults: { ease: "power3.out" },
      });

      // 1. Navbar entrance — expands outward from the center line, then buttons blur in
      if (navWrapRef.current) {
        const expandProxy = { p: 0 };
        entranceTl.to(expandProxy, {
          p: 1,
          duration: 1.0,
          ease: "smooth",
          onUpdate: () => {
            if (navWrapRef.current) {
              const side = (1 - expandProxy.p) * 50;
              navWrapRef.current.style.clipPath = `inset(0% ${side}% 0% ${side}%)`;
            }
          },
          onComplete: () => {
            if (navWrapRef.current) {
              navWrapRef.current.style.clipPath = "";
            }
          },
        }, 0);
      }
      if (navRef.current) {
        entranceTl.fromTo(
          navRef.current,
          { opacity: 0 },
          { opacity: 1, duration: 0.8, ease: "smooth" },
          0.15
        );

        const navItems = navRef.current.querySelectorAll(".nav-item");
        if (navItems.length > 0) {
          entranceTl.fromTo(
            navItems,
            { y: -12, opacity: 0, filter: "blur(8px)" },
            { y: 0, opacity: 1, filter: "blur(0px)", duration: 0.6, stagger: 0.04 },
            0.45
          );
        }
      }

      // 2. Logo entrance
      if (crescentRef.current) {
        entranceTl.fromTo(
          crescentRef.current,
          { y: -30, opacity: 0, filter: "blur(8px)" },
          { y: 0, opacity: 1, filter: "blur(0px)", duration: 1.2, ease: "smooth" },
          0.1
        );
      }
      if (technocratsRef.current) {
        entranceTl.fromTo(
          technocratsRef.current,
          { scale: 0.95, opacity: 0, filter: "blur(15px)" },
          { scale: 1, opacity: 1, filter: "blur(0px)", duration: 1.4, ease: "smooth" },
          0.2
        );
      }
      if (clubRef.current) {
        entranceTl.fromTo(
          clubRef.current,
          { y: 30, opacity: 0, filter: "blur(8px)" },
          { y: 0, opacity: 1, filter: "blur(0px)", duration: 1.2, ease: "smooth" },
          0.3
        );
      }

      // 3. Accent elements entrance
      if (sparkleRef.current) {
        entranceTl.fromTo(
          sparkleRef.current,
          { opacity: 0, scale: 0.5, rotation: -45 },
          { opacity: 0.25, scale: 1, rotation: 0, duration: 1.5, ease: "power3.out" },
          0.5
        );
      }
      if (indicatorRef.current) {
        entranceTl.fromTo(
          indicatorRef.current,
          { opacity: 0, y: 20 },
          { opacity: 1, y: 0, duration: 1.0, ease: "power3.out" },
          0.6
        );
      }

      // 3b. Particle constellation & mouse spotlight fade in
      if (heroParticlesRef.current) {
        entranceTl.fromTo(
          heroParticlesRef.current,
          { opacity: 0 },
          { opacity: 1, duration: 1.6, ease: "power3.out" },
          0.4
        );
      }
      if (heroGlowRef.current) {
        entranceTl.fromTo(
          heroGlowRef.current,
          { opacity: 0 },
          { opacity: 1, duration: 1.2, ease: "power3.out" },
          0.5
        );
      }

      // 4. Orbital rings entrance & rotation animation
      const ringEls = orbitalRingsRef.current.filter(Boolean);
      if (ringEls.length) {
        ringEls.forEach((el, i) => {
          gsap.set(el, {
            rotationX: orbitalRings[i].tiltX,
            rotationY: orbitalRings[i].tiltY,
          });
        });

        entranceTl.fromTo(
          ringEls,
          { opacity: 0, scale: 0.7 },
          { opacity: 1, scale: 1, duration: 1.5, ease: "power3.out", stagger: 0.15 },
          0.3
        );

        ringTweensRef.current = ringEls.map((el, i) =>
          gsap.to(el, {
            rotation: 360,
            duration: orbitalRings[i].speed,
            repeat: -1,
            ease: "none",
            delay: orbitalRings[i].delay,
          })
        );
      }
    });

    return () => ctx.revert();
  }, [splashReveal]);

  return (
    <>
      {/* Splash Screen — Cyber-Holographic Capsule Reveal */}
      <div
        ref={splashRef}
        className="fixed inset-0 z-[100] flex flex-col items-center justify-center overflow-hidden bg-[#040706] select-none"
      >
        {/* Ambient Grid Background */}
        <div
          className="absolute inset-0 pointer-events-none opacity-20"
          style={{
            backgroundImage:
              "radial-gradient(circle, rgba(52,211,153,0.15) 1px, transparent 1px)",
            backgroundSize: "32px 32px",
          }}
        />

        {/* Glowing Ambient Radial Glow */}
        <div
          ref={splashGlowRef}
          className="absolute w-[600px] h-[600px] rounded-full pointer-events-none opacity-0"
          style={{
            background:
              "radial-gradient(circle, rgba(52,211,153,0.2) 0%, rgba(99,102,241,0.1) 45%, transparent 70%)",
          }}
        />

        {/* Laser Beam Line */}
        <div
          ref={splashLaserRef}
          className="absolute h-[2px] w-0 bg-gradient-to-r from-transparent via-emerald-400 to-transparent shadow-[0_0_20px_rgba(52,211,153,0.9)] z-20"
        />

        {/* Holographic Capsule Container */}
        <div
          ref={splashCapsuleRef}
          className="relative z-10 opacity-0 scale-90"
        >
          <div className="flex items-center gap-3.5 px-5 sm:px-12 py-4 sm:py-5 rounded-full bg-emerald-950/30 border border-emerald-500/30 backdrop-blur-2xl shadow-[0_0_60px_rgba(52,211,153,0.18)]">
            <span className="text-base sm:text-xl text-emerald-400 animate-pulse">✦</span>
            <h1
              ref={splashTitleRef}
              className="font-syne text-[22px] sm:text-4xl md:text-5xl font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-white via-emerald-100 to-teal-300 drop-shadow-[0_0_25px_rgba(52,211,153,0.4)] whitespace-nowrap"
            >
              Hey Technocrat!
            </h1>
            <span className="text-base sm:text-xl text-emerald-400 animate-pulse">✦</span>
          </div>
        </div>
      </div>

      {/* Background Music Toggle — bottom right, fades in after the splash ends */}
      <MusicToggle
        start={splashDone}
        onResolved={() => {
          setMusicResolved(true);
        }}
      />

      {/* Welcome tour — question-mark toggle at the bottom left (fades in after splash & music resolved) — manual open only */}
      <WelcomeTour
        start={splashDone && musicResolved}
        autoOpen={false}
        onAutoOpen={() => setShowWelcomeTour(false)}
      />

      {/* Currently Focusing Ticker — fixed to the very top of the page */}
      <FocusTicker
        onActiveChange={setFocusTickerOn}
        hidden={mobileMenuOpen}
      />

      {/* ── Full-Screen Mobile Overlay Menu ── */}
      <div
        aria-modal="true"
        role="dialog"
        className={`fixed inset-0 z-[80] md:hidden transition-all duration-500 ease-in-out flex flex-col ${
          mobileMenuOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        }`}
        style={{
          background: "rgba(8,12,11,0.97)",
          backdropFilter: "blur(28px)",
          WebkitBackdropFilter: "blur(28px)",
          // Drop the full-screen blur surface when closed (visibility hides the
          // backdrop-filter), while still allowing the fade-out to play.
          visibility: mobileMenuOpen ? "visible" : "hidden",
          transition: mobileMenuOpen
            ? "opacity 500ms ease, visibility 0s linear 0s"
            : "opacity 500ms ease, visibility 0s linear 500ms",
        }}
      >
        {/* Grid decoration */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage:
              "linear-gradient(to right,rgba(52,211,153,0.04) 1px,transparent 1px),linear-gradient(to bottom,rgba(52,211,153,0.04) 1px,transparent 1px)",
            backgroundSize: "40px 40px",
          }}
        />
        {/* Ambient glow orbs */}
        <div className="absolute top-1/4 left-1/4 w-64 h-64 rounded-full pointer-events-none" style={{ background: "radial-gradient(circle, rgba(52,211,153,0.08) 0%, transparent 70%)" }} />
        <div className="absolute bottom-1/4 right-1/4 w-48 h-48 rounded-full pointer-events-none" style={{ background: "radial-gradient(circle, rgba(99,102,241,0.07) 0%, transparent 70%)" }} />

        {/* Thin separator */}
        <div className="mx-6 h-px" style={{ background: "linear-gradient(90deg,transparent,rgba(52,211,153,0.25),transparent)" }} />

        {/* Nav Links — large centered */}
        <nav className="flex-1 flex flex-col justify-center gap-1 px-6 py-8 relative z-10">
          {[
            { href: "#events",  label: "Events", num: "01" },
            { href: "#about",   label: "About",  num: "02" },
            { href: "#team",    label: "Team",   num: "03" },
            { href: "/gallery", label: "Gallery", num: "04" },
          ].map(({ href, label, num }, i) => (
            <a
              key={label}
              href={href}
              onClick={() => setMobileMenuOpen(false)}
              className="group flex items-center gap-4 py-4 border-b border-white/5 hover:border-mint/20 transition-all duration-300"
              style={{
                transform: mobileMenuOpen ? "translateX(0)" : "translateX(-24px)",
                opacity: mobileMenuOpen ? 1 : 0,
                transition: `transform 500ms cubic-bezier(0.16,1,0.3,1) ${100 + i * 80}ms, opacity 450ms ease ${80 + i * 80}ms, border-color 300ms ease`,
              }}
            >
              <span className="text-[10px] font-mono text-mint/40 group-hover:text-mint/80 transition-colors duration-300 w-6 shrink-0">{num}</span>
              <span className="font-syne text-4xl font-black tracking-tight text-white/80 group-hover:text-white transition-colors duration-300">{label}</span>
              <span className="ml-auto w-0 group-hover:w-8 h-[1.5px] rounded-full transition-all duration-400 shrink-0" style={{ background: "linear-gradient(90deg,#34d399,#6366f1)" }} />
            </a>
          ))}
        </nav>

        {/* CTA row at the bottom */}
        <div
          className="flex gap-3 px-6 pb-12 relative z-10"
          style={{
            transform: mobileMenuOpen ? "translateY(0)" : "translateY(16px)",
            opacity: mobileMenuOpen ? 1 : 0,
            transition: "transform 500ms cubic-bezier(0.16,1,0.3,1) 420ms, opacity 400ms ease 400ms",
          }}
        >
          <a
            href="#hostit"
            onClick={() => setMobileMenuOpen(false)}
            className="flex-1 text-center px-5 py-3.5 rounded-full border border-white/15 hover:border-mint/40 hover:bg-mint/5 font-syne text-sm font-bold tracking-wider uppercase text-white/70 hover:text-white transition-all duration-300"
          >
            <span className="text-gradient-loop">HOST&apos;IT</span>
          </a>
          <a
            href="/join"
            onClick={() => setMobileMenuOpen(false)}
            className="group flex-1 relative flex items-center justify-center gap-2 px-5 py-3.5 rounded-full bg-mint text-black font-syne text-sm font-bold tracking-wider uppercase overflow-hidden shadow-lg shadow-mint/20 hover:shadow-mint/40 hover:scale-[1.03] transition-all duration-300"
          >
            <span className="relative z-10">Join Us</span>
            <svg className="relative z-10 w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M7 17L17 7M17 7H7M17 7V17" />
            </svg>
          </a>
        </div>

        {/* Bottom tagline */}
        <p
          className="text-center pb-8 text-[10px] font-mono tracking-[0.3em] text-white/20 uppercase relative z-10"
          style={{
            opacity: mobileMenuOpen ? 1 : 0,
            transition: "opacity 600ms ease 500ms",
          }}
        >
          Crescent Technical Club
        </p>
      </div>

      {/* Floating Holographic 3D Glass Pill Navbar */}
      <div
        ref={navWrapRef}
        className="fixed left-1/2 -translate-x-1/2 z-[85] w-[92%] max-w-5xl holo-border-wrapper shadow-2xl transition-transform duration-500 hover:scale-[1.01] rounded-full"
        style={{ clipPath: "inset(0% 50% 0% 50%)", top: focusTickerOn ? "3.5rem" : "1.25rem" }}
      >
        <nav
          ref={navRef}
          className="relative w-full opacity-0 text-black transition-all duration-500"
        >
          {/* ── Desktop Row (md+) — unchanged ── */}
          <div className="hidden md:flex items-center justify-between px-6 py-2.5 holo-pill-glass rounded-full">
            {/* Left Navigation Links */}
            <div className="flex flex-1 items-center gap-1 sm:gap-2 text-xs md:text-sm font-semibold text-black/80 font-syne tracking-wider uppercase">
              <a
                href="#events"
                className="nav-item nav-item-text px-3.5 py-1.5 rounded-full hover:bg-black/5 hover:text-emerald-700 transition-all duration-300 relative group"
              >
                <span>Events</span>
                <span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-0 h-[2px] bg-gradient-to-r from-emerald-500 via-indigo-500 to-purple-500 rounded-full group-hover:w-2/3 transition-all duration-300" />
              </a>
              <a
                href="#about"
                className="nav-item nav-item-text px-3.5 py-1.5 rounded-full hover:bg-black/5 hover:text-emerald-700 transition-all duration-300 relative group"
              >
                <span>About</span>
                <span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-0 h-[2px] bg-gradient-to-r from-emerald-500 via-indigo-500 to-purple-500 rounded-full group-hover:w-2/3 transition-all duration-300" />
              </a>
              <a
                href="#team"
                className="nav-item nav-item-text px-3.5 py-1.5 rounded-full hover:bg-black/5 hover:text-emerald-700 transition-all duration-300 relative group"
              >
                <span>Team</span>
                <span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-0 h-[2px] bg-gradient-to-r from-emerald-500 via-indigo-500 to-purple-500 rounded-full group-hover:w-2/3 transition-all duration-300" />
              </a>
            </div>

            {/* Centered Holographic Brand Badge */}
            <div className="absolute left-0 right-0 top-1/2 -translate-y-1/2 flex justify-center pointer-events-none">
              <a
                href="#top"
                onClick={scrollToTop}
                aria-label="Back to top"
                className="nav-item pointer-events-auto flex items-center gap-2 px-3.5 py-1 rounded-full bg-white/40 border border-black/10 hover:bg-white/70 transition-all duration-300 group cursor-pointer shadow-sm"
              >
                <span className="text-emerald-600 group-hover:rotate-180 transition-transform duration-700 text-sm">✦</span>
                <span className="nav-item-text text-lg md:text-xl font-black tracking-widest text-gradient-loop font-syne select-none">
                  CTC
                </span>
                <span className="w-1.5 h-1.5 rounded-full bg-purple-500 animate-pulse" />
              </a>
            </div>

            {/* Right Navigation Links & Holographic CTA */}
            <div className="flex flex-1 items-center justify-end gap-2 sm:gap-4 text-xs md:text-sm font-semibold text-black/80 font-syne tracking-wider uppercase">
              <a
                href="/gallery"
                className="nav-item nav-item-text px-3.5 py-1.5 rounded-full hover:bg-black/5 hover:text-emerald-700 transition-all duration-300 relative group"
              >
                <span>Gallery</span>
                <span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-0 h-[2px] bg-gradient-to-r from-emerald-500 via-indigo-500 to-purple-500 rounded-full group-hover:w-2/3 transition-all duration-300" />
              </a>

              <a
                href="#hostit"
                className="nav-item group relative inline-flex items-center px-3.5 py-1.5 rounded-full border border-transparent hover:border-black/10 hover:bg-white/40 font-syne text-xs md:text-sm font-bold tracking-wider uppercase transition-all duration-300"
              >
                <span className="text-gradient-loop">HOST&apos;IT</span>
              </a>

              <a
                href="/join"
                className="nav-item group relative inline-flex items-center gap-2 px-5 py-2 rounded-full bg-black text-white font-syne text-xs font-bold tracking-wider uppercase overflow-hidden shadow-lg hover:shadow-purple-500/25 hover:scale-[1.04] transition-all duration-300"
              >
                <span className="relative z-10">Join Us</span>
                <svg
                  className="relative z-10 w-3.5 h-3.5 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform duration-300 text-emerald-400"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M7 17L17 7M17 7H7M17 7V17" />
                </svg>
                <div className="absolute inset-0 gradient-overlay-loop opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              </a>
            </div>
          </div>

          {/* ── Mobile Row (< md) ── */}
          <div className={`flex md:hidden items-center justify-between px-4 py-2.5 holo-pill-glass transition-all duration-300 ${mobileMenuOpen ? "rounded-t-3xl" : "rounded-3xl"}`}>
            {/* Mobile Brand Badge */}
            <a
              href="#top"
              onClick={(e) => {
                setMobileMenuOpen(false);
                scrollToTop(e);
              }}
              aria-label="Back to top"
              className="nav-item flex items-center gap-2 px-3 py-1 rounded-full bg-white/40 border border-black/10 group cursor-pointer shadow-sm"
            >
              <span className="text-emerald-600 group-hover:rotate-180 transition-transform duration-700 text-sm">✦</span>
              <span className="nav-item-text text-base font-black tracking-widest text-gradient-loop font-syne select-none">CTC</span>
              <span className="w-1.5 h-1.5 rounded-full bg-purple-500 animate-pulse" />
            </a>

            {/* Burger Button */}
            <button
              id="mobile-menu-toggle"
              aria-label={mobileMenuOpen ? "Close menu" : "Open menu"}
              aria-expanded={mobileMenuOpen}
              onClick={() => setMobileMenuOpen((prev) => !prev)}
              className="nav-item relative flex items-center justify-center w-10 h-10 rounded-full bg-white/30 border border-black/10 hover:bg-white/60 transition-all duration-300 focus:outline-none"
            >
              <span className="sr-only">{mobileMenuOpen ? "Close" : "Menu"}</span>
              {/* Animated burger → X */}
              <span className="flex flex-col items-center justify-center w-5 h-5 gap-[5px]">
                <span
                  className="block h-[2px] rounded-full bg-black/80 transition-all duration-300 origin-center"
                  style={{
                    width: mobileMenuOpen ? "18px" : "18px",
                    transform: mobileMenuOpen ? "translateY(7px) rotate(45deg)" : "none",
                  }}
                />
                <span
                  className="block h-[2px] rounded-full bg-black/80 transition-all duration-300"
                  style={{
                    width: "14px",
                    opacity: mobileMenuOpen ? 0 : 1,
                    transform: mobileMenuOpen ? "scaleX(0)" : "none",
                  }}
                />
                <span
                  className="block h-[2px] rounded-full bg-black/80 transition-all duration-300 origin-center"
                  style={{
                    width: mobileMenuOpen ? "18px" : "18px",
                    transform: mobileMenuOpen ? "translateY(-7px) rotate(-45deg)" : "none",
                  }}
                />
              </span>
            </button>
          </div>

          {/* Mobile dropdown removed — full-screen overlay is used instead */}
        </nav>
      </div>

      {/* Main Hero Container */}
      <div
        ref={pinRef}
        id="top"
        className="relative sticky top-0 z-10 min-h-screen bg-hero-gradient overflow-x-hidden overflow-y-visible flex flex-col justify-center items-center snap-start"
        data-section-theme="light"
      >
        {/* Grain Texture Overlay */}
        <div className="bg-grain opacity-60" />

        {/* Mouse Spotlight Glow */}
        <div
          ref={heroGlowRef}
          className="absolute inset-0 pointer-events-none select-none z-[1] hero-spotlight opacity-0"
          style={{ "--mouse-x": "50%", "--mouse-y": "40%" } as React.CSSProperties}
        />

        {/* Interactive Particle Constellation */}
        <canvas
          ref={heroParticlesRef}
          className="absolute inset-0 w-full h-full pointer-events-none select-none z-[1] opacity-0"
        />

        {/* Orbital Rings */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none z-[1]" style={{ perspective: "800px" }}>
          {orbitalRings.map((ring) => (
            <div
              key={ring.id}
              ref={(ref) => { if (ref) orbitalRingsRef.current[ring.id] = ref; }}
              className="absolute rounded-full"
              style={{
                width: ring.size,
                height: ring.size,
                border: `${ring.size > 300 ? 1.5 : 2}px solid rgba(52, 211, 153, ${ring.borderOpacity})`,
                boxShadow: `0 0 ${ring.size * 0.04}px rgba(52, 211, 153, ${ring.borderOpacity * 0.5})`,
                opacity: 0,
              }}
            />
          ))}
        </div>

        {/* Logo Text Stack — Pristine, Crisp Fixed Text */}
        <main ref={textWrapRef} className="flex flex-col items-center justify-center text-center select-none z-10 py-12 px-6">
          <h2
            ref={crescentRef}
            className="font-inversionz text-black text-4xl sm:text-5xl md:text-6xl lg:text-7xl tracking-[0.2em] pl-[0.2em] mb-0 uppercase leading-none opacity-0"
          >
            Crescent
          </h2>
          <h1
            ref={technocratsRef}
            className="font-nechlas text-black text-6xl sm:text-8xl md:text-[7rem] lg:text-[8rem] xl:text-[10rem] font-normal tracking-[0.08em] leading-none uppercase opacity-0"
          >
            Technocrats
          </h1>
          <h2
            ref={clubRef}
            className="font-gameshow text-black text-4xl sm:text-5xl md:text-6xl lg:text-7xl tracking-[0.15em] pl-[0.15em] mt-0 uppercase leading-none opacity-0"
          >
            Club
          </h2>

          {/* CTA Button — Join Us */}
          <LightBeamButton
            href="/join"
            className="mt-10 opacity-0"
            style={{ animation: "fadeInUp 0.8s cubic-bezier(0.16,1,0.3,1) 1.2s forwards" }}
          >
            Join Us
            <svg
              className="w-4 h-4 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform duration-300 text-emerald-400"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M7 17L17 7M17 7H7M17 7V17" />
            </svg>
          </LightBeamButton>
        </main>

        {/* Sparkle Icon (Bottom Right, matching mockup) */}
        <div
          ref={sparkleRef}
          className="absolute bottom-10 right-10 opacity-0 text-black/25 pointer-events-none"
        >
          <svg className="w-8 h-8 animate-pulse-glow" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 0L14.6 9.4L24 12L14.6 14.6L12 24L9.4 14.6L0 12L9.4 9.4L12 0Z" />
          </svg>
        </div>

        {/* Scroll Down Indicator */}
        <div
          ref={indicatorRef}
          className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 opacity-0 text-black/40 pointer-events-none select-none z-10"
        >
          <span className="text-[10px] font-mono tracking-widest uppercase">Scroll to Discover</span>
          <svg className="w-4 h-4 animate-bounce" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 14l-7 7m0 0l-7-7m7 7V3" />
          </svg>
        </div>
      </div>

      {/* Events Showcase Section */}
      <EventsShowcase />

      {/* About Section (Light Theme, 8x8 Expanding Grid) */}
      <AboutSection />

      {/* Team Section (Circle Mask Reveal & 45-degree Diagonal Wipe Reveal) */}
      <TeamSection />

      {/* HostIt Section (Scroll Scrub Typing Animation & Light Anime Theme) */}
      <HostItSection />

      {/* Ideas Marquee (Light Theme, Sticky + GSAP Horizontal Scroll Text) */}
      <IdeasMarquee />

      {/* Large Typography Animated Home Footer */}
      <HomeFooter />

      <style jsx global>{`
        .holo-border-wrapper {
          transition: transform 500ms cubic-bezier(0.16, 1, 0.3, 1), opacity 400ms ease !important;
        }
        .holo-border-wrapper.nav-hidden {
          transform: translate(-50%, -120px) scale(0.95) !important;
          opacity: 0 !important;
          pointer-events: none !important;
        }
      `}</style>
    </>
  );
}
