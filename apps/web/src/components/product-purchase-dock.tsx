'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';
import { cn } from 'cn';

/** Keeps one set of purchase controls so a dock never loses quantity or request state. */
export function ProductPurchaseDock({ children }: { children: ReactNode }) {
  const marker = useRef<HTMLDivElement>(null);
  const controls = useRef<HTMLDivElement>(null);
  const [docked, setDocked] = useState(false);
  const [height, setHeight] = useState(0);
  const [keyboard, setKeyboard] = useState(false);

  useEffect(() => {
    const anchor = marker.current;
    const panel = controls.current;
    if (!anchor || !panel) return;
    let frame = 0;
    const measure = () => setDocked(anchor.getBoundingClientRect().bottom < 0);
    const update = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(measure);
    };
    const observer = new IntersectionObserver(measure);
    window.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update);
    measure();
    const resize = new ResizeObserver(() => setHeight(panel.getBoundingClientRect().height));
    const viewport = window.visualViewport;
    const updateKeyboard = () => setKeyboard(Boolean(viewport && window.innerHeight - viewport.height > 160));
    observer.observe(anchor);
    resize.observe(panel);
    viewport?.addEventListener('resize', updateKeyboard);
    return () => {
      observer.disconnect();
      cancelAnimationFrame(frame);
      window.removeEventListener('scroll', update);
      window.removeEventListener('resize', update);
      resize.disconnect();
      viewport?.removeEventListener('resize', updateKeyboard);
    };
  }, []);

  return <div ref={marker} className="purchase-dock" style={docked && !keyboard ? { minHeight: height } : undefined}>
    <div ref={controls} className={cn('purchase-dock-controls', docked && !keyboard && 'is-docked')}>
      {children}
    </div>
  </div>;
}
