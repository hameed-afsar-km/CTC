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
  Sparkles,
  Layers,
  Camera,
  Grid,
} from "lucide-react";
import type { GalleryEvent, GalleryYear } from "@/lib/gallery";

const SLIDE_MS = 4000;

function pad(n: number) {
  return n.toString().padStart(2, "0");
}

function uploadedToYears(items: GalleryItem[]): GalleryYear[] {
  const yearMap = new Map<number, Map<string, GalleryEvent>>();
  for (const item of items) {
    if (!item || typeof item !== "object") continue;
    let year = 2026;
    if (item.date && typeof item.date === "string" && item.date.length >= 4) {
      const y = parseInt(item.date.slice(0, 4), 10);
      if (!Number.isNaN(y)) year = y;
    } else if (item.createdAt) {
      const dt = new Date(item.createdAt);
      if (!Number.isNaN(dt.getTime())) year = dt.getFullYear();
    }

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

      let day = "Uploaded";
      if (item.date) {
        const d = new Date(item.date.includes("T") ? item.date : `${item.date}T00:00:00`);
        if (!Number.isNaN(d.getTime())) {
          day = d.toLocaleDateString(undefined, {
            month: "short",
            day: "numeric",
          });
        }
      }

      event = {
        id: `up-${year}-${slug}`,
        title,
        meta: [item.category?.trim(), day].filter(Boolean).join(" · ") || "Uploaded",
        images: [],
      };
      events.set(title, event);
    }
    if (item.imageUrl) {
      event.images.push({
        src: item.imageUrl,
        alt: item.title?.trim() || item.category?.trim() || "Gallery photo",
      });
    }
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
        !!targetEl && !!targetEl.closest("a, button, [role='button']");
      if (overInteractive !== macHoverRef.current) {
        macHoverRef.current = overInteractive;
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
  const [galleryError, setGalleryError] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>("ALL");
  const [mousePos, setMousePos] = useState({ x: 50, y: 50 });
  const mouseMoveRaf = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (mouseMoveRaf.current != null) cancelAnimationFrame(mouseMoveRaf.current);
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/gallery", { cache: "no-store" })
      .then((r) => {
        if (!r.ok) throw new Error(`gallery request failed (${r.status})`);
        return r.json();
      })
      .then((d) => {
        if (cancelled) return;
        if (Array.isArray(d.items)) setUploadedYears(uploadedToYears(d.items));
        else throw new Error("gallery API returned an unexpected payload");
      })
      .catch(() => {
        if (!cancelled) setGalleryError(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const combined = useMemo<GalleryYear[]>(() => {
    return [...uploadedYears].sort((a, b) => b.year - a.year);
  }, [uploadedYears]);

  const categories = useMemo(() => {
    const set = new Set<string>();
    combined.forEach((y) => {
      y.events.forEach((ev) => {
        const cat = ev.meta?.split("·")[0]?.trim();
        if (cat) set.add(cat.toUpperCase());
      });
    });
    return ["ALL", ...Array.from(set)];
  }, [combined]);

  const [expandedYears, setExpandedYears] = useState<number[]>([]);
  const [expandedEvents, setExpandedEvents] = useState<string[]>([]);
  const hasAutoExpanded = useRef(false);

  useEffect(() => {
    if (combined.length === 0 || hasAutoExpanded.current) return;
    hasAutoExpanded.current = true;
    const first = combined[0];
    const t = window.setTimeout(() => {
      setExpandedYears([first.year]);
      setExpandedEvents(first.events.map((ev) => ev.id));
    }, 0);
    return () => window.clearTimeout(t);
  }, [combined]);

  const toggleYear = useCallback((y: number) => {
    setExpandedYears((prev) =>
      prev.includes(y) ? prev.filter((year) => year !== y) : [...prev, y]
    );
  }, []);

  const toggleEvent = useCallback((id: string) => {
    setExpandedEvents((prev) =>
      prev.includes(id) ? prev.filter((e) => e !== id) : [...prev, id]
    );
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
    if (!slideshowOpen) {
      setSlideshowOpen(false);
      setViewerEvent(null);
    }
  }, [slideshowOpen]);

  const toggleFs = useCallback(() => {
    if (!fullscreenRef.current) return;
    if (!document.fullscreenElement)
      fullscreenRef.current.requestFullscreen().catch(() => {});
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
    setSlideIndex(
      (i) => (i - 1 + viewerEvent.images.length) % viewerEvent.images.length
    );
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
  }, [
    viewerEvent,
    slideshowOpen,
    fsOpen,
    nextSlide,
    prevSlide,
    closeFullscreen,
    toggleFs,
    slideIndex,
    openFullscreen,
  ]);

  useEffect(() => {
    document.body.style.overflow =
      viewerEvent || slideshowOpen || fsOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [viewerEvent, slideshowOpen, fsOpen]);

  const swipeHandlers = {
    onTouchStart: (e: React.TouchEvent) => {
      touchStartX.current = e.touches[0].clientX;
    },
    onTouchEnd: (e: React.TouchEvent) => {
      if (touchStartX.current === null) return;
      const dx = e.changedTouches[0].clientX - touchStartX.current;
      if (dx > 50) prevSlide();
      else if (dx < -50) nextSlide();
      touchStartX.current = null;
    },
  };

  const progressStyle = {
    animation: `slideshow-progress ${SLIDE_MS}ms linear forwards`,
    animationPlayState: autoplay ? "running" : "paused",
  };

  const cursorPng = (
    <Image
      src="/assets/cursor.png"
      alt=""
      width={48}
      height={48}
      className="w-full h-full object-contain"
      draggable={false}
    />
  );

  return (
    <div
      onMouseMove={(e) => {
        if (mouseMoveRaf.current != null) return;
        const el = e.currentTarget;
        const cx = e.clientX;
        const cy = e.clientY;
        mouseMoveRaf.current = requestAnimationFrame(() => {
          mouseMoveRaf.current = null;
          const r = el.getBoundingClientRect();
          setMousePos({
            x: ((cx - r.left) / r.width) * 100,
            y: ((cy - r.top) / r.height) * 100,
          });
        });
      }}
      className="relative min-h-screen bg-[#040608] font-syne text-white select-none overflow-x-hidden"
    >
      {/* Background Lighting Effects */}
      <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden" aria-hidden>
        <div className="absolute inset-0 bg-gradient-to-b from-[#04070a] via-[#070712] to-[#040608]" />

        <div
          className="absolute inset-0 transition-opacity duration-1000"
          style={{
            background: `radial-gradient(1200px circle at ${mousePos.x}% ${mousePos.y}%, rgba(52, 211, 153, 0.09), transparent 60%), radial-gradient(900px circle at ${100 - mousePos.x}% ${100 - mousePos.y}%, rgba(129, 140, 248, 0.08), transparent 55%)`,
          }}
        />

        <div className="absolute -top-1/3 left-1/4 h-[140vh] w-[180vw] -translate-x-1/2 rotate-[18deg] bg-gradient-to-b from-[#34d399]/8 via-[#2dd4bf]/4 to-transparent blur-[130px] gallery-aurora" />
        <div className="absolute -bottom-1/3 right-1/4 h-[130vh] w-[160vw] translate-x-1/2 -rotate-[14deg] bg-gradient-to-t from-[#6366f1]/9 via-[#8b5cf6]/4 to-transparent blur-[130px] gallery-aurora-alt" />
        <div className="bg-grain absolute inset-0 opacity-20 mix-blend-overlay" />
      </div>

      <div className="relative z-10 mx-auto max-w-[1440px] px-6 sm:px-12 py-10 sm:py-16 min-h-screen flex flex-col">
        {/* Navigation Bar */}
        <nav className="flex items-center justify-between">
          <Link
            href="/"
            className="group inline-flex items-center gap-3 font-mono text-xs text-white/70 transition-all duration-300 hover:text-white"
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-white/5 transition-all group-hover:border-emerald-400 group-hover:bg-emerald-500/20 group-hover:text-emerald-300">
              <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-1" />
            </div>
            <span className="font-bold tracking-widest uppercase">BACK TO HOME</span>
          </Link>

          <div className="hidden sm:flex items-center gap-3 font-mono text-[11px] uppercase tracking-widest text-white/50 bg-white/5 px-4 py-2 rounded-full border border-white/10">
            <span className="text-emerald-400 font-bold">CTC</span>
            <span className="h-1 w-1 rounded-full bg-white/40" />
            <span>VISUAL CHRONICLES</span>
          </div>
        </nav>

        {/* Hero Header */}
        <header className="mt-16 sm:mt-24 relative text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-4 py-1.5 mb-6 text-xs font-mono font-bold uppercase tracking-widest text-emerald-400 shadow-[0_0_20px_rgba(52,211,153,0.2)]">
            <Camera className="h-4 w-4" />
            PHOTOGRAPHIC REELS & ALBUMS
          </div>

          <h1 className="relative font-syne font-black uppercase leading-[0.82] tracking-tighter text-[clamp(3.8rem,16vw,12rem)] text-transparent bg-clip-text bg-gradient-to-b from-white via-white/90 to-white/40">
            VISUAL ARCHIVE
          </h1>

          <div className="mt-8 mx-auto flex max-w-lg items-center justify-center gap-6">
            <div className="h-[1px] flex-1 bg-gradient-to-r from-transparent to-emerald-400/40" />
            <p className="font-mono text-xs uppercase tracking-[0.3em] text-emerald-400 font-bold">
              MEMORIES & MOMENTS
            </p>
            <div className="h-[1px] flex-1 bg-gradient-to-l from-transparent to-emerald-400/40" />
          </div>
        </header>

        {/* Category Filter Bar */}
        {categories.length > 1 && (
          <div className="mt-12 flex items-center justify-center gap-2 overflow-x-auto pb-2 scrollbar-none">
            {categories.map((cat) => {
              const active = selectedCategory === cat;
              return (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-5 py-2.5 rounded-full text-xs font-mono font-bold tracking-wider uppercase transition-all whitespace-nowrap border ${
                    active
                      ? "bg-emerald-500 text-black border-emerald-400 shadow-[0_0_20px_rgba(52,211,153,0.4)]"
                      : "bg-white/5 text-white/70 border-white/10 hover:bg-white/10 hover:text-white"
                  }`}
                >
                  {cat}
                </button>
              );
            })}
          </div>
        )}

        {/* Main Gallery Section */}
        <section className="mt-16 sm:mt-24 pb-32">
          <div className="flex flex-col gap-16">
            {galleryError && (
              <div className="flex flex-col items-center gap-3 rounded-3xl border border-red-500/20 bg-red-950/20 p-10 text-center">
                <p className="font-mono text-xs uppercase tracking-widest text-red-300 font-bold">
                  Couldn&apos;t load the gallery.
                </p>
                <p className="text-sm font-sans text-white/60 max-w-md">
                  The server couldn&apos;t fetch photos right now. Please check back shortly or refresh the page.
                </p>
              </div>
            )}

            {!galleryError && combined.length === 0 && (
              <div className="flex flex-col items-center gap-3 rounded-3xl border border-white/10 bg-white/5 p-12 text-center">
                <Sparkles className="h-10 w-10 text-emerald-400/40 mb-2" />
                <p className="font-mono text-xs uppercase tracking-widest text-white/60 font-bold">
                  NO GALLERY ALBUMS YET
                </p>
                <p className="text-sm font-sans text-white/40 max-w-md">
                  Photos uploaded from the Admin Dashboard will appear here automatically.
                </p>
              </div>
            )}

            {combined.map((yearGroup) => {
              const isYearOpen = expandedYears.includes(yearGroup.year);

              const matchingEvents = yearGroup.events.filter((ev) => {
                if (selectedCategory === "ALL") return true;
                const cat = ev.meta?.split("·")[0]?.trim()?.toUpperCase();
                return cat === selectedCategory;
              });

              if (matchingEvents.length === 0 && selectedCategory !== "ALL") return null;

              return (
                <div key={yearGroup.year} className="border-b border-white/10 pb-16">
                  {/* Year Header */}
                  <button
                    type="button"
                    onClick={() => toggleYear(yearGroup.year)}
                    className="flex w-full items-center justify-between group py-4"
                  >
                    <div className="flex items-center gap-4">
                      <h2 className="font-syne text-[3.5rem] sm:text-[6rem] font-black text-white/90 transition-colors group-hover:text-emerald-400 leading-none">
                        {yearGroup.year}
                      </h2>
                      <span className="font-mono text-xs text-emerald-400/80 bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/20">
                        {matchingEvents.length} ALBUMS
                      </span>
                    </div>

                    <div
                      className={`flex h-14 w-14 items-center justify-center rounded-full border transition-all duration-500 ${
                        isYearOpen
                          ? "bg-emerald-500 text-black border-emerald-400 shadow-[0_0_20px_rgba(52,211,153,0.4)]"
                          : "border-white/20 text-white group-hover:border-white/40 group-hover:bg-white/5"
                      }`}
                    >
                      <ChevronRight
                        className={`h-6 w-6 transition-transform duration-500 ${
                          isYearOpen ? "rotate-90" : ""
                        }`}
                      />
                    </div>
                  </button>

                  {/* Year Events List */}
                  {isYearOpen && (
                    <div className="mt-8 flex flex-col gap-8 animate-in slide-in-from-top-4 fade-in duration-500">
                      {matchingEvents.map((ev) => {
                        const isEventOpen = expandedEvents.includes(ev.id);
                        return (
                          <div
                            key={ev.id}
                            className="rounded-3xl border border-white/10 bg-[#080d10]/80 overflow-hidden transition-all duration-500 hover:border-emerald-500/30"
                          >
                            {/* Album Header Bar */}
                            <button
                              type="button"
                              onClick={() => toggleEvent(ev.id)}
                              className="flex w-full items-center justify-between p-6 sm:p-8 hover:bg-white/5 transition-colors"
                            >
                              <div className="text-left">
                                <h3 className="font-syne text-2xl sm:text-3xl font-bold text-white">
                                  {ev.title}
                                </h3>
                                <p className="mt-2 font-mono text-xs uppercase tracking-widest text-emerald-400/80">
                                  {ev.meta} · {ev.images.length} CAPTURES
                                </p>
                              </div>

                              <div className="flex items-center gap-4">
                                {isEventOpen && ev.images.length > 0 && (
                                  <span
                                    role="button"
                                    tabIndex={0}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setViewerEvent(ev);
                                      openSlideshow(0);
                                    }}
                                    onKeyDown={(e) => {
                                      if (e.key === "Enter" || e.key === " ") {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        setViewerEvent(ev);
                                        openSlideshow(0);
                                      }
                                    }}
                                    className="hidden sm:flex cursor-pointer items-center gap-2 rounded-full bg-emerald-500 px-6 py-2.5 font-mono text-xs font-bold uppercase tracking-widest text-black transition-all hover:scale-105 hover:bg-emerald-400 hover:shadow-[0_0_20px_rgba(52,211,153,0.5)]"
                                  >
                                    <Play className="h-3.5 w-3.5 fill-black" />
                                    SLIDESHOW
                                  </span>
                                )}

                                <div
                                  className={`flex h-9 w-9 items-center justify-center rounded-full bg-white/10 transition-transform duration-500 ${
                                    isEventOpen ? "rotate-90 bg-emerald-500/20 text-emerald-300" : ""
                                  }`}
                                >
                                  <ChevronRight className="h-5 w-5 text-white" />
                                </div>
                              </div>
                            </button>

                            {/* Album Photo Bento Grid */}
                            {isEventOpen && (
                              <div className="px-6 pb-6 sm:px-8 sm:pb-8 animate-in slide-in-from-top-4 fade-in duration-500">
                                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 auto-rows-fr">
                                  {ev.images.map((img, i) => {
                                    const isFeatured = i % 7 === 0;
                                    const spanClasses = isFeatured
                                      ? "md:col-span-2 md:row-span-2"
                                      : i % 5 === 0
                                      ? "md:col-span-2"
                                      : "";

                                    return (
                                      <div
                                        key={`${ev.id}-${i}`}
                                        className={`group relative overflow-hidden rounded-2xl bg-[#0f1418] border border-white/10 hover:border-emerald-400/50 transition-all duration-500 hover:shadow-[0_8px_30px_rgba(52,211,153,0.2)] ${spanClasses}`}
                                      >
                                        <button
                                          type="button"
                                          onClick={() => {
                                            setViewerEvent(ev);
                                            openFullscreen(i);
                                          }}
                                          className="absolute inset-0 z-10"
                                          aria-label={`View ${img.alt}`}
                                        />

                                        <div
                                          className="relative w-full h-full min-h-[220px]"
                                          style={{ aspectRatio: isFeatured ? "16/9" : "4/3" }}
                                        >
                                          <Image
                                            src={img.src}
                                            alt={img.alt}
                                            fill
                                            sizes="(min-width: 768px) 33vw, 50vw"
                                            className="object-cover transition-transform duration-[1.5s] group-hover:scale-110"
                                          />
                                        </div>

                                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100 flex items-end p-4">
                                          <p className="font-syne text-sm font-semibold text-white truncate">
                                            {img.alt}
                                          </p>
                                        </div>
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

        {/* Footer */}
        <footer className="mt-auto flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-white/10 pt-10 pb-8 text-center sm:text-left text-xs font-mono text-white/40">
          <p>© {new Date().getFullYear()} CRESCENT TECHNOCRATS CLUB</p>
          <p className="tracking-widest uppercase text-[10px]">VISUAL ARCHIVE CHRONICLES</p>
        </footer>
      </div>

      {/* Lightbox Slideshow Modal */}
      {slideshowOpen && viewerEvent && (
        <div className="fixed inset-0 z-[60] flex flex-col bg-[#040608] text-white gallery-zoom-in">
          <header className="absolute top-0 inset-x-0 z-20 flex items-center justify-between p-6 bg-gradient-to-b from-black/80 to-transparent">
            <div className="flex items-center gap-4">
              <button
                type="button"
                onClick={() => setSlideshowOpen(false)}
                className="flex h-11 w-11 items-center justify-center rounded-full border border-white/20 bg-black/60 backdrop-blur-xl transition-all hover:bg-white hover:text-black"
              >
                <X className="h-5 w-5" />
              </button>
              <div className="hidden sm:block text-left">
                <h3 className="font-syne text-lg font-bold text-white">{viewerEvent.title}</h3>
                <p className="font-mono text-xs tracking-widest text-emerald-400">
                  {pad(slideIndex + 1)} / {pad(viewerEvent.images.length)}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setAutoplay((a) => !a)}
                className="flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-5 py-2.5 font-mono text-xs font-bold uppercase tracking-widest backdrop-blur-xl text-emerald-300 transition-all hover:bg-emerald-500 hover:text-black"
              >
                {autoplay ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4 fill-current" />}
                {autoplay ? "PAUSE" : "PLAY"}
              </button>

              <button
                type="button"
                onClick={() => openFullscreen(slideIndex)}
                className="flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-5 py-2.5 font-mono text-xs font-bold uppercase tracking-widest backdrop-blur-xl transition-all hover:bg-white hover:text-black"
              >
                <Maximize2 className="h-4 w-4" />
                <span className="hidden sm:inline">FULLSCREEN</span>
              </button>
            </div>
          </header>

          <div className="absolute top-0 inset-x-0 z-10 h-1.5 w-full bg-white/10">
            <div key={slideIndex} className="h-full bg-emerald-400" style={progressStyle} />
          </div>

          <div className="relative h-full w-full flex items-center justify-center" {...swipeHandlers}>
            <div key={slideIndex} className="absolute inset-0 gallery-slide flex items-center justify-center p-8 sm:p-16">
              <div className="relative h-full w-full max-w-7xl max-h-[80vh]">
                <Image
                  src={viewerEvent.images[slideIndex].src}
                  alt={viewerEvent.images[slideIndex].alt}
                  fill
                  sizes="100vw"
                  className="object-contain"
                />
              </div>
            </div>

            <button
              type="button"
              onClick={prevSlide}
              className="absolute left-6 top-1/2 -translate-y-1/2 flex h-14 w-14 items-center justify-center rounded-full border border-white/20 bg-black/50 text-white backdrop-blur-xl transition-all hover:scale-110 hover:bg-emerald-500 hover:text-black hover:border-emerald-400"
            >
              <ChevronLeft className="h-6 w-6" />
            </button>

            <button
              type="button"
              onClick={nextSlide}
              className="absolute right-6 top-1/2 -translate-y-1/2 flex h-14 w-14 items-center justify-center rounded-full border border-white/20 bg-black/50 text-white backdrop-blur-xl transition-all hover:scale-110 hover:bg-emerald-500 hover:text-black hover:border-emerald-400"
            >
              <ChevronRight className="h-6 w-6" />
            </button>
          </div>
        </div>
      )}

      {/* Fullscreen View */}
      {viewerEvent && (
        <div
          ref={fullscreenRef}
          className="fixed inset-0 z-[80] flex flex-col bg-black text-white gallery-zoom-in transition-opacity duration-500"
          style={{ opacity: fsOpen ? 1 : 0, pointerEvents: fsOpen ? "auto" : "none" }}
        >
          <header className="absolute top-0 inset-x-0 z-20 flex items-center justify-between p-6">
            <button
              type="button"
              onClick={closeFullscreen}
              className="flex cursor-pointer items-center gap-2 rounded-full border border-white/25 bg-black/60 px-5 py-2.5 font-mono text-xs font-bold uppercase tracking-widest text-white backdrop-blur-xl transition-colors hover:bg-white hover:text-black"
            >
              <X className="h-4 w-4" />
              <span className="hidden sm:inline">CLOSE</span>
            </button>

            <button
              type="button"
              onClick={toggleFs}
              className="flex cursor-pointer items-center gap-2 rounded-full border border-white/25 bg-black/60 px-5 py-2.5 font-mono text-xs font-bold uppercase tracking-widest text-white backdrop-blur-xl transition-colors hover:bg-white hover:text-black"
            >
              {isFs ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
              <span className="hidden sm:inline">{isFs ? "SHRINK" : "EXPAND"}</span>
            </button>
          </header>

          <div className="relative h-full w-full flex items-center justify-center" {...swipeHandlers}>
            <div key={slideIndex} className="absolute inset-0 gallery-slide">
              <Image
                src={viewerEvent.images[slideIndex].src}
                alt={viewerEvent.images[slideIndex].alt}
                fill
                sizes="100vw"
                className="object-contain"
              />
            </div>

            <button
              type="button"
              onClick={prevSlide}
              className="absolute left-6 top-1/2 -translate-y-1/2 flex h-14 w-14 items-center justify-center rounded-full bg-black/50 text-white backdrop-blur-xl opacity-70 hover:opacity-100 transition-all hover:scale-110"
              aria-label="Previous"
            >
              <ChevronLeft className="h-6 w-6" />
            </button>

            <button
              type="button"
              onClick={nextSlide}
              className="absolute right-6 top-1/2 -translate-y-1/2 flex h-14 w-14 items-center justify-center rounded-full bg-black/50 text-white backdrop-blur-xl opacity-70 hover:opacity-100 transition-all hover:scale-110"
              aria-label="Next"
            >
              <ChevronRight className="h-6 w-6" />
            </button>
          </div>

          {!isTouchDevice && (
            <div
              ref={fsCursorRef}
              className="fixed top-0 left-0 z-[99] h-12 w-12 -translate-x-1/2 -translate-y-1/2 pointer-events-none transition-opacity duration-300"
              style={{ opacity: cursorVisible ? 1 : 0 }}
            >
              {cursorPng}
            </div>
          )}
        </div>
      )}

      {/* Custom Cursor */}
      {!isTouchDevice && (
        <div
          ref={cursorPngRef}
          className="fixed top-0 left-0 z-[99] h-12 w-12 -translate-x-1/2 -translate-y-1/2 pointer-events-none transition-opacity duration-300 mix-blend-difference"
          style={{ opacity: cursorVisible && !fsOpen ? 1 : 0 }}
        >
          {cursorPng}
        </div>
      )}

      <style>{`
        @keyframes slideshow-progress {
          from { width: 0%; }
          to   { width: 100%; }
        }
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
        @keyframes aurora {
          0%, 100% { opacity: 0.6; transform: translateX(-50%) rotate(18deg) translateY(0); }
          50% { opacity: 1; transform: translateX(-50%) rotate(18deg) translateY(-40px); }
        }
        @keyframes aurora-alt {
          0%, 100% { opacity: 0.55; transform: translateX(50%) rotate(-14deg) translateY(0); }
          50% { opacity: 1; transform: translateX(50%) rotate(-14deg) translateY(40px); }
        }
        .gallery-aurora { animation: aurora 18s ease-in-out infinite; }
        .gallery-aurora-alt { animation: aurora-alt 22s ease-in-out infinite; }
      `}</style>
    </div>
  );
}
