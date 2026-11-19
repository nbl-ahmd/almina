'use client';
import { createContext, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { commitProductNavigation, observeProductNavigation } from '../lib/catalog/product-return';
import type { Locale } from '../lib/i18n';

export const StorefrontLocale = createContext<Locale>('en');

/** Motion follows the input method; keyboard navigation stays immediate. */
export function StorefrontInteractions() {
  const pathname = usePathname();
  useEffect(observeProductNavigation, []);
  useEffect(() => { commitProductNavigation(); }, [pathname]);
  useEffect(() => {
    const shell = document.querySelector<HTMLElement>('.storefront-shell');
    if (!shell) return;
    const set = (mode: 'pointer' | 'keyboard') => {
      if (shell.dataset.inputModality !== mode) shell.dataset.inputModality = mode;
    };
    const pointer = () => set('pointer');
    const keyboard = () => set('keyboard');
    document.addEventListener('pointerdown', pointer, true);
    document.addEventListener('keydown', keyboard, true);
    return () => {
      document.removeEventListener('pointerdown', pointer, true);
      document.removeEventListener('keydown', keyboard, true);
      delete shell.dataset.inputModality;
    };
  }, []);
  useEffect(() => {
    if (pathname !== '/') return;
    const shortcut = document.querySelector<HTMLElement>('.floating-contact');
    const home = document.querySelector<HTMLElement>('[data-storefront-home]');
    if (!shortcut || !home || !('IntersectionObserver' in window)) return;

    const media = window.matchMedia('(max-width: 767px)');
    const targets = new Set<Element>();
    const overlaps = new Set<Element>();
    let observer: IntersectionObserver | undefined;

    function observeActions() {
      if (!home || !shortcut || !observer) return;
      for (const action of targets) {
        if (home.contains(action)) continue;
        targets.delete(action);
        overlaps.delete(action);
        observer.unobserve(action);
      }
      shortcut.toggleAttribute('data-over-purchase-action', overlaps.size > 0);
      for (const action of home.querySelectorAll('.home-product-grid :is(.add-to-cart, .product-option-link)')) {
        if (targets.has(action)) continue;
        targets.add(action);
        observer.observe(action);
      }
    }

    function sync() {
      if (!shortcut) return;
      observer?.disconnect();
      observer = undefined;
      overlaps.clear();
      targets.clear();
      shortcut.removeAttribute('data-over-purchase-action');
      if (!media.matches) return;

      // Observe only the viewport area occupied by the fixed shortcut.
      const area = shortcut.getBoundingClientRect();
      if (!area.width) return;
      const margin = `-${area.top}px ${area.right - innerWidth}px ${area.bottom - innerHeight}px -${area.left}px`;
      observer = new IntersectionObserver(entries => {
        for (const { target, intersectionRect } of entries) {
          if (intersectionRect.width > 0 && intersectionRect.height > 0) overlaps.add(target);
          else overlaps.delete(target);
        }
        shortcut.toggleAttribute('data-over-purchase-action', overlaps.size > 0);
      }, { rootMargin: margin });
      observeActions();
    }

    const content = new MutationObserver(() => { observeActions(); });
    content.observe(home, { childList: true, subtree: true });
    const box = new ResizeObserver(sync);
    box.observe(shortcut);
    window.addEventListener('resize', sync);
    sync();
    return () => {
      window.removeEventListener('resize', sync);
      content.disconnect();
      box.disconnect();
      observer?.disconnect();
      shortcut.removeAttribute('data-over-purchase-action');
    };
  }, [pathname]);
  return null;
}
