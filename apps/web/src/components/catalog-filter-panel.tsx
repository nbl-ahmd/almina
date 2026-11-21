'use client';

import { useEffect, useRef, type ReactNode } from 'react';
import { Icon } from './icon';
import styles from './catalog-list.module.css';

/** The disclosure supplies the no-JS fallback. One form serves the sheet and desktop sidebar. */
export function CatalogFilterPanel({ children, toggle, title, closeLabel, id }: {
  children: ReactNode;
  toggle: ReactNode;
  title: string;
  closeLabel: string;
  id: string;
}) {
  const ref = useRef<HTMLDetailsElement>(null);
  const sheet = useRef<HTMLDialogElement>(null);
  const trigger = useRef<HTMLElement>(null);

  useEffect(() => {
    const panel = ref.current;
    const dialog = sheet.current;
    if (!panel || !dialog) return;
    const media = window.matchMedia('(min-width: 1024px)');

    function sync() {
      if (!panel || !dialog) return;
      if (media.matches) {
        if (panel.hasAttribute('data-desktop')) return;
        const focused = document.activeElement;
        if (dialog.matches(':modal')) dialog.close();
        dialog.setAttribute('open', '');
        dialog.setAttribute('role', 'presentation');
        panel.open = true;
        panel.dataset.desktop = '';
        if (focused === trigger.current || focused?.hasAttribute('data-filter-dismiss')) {
          panel.querySelector<HTMLInputElement>('input:not([type="hidden"])')?.focus({ preventScroll: true });
        } else if (focused instanceof HTMLElement && dialog.contains(focused)) {
          focused.focus({ preventScroll: true });
        }
      } else if (panel.hasAttribute('data-desktop')) {
        const restoreFocus = dialog.contains(document.activeElement);
        delete panel.dataset.desktop;
        panel.open = false;
        if (restoreFocus) trigger.current?.focus({ preventScroll: true });
      } else if (panel.open && !dialog.matches(':modal')) {
        dialog.removeAttribute('open');
        dialog.removeAttribute('role');
        dialog.showModal();
      } else if (!panel.open && dialog.matches(':modal')) {
        dialog.close();
      }
    }

    sync();
    panel.addEventListener('toggle', sync);
    media.addEventListener('change', sync);
    return () => {
      panel.removeEventListener('toggle', sync);
      media.removeEventListener('change', sync);
    };
  }, []);

  function dismiss() {
    sheet.current?.close();
    if (ref.current) ref.current.open = false;
    trigger.current?.focus({ preventScroll: true });
  }

  return <details id={id} ref={ref} className={styles.filters}>
    <summary ref={trigger} className={styles.filterToggle}>{toggle}</summary>
    <dialog ref={sheet} open role="presentation" className={styles.filterDialog} aria-labelledby={id + '-title'}
      onCancel={event => { event.preventDefault(); dismiss(); }}>
      <div className={styles.filterSheetHeader}>
        <h2 id={id + '-title'}>{title}</h2>
        <button type="button" data-filter-dismiss aria-label={closeLabel} onClick={dismiss}><Icon name="close" /></button>
      </div>
      {children}
    </dialog>
  </details>;
}
