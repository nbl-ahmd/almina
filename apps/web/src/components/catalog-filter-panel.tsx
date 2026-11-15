'use client';
import { useEffect, useState, type ReactNode } from 'react';

/** One native disclosure; desktop opens it after hydration, mobile stays explicit. */
export function CatalogFilterPanel({ children, className, id }: { children: ReactNode; className: string; id: string }) {
 const [expanded, setExpanded] = useState(false);
 useEffect(() => {
  const media = window.matchMedia('(min-width:1024px)');
  const sync = () => setExpanded(media.matches);
  sync(); media.addEventListener('change', sync);
  return () => media.removeEventListener('change', sync);
 }, []);
 return <details id={id} className={className} open={expanded} onToggle={event => setExpanded(event.currentTarget.open)}>{children}</details>;
}
