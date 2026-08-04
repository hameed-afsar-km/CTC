"use client";

import { useEffect, useState, useRef, useMemo } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowLeft,
  Calendar,
  MapPin,
  ExternalLink,
  Sparkles,
  Clock,
  X,
  Search,
  Tag,
} from "lucide-react";
import type { ClubEvent } from "@/lib/events";
import { gsap } from "gsap";

function formatDate(dateStr: string) {
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatTime(dateStr: string) {
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function EventsPage() {
  const [events, setEvents] = useState<ClubEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("ALL");
  const [selectedEvent, setSelectedEvent] = useState<ClubEvent | null>(null);

  const [mousePos, setMousePos] = useState({ x: 50, y: 50 });
  const containerRef = useRef<HTMLDivElement>(null);

  const [isTouchDevice, setIsTouchDevice] = useState(false);
  const cursorPngRef = useRef<HTMLDivElement>(null);
  const [cursorVisible, setCursorVisible] = useState(false);

  useEffect(() => {
    if (selectedEvent) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [selectedEvent]);

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
    };
    const handleMouseLeave = () => setCursorVisible(false);
    window.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseleave", handleMouseLeave);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseleave", handleMouseLeave);
    };
  }, []);

  useEffect(() => {
    fetch("/api/events", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => {
        if (d.events) setEvents(d.events);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!loading && events.length > 0) {
      gsap.fromTo(
        ".event-card",
        { opacity: 0, y: 35 },
        {
          opacity: 1,
          y: 0,
          duration: 0.7,
          stagger: 0.08,
          ease: "power3.out",
        }
      );
    }
  }, [loading, events, selectedCategory, searchQuery]);

  const categories = useMemo(() => {
    const set = new Set<string>();
    events.forEach((e) => {
      if (e.category) set.add(e.category.toUpperCase());
    });
    return ["ALL", ...Array.from(set)];
  }, [events]);

  const filteredEvents = useMemo(() => {
    return events.filter((ev) => {
      const matchesCat =
        selectedCategory === "ALL" ||
        (ev.category && ev.category.toUpperCase() === selectedCategory);
      const matchesSearch =
        !searchQuery.trim() ||
        ev.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        ev.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (ev.venue && ev.venue.toLowerCase().includes(searchQuery.toLowerCase()));
      return matchesCat && matchesSearch;
    });
  }, [events, selectedCategory, searchQuery]);

  const now = Date.now();
  const upcoming = useMemo(() => {
    return filteredEvents
      .filter((e) => new Date(e.date).getTime() > now)
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [filteredEvents, now]);

  const past = useMemo(() => {
    return filteredEvents
      .filter((e) => new Date(e.date).getTime() <= now)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [filteredEvents, now]);

  const renderEventCard = (ev: ClubEvent, isPast: boolean) => (
    <div
      key={ev.id}
      onClick={() => setSelectedEvent(ev)}
      className={`event-card group cursor-pointer relative flex flex-col rounded-3xl border transition-all duration-500 overflow-hidden ${
        isPast
          ? "border-white/5 bg-[#090d10]/60 hover:border-white/20 hover:bg-[#0d1318]"
          : "border-emerald-500/20 bg-[#0a0f12]/90 hover:border-emerald-400/50 hover:shadow-[0_12px_40px_rgba(52,211,153,0.18)] hover:-translate-y-1.5"
      }`}
    >
      {/* Card Image Cover */}
      <div className="relative h-56 w-full overflow-hidden bg-black/40">
        {ev.image ? (
          <img
            src={ev.image}
            alt={ev.title}
            className={`h-full w-full object-cover transition-transform duration-[1.2s] group-hover:scale-110 ${
              isPast ? "grayscale-[35%]" : ""
            }`}
          />
        ) : (
          <div className="h-full w-full bg-gradient-to-br from-emerald-950/60 via-black to-emerald-900/30 flex items-center justify-center">
            <Sparkles className="h-12 w-12 text-emerald-400/30" />
          </div>
        )}

        <div className="absolute inset-0 bg-gradient-to-t from-[#0a0f12] via-[#0a0f12]/20 to-transparent" />

        <div className="absolute top-4 left-4 right-4 z-10 flex items-center justify-between">
          <span
            className={`inline-flex items-center gap-1.5 rounded-full px-3.5 py-1 text-[10px] font-mono font-bold uppercase tracking-wider backdrop-blur-xl border ${
              isPast
                ? "bg-black/60 text-white/60 border-white/10"
                : "bg-emerald-500/20 text-emerald-300 border-emerald-500/40 shadow-[0_0_15px_rgba(52,211,153,0.3)]"
            }`}
          >
            <Tag className="h-3 w-3" />
            {ev.category || "EVENT"}
          </span>

          {!isPast && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-400/10 px-3 py-1 text-[10px] font-mono font-bold text-emerald-300 border border-emerald-400/30 backdrop-blur-md">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-ping" />
              UPCOMING
            </span>
          )}
        </div>
      </div>

      {/* Card Content */}
      <div className="flex flex-1 flex-col p-6 pt-2">
        <h3 className="font-syne text-2xl font-bold text-white mb-3 line-clamp-2 group-hover:text-emerald-300 transition-colors leading-tight">
          {ev.title}
        </h3>

        <p className="text-sm text-white/60 mb-6 line-clamp-3 leading-relaxed font-sans">
          {ev.description}
        </p>

        {/* Footer Details */}
        <div className="mt-auto pt-4 border-t border-white/10 flex flex-col gap-3">
          <div className="flex items-center gap-2.5 text-xs font-mono text-emerald-400/90">
            <Calendar className="h-4 w-4 shrink-0 text-emerald-400" />
            <span>{formatDate(ev.date)}</span>
          </div>

          <div className="flex items-center justify-between pt-1">
            <div className="flex items-center gap-2 text-xs font-mono text-white/50">
              {isPast ? (
                <Clock className="h-4 w-4 shrink-0" />
              ) : (
                <MapPin className="h-4 w-4 shrink-0 text-emerald-400/70" />
              )}
              <span className="truncate max-w-[150px]">
                {isPast ? formatTime(ev.date) : ev.venue || "Campus"}
              </span>
            </div>

            {ev.registerUrl && !isPast && (
              <a
                href={ev.registerUrl}
                onClick={(e) => e.stopPropagation()}
                target={ev.registerUrl.startsWith("http") ? "_blank" : undefined}
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-4 py-1.5 text-xs font-mono font-bold text-emerald-300 border border-emerald-500/30 transition-all hover:bg-emerald-500 hover:text-black hover:shadow-[0_0_18px_rgba(52,211,153,0.5)]"
              >
                Register <ExternalLink className="h-3.5 w-3.5" />
              </a>
            )}

            {isPast && (
              <span className="inline-flex items-center gap-1 rounded-full bg-white/5 px-3 py-1 text-[11px] font-mono text-white/40 border border-white/10">
                Completed
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
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
      className="relative min-h-screen bg-[#040608] font-syne text-white selection:bg-emerald-500/30 overflow-x-hidden"
    >
      {/* Ambient Lighting Background */}
      <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden" aria-hidden>
        <div
          className="absolute inset-0 transition-opacity duration-1000"
          style={{
            background: `radial-gradient(1200px circle at ${mousePos.x}% ${mousePos.y}%, rgba(52, 211, 153, 0.08), transparent 60%)`,
          }}
        />
        <div className="absolute top-1/4 -right-1/4 h-[800px] w-[800px] rounded-full bg-gradient-to-bl from-emerald-500/10 to-transparent blur-[140px] animate-pulse" />
        <div className="absolute bottom-0 -left-1/4 h-[600px] w-[600px] rounded-full bg-gradient-to-tr from-teal-600/10 to-transparent blur-[140px]" />
        <div className="bg-grain absolute inset-0 opacity-20 mix-blend-overlay" />
      </div>

      <div className="relative z-10 mx-auto max-w-[1440px] px-6 sm:px-12 py-10 sm:py-16 min-h-screen flex flex-col">
        {/* Navigation Bar */}
        <nav className="flex items-center justify-between mb-12 sm:mb-16">
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
            <span>EVENT CHRONICLES</span>
          </div>
        </nav>

        {/* Page Header */}
        <header className="relative text-left mb-12 sm:mb-16">
          <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-4 py-1.5 mb-6 text-xs font-mono font-bold uppercase tracking-widest text-emerald-400 shadow-[0_0_20px_rgba(52,211,153,0.2)]">
            <Sparkles className="h-4 w-4" />
            CRESCENT TECHNOCRATS CLUB
          </div>

          <h1 className="font-syne font-black uppercase leading-[0.88] tracking-tighter text-[clamp(3.5rem,10vw,8.5rem)] text-transparent bg-clip-text bg-gradient-to-r from-white via-emerald-100 to-emerald-400">
            ALL EVENTS
          </h1>

          <p className="mt-6 max-w-2xl text-lg text-white/70 font-sans font-normal leading-relaxed">
            Explore workshops, hackathons, and tech talks hosted by the Crescent Technocrats Club. Empowering innovators to build the future.
          </p>
        </header>

        {/* Quick Search & Filter Controls */}
        <div className="mb-14 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-6 p-4 rounded-3xl border border-white/10 bg-[#080d10]/90 backdrop-blur-2xl shadow-2xl">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-emerald-400/70" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search events by title, description, venue..."
              className="w-full rounded-2xl bg-white/5 pl-11 pr-4 py-3 text-sm font-sans text-white placeholder-white/40 border border-white/5 focus:border-emerald-500/50 focus:bg-emerald-500/5 focus:outline-none transition-all"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-white/40 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          {categories.length > 1 && (
            <div className="flex items-center gap-2 overflow-x-auto pb-2 md:pb-0 scrollbar-none">
              {categories.map((cat) => {
                const active = selectedCategory === cat;
                return (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    className={`px-4 py-2.5 rounded-xl text-xs font-mono font-bold tracking-wider uppercase transition-all whitespace-nowrap border ${
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
        </div>

        {/* Events Sections (UPCOMING & PAST) */}
        <main ref={containerRef} className="flex-1 pb-32 flex flex-col gap-20">
          {loading ? (
            <div className="flex-1 flex items-center justify-center py-28">
              <div className="flex flex-col items-center gap-4">
                <div className="h-14 w-14 rounded-full border-4 border-white/10 border-t-emerald-400 animate-spin" />
                <p className="font-mono text-xs uppercase tracking-widest text-emerald-400 animate-pulse">
                  Loading Events...
                </p>
              </div>
            </div>
          ) : (
            <>
              {/* UPCOMING EVENTS SECTION */}
              {upcoming.length > 0 && (
                <section>
                  <div className="mb-8 flex items-center gap-6">
                    <h2 className="font-syne text-3xl sm:text-4xl font-extrabold text-white uppercase tracking-tight">
                      UPCOMING EVENTS ({upcoming.length})
                    </h2>
                    <div className="h-[1px] flex-1 bg-gradient-to-r from-emerald-500/40 to-transparent" />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {upcoming.map((ev) => renderEventCard(ev, false))}
                  </div>
                </section>
              )}

              {/* PAST EVENTS SECTION */}
              {past.length > 0 && (
                <section>
                  <div className="mb-8 flex items-center gap-6">
                    <h2 className="font-syne text-3xl sm:text-4xl font-bold text-white/50 uppercase tracking-tight">
                      PAST EVENTS ({past.length})
                    </h2>
                    <div className="h-[1px] flex-1 bg-gradient-to-r from-white/10 to-transparent" />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {past.map((ev) => renderEventCard(ev, true))}
                  </div>
                </section>
              )}

              {/* EMPTY RESULTS */}
              {filteredEvents.length === 0 && (
                <div className="flex-1 flex flex-col items-center justify-center py-28 text-center bg-white/5 rounded-3xl border border-white/10 p-8">
                  <Sparkles className="h-12 w-12 text-emerald-400/40 mb-4" />
                  <p className="font-syne text-2xl font-bold text-white mb-2">No matching events found</p>
                  <p className="text-sm font-sans text-white/50 max-w-md mb-6">
                    Try adjusting your category filter or search terms.
                  </p>
                  <button
                    onClick={() => {
                      setSearchQuery("");
                      setSelectedCategory("ALL");
                    }}
                    className="px-6 py-2.5 rounded-full bg-emerald-500/20 text-emerald-300 font-mono text-xs font-bold border border-emerald-500/30 hover:bg-emerald-500 hover:text-black transition-all"
                  >
                    RESET FILTERS
                  </button>
                </div>
              )}
            </>
          )}
        </main>

        {/* Footer */}
        <footer className="mt-auto border-t border-white/10 py-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-left text-xs font-mono text-white/40">
          <p>© {new Date().getFullYear()} CRESCENT TECHNOCRATS CLUB</p>
          <p className="tracking-widest uppercase text-[10px]">DESIGNED FOR THE FUTURE</p>
        </footer>
      </div>

      {/* Expanded Modal Overlay */}
      {selectedEvent && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/85 backdrop-blur-2xl p-4 sm:p-8 animate-in fade-in duration-300">
          <div className="absolute inset-0" onClick={() => setSelectedEvent(null)} />

          <div className="relative w-full max-w-3xl max-h-[90vh] flex flex-col rounded-3xl border border-emerald-500/30 bg-[#090e11] shadow-[0_20px_80px_rgba(0,0,0,0.9)] overflow-hidden animate-in zoom-in-95 duration-300">
            {/* Modal Cover Image */}
            <div className="relative h-56 sm:h-72 w-full shrink-0 bg-black">
              {selectedEvent.image ? (
                <img
                  src={selectedEvent.image}
                  alt={selectedEvent.title}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="h-full w-full bg-gradient-to-br from-emerald-950 to-black flex items-center justify-center">
                  <Sparkles className="h-16 w-16 text-emerald-400/40" />
                </div>
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-[#090e11] via-[#090e11]/40 to-transparent" />

              <button
                onClick={() => setSelectedEvent(null)}
                className="absolute top-4 right-4 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-black/60 text-white/80 backdrop-blur-xl border border-white/20 transition-all hover:bg-white hover:text-black"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="flex-1 overflow-y-auto p-6 sm:p-10">
              <div className="flex items-center gap-3 mb-4">
                <span className="inline-flex items-center rounded-full bg-emerald-500/20 px-3.5 py-1 text-xs font-mono font-bold text-emerald-300 border border-emerald-500/40">
                  {selectedEvent.category || "EVENT"}
                </span>
                {new Date(selectedEvent.date).getTime() <= Date.now() && (
                  <span className="inline-flex items-center rounded-full bg-white/10 px-3 py-1 text-xs font-mono text-white/50 border border-white/10">
                    Completed
                  </span>
                )}
              </div>

              <h2 className="font-syne text-3xl sm:text-4xl font-extrabold text-white mb-6 leading-tight">
                {selectedEvent.title}
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8 bg-white/5 rounded-2xl p-5 border border-white/10 font-mono">
                <div className="flex items-start gap-3">
                  <div className="rounded-xl bg-emerald-500/20 p-2.5 text-emerald-400 border border-emerald-500/30">
                    <Calendar className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-[11px] uppercase tracking-widest text-white/40 mb-1">Date & Time</p>
                    <p className="text-sm font-semibold text-white">{formatDate(selectedEvent.date)}</p>
                    <p className="text-xs text-emerald-400">{formatTime(selectedEvent.date)}</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="rounded-xl bg-emerald-500/20 p-2.5 text-emerald-400 border border-emerald-500/30">
                    <MapPin className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-[11px] uppercase tracking-widest text-white/40 mb-1">Venue Location</p>
                    <p className="text-sm font-semibold text-white">{selectedEvent.venue || "Crescent Campus"}</p>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="font-syne text-xl font-bold text-white mb-3 flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-emerald-400" />
                  About Event
                </h3>
                <p className="text-white/80 font-sans leading-relaxed whitespace-pre-wrap text-base">
                  {selectedEvent.description}
                </p>
              </div>
            </div>

            {/* Modal Footer CTA */}
            {selectedEvent.registerUrl && new Date(selectedEvent.date).getTime() > Date.now() && (
              <div className="p-6 sm:px-10 border-t border-white/10 bg-black/40 shrink-0 flex justify-end">
                <a
                  href={selectedEvent.registerUrl}
                  target={selectedEvent.registerUrl.startsWith("http") ? "_blank" : undefined}
                  rel="noreferrer"
                  className="inline-flex w-full sm:w-auto justify-center items-center gap-2.5 rounded-full bg-emerald-500 px-8 py-3.5 text-sm font-bold text-black transition-all hover:scale-105 hover:bg-emerald-400 hover:shadow-[0_0_30px_rgba(52,211,153,0.6)]"
                >
                  Register Now <ExternalLink className="h-4 w-4" />
                </a>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Custom Mouse Cursor */}
      {!isTouchDevice && (
        <div
          ref={cursorPngRef}
          className="fixed top-0 left-0 z-[99] h-12 w-12 -translate-x-1/2 -translate-y-1/2 pointer-events-none transition-opacity duration-300 mix-blend-difference"
          style={{ opacity: cursorVisible ? 1 : 0 }}
        >
          <Image
            src="/assets/cursor.png"
            alt=""
            width={48}
            height={48}
            className="w-full h-full object-contain"
            draggable={false}
          />
        </div>
      )}
    </div>
  );
}
