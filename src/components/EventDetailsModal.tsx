"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Calendar,
  MapPin,
  ExternalLink,
  Sparkles,
  Clock,
  X,
  ListChecks,
  CheckCircle2,
  XCircle,
  Mail,
  Phone,
  User,
} from "lucide-react";
import type { ClubEvent } from "@/lib/events";
import { eventCtaHref, hasCtaLink } from "@/lib/events";
import { useSmoothScroll } from "@/components/SmoothScroll";

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

function pad(n: number) {
  return n.toString().padStart(2, "0");
}

export default function EventDetailsModal({
  event,
  onClose,
}: {
  event: ClubEvent;
  onClose: () => void;
}) {
  const lenis = useSmoothScroll();
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    document.body.style.overflow = "hidden";
    lenis?.stop();
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => {
      document.body.style.overflow = "";
      lenis?.start();
      clearInterval(id);
    };
  }, [lenis]);

  const isPast = new Date(event.date).getTime() <= now;
  const deadlineMs = event.registrationDeadline
    ? new Date(event.registrationDeadline).getTime()
    : NaN;
  const deadlineActive = !Number.isNaN(deadlineMs) && deadlineMs > now;

  const countdown = useMemo(() => {
    if (!deadlineActive) return null;
    const ms = Math.max(0, deadlineMs - now);
    return {
      days: Math.floor(ms / 86400000),
      hours: Math.floor(ms / 3600000) % 24,
      minutes: Math.floor(ms / 60000) % 60,
      seconds: Math.floor(ms / 1000) % 60,
    };
  }, [deadlineActive, deadlineMs, now]);

  const contactName = event.contactName?.trim();
  const contactEmail = event.contactEmail?.trim();
  const contactPhone = event.contactPhone?.trim();
  const hasContact = !!(contactName || contactEmail || contactPhone);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/85 backdrop-blur-2xl p-4 sm:p-8 animate-in fade-in duration-300">
      <div className="absolute inset-0" onClick={onClose} />

      <div className="relative w-full max-w-5xl max-h-[90vh] flex flex-col rounded-3xl border border-emerald-500/30 bg-[#090e11] shadow-[0_20px_80px_rgba(0,0,0,0.9)] overflow-hidden animate-in zoom-in-95 duration-300">
        {/* Modal Cover Image */}
        <div className="relative h-56 sm:h-72 w-full shrink-0 bg-black">
          {event.image ? (
            <img src={event.image} alt={event.title} className="h-full w-full object-cover" />
          ) : (
            <div className="h-full w-full bg-gradient-to-br from-emerald-950 to-black flex items-center justify-center">
              <Sparkles className="h-16 w-16 text-emerald-400/40" />
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-[#090e11] via-[#090e11]/40 to-transparent" />

          <button
            onClick={onClose}
            aria-label="Close event details"
            className="absolute top-4 right-4 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-black/60 text-white/80 backdrop-blur-xl border border-white/20 transition-all hover:bg-white hover:text-black"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Modal Content */}
        <div className="flex-1 overflow-y-auto p-6 sm:p-10" data-lenis-prevent>
          <div className="flex items-center gap-3 mb-4">
            <span className="inline-flex items-center rounded-full bg-emerald-500/20 px-3.5 py-1 text-xs font-mono font-bold text-emerald-300 border border-emerald-500/40">
              {event.category || "EVENT"}
            </span>
            {isPast && (
              <span className="inline-flex items-center rounded-full bg-white/10 px-3 py-1 text-xs font-mono text-white/50 border border-white/10">
                Completed
              </span>
            )}
          </div>

          <h2 className="font-syne text-3xl sm:text-4xl font-extrabold text-white mb-6 leading-tight">
            {event.title}
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8 bg-white/5 rounded-2xl p-5 border border-white/10 font-mono">
            <div className="flex items-start gap-3">
              <div className="rounded-xl bg-emerald-500/20 p-2.5 text-emerald-400 border border-emerald-500/30">
                <Calendar className="h-5 w-5" />
              </div>
              <div>
                <p className="text-[11px] uppercase tracking-widest text-white/40 mb-1">Date & Time</p>
                <p className="text-sm font-semibold text-white">{formatDate(event.date)}</p>
                <p className="text-xs text-emerald-400">{formatTime(event.date)}</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="rounded-xl bg-emerald-500/20 p-2.5 text-emerald-400 border border-emerald-500/30">
                <MapPin className="h-5 w-5" />
              </div>
              <div>
                <p className="text-[11px] uppercase tracking-widest text-white/40 mb-1">Venue Location</p>
                <p className="text-sm font-semibold text-white">{event.venue || "Crescent Campus"}</p>
              </div>
            </div>
          </div>

          {event.registrationDeadline && (
            <div
              className={`mb-8 rounded-2xl p-5 border font-mono ${
                deadlineActive
                  ? "border-amber-500/30 bg-amber-500/10"
                  : "border-rose-500/30 bg-rose-500/10"
              }`}
            >
              <div className="flex items-start gap-3">
                <div
                  className={`rounded-xl p-2.5 border ${
                    deadlineActive
                      ? "bg-amber-500/20 text-amber-300 border-amber-500/30"
                      : "bg-rose-500/20 text-rose-300 border-rose-500/30"
                  }`}
                >
                  <Clock className="h-5 w-5" />
                </div>
                <div>
                  <p
                    className={`text-[11px] uppercase tracking-widest mb-1 ${
                      deadlineActive ? "text-amber-300/70" : "text-rose-300/70"
                    }`}
                  >
                    {deadlineActive ? "Registration Closes" : "Registration Closed"}
                  </p>
                  <p className="text-sm font-semibold text-white">
                    {formatDate(event.registrationDeadline)}
                    {formatTime(event.registrationDeadline)
                      ? ` • ${formatTime(event.registrationDeadline)}`
                      : ""}
                  </p>
                </div>
              </div>

              {deadlineActive && countdown && (
                <div className="mt-4 grid grid-cols-4 gap-2">
                  {(
                    [
                      { label: "DAYS", value: countdown.days },
                      { label: "HOURS", value: countdown.hours },
                      { label: "MINS", value: countdown.minutes },
                      { label: "SECS", value: countdown.seconds },
                    ] as const
                  ).map((c) => (
                    <div
                      key={c.label}
                      className="rounded-xl bg-amber-500/10 border border-amber-500/20 px-2 py-2.5 text-center"
                    >
                      <span className="block text-xl sm:text-2xl font-extrabold text-amber-300 tabular-nums leading-none">
                        {pad(c.value)}
                      </span>
                      <span className="block text-[9px] uppercase tracking-widest text-amber-300/60 mt-1">
                        {c.label}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          <div>
            <h3 className="font-syne text-xl font-bold text-white mb-3 flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-emerald-400" />
              About Event
            </h3>
            <p className="text-white/80 font-sans leading-relaxed whitespace-pre-wrap text-base">
              {event.description}
            </p>
          </div>

          {event.highlights && event.highlights.length > 0 && (
            <div className="mt-8">
              <h3 className="font-syne text-xl font-bold text-white mb-3 flex items-center gap-2">
                <ListChecks className="h-4 w-4 text-emerald-400" />
                Key Highlights
              </h3>
              <ul className="space-y-2.5">
                {event.highlights.map((item, i) => (
                  <li
                    key={i}
                    className="flex items-start gap-3 text-white/80 font-sans text-sm leading-relaxed"
                  >
                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {event.schedule && event.schedule.length > 0 && (
            <div className="mt-8">
              <h3 className="font-syne text-xl font-bold text-white mb-5 flex items-center gap-2">
                <Clock className="h-4 w-4 text-emerald-400" />
                Event Schedule
              </h3>
              <div className="relative pl-5 border-l border-emerald-500/20 space-y-6">
                {event.schedule.map((slot, i) => (
                  <div key={i} className="relative">
                    <span className="absolute -left-[26px] top-1.5 h-2.5 w-2.5 rounded-full border-2 border-emerald-400 bg-[#090e11] shadow-[0_0_10px_rgba(52,211,153,0.6)]" />
                    <div className="flex flex-col sm:flex-row sm:items-baseline gap-1 sm:gap-4">
                      <span className="shrink-0 rounded-lg bg-emerald-500/15 border border-emerald-500/30 px-2.5 py-1 font-mono text-xs font-bold text-emerald-300 w-fit">
                        {slot.time}
                      </span>
                      <div>
                        <p className="text-white font-sans text-sm font-semibold">
                          {slot.title}
                        </p>
                        {slot.description && (
                          <p className="text-white/60 font-sans text-sm mt-0.5">
                            {slot.description}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {(event.dos?.length || event.donts?.length) ? (
            <div className="mt-8">
              <h3 className="font-syne text-xl font-bold text-white mb-4 flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                Do&apos;s &amp; Don&apos;ts
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {event.dos && event.dos.length > 0 && (
                  <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-5">
                    <p className="font-mono text-[11px] font-bold uppercase tracking-widest text-emerald-300 mb-3">
                      Do&apos;s
                    </p>
                    <ul className="space-y-2.5">
                      {event.dos.map((item, i) => (
                        <li
                          key={i}
                          className="flex items-start gap-2.5 text-white/80 font-sans text-sm leading-relaxed"
                        >
                          <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5 text-emerald-400" />
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {event.donts && event.donts.length > 0 && (
                  <div className="rounded-2xl border border-red-500/20 bg-red-500/5 p-5">
                    <p className="font-mono text-[11px] font-bold uppercase tracking-widest text-red-300 mb-3">
                      Don&apos;ts
                    </p>
                    <ul className="space-y-2.5">
                      {event.donts.map((item, i) => (
                        <li
                          key={i}
                          className="flex items-start gap-2.5 text-white/80 font-sans text-sm leading-relaxed"
                        >
                          <XCircle className="h-4 w-4 shrink-0 mt-0.5 text-red-400" />
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          ) : null}
        </div>

        {/* Modal Footer — contact info + register CTA */}
        {(hasContact || !isPast) && (
          <div className="p-6 sm:px-10 border-t border-white/10 bg-black/40 shrink-0 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-x-6 gap-y-2 min-w-0">
              {contactName && (
                <span className="inline-flex items-center gap-2 text-xs font-mono text-white/70">
                  <User className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                  {contactName}
                </span>
              )}
              {contactEmail && (
                <a
                  href={`mailto:${contactEmail}`}
                  className="inline-flex items-center gap-2 text-xs font-mono text-emerald-300 hover:text-emerald-200 underline-offset-4 hover:underline"
                >
                  <Mail className="h-3.5 w-3.5 shrink-0" />
                  {contactEmail}
                </a>
              )}
              {contactPhone && (
                <a
                  href={`tel:${contactPhone.replace(/[^\d+]/g, "")}`}
                  className="inline-flex items-center gap-2 text-xs font-mono text-emerald-300 hover:text-emerald-200 underline-offset-4 hover:underline"
                >
                  <Phone className="h-3.5 w-3.5 shrink-0" />
                  {contactPhone}
                </a>
              )}
              {!hasContact && isPast && (
                <span className="text-xs font-mono text-white/40">Event completed</span>
              )}
            </div>

            {!isPast && (
              <a
                href={eventCtaHref(event.registerUrl)}
                target={hasCtaLink(event.registerUrl) ? "_blank" : undefined}
                rel={hasCtaLink(event.registerUrl) ? "noreferrer" : undefined}
                className="inline-flex w-full sm:w-auto justify-center items-center gap-2.5 rounded-full bg-emerald-500 px-8 py-3.5 text-sm font-bold text-black transition-all hover:scale-105 hover:bg-emerald-400 hover:shadow-[0_0_30px_rgba(52,211,153,0.6)]"
              >
                Register Now <ExternalLink className="h-4 w-4" />
              </a>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
