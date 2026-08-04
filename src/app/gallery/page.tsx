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
import { GALLERY, type GalleryEvent, type GalleryYear } from "@/lib/gallery";

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

  const [activeEvent, setActiveEvent] = useState<GalleryEvent | null>(null);
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
    const byYear = new Map<number, GalleryEvent[]>(GALLERY.map(y => [y.year, [...y.events]]));
    uploadedYears.forEach(y => {
      const existing = byYear.get(y.year) || [];
      byYear.set(y.year, [...existing, ...y.events]);
    });
    return Array.from(byYear.entries())
      .sort((a, b) => b[0] - a[0])
      .map(([year, events]) => ({ year, events }));
  }, [uploadedYears]);

  const [selectedCategory, setSelectedCategory] = useState<string>("ALL");

  const categories = useMemo(() => {
    const set = new Set<string>();
    combined.forEach((y) => y.events.forEach((e) => {
      const cat = e.meta.split("·")[0]?.trim();
      if (cat) set.add(cat.toUpperCase());
    }));
    return ["ALL", ...Array.from(set)];
  }, [combined]);

  const filteredEvents = useMemo(() => {
    const allEvs: { event: GalleryEvent; year: number }[] = [];
    combined.forEach((y) => y.events.forEach((e) => {
      const cat = e.meta.split("·")[0]?.trim().toUpperCase();
      if (selectedCategory === "ALL" || cat === selectedCategory) {
        allEvs.push({ event: e, year: y.year });
      }
    }));
    return allEvs;
  }, [combined, selectedCategory]);

  const openEvent = useCallback((ev: GalleryEvent) => {
    setActiveEvent(ev);
    setSlideIndex(0);
    setSlideshowOpen(false);
    setFsOpen(false);
    setIsFs(false);
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
    if (!activeEvent) return;
    setSlideIndex((i) => (i + 1) % activeEvent.images.length);
  }, [activeEvent]);

  const prevSlide = useCallback(() => {
    if (!activeEvent) return;
    setSlideIndex((i) => (i - 1 + activeEvent.images.length) % activeEvent.images.length);
  }, [activeEvent]);

  useEffect(() => {
    if (!autoplay || (!slideshowOpen && !fsOpen)) return;
    const t = window.setTimeout(nextSlide, SLIDE_MS);
    return () => window.clearTimeout(t);
  }, [slideIndex, autoplay, slideshowOpen, fsOpen, nextSlide]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (!activeEvent) return;
      if (e.key === "Escape") {
        if (fsOpen) closeFullscreen();
        else if (slideshowOpen) setSlideshowOpen(false);
        else setActiveEvent(null);
      } else if (e.key === "ArrowRight") nextSlide();
      else if (e.key === "ArrowLeft") prevSlide();
      else if (e.key === "f" || e.key === "F") {
        if (slideshowOpen || fsOpen) toggleFs();
        else if (activeEvent) openFullscreen(slideIndex);
      } else if (e.key === " ") {
        e.preventDefault();
        setAutoplay((a) => !a);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [activeEvent, slideshowOpen, fsOpen, nextSlide, prevSlide, closeFullscreen, toggleFs, slideIndex, openFullscreen]);

  useEffect(() => {
    document.body.style.overflow = (activeEvent || slideshowOpen || fsOpen) ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [activeEvent, slideshowOpen, fsOpen]);

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

        <section className="mt-32 sm:mt-40 sticky top-4 z-40 flex justify-center">
          <div className="flex items-center gap-1 rounded-full border border-white/10 bg-black/50 p-1.5 backdrop-blur-2xl shadow-2xl">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-5 py-2.5 rounded-full font-mono text-[10px] sm:text-xs font-bold tracking-widest uppercase transition-all duration-500 ${
                  selectedCategory === cat ? "bg-white text-black shadow-[0_0_20px_rgba(255,255,255,0.3)]" : "text-white/50 hover:text-white hover:bg-white/10"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </section>

        <section className="mt-16 sm:mt-24 pb-32">
          <div className="columns-1 sm:columns-2 lg:columns-3 gap-6 space-y-6">
            {filteredEvents.map(({ event: ev, year }, i) => (
              <button
                key={`${ev.id}-${i}`}
                type="button"
                onClick={() => openEvent(ev)}
                className="group relative block w-full overflow-hidden rounded-[2rem] bg-[#0a0a0a] border border-white/5 transition-all duration-700 hover:border-white/20 hover:shadow-[0_20px_80px_-20px_rgba(255,255,255,0.15)] break-inside-avoid gallery-fade-up"
                style={{ animationDelay: `${i * 0.05}s` }}
              >
                <div className="relative w-full overflow-hidden" style={{ aspectRatio: i % 3 === 0 ? "4/5" : i % 2 === 0 ? "1/1" : "3/4" }}>
                  <Image
                    src={ev.images[0].src}
                    alt={ev.images[0].alt}
                    fill
                    sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
                    className="object-cover transition-transform duration-[1.5s] ease-[cubic-bezier(0.2,0.8,0.2,1)] group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-black/20 transition-colors duration-700 group-hover:bg-transparent" />
                  <div className="absolute inset-0 bg-grain opacity-10 mix-blend-overlay" />
                </div>
                <div className="absolute inset-x-3 bottom-3 translate-y-4 opacity-0 transition-all duration-500 group-hover:translate-y-0 group-hover:opacity-100">
                  <div className="flex items-center justify-between rounded-2xl border border-white/20 bg-black/40 p-4 backdrop-blur-xl">
                    <div className="text-left">
                      <h3 className="font-syne text-lg font-bold text-white leading-tight">{ev.title}</h3>
                      <div className="mt-1 flex items-center gap-2 font-mono text-[9px] uppercase tracking-wider text-white/70">
                        <span>{year}</span>
                        <span className="h-1 w-1 rounded-full bg-white/30" />
                        <span>{ev.meta}</span>
                      </div>
                    </div>
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white text-black transition-transform duration-300 hover:scale-110">
                      <Camera className="h-4 w-4" />
                    </div>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </section>

        <footer className="mt-12 flex flex-col items-center gap-4 border-t border-white/10 pt-12 pb-8 text-center opacity-60">
          <p className="font-mono text-[10px] uppercase tracking-widest text-white/70">© {new Date().getFullYear()} CRESCENT TECHNOCRATS CLUB</p>
        </footer>
      </div>

      {activeEvent && (
        <div key={activeEvent.id} className="fixed inset-0 z-50 overflow-y-auto bg-[#050505]/95 backdrop-blur-3xl gallery-zoom-in">
          <div className="relative min-h-full flex flex-col">
            <header className="sticky top-0 z-10 border-b border-white/10 bg-[#050505]/80 backdrop-blur-xl">
              <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-6">
                <button
                  type="button"
                  onClick={() => setActiveEvent(null)}
                  className="group flex items-center gap-3 font-mono text-xs uppercase tracking-widest text-white/60 transition-colors hover:text-white"
                >
                  <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-1" />
                  RETURN
                </button>
                <div className="hidden sm:block text-center absolute left-1/2 -translate-x-1/2">
                  <h2 className="font-syne text-xl font-bold text-white tracking-wide">{activeEvent.title}</h2>
                  <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.2em] text-white/50">{activeEvent.images.length} CAPTURES</p>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => openSlideshow(0)}
                    className="inline-flex items-center gap-2 rounded-full bg-white px-5 py-2 font-mono text-[10px] font-bold uppercase tracking-widest text-black transition-transform hover:scale-105"
                  >
                    <Play className="h-3 w-3" />
                    SLIDESHOW
                  </button>
                </div>
              </div>
            </header>
            <main className="mx-auto w-full max-w-7xl flex-1 px-6 py-12">
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 auto-rows-fr">
                {activeEvent.images.map((img, i) => {
                  const spanClasses = i % 7 === 0 ? "md:col-span-2 md:row-span-2" : i % 5 === 0 ? "md:col-span-2" : "";
                  return (
                    <div key={`${activeEvent.id}-${i}`} className={`group relative overflow-hidden rounded-2xl bg-[#111] border border-white/5 hover:border-white/20 transition-all duration-500 ${spanClasses}`}>
                      <button type="button" onClick={() => openFullscreen(i)} className="absolute inset-0 z-10" aria-label={`View ${img.alt}`} />
                      <div className="relative w-full h-full min-h-[200px]" style={{ aspectRatio: "4/3" }}>
                        <Image src={img.src} alt={img.alt} fill sizes="(min-width: 768px) 33vw, 50vw" className="object-cover transition-transform duration-[2s] group-hover:scale-110" />
                      </div>
                      <div className="absolute inset-0 bg-black/0 transition-colors duration-500 group-hover:bg-black/40" />
                    </div>
                  );
                })}
              </div>
            </main>
          </div>
        </div>
      )}

      {slideshowOpen && activeEvent && (
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
                <h3 className="font-syne text-lg font-bold">{activeEvent.title}</h3>
                <p className="font-mono text-[10px] tracking-widest text-white/50">{pad(slideIndex + 1)} / {pad(activeEvent.images.length)}</p>
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
                <Image src={activeEvent.images[slideIndex].src} alt={activeEvent.images[slideIndex].alt} fill sizes="100vw" className="object-contain" />
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

      {activeEvent && (
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
              <Image src={activeEvent.images[slideIndex].src} alt={activeEvent.images[slideIndex].alt} fill sizes="100vw" className="object-contain" />
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
