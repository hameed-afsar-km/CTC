"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { gsap } from "gsap";

export default function CursorOverlay() {
  const [isTouchDevice, setIsTouchDevice] = useState(false);
  const cursorRef = useRef<HTMLDivElement>(null);
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
    const handleMouseMove = (e: MouseEvent) => {
      setCursorVisible(true);
      if (cursorRef.current) {
        gsap.to(cursorRef.current, {
          x: e.clientX,
          y: e.clientY,
          xPercent: -50,
          yPercent: -50,
          duration: 0.08,
          ease: "power2.out",
        });
      }
      const targetEl = e.target as Element | null;
      const overInteractive =
        !!targetEl &&
        typeof targetEl.closest === "function" &&
        !!targetEl.closest("a[href], button, [role='button'], input, textarea, select, label");
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

  useEffect(() => {
    if (!cursorRef.current) return;
    gsap.to(cursorRef.current, {
      rotation: macHover ? -40 : 0,
      duration: 0.3,
      ease: "power2.out",
    });
  }, [macHover]);

  if (isTouchDevice) return null;

  return (
    <div
      ref={cursorRef}
      className="fixed top-0 left-0 w-12 h-12 pointer-events-none z-[9999] transition-opacity duration-300 -translate-x-1/2 -translate-y-1/2 select-none"
      style={{ opacity: cursorVisible ? 1 : 0 }}
      aria-hidden="true"
    >
      <Image
        src="/assets/cursor.png"
        alt=""
        width={48}
        height={48}
        priority
        className="w-full h-full object-contain pointer-events-none"
        draggable={false}
      />
    </div>
  );
}
