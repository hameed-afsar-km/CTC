"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { gsap } from "gsap";
import Image from "next/image";
import Link from "next/link";
import type { GalleryItem } from "@/lib/gallery-store";
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Maximize2,
  Minimize2,
  Pause,
  Play,
  X,
  Camera,
} from "lucide-react";
import type { GalleryEvent, GalleryYear } from "@/lib/gallery";

const SLIDE_MS = 4000;

function pad(n: number) {
  return n.toString().padStart(2, "0");
}

function uploadedToYears(items: GalleryItem[]): GalleryYear[] {
  const yearMap = new Map<number, Map<string, GalleryEvent>>();
  for (const item of items) {
    const year =
      Number((item.date || "").slice(0, 4)) ||
      new Date(item.createdAt).getFullYear() ||
      2026;
    let events = yearMap.get(year);
    if (!events) {
      events = new Map();
      yearMap.set(year, events);
    }
    const title = item.title?.trim() || "Gallery Uploads";
    let event = events.get(title);
    if (!event) {
      const slug =
        title
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/(^-|-$)/g, "") || "uploads";
      const day = item.date
        ? new Date(`${item.date}T00:00:00`).toLocaleDateString(undefined, {
            month: "short",
            day: "numeric",
          })
        : "";
      event = {
        id: `up-${year}-${slug}`,
        title,
        meta: [item.category?.trim(), day].filter(Boolean).join(" · ") || "Uploaded",
        images: [],
      };
      events.set(title, event);
    }
    event.images.push({
      src: item.imageUrl,
      alt: item.title?.trim() || item.category?.trim() || "Gallery photo",
    });
  }
  return Array.from(yearMap.entries())
    .sort((a, b) => b[0] - a[0])
    .map(([year, events]) => ({ year, events: Array.from(events.values()) }));
}

