'use client';
import { createContext, useEffect } from 'react';
import type { Locale } from '../lib/i18n';

export const StorefrontLocale = createContext<Locale>('en');

/** Motion follows the input method; keyboard navigation stays immediate. */
export function StorefrontInteractions() {
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
  return null;
}
