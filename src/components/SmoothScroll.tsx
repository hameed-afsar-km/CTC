"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import Lenis from "lenis";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

const LenisContext = createContext<Lenis | null>(null);

/**
 * Returns the global Lenis instance (or null before it has mounted / when the
 * user prefers reduced motion). Use it for programmatic smooth scrolls, e.g.
 * `lenis.scrollTo(target, { duration: 0.8 })`.
 */
export function useSmoothScroll() {
  return useContext(LenisContext);
}

export default function SmoothScrollProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [lenis, setLenis] = useState<Lenis | null>(null);

  useEffect(() => {
    const instance = new Lenis({
      autoRaf: false,
      smoothWheel: true,
      lerp: 0.1,
      allowNestedScroll: true,
      stopInertiaOnNavigate: true,
    });

    // Keep GSAP ScrollTrigger (pins, scrubs) in sync with Lenis's smoothed scroll.
    instance.on("scroll", ScrollTrigger.update);

    const tick = (time: number) => instance.raf(time * 1000);
    gsap.ticker.add(tick);
    gsap.ticker.lagSmoothing(0);

    // Same-page anchor links scroll smoothly through Lenis instead of the
    // native jump. Section targets use `scroll-margin-top` for the fixed
    // navbar, and `#top` is sent straight to scroll position 0.
    const handleAnchorClick = (event: MouseEvent) => {
      const anchor = event
        .composedPath()
        .find(
          (node): node is HTMLAnchorElement =>
            node instanceof HTMLAnchorElement && Boolean(node.hash) && Boolean(node.href)
        );
      if (!anchor) return;

      const url = new URL(anchor.href);
      if (
        url.origin !== window.location.origin ||
        url.pathname !== window.location.pathname
      ) {
        return;
      }

      const hash = anchor.getAttribute("href");
      if (!hash || !hash.startsWith("#")) return;

      event.preventDefault();

      if (hash === "#top") {
        instance.scrollTo(0);
      } else {
        instance.scrollTo(hash);
      }

      if (window.location.hash !== hash) {
        window.history.replaceState(null, "", hash);
      }
    };

    window.addEventListener("click", handleAnchorClick);

    // Re-measure pinned ScrollTriggers now that Lenis owns the scroll, then
    // publish the instance to the context on the same frame.
    const refreshId = requestAnimationFrame(() => {
      ScrollTrigger.refresh();
      setLenis(instance);
    });

    return () => {
      cancelAnimationFrame(refreshId);
      window.removeEventListener("click", handleAnchorClick);
      gsap.ticker.remove(tick);
      instance.destroy();
      setLenis(null);
    };
  }, []);

  return (
    <LenisContext.Provider value={lenis}>{children}</LenisContext.Provider>
  );
}
