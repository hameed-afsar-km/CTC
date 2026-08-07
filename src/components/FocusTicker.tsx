"use client";

import { useEffect, useState } from "react";
import type { FocusConfig } from "@/lib/focus";

const REPEATS = 6;

export default function FocusTicker({
  onActiveChange,
  hidden = false,
}: {
  onActiveChange?: (active: boolean) => void;
  hidden?: boolean;
}) {
  const [config, setConfig] = useState<FocusConfig | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/focus", { cache: "no-store" })
      .then((res) => res.json())
      .then((data) => {
        if (cancelled) return;
        if (data && typeof data.config?.text === "string") {
          setConfig(data.config);
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  const active = Boolean(config?.enabled && config?.text?.trim());

  useEffect(() => {
    onActiveChange?.(active);
  }, [active, onActiveChange]);

  if (!active) return null;

  const items = config!.text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  return (
    <div
      className={`fixed top-0 left-0 right-0 z-[90] h-9 overflow-hidden border-b border-emerald-500/20 bg-[#040706]/95 backdrop-blur-md select-none transition-opacity duration-300 ${
        hidden ? "opacity-0 pointer-events-none" : "opacity-100"
      }`}
      style={{
        backgroundImage:
          "linear-gradient(to right, rgba(52,211,153,0.04) 1px, transparent 1px), linear-gradient(to bottom, rgba(52,211,153,0.04) 1px, transparent 1px)",
        backgroundSize: "28px 28px",
      }}
    >
      <div className="flex h-full items-center overflow-hidden">
        <div className="animate-marquee items-center">
          {[0, 1].map((dup) => (
            <div key={dup} className="flex items-center" aria-hidden={dup === 1}>
              {Array.from({ length: REPEATS }).map((_, i) =>
                items.map((item, j) => (
                  <span
                    key={`${i}-${j}`}
                    className="flex items-center whitespace-nowrap px-5 text-[11px] sm:text-xs font-syne font-bold uppercase tracking-[0.2em] text-emerald-300"
                  >
                    <span className="text-emerald-400 mr-3">✦</span>
                    {item}
                  </span>
                ))
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
