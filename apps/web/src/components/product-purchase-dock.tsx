'use client';

import { useEffect, useRef, type ReactNode } from 'react';
import styles from './product-detail.module.css';

/** Reserve the actual fixed dock height, including wrapped content and the safe area. */
export function ProductPurchaseDock({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const dock = ref.current;
    const shell = dock?.closest<HTMLElement>('.storefront-shell');
    if (!dock || !shell) return;
    const update = () => {
      const height = getComputedStyle(dock).position === 'fixed' ? Math.ceil(dock.getBoundingClientRect().height) : 0;
      shell.style.setProperty('--pdp-dock-clearance', `${height}px`);
    };
    const observer = new ResizeObserver(update);
    observer.observe(dock);
    window.addEventListener('resize', update);
    update();
    return () => {
      observer.disconnect();
      window.removeEventListener('resize', update);
      shell.style.removeProperty('--pdp-dock-clearance');
    };
  }, []);

  return <div className={`pdp-purchase ${styles.dock}`} ref={ref}>{children}</div>;
}
