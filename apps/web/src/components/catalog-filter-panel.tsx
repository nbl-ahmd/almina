'use client';

import { useEffect, useRef, type ReactNode } from 'react';

/** One native disclosure and one form. Without JavaScript the summary stays operable at any width. */
export function CatalogFilterPanel({ children, className, id }: { children: ReactNode; className?: string | undefined; id: string }) {
  const ref = useRef<HTMLDetailsElement>(null);
  useEffect(() => {
    const panel = ref.current;
    if (!panel) return;
    const media = window.matchMedia('(min-width: 1024px)');
    const sync = () => {
      const focused = document.activeElement;
      const summary = panel.querySelector('summary');
      if (media.matches) {
        panel.open = true;
        if (focused === summary) panel.querySelector<HTMLInputElement>('input:not([type="hidden"])')?.focus();
        panel.dataset.desktop = '';
      } else {
        delete panel.dataset.desktop;
        if (focused !== summary && panel.contains(focused)) summary?.focus();
        panel.open = false;
      }
    };
    // A phone user can open the native disclosure before hydration completes.
    if (media.matches) sync();
    media.addEventListener('change', sync);
    return () => media.removeEventListener('change', sync);
  }, []);
  return <details id={id} ref={ref} className={className}>{children}</details>;
}