export default function GalleryPage() {
  const [isTouchDevice, setIsTouchDevice] = useState(false);
  const cursorPngRef = useRef<HTMLDivElement>(null);
  const fsCursorRef = useRef<HTMLDivElement>(null);
  const macHoverRef = useRef(false);
  const [cursorVisible, setCursorVisible] = useState(false);
  const [macHover, setMacHover] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(pointer: coarse)");
    const t = window.setTimeout(() => setIsTouchDevice(mq.matches), 0);
    const handler = (e: MediaQueryListEvent) => setIsTouchDevice(e.matches);
    mq.addEventListener("change", handler);
    return () => {
      window.clearTimeout(t);
      mq.removeEventListener("change", handler);
    };
  }, []);

  useEffect(() => {
    const move = (el: HTMLDivElement | null, x: number, y: number) => {
      if (!el) return;
      gsap.to(el, { x, y, duration: 0.15, ease: "power2.out" });
    };
    const handleMouseMove = (e: MouseEvent) => {
      setCursorVisible(true);
      move(cursorPngRef.current, e.clientX, e.clientY);
      move(fsCursorRef.current, e.clientX, e.clientY);
      const targetEl = e.target as Element | null;
      const overInteractive =
        !!targetEl &&
        !!targetEl.closest("a, button, [role='button']");
      if (overInteractive !== macHoverRef.current) {
        macHoverRef.current = overInteractive;
        setMacHover(overInteractive);
      }
    };
    const handleMouseLeave = () => setCursorVisible(false);
    window.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseleave", handleMouseLeave);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseleave", handleMouseLeave);
    };
  }, []);

  const [viewerEvent, setViewerEvent] = useState<GalleryEvent | null>(null);
  const [slideIndex, setSlideIndex] = useState(0);
  const [slideshowOpen, setSlideshowOpen] = useState(false);
  const [autoplay, setAutoplay] = useState(true);
  const [fsOpen, setFsOpen] = useState(false);
  const [isFs, setIsFs] = useState(false);
  const fullscreenRef = useRef<HTMLDivElement>(null);
  const touchStartX = useRef<number | null>(null);

  const [uploadedYears, setUploadedYears] = useState<GalleryYear[]>([]);
  const [mousePos, setMousePos] = useState({ x: 50, y: 50 });

  useEffect(() => {
    fetch("/api/gallery", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => d.items && setUploadedYears(uploadedToYears(d.items)))
      .catch(() => {});
  }, []);

  const combined = useMemo<GalleryYear[]>(() => {
    return [...uploadedYears].sort((a, b) => b.year - a.year);
  }, [uploadedYears]);

  const [expandedYears, setExpandedYears] = useState<number[]>([]);
  const [expandedEvents, setExpandedEvents] = useState<string[]>([]);
  const [hasAutoExpanded, setHasAutoExpanded] = useState(false);

  useEffect(() => {
    if (combined.length > 0 && !hasAutoExpanded) {
      setHasAutoExpanded(true);
      const t = window.setTimeout(() => setExpandedYears([combined[0].year]), 0);
      return () => window.clearTimeout(t);
    }
  }, [combined, hasAutoExpanded]);

  const toggleYear = useCallback((y: number) => {
    setExpandedYears((prev) => prev.includes(y) ? prev.filter((year) => year !== y) : [...prev, y]);
  }, []);

  const toggleEvent = useCallback((id: string) => {
    setExpandedEvents((prev) => prev.includes(id) ? prev.filter((e) => e !== id) : [...prev, id]);
  }, []);

  const openSlideshow = useCallback((idx: number) => {
    setSlideIndex(idx);
    setSlideshowOpen(true);
    setAutoplay(true);
  }, []);

  const openFullscreen = useCallback((idx: number) => {
    setSlideIndex(idx);
    setFsOpen(true);
    setAutoplay(false);
  }, []);

  const closeFullscreen = useCallback(() => {
    if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
    setFsOpen(false);
    setIsFs(false);
  }, []);

  const toggleFs = useCallback(() => {
    if (!fullscreenRef.current) return;
    if (!document.fullscreenElement) fullscreenRef.current.requestFullscreen().catch(() => {});
    else document.exitFullscreen().catch(() => {});
  }, []);

  useEffect(() => {
    const handler = () => setIsFs(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", handler);
    return () => document.removeEventListener("fullscreenchange", handler);
  }, []);

  const nextSlide = useCallback(() => {
    if (!viewerEvent) return;
    setSlideIndex((i) => (i + 1) % viewerEvent.images.length);
  }, [viewerEvent]);

  const prevSlide = useCallback(() => {
    if (!viewerEvent) return;
    setSlideIndex((i) => (i - 1 + viewerEvent.images.length) % viewerEvent.images.length);
  }, [viewerEvent]);

  useEffect(() => {
    if (!autoplay || (!slideshowOpen && !fsOpen)) return;
    const t = window.setTimeout(nextSlide, SLIDE_MS);
    return () => window.clearTimeout(t);
  }, [slideIndex, autoplay, slideshowOpen, fsOpen, nextSlide]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (!viewerEvent) return;
      if (e.key === "Escape") {
        if (fsOpen) closeFullscreen();
        else if (slideshowOpen) setSlideshowOpen(false);
        else setViewerEvent(null);
      } else if (e.key === "ArrowRight") nextSlide();
      else if (e.key === "ArrowLeft") prevSlide();
      else if (e.key === "f" || e.key === "F") {
        if (slideshowOpen || fsOpen) toggleFs();
        else if (viewerEvent) openFullscreen(slideIndex);
      } else if (e.key === " ") {
        e.preventDefault();
        setAutoplay((a) => !a);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [viewerEvent, slideshowOpen, fsOpen, nextSlide, prevSlide, closeFullscreen, toggleFs, slideIndex, openFullscreen]);

  useEffect(() => {
    document.body.style.overflow = (viewerEvent || slideshowOpen || fsOpen) ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [viewerEvent, slideshowOpen, fsOpen]);

  const swipeHandlers = {
    onTouchStart: (e: React.TouchEvent) => { touchStartX.current = e.touches[0].clientX; },
    onTouchEnd: (e: React.TouchEvent) => {
      if (touchStartX.current === null) return;
      const dx = e.changedTouches[0].clientX - touchStartX.current;
      if (dx > 50) prevSlide(); else if (dx < -50) nextSlide();
      touchStartX.current = null;
    },
  };

  const progressStyle = {
    animation: `slideshow-progress ${SLIDE_MS}ms linear forwards`,
    animationPlayState: autoplay ? "running" : "paused",
  };

  const cursorPng = (
    <Image src="/assets/cursor.png" alt="" width={48} height={48} className="w-full h-full object-contain" draggable={false} />
  );

  return (
    <div
      onMouseMove={(e) => {
        const r = e.currentTarget.getBoundingClientRect();
        setMousePos({
          x: ((e.clientX - r.left) / r.width) * 100,
          y: ((e.clientY - r.top) / r.height) * 100,
        });
      }}
      className="relative min-h-screen bg-[#050505] font-syne text-white select-none overflow-x-hidden"
    >
      <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden" aria-hidden>
        <div 
          className="absolute inset-0 transition-opacity duration-1000"
          style={{ background: `radial-gradient(1200px circle at ${mousePos.x}% ${mousePos.y}%, rgba(52, 211, 153, 0.08), transparent 60%)` }}
        />
        <div className="absolute top-1/4 -right-1/4 h-[800px] w-[800px] rounded-full bg-gradient-to-bl from-[#34d399]/10 to-transparent blur-[120px] gallery-float" />
        <div className="absolute bottom-0 -left-1/4 h-[600px] w-[600px] rounded-full bg-gradient-to-tr from-[#059669]/10 to-transparent blur-[120px] gallery-float-alt" />
        <div className="bg-grain absolute inset-0 opacity-20 mix-blend-overlay" />
      </div>

      <div className="relative z-10 mx-auto max-w-[1400px] px-6 sm:px-12 py-10 sm:py-16">
        <nav className="flex items-center justify-between mix-blend-difference">
          <Link href="/" className="group inline-flex items-center gap-3 font-mono text-xs text-white/70 transition-all duration-300 hover:text-white">
            <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-2" />
            <span className="font-bold tracking-widest uppercase">BACK TO HOME</span>
          </Link>
          <div className="hidden sm:flex items-center gap-2 font-mono text-[10px] uppercase tracking-widest text-white/50">
            <span>CTC</span>
            <span className="h-1 w-1 rounded-full bg-white/50" />
            <span>ARCHIVE</span>
          </div>
        </nav>

        <header className="mt-24 sm:mt-32 relative text-center">
          <h1 className="relative font-syne font-black uppercase leading-[0.8] tracking-tighter text-[clamp(4rem,18vw,14rem)] text-white mix-blend-difference">
            ARCHIVE
          </h1>
          <div className="mt-8 mx-auto flex max-w-lg items-center justify-center gap-6">
            <div className="h-[1px] flex-1 bg-gradient-to-r from-transparent to-white/20" />
            <p className="font-mono text-xs uppercase tracking-[0.4em] text-white/60 font-medium">VISUAL CHRONICLES & EVENT REELS</p>
            <div className="h-[1px] flex-1 bg-gradient-to-l from-transparent to-white/20" />
          </div>
        </header>

        <section className="mt-20 sm:mt-32 pb-32">
          <div className="flex flex-col gap-12">
            {combined.map((yearGroup) => {
              const isYearOpen = expandedYears.includes(yearGroup.year);
              return (
                <div key={yearGroup.year} className="border-b border-white/10 pb-12">
                  <button
                    type="button"
                    onClick={() => toggleYear(yearGroup.year)}
                    className="flex w-full items-center justify-between group"
                  >
                    <h2 className="font-syne text-[3rem] sm:text-[5rem] font-black text-white/80 transition-colors group-hover:text-white">
                      {yearGroup.year}
                    </h2>
                    <div className={`flex h-12 w-12 items-center justify-center rounded-full border border-white/20 transition-transform duration-500 ${isYearOpen ? 'rotate-90 bg-white text-black' : 'text-white'}`}>
                      <ChevronRight className="h-6 w-6" />
                    </div>
                  </button>

                  {isYearOpen && (
                    <div className="mt-8 flex flex-col gap-6 animate-in slide-in-from-top-4 fade-in duration-500">
                      {yearGroup.events.map((ev) => {
                        const isEventOpen = expandedEvents.includes(ev.id);
                        return (
                          <div key={ev.id} className="rounded-2xl border border-white/10 bg-[#0a0a0a] overflow-hidden transition-all duration-500">
                            <button
                              type="button"
                              onClick={() => toggleEvent(ev.id)}
                              className="flex w-full items-center justify-between p-6 sm:p-8 hover:bg-white/5 transition-colors"
                            >
                              <div className="text-left">
                                <h3 className="font-syne text-xl sm:text-2xl font-bold text-white">{ev.title}</h3>
                                <p className="mt-1 font-mono text-[10px] uppercase tracking-widest text-white/50">{ev.meta} · {ev.images.length} CAPTURES</p>
                              </div>
                              <div className="flex items-center gap-4">
                                {isEventOpen && (
                                  <button
                                    type="button"
                                    onClick={(e) => { e.stopPropagation(); setViewerEvent(ev); openSlideshow(0); }}
                                    className="hidden sm:flex items-center gap-2 rounded-full bg-white px-5 py-2.5 font-mono text-[10px] font-bold uppercase tracking-widest text-black transition-transform hover:scale-105"
                                  >
                                    <Play className="h-3 w-3" />
                                    SLIDESHOW
                                  </button>
                                )}
                                <div className={`flex h-8 w-8 items-center justify-center rounded-full bg-white/10 transition-transform duration-500 ${isEventOpen ? 'rotate-90' : ''}`}>
                                  <ChevronRight className="h-4 w-4 text-white" />
                                </div>
                              </div>
                            </button>

                            {isEventOpen && (
                              <div className="px-6 pb-6 sm:px-8 sm:pb-8 animate-in slide-in-from-top-4 fade-in duration-500">
                                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 auto-rows-fr">
                                  {ev.images.map((img, i) => {
                                    const spanClasses = i % 7 === 0 ? "md:col-span-2 md:row-span-2" : i % 5 === 0 ? "md:col-span-2" : "";
                                    return (
                                      <div key={`${ev.id}-${i}`} className={`group relative overflow-hidden rounded-2xl bg-[#111] border border-white/5 hover:border-white/20 transition-all duration-500 ${spanClasses}`}>
                                        <button type="button" onClick={() => { setViewerEvent(ev); openFullscreen(i); }} className="absolute inset-0 z-10" aria-label={`View ${img.alt}`} />
                                        <div className="relative w-full h-full min-h-[200px]" style={{ aspectRatio: "4/3" }}>
                                          <Image src={img.src} alt={img.alt} fill sizes="(min-width: 768px) 33vw, 50vw" className="object-cover transition-transform duration-[2s] group-hover:scale-110" />
                                        </div>
                                        <div className="absolute inset-0 bg-black/0 transition-colors duration-500 group-hover:bg-black/40" />
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>

        <footer className="mt-12 flex flex-col items-center gap-4 border-t border-white/10 pt-12 pb-8 text-center opacity-60">
          <p className="font-mono text-[10px] uppercase tracking-widest text-white/70">© {new Date().getFullYear()} CRESCENT TECHNOCRATS CLUB</p>
        </footer>
      </div>

      {slideshowOpen && viewerEvent && (
        <div className="fixed inset-0 z-[60] flex flex-col bg-[#000] text-white gallery-zoom-in">
          <header className="absolute top-0 inset-x-0 z-20 flex items-center justify-between p-6 mix-blend-difference">
            <div className="flex items-center gap-4">
              <button
                type="button"
                onClick={() => setSlideshowOpen(false)}
                className="flex h-10 w-10 items-center justify-center rounded-full border border-white/20 bg-white/10 backdrop-blur-md transition-colors hover:bg-white hover:text-black"
              >
                <X className="h-5 w-5" />
              </button>
              <div className="hidden sm:block text-left">
                <h3 className="font-syne text-lg font-bold">{viewerEvent.title}</h3>
                <p className="font-mono text-[10px] tracking-widest text-white/50">{pad(slideIndex + 1)} / {pad(viewerEvent.images.length)}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setAutoplay((a) => !a)}
                className="flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-2 font-mono text-[10px] font-bold uppercase tracking-widest backdrop-blur-md transition-colors hover:bg-white hover:text-black"
              >
                {autoplay ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
                {autoplay ? "PAUSE" : "PLAY"}
              </button>
              <button
                type="button"
                onClick={() => openFullscreen(slideIndex)}
                className="flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-2 font-mono text-[10px] font-bold uppercase tracking-widest backdrop-blur-md transition-colors hover:bg-white hover:text-black"
              >
                <Maximize2 className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">FULLSCREEN</span>
              </button>
            </div>
          </header>
          <div className="absolute top-0 inset-x-0 z-10 h-1 w-full bg-white/10">
            <div key={slideIndex} className="h-full bg-white" style={progressStyle} />
          </div>
          <div className="relative h-full w-full" {...swipeHandlers}>
            <div key={slideIndex} className="absolute inset-0 gallery-slide flex items-center justify-center p-10">
              <div className="relative h-full w-full max-w-7xl max-h-[85vh]">
                <Image src={viewerEvent.images[slideIndex].src} alt={viewerEvent.images[slideIndex].alt} fill sizes="100vw" className="object-contain" />
              </div>
            </div>
            <button type="button" onClick={prevSlide} className="absolute left-6 top-1/2 -translate-y-1/2 flex h-14 w-14 items-center justify-center rounded-full border border-white/10 bg-black/20 text-white backdrop-blur-xl transition-all hover:scale-110 hover:bg-white hover:text-black">
              <ChevronLeft className="h-6 w-6" />
            </button>
            <button type="button" onClick={nextSlide} className="absolute right-6 top-1/2 -translate-y-1/2 flex h-14 w-14 items-center justify-center rounded-full border border-white/10 bg-black/20 text-white backdrop-blur-xl transition-all hover:scale-110 hover:bg-white hover:text-black">
              <ChevronRight className="h-6 w-6" />
            </button>
          </div>
        </div>
      )}

      {viewerEvent && (
        <div
          ref={fullscreenRef}
          className="fixed inset-0 z-[80] flex flex-col bg-black text-white gallery-zoom-in transition-opacity duration-500"
          style={{ opacity: fsOpen ? 1 : 0, pointerEvents: fsOpen ? "auto" : "none" }}
        >
          <header className="absolute top-0 inset-x-0 z-20 flex items-center justify-between p-6">
            <button type="button" onClick={closeFullscreen} className="flex items-center gap-2 rounded-full bg-white/10 px-5 py-2.5 font-mono text-[10px] font-bold uppercase tracking-widest backdrop-blur-md transition-colors hover:bg-white hover:text-black">
              <X className="h-4 w-4" />
              <span className="hidden sm:inline">CLOSE</span>
            </button>
            <div className="flex items-center gap-3">
              <button type="button" onClick={toggleFs} className="flex items-center gap-2 rounded-full bg-white/10 px-5 py-2.5 font-mono text-[10px] font-bold uppercase tracking-widest backdrop-blur-md transition-colors hover:bg-white hover:text-black">
                {isFs ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
                <span className="hidden sm:inline">{isFs ? "SHRINK" : "EXPAND"}</span>
              </button>
            </div>
          </header>
          <div className="relative h-full w-full" {...swipeHandlers}>
            <div key={slideIndex} className="absolute inset-0 gallery-slide">
              <Image src={viewerEvent.images[slideIndex].src} alt={viewerEvent.images[slideIndex].alt} fill sizes="100vw" className="object-contain" />
            </div>
            <button type="button" onClick={prevSlide} className="absolute left-6 top-1/2 -translate-y-1/2 flex h-14 w-14 items-center justify-center rounded-full bg-black/40 text-white backdrop-blur-xl opacity-60 hover:opacity-100 transition-all hover:scale-110" aria-label="Previous">
              <ChevronLeft className="h-6 w-6" />
            </button>
            <button type="button" onClick={nextSlide} className="absolute right-6 top-1/2 -translate-y-1/2 flex h-14 w-14 items-center justify-center rounded-full bg-black/40 text-white backdrop-blur-xl opacity-60 hover:opacity-100 transition-all hover:scale-110" aria-label="Next">
              <ChevronRight className="h-6 w-6" />
            </button>
          </div>
          {!isTouchDevice && (
            <div ref={fsCursorRef} className="fixed top-0 left-0 z-[99] h-12 w-12 -translate-x-1/2 -translate-y-1/2 pointer-events-none transition-opacity duration-300" style={{ opacity: cursorVisible ? 1 : 0 }}>
              {cursorPng}
            </div>
          )}
        </div>
      )}

      {!isTouchDevice && (
        <div ref={cursorPngRef} className="fixed top-0 left-0 z-[99] h-12 w-12 -translate-x-1/2 -translate-y-1/2 pointer-events-none transition-opacity duration-300 mix-blend-difference" style={{ opacity: cursorVisible ? 1 : 0 }}>
          {cursorPng}
        </div>
      )}

      <style>{`
        @keyframes slideshow-progress {
          from { width: 0%; }
          to   { width: 100%; }
        }
        @keyframes gallery-fade-up {
          from { opacity: 0; transform: translateY(40px); }
          to   { opacity: 1; transform: none; }
        }
        .gallery-fade-up { animation: gallery-fade-up 1s cubic-bezier(0.16, 1, 0.3, 1) both; }
        @keyframes gallery-zoom-in {
          from { opacity: 0; transform: scale(0.97); }
          to   { opacity: 1; transform: none; }
        }
        .gallery-zoom-in { animation: gallery-zoom-in 0.5s cubic-bezier(0.16, 1, 0.3, 1) both; }
        @keyframes gallery-slide {
          from { opacity: 0; transform: scale(1.05); }
          to   { opacity: 1; transform: scale(1); }
        }
        .gallery-slide { animation: gallery-slide 0.8s cubic-bezier(0.16, 1, 0.3, 1) both; }
        @keyframes float {
          0%, 100% { transform: translate(0, 0) scale(1); }
          50% { transform: translate(30px, -40px) scale(1.05); }
        }
        @keyframes float-alt {
          0%, 100% { transform: translate(0, 0) scale(1); }
          50% { transform: translate(-30px, 40px) scale(1.05); }
        }
        .gallery-float { animation: float 20s ease-in-out infinite; }
        .gallery-float-alt { animation: float-alt 25s ease-in-out infinite; }
        @media (prefers-reduced-motion: reduce) {
          .gallery-fade-up, .gallery-zoom-in, .gallery-slide, .gallery-float, .gallery-float-alt {
            animation: none;
          }
        }
      `}</style>
    </div>
  );
}
