'use client';
import { ChevronDownIcon } from '@heroicons/react/24/outline';
import { useEffect, useState, type ReactNode } from 'react';
export function FooterGroup({ title, children }: { title: string; children: ReactNode }) {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    const media = window.matchMedia('(min-width:768px)');
    const sync = () => setOpen(media.matches);
    sync(); media.addEventListener('change', sync);
    return () => media.removeEventListener('change', sync);
  }, []);
  return <details className="sf-footer-group" open={open} onToggle={event => setOpen(event.currentTarget.open)}><summary>{title}<ChevronDownIcon className="footer-chevron" aria-hidden="true" /></summary><h3 className="sf-footer-title">{title}</h3>{children}</details>;
}
