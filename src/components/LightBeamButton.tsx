"use client";

import React from "react";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export interface LightBeamButtonProps {
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
  gradientColors?: [string, string, string];
  href?: string;
  onClick?: () => void;
}

export function LightBeamButton({
  children,
  className,
  style,
  gradientColors = ["#a7f3d0", "#34d399", "#a7f3d0"],
  href,
  onClick,
}: LightBeamButtonProps) {
  const router = useRouter();
  const gradientString = `conic-gradient(from var(--gradient-angle), transparent 0%, ${gradientColors[0]} 40%, ${gradientColors[1]} 50%, transparent 60%, transparent 100%)`;

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (onClick) onClick();
    if (href) {
      e.preventDefault();
      router.push(href);
    }
  };

  return (
    <>
      <style jsx global>{`
        @property --gradient-angle {
          syntax: "<angle>";
          initial-value: 0deg;
          inherits: false;
        }
        @keyframes border-spin {
          from { --gradient-angle: 0deg; }
          to { --gradient-angle: 360deg; }
        }
        .animate-border-spin {
          animation: border-spin 2s linear infinite;
        }
      `}</style>

      <motion.button
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        onClick={handleClick}
        style={style}
        className={cn(
          "group relative isolate overflow-hidden rounded-full bg-neutral-950 px-12 py-3 font-syne font-bold tracking-wider uppercase text-white transition-all hover:bg-neutral-900 text-base",
          "shadow-[0_0_20px_-5px_rgba(167,243,208,0.6)] hover:shadow-[0_0_30px_-5px_rgba(167,243,208,0.8)]",
          className
        )}
      >
        <span className="relative z-10 flex items-center gap-2">{children}</span>

        <div
          className="absolute inset-0 -z-10 rounded-full p-[1px] animate-border-spin"
          style={{
            "--gradient-angle": "0deg",
            background: gradientString,
          } as React.CSSProperties}
        />

        <div className="absolute inset-[1px] -z-10 rounded-full bg-neutral-950" />

        <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_50%_0%,rgba(167,243,208,0.35)_0%,transparent_60%)] opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
      </motion.button>
    </>
  );
}

export default LightBeamButton;