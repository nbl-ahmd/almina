"use client";
import { useEffect, useRef, type ReactNode } from "react";
/** Progressive enhancement: content is visible with no JS or when motion is reduced. */
export function ScrollReveal({ children }: { children: ReactNode }) {
  const root = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (
      !root.current ||
      !("IntersectionObserver" in window) ||
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    )
      return;
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          entry.target.animate(
            [
              { transform: "translateY(10px)", opacity: 0.85 },
              { transform: "translateY(0)", opacity: 1 },
            ],
            { duration: 360, easing: "cubic-bezier(.16,1,.3,1)" },
          );
          observer.unobserve(entry.target);
        }
      },
      { threshold: 0.08 },
    );
    const elements = root.current.querySelectorAll(
      ":scope > section[data-scroll-reveal]",
    );
    elements.forEach((element) => observer.observe(element));
    return () => observer.disconnect();
  }, []);
  return (
    <div ref={root} className="contents">
      {children}
    </div>
  );
}
