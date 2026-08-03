"use client";

import { useEffect, useRef, useState } from "react";

export function useInView<T extends Element>(
  options?: { rootMargin?: string }
): [React.MutableRefObject<T | null>, boolean] {
  const ref = useRef<T | null>(null);
  const [inView, setInView] = useState(true);

  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === "undefined") return;

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        setInView(entry?.isIntersecting ?? true);
      },
      { rootMargin: options?.rootMargin ?? "0px" }
    );
    observer.observe(el);

    return () => observer.disconnect();
  }, [options?.rootMargin]);

  return [ref, inView];
}
