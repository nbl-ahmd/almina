"use client";
/*
  Administration motion.

  Two small client components own the only effects that need JavaScript: the
  numeric count-up and the measured sparkline stroke draw. Each one lives on the
  exact node it animates, so its effect runs only after that node has hydrated
  and can never rewrite server-rendered text or attributes out from under React.
  (A single wrapper around the streamed page mounted too early — the App Router
  hydrates the shell before the page segment — letting GSAP touch not-yet-hydrated
  DOM and trip hydration diagnostics.)

  Entrance lifts and bar grows stay in CSS (see admin.css "Motion"): CSS animates
  the computed style React never diffs, so those can never mismatch.

  Both effects are gated behind prefers-reduced-motion and keep their resting,
  fully visible state when reduced motion is requested.
*/
import { useRef } from 'react';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';

gsap.registerPlugin(useGSAP);

const reducedMotionQuery = '(prefers-reduced-motion: reduce)';

export function CountUp({ to }: { to: number }) {
  const ref = useRef<HTMLSpanElement>(null);
  const display = to.toLocaleString();
  useGSAP(
    () => {
      const node = ref.current;
      if (!node) return;
      if (window.matchMedia(reducedMotionQuery).matches) {
        node.textContent = display;
        return;
      }
      const state = { value: 0 };
      gsap.to(state, {
        value: to,
        duration: 0.9,
        ease: 'power2.out',
        onUpdate: () => {
          node.textContent = Math.round(state.value).toLocaleString();
        },
        onComplete: () => {
          node.textContent = display;
        },
      });
    },
    { dependencies: [to, display] },
  );
  return <span ref={ref}>{display}</span>;
}

export function DrawLine({ points }: { points: string }) {
  const ref = useRef<SVGPolylineElement>(null);
  useGSAP(
    () => {
      const line = ref.current;
      if (!line) return;
      if (window.matchMedia(reducedMotionQuery).matches) return;
      const length =
        typeof line.getTotalLength === 'function' ? line.getTotalLength() : 0;
      if (!length) return;
      gsap.fromTo(
        line,
        { strokeDasharray: length, strokeDashoffset: length },
        {
          strokeDashoffset: 0,
          duration: 1.1,
          ease: 'power2.out',
          clearProps: 'strokeDasharray,strokeDashoffset',
        },
      );
    },
    { dependencies: [points] },
  );
  return (
    <polyline
      ref={ref}
      className="admin-spark__line"
      points={points}
      vectorEffect="non-scaling-stroke"
    />
  );
}
