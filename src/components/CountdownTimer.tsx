"use client";

import { Fragment, useEffect, useState } from "react";

interface TimeLeft {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
}

function getTimeLeft(targetMs: number): TimeLeft {
  const ms = Math.max(0, targetMs - Date.now());
  return {
    days: Math.floor(ms / 86400000),
    hours: Math.floor(ms / 3600000) % 24,
    minutes: Math.floor(ms / 60000) % 60,
    seconds: Math.floor(ms / 1000) % 60,
  };
}

const ZERO_TIME: TimeLeft = { days: 0, hours: 0, minutes: 0, seconds: 0 };

function pad(n: number) {
  return n.toString().padStart(2, "0");
}

export default function CountdownTimer({ target }: { target: string }) {
  const targetMs = new Date(target).getTime();
  const valid = !Number.isNaN(targetMs);
  const [time, setTime] = useState<TimeLeft | null>(null);

  useEffect(() => {
    if (!valid) return;
    const tick = () => setTime(getTimeLeft(targetMs));
    const initial = setTimeout(tick, 0);
    const id = setInterval(tick, 1000);
    return () => {
      clearTimeout(initial);
      clearInterval(id);
    };
  }, [targetMs, valid]);

  const cells = [
    { label: "DAYS", value: (time ?? ZERO_TIME).days },
    { label: "HOURS", value: (time ?? ZERO_TIME).hours },
    { label: "MINS", value: (time ?? ZERO_TIME).minutes },
    { label: "SECS", value: (time ?? ZERO_TIME).seconds },
  ];

  return (
    <div className="flex items-center justify-center gap-2 sm:gap-5 select-none">
      {cells.map((c, i) => (
        <Fragment key={c.label}>
          {i > 0 && (
            <span
              className="text-2xl sm:text-3xl md:text-4xl font-thin text-emerald-400/40 animate-pulse select-none"
              aria-hidden="true"
            >
              :
            </span>
          )}
          <div className="flex flex-col items-center">
            <span className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-extrabold font-syne text-transparent bg-clip-text bg-gradient-to-b from-white via-emerald-100 to-emerald-400 drop-shadow-[0_0_25px_rgba(52,211,153,0.4)] tabular-nums leading-none tracking-tight">
              {pad(c.value)}
            </span>
            <span className="text-[9px] sm:text-[10px] md:text-xs font-mono text-emerald-400/80 tracking-[0.3em] uppercase mt-1.5 sm:mt-2 font-semibold">
              {c.label}
            </span>
          </div>
        </Fragment>
      ))}
    </div>
  );
}
