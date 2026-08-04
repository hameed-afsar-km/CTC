"use client";

import { useCallback, useEffect, useRef, useState } from "react";

const MUSIC_SRC = "/assets/background-music.mp3";
const FADE_DURATION = 2000;
const TARGET_VOLUME = 0.12;
const PREF_KEY = "ctc-music-preference";
const PREF_TTL = 24 * 60 * 60 * 1000;

type MusicPreference = "yes" | "no" | null;

function readPreference(): MusicPreference {
  try {
    const raw = window.localStorage.getItem(PREF_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { choice?: string; expires?: number };
    if (parsed.choice !== "yes" && parsed.choice !== "no") return null;
    if (typeof parsed.expires !== "number" || parsed.expires <= Date.now()) {
      window.localStorage.removeItem(PREF_KEY);
      return null;
    }
    return parsed.choice;
  } catch {
    return null;
  }
}

function rememberPreference(choice: "yes" | "no") {
  try {
    window.localStorage.setItem(
      PREF_KEY,
      JSON.stringify({ choice, expires: Date.now() + PREF_TTL }),
    );
  } catch {
    // Storage unavailable (private mode, etc.) — ignore.
  }
}

export default function MusicToggle({ start }: { start: boolean }) {
  const [muted, setMuted] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [promptOpen, setPromptOpen] = useState(false);
  const [theme, setTheme] = useState<"dark" | "light">("dark");
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const mutedRef = useRef(false);
  const playingRef = useRef(false);
  const fadeRafRef = useRef<number | null>(null);

  // Create the looping audio element once — src is only assigned after consent,
  // so nothing is downloaded until the visitor opts in.
  useEffect(() => {
    const audio = new Audio();
    audio.loop = true;
    audio.preload = "none";
    audio.volume = 0;
    audioRef.current = audio;
    return () => {
      if (fadeRafRef.current) cancelAnimationFrame(fadeRafRef.current);
      audio.pause();
      audio.src = "";
      audioRef.current = null;
    };
  }, []);

  // Start playback with a smooth fade-in (called from the prompt or the toggle)
  const startPlayback = useCallback(() => {
    const audio = audioRef.current;
    if (!audio || playingRef.current) return;
    playingRef.current = true;
    setPlaying(true);
    mutedRef.current = false;
    setMuted(false);
    audio.src = MUSIC_SRC;
    audio.volume = 0;
    audio
      .play()
      .then(() => {
        const t0 = performance.now();
        const step = (now: number) => {
          const p = Math.min(Math.max((now - t0) / FADE_DURATION, 0), 1);
          const vol = TARGET_VOLUME * (1 - Math.pow(1 - p, 3));
          audio.volume = Math.min(Math.max(vol, 0), TARGET_VOLUME);
          if (p < 1) {
            fadeRafRef.current = requestAnimationFrame(step);
          } else {
            fadeRafRef.current = null;
          }
        };
        fadeRafRef.current = requestAnimationFrame(step);
      })
      .catch(() => {
        playingRef.current = false;
        setPlaying(false);
      });
  }, []);

  // Ask the visitor whether they'd like background music once the splash is over.
  // A stored yes/no answer suppresses the prompt for 24 hours: "yes" auto-starts
  // playback (retried on the first user gesture if autoplay is blocked), "no"
  // keeps it silent.
  useEffect(() => {
    if (!start) return;
    const pref = readPreference();
    if (pref === "no") return;
    if (pref === "yes") {
      startPlayback();
      const resume = () => {
        if (!playingRef.current) startPlayback();
      };
      window.addEventListener("pointerdown", resume);
      window.addEventListener("keydown", resume);
      return () => {
        window.removeEventListener("pointerdown", resume);
        window.removeEventListener("keydown", resume);
      };
    }
    const t = window.setTimeout(() => setPromptOpen(true), 700);
    return () => window.clearTimeout(t);
  }, [start, startPlayback]);

  const toggleMute = () => {
    if (!playingRef.current) {
      startPlayback();
      return;
    }
    const audio = audioRef.current;
    mutedRef.current = !mutedRef.current;
    setMuted(mutedRef.current);
    if (audio) audio.volume = mutedRef.current ? 0 : TARGET_VOLUME;
  };

  // Dynamic icon color — pick the theme of the section currently under the
  // fixed bottom-right corner (light hero/sections → dark icon, dark → mint).
  // The section nodes are cached once and scroll reads are throttled to a rAF.
  useEffect(() => {
    const nodes = Array.from(
      document.querySelectorAll<HTMLElement>("[data-section-theme]"),
    );
    const update = () => {
      const cx = window.innerWidth - 52;
      const cy = window.innerHeight - 52;
      let found: "dark" | "light" | null = null;
      for (const el of nodes) {
        const r = el.getBoundingClientRect();
        if (cx >= r.left && cx <= r.right && cy >= r.top && cy <= r.bottom) {
          found = el.dataset.sectionTheme === "light" ? "light" : "dark";
        }
      }
      if (found) setTheme(found);
    };
    update();
    let raf = 0;
    const onScroll = () => {
      if (raf) return;
      raf = requestAnimationFrame(() => {
        raf = 0;
        update();
      });
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", update);
    return () => {
      if (raf) cancelAnimationFrame(raf);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", update);
    };
  }, []);

  const activeColor = theme === "dark" ? "text-mint" : "text-black/80";
  const idleColor = theme === "dark" ? "text-mint/60" : "text-black/40";
  const barClass = muted ? "music-bar-paused text-neutral-400" : playing ? `music-bar ${activeColor}` : idleColor;

  return (
    <>
      {/* Music toggle — bare icon, no surrounding circle */}
      <button
        type="button"
        onClick={toggleMute}
        aria-pressed={playing && !muted}
        aria-label={
          playing ? (muted ? "Unmute background music" : "Mute background music") : "Play background music"
        }
        title={
          playing ? (muted ? "Unmute music" : "Mute music") : "Play music"
        }
        className="fixed bottom-6 right-6 z-[95] flex items-center justify-center w-14 h-14 hover:scale-110 transition-transform duration-300 focus:outline-none"
      >
        <svg viewBox="0 0 24 24" className="w-10 h-10" fill="currentColor" aria-hidden="true">
          <rect x="4" y="9" width="3" height="6" rx="1.2" className={barClass} />
          <rect
            x="10.5"
            y="5"
            width="3"
            height="14"
            rx="1.2"
            className={barClass}
            style={muted || !playing ? undefined : { animationDelay: "0.18s" }}
          />
          <rect
            x="17"
            y="11"
            width="3"
            height="8"
            rx="1.2"
            className={barClass}
            style={muted || !playing ? undefined : { animationDelay: "0.36s" }}
          />
          {muted && (
            <line
              x1="3.5"
              y1="20.5"
              x2="20.5"
              y2="3.5"
              stroke="#f43f5e"
              strokeWidth="2.5"
              strokeLinecap="round"
            />
          )}
        </svg>
      </button>

      {/* Post-splash music consent modal */}
      {promptOpen && (
        <div className="fixed inset-0 z-[96] flex items-center justify-center p-6 bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-3xl border border-mint/25 bg-[#080c0b]/90 backdrop-blur-xl p-8 text-center shadow-[0_0_60px_rgba(52,211,153,0.15)] animate-modal-in">
            <div className="mx-auto mb-5 flex items-center justify-center w-14 h-14 rounded-2xl border border-mint/30 bg-mint/10">
              <svg viewBox="0 0 24 24" className="w-6 h-6" fill="currentColor" aria-hidden="true">
                <rect x="4" y="9" width="3" height="6" rx="1.2" className="music-bar text-mint" />
                <rect x="10.5" y="5" width="3" height="14" rx="1.2" className="music-bar text-mint" style={{ animationDelay: "0.18s" }} />
                <rect x="17" y="11" width="3" height="8" rx="1.2" className="music-bar text-mint" style={{ animationDelay: "0.36s" }} />
              </svg>
            </div>
            <h2 className="font-syne text-2xl font-black tracking-tight text-white">
              Enhance Your Experience?
            </h2>
            <p className="mt-2 text-sm text-white/60 leading-relaxed">
              Would you like background music while you explore CTC? You can mute or resume it anytime from the button in the corner.
            </p>
            <div className="mt-7 flex flex-col sm:flex-row gap-3">
              <button
                type="button"
                onClick={() => {
                  rememberPreference("yes");
                  startPlayback();
                  setPromptOpen(false);
                }}
                className="flex-1 px-5 py-3 rounded-full bg-mint text-black font-syne text-sm font-bold tracking-wider uppercase shadow-lg shadow-mint/20 hover:shadow-mint/40 hover:scale-[1.03] transition-all duration-300"
              >
                Yes, Play Music
              </button>
              <button
                type="button"
                onClick={() => {
                  rememberPreference("no");
                  setPromptOpen(false);
                }}
                className="flex-1 px-5 py-3 rounded-full border border-white/15 text-white/70 hover:border-mint/40 hover:text-white font-syne text-sm font-bold tracking-wider uppercase transition-all duration-300"
              >
                No Thanks
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
