"use client";

import { useEffect, useState, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, Calendar, MapPin, ExternalLink, Sparkles, Clock, X } from "lucide-react";
import type { ClubEvent } from "@/lib/events";
import { gsap } from "gsap";

function formatDate(dateStr: string) {
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString("en-US", {
    weekday: "short",
    month: "long",
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
  const [mousePos, setMousePos] = useState({ x: 50, y: 50 });
  const containerRef = useRef<HTMLDivElement>(null);
  
  const [selectedEvent, setSelectedEvent] = useState<ClubEvent | null>(null);

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
  
  const [isTouchDevice, setIsTouchDevice] = useState(false);
  const cursorPngRef = useRef<HTMLDivElement>(null);
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
        { opacity: 0, y: 40 },
        {
          opacity: 1,
          y: 0,
          duration: 0.8,
          stagger: 0.1,
          ease: "power3.out",
        }
      );
      
      gsap.fromTo(
        ".section-title",
        { opacity: 0, x: -20 },
        {
          opacity: 1,
          x: 0,
          duration: 0.8,
          stagger: 0.2,
          ease: "power3.out",
        }
      );
    }
  }, [loading, events]);

  const now = Date.now();
  const upcoming = events
    .filter((e) => new Date(e.date).getTime() > now)
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  const past = events
    .filter((e) => new Date(e.date).getTime() <= now)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const renderEventCard = (ev: ClubEvent, isPast: boolean) => (
    <div
      key={ev.id}
      onClick={() => setSelectedEvent(ev)}
      className={`event-card group cursor-pointer relative flex flex-col rounded-2xl border ${
        isPast ? "border-white/5 bg-white/5 opacity-80" : "border-emerald-500/20 bg-[#0a0f12]"
      } overflow-hidden transition-all duration-500 hover:-translate-y-2 hover:shadow-[0_8px_32px_rgba(52,211,153,0.15)] hover:border-emerald-500/40`}
    >
      <div className="relative h-56 w-full overflow-hidden">
        {ev.image ? (
          <img
            src={ev.image}
            alt={ev.title}
            className={`h-full w-full object-cover transition-transform duration-[1.5s] group-hover:scale-110 ${isPast ? "grayscale-[40%]" : ""}`}
          />
        ) : (
          <div className="h-full w-full bg-gradient-to-br from-emerald-900/40 to-black flex items-center justify-center">
            <Sparkles className="h-12 w-12 text-emerald-500/30" />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-[#0a0f12] via-transparent to-transparent" />
        
        <div className="absolute top-4 right-4 z-10 flex gap-2">
          <span className={`inline-flex items-center rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-wider backdrop-blur-md ${
            isPast 
              ? "bg-black/50 text-white/70 border border-white/10" 
              : "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 shadow-[0_0_12px_rgba(52,211,153,0.3)]"
          }`}>
            {ev.category}
          </span>
        </div>
      </div>

      <div className="flex flex-1 flex-col p-6 pt-2">
        <h3 className="font-syne text-2xl font-bold text-white mb-2 line-clamp-2 group-hover:text-emerald-300 transition-colors">
          {ev.title}
        </h3>
        
        <p className="text-sm text-white/60 mb-6 line-clamp-3 leading-relaxed flex-1">
          {ev.description}
        </p>

        <div className="flex flex-col gap-3 mt-auto pt-4 border-t border-white/10">
          <div className="flex items-center gap-2 text-xs font-mono text-emerald-400/80">
            <Calendar className="h-4 w-4" />
            <span>{formatDate(ev.date)}</span>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-mono text-white/50">
              {isPast ? <Clock className="h-4 w-4" /> : <MapPin className="h-4 w-4" />}
              <span>{isPast ? formatTime(ev.date) : ev.venue}</span>
            </div>
            
            {ev.registerUrl && !isPast && (
              <a
                href={ev.registerUrl}
                onClick={(e) => e.stopPropagation()}
                target={ev.registerUrl.startsWith("http") ? "_blank" : undefined}
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-4 py-1.5 text-xs font-bold text-emerald-400 border border-emerald-500/20 transition-all hover:bg-emerald-500 hover:text-black hover:shadow-[0_0_16px_rgba(52,211,153,0.5)]"
              >
                Register <ExternalLink className="h-3.5 w-3.5" />
              </a>
            )}
            {isPast && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white/5 px-4 py-1.5 text-xs font-bold text-white/40 border border-white/10">
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
      className="relative min-h-screen bg-[#050505] font-syne text-white selection:bg-emerald-500/30 overflow-x-hidden"
    >
      {/* Background Effects */}
      <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden" aria-hidden>
        <div
          className="absolute inset-0 transition-opacity duration-1000"
          style={{
            background: `radial-gradient(1200px circle at ${mousePos.x}% ${mousePos.y}%, rgba(52, 211, 153, 0.08), transparent 60%)`,
          }}
        />
        <div className="absolute top-1/4 -right-1/4 h-[800px] w-[800px] rounded-full bg-gradient-to-bl from-[#34d399]/10 to-transparent blur-[120px] animate-[float_20s_ease-in-out_infinite]" />
        <div className="absolute bottom-0 -left-1/4 h-[600px] w-[600px] rounded-full bg-gradient-to-tr from-[#059669]/10 to-transparent blur-[120px] animate-[float_25s_ease-in-out_infinite_reverse]" />
        <div className="bg-grain absolute inset-0 opacity-20 mix-blend-overlay" />
      </div>

      <div className="relative z-10 mx-auto max-w-[1400px] px-6 sm:px-12 py-10 sm:py-16 min-h-screen flex flex-col">
        <nav className="flex items-center justify-between mix-blend-difference mb-12 sm:mb-20">
          <Link
            href="/"
            className="group inline-flex items-center gap-3 font-mono text-xs text-white/70 transition-all duration-300 hover:text-white"
          >
            <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-2" />
            <span className="font-bold tracking-widest uppercase">BACK TO HOME</span>
          </Link>
          <div className="hidden sm:flex items-center gap-2 font-mono text-[10px] uppercase tracking-widest text-white/50">
            <span>CTC</span>
            <span className="h-1 w-1 rounded-full bg-white/50" />
            <span>EVENTS</span>
          </div>
        </nav>

        <header className="relative text-left mb-16 sm:mb-24">
          <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-4 py-1.5 mb-6 text-xs font-mono font-bold uppercase tracking-widest text-emerald-400">
            <Sparkles className="h-4 w-4" />
            Discover What's Next
          </div>
          <h1 className="font-syne font-black uppercase leading-[0.9] tracking-tighter text-[clamp(3rem,10vw,8rem)] text-transparent bg-clip-text bg-gradient-to-r from-white via-emerald-100 to-emerald-400/50 mix-blend-plus-lighter">
            ALL EVENTS
          </h1>
          <p className="mt-6 max-w-2xl text-lg text-white/60 font-medium">
            Explore upcoming workshops, hackathons, and tech talks hosted by the Crescent Technocrats Club. Join us in building the future.
          </p>
        </header>

        <main ref={containerRef} className="flex-1 pb-32 flex flex-col gap-24">
          {loading ? (
            <div className="flex-1 flex items-center justify-center">
              <div className="flex flex-col items-center gap-4">
                <div className="h-12 w-12 rounded-full border-4 border-white/10 border-t-emerald-400 animate-spin" />
                <p className="font-mono text-xs uppercase tracking-widest text-emerald-400 animate-pulse">Loading Events...</p>
              </div>
            </div>
          ) : (
            <>
              {upcoming.length > 0 && (
                <section>
                  <div className="section-title mb-10 flex items-center gap-6">
                    <h2 className="font-syne text-4xl font-bold text-white">UPCOMING</h2>
                    <div className="h-[1px] flex-1 bg-gradient-to-r from-emerald-500/40 to-transparent" />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
                    {upcoming.map(ev => renderEventCard(ev, false))}
                  </div>
                </section>
              )}

              {past.length > 0 && (
                <section>
                  <div className="section-title mb-10 flex items-center gap-6">
                    <h2 className="font-syne text-4xl font-bold text-white/60">PAST EVENTS</h2>
                    <div className="h-[1px] flex-1 bg-gradient-to-r from-white/10 to-transparent" />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
                    {past.map(ev => renderEventCard(ev, true))}
                  </div>
                </section>
              )}

              {events.length === 0 && (
                <div className="flex-1 flex items-center justify-center py-20">
                  <p className="font-mono text-sm text-white/40 uppercase tracking-widest">No events found.</p>
                </div>
              )}
            </>
          )}
        </main>
        
        <footer className="mt-auto border-t border-white/10 py-8 text-center">
          <p className="font-mono text-[10px] uppercase tracking-widest text-white/40">
            © {new Date().getFullYear()} CRESCENT TECHNOCRATS CLUB
          </p>
        </footer>
      </div>

      {/* Expanded Modal */}
      {selectedEvent && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-md p-4 sm:p-6 animate-in fade-in duration-300">
          <div 
            className="absolute inset-0" 
            onClick={() => setSelectedEvent(null)} 
          />
          <div className="relative w-full max-w-3xl max-h-[90vh] flex flex-col rounded-3xl border border-white/10 bg-[#0a0f12] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
            {/* Modal Header Image */}
            <div className="relative h-48 sm:h-64 w-full shrink-0 bg-black">
              {selectedEvent.image ? (
                <img
                  src={selectedEvent.image}
                  alt={selectedEvent.title}
                  className="h-full w-full object-cover opacity-80"
                />
              ) : (
                <div className="h-full w-full bg-gradient-to-br from-emerald-900/40 to-black flex items-center justify-center">
                  <Sparkles className="h-16 w-16 text-emerald-500/30" />
                </div>
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-[#0a0f12] via-transparent to-transparent" />
              
              <button
                onClick={() => setSelectedEvent(null)}
                className="absolute top-4 right-4 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-black/50 text-white/70 backdrop-blur-md border border-white/10 transition-colors hover:bg-white hover:text-black"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto p-6 sm:p-8">
              <div className="flex items-center gap-3 mb-4">
                <span className="inline-flex items-center rounded-full bg-emerald-500/20 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-emerald-300 border border-emerald-500/30">
                  {selectedEvent.category}
                </span>
                {new Date(selectedEvent.date).getTime() <= Date.now() && (
                  <span className="inline-flex items-center rounded-full bg-white/10 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-white/50 border border-white/10">
                    Completed
                  </span>
                )}
              </div>
              
              <h2 className="font-syne text-3xl sm:text-4xl font-bold text-white mb-6">
                {selectedEvent.title}
              </h2>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8 bg-white/5 rounded-2xl p-4 border border-white/5">
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 rounded-full bg-emerald-500/10 p-2 text-emerald-400">
                    <Calendar className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-xs font-mono uppercase tracking-widest text-white/40 mb-1">Date & Time</p>
                    <p className="text-sm font-medium text-white/90">{formatDate(selectedEvent.date)}</p>
                    <p className="text-sm text-white/60">{formatTime(selectedEvent.date)}</p>
                  </div>
                </div>
                
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 rounded-full bg-emerald-500/10 p-2 text-emerald-400">
                    <MapPin className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-xs font-mono uppercase tracking-widest text-white/40 mb-1">Venue</p>
                    <p className="text-sm font-medium text-white/90">{selectedEvent.venue}</p>
                  </div>
                </div>
              </div>

              <div className="prose prose-invert max-w-none">
                <h3 className="font-syne text-xl font-bold text-white mb-3">About Event</h3>
                <p className="text-white/70 leading-relaxed whitespace-pre-wrap">
                  {selectedEvent.description}
                </p>
              </div>
            </div>

            {/* Modal Footer */}
            {selectedEvent.registerUrl && new Date(selectedEvent.date).getTime() > Date.now() && (
              <div className="p-6 sm:px-8 border-t border-white/10 bg-black/20 shrink-0 flex justify-end">
                <a
                  href={selectedEvent.registerUrl}
                  target={selectedEvent.registerUrl.startsWith("http") ? "_blank" : undefined}
                  rel="noreferrer"
                  className="inline-flex w-full sm:w-auto justify-center items-center gap-2 rounded-full bg-gradient-to-r from-emerald-500 to-teal-400 px-8 py-3.5 text-sm font-bold text-black transition-all hover:scale-105 hover:shadow-[0_0_24px_rgba(52,211,153,0.4)]"
                >
                  Register Now <ExternalLink className="h-4 w-4" />
                </a>
              </div>
            )}
          </div>
        </div>
      )}

      {!isTouchDevice && (
        <div ref={cursorPngRef} className="fixed top-0 left-0 z-[99] h-12 w-12 -translate-x-1/2 -translate-y-1/2 pointer-events-none transition-opacity duration-300 mix-blend-difference" style={{ opacity: cursorVisible ? 1 : 0 }}>
          <Image src="/assets/cursor.png" alt="" width={48} height={48} className="w-full h-full object-contain" draggable={false} />
        </div>
      )}
    </div>
  );
}
