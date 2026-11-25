'use client';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import type { Locale } from '../lib/i18n';
import { ChevronLeftIcon, ChevronRightIcon } from './storefront-icons';

/** A product row. Phones swipe it; desktop adds previous and next buttons (Life Pharmacy / Aster) that page through it and
 *  hide at either end. The tiles are server-rendered children; this only scrolls them. */
export function ProductShelf({ children, locale = 'en' }: { children: ReactNode; locale?: Locale }) {
  const rail = useRef<HTMLDivElement>(null);
  const [ends, setEnds] = useState({ start: true, end: true });
  useEffect(() => {
    const element = rail.current;
    if (!element) return;
    // scrollLeft runs negative in right-to-left rows, so distance from the start is its size.
    const measure = () => { const position = Math.abs(element.scrollLeft); setEnds({ start: position < 2, end: position + element.clientWidth >= element.scrollWidth - 2 }); };
    measure();
    element.addEventListener('scroll', measure, { passive: true });
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => { element.removeEventListener('scroll', measure); observer.disconnect(); };
  }, []);
  function page(direction: 1 | -1) {
    const element = rail.current;
    if (!element) return;
    element.scrollBy({ left: direction * (getComputedStyle(element).direction === 'rtl' ? -1 : 1) * element.clientWidth, behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
  }
  const ar = locale === 'ar';
  return <div className="qc-shelf">
    <div className="home-product-grid qc-rail" ref={rail}>{children}</div>
    <button type="button" className="qc-shelf-arrow" data-side="previous" hidden={ends.start} onClick={() => page(-1)} aria-label={ar ? 'المنتجات السابقة' : 'Previous products'}><ChevronLeftIcon aria-hidden="true" /></button>
    <button type="button" className="qc-shelf-arrow" data-side="next" hidden={ends.end} onClick={() => page(1)} aria-label={ar ? 'المزيد من المنتجات' : 'Next products'}><ChevronRightIcon aria-hidden="true" /></button>
  </div>;
}
