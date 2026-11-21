'use client';

import { useEffect, useRef } from 'react';

/** Reserve the actual dock height, including wrapped controls and the safe area. */
export function useFixedDockClearance(property: `--${string}`, fixedAllowed = true) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const dock = ref.current;
    const shell = dock?.closest<HTMLElement>('.storefront-shell');
    if (!dock || !shell) return;

    const update = () => {
      const height = fixedAllowed && getComputedStyle(dock).position === 'fixed' ? Math.ceil(dock.getBoundingClientRect().height) : 0;
      shell.style.setProperty(property, `${height}px`);
    };
    const observer = new ResizeObserver(update);
    observer.observe(dock);
    window.addEventListener('resize', update);
    update();

    return () => {
      observer.disconnect();
      window.removeEventListener('resize', update);
      shell.style.removeProperty(property);
    };
  }, [property, fixedAllowed]);

  return ref;
}
