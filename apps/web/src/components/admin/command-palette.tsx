'use client';
import { useMemo, useState, type ComponentType, type SVGProps } from 'react';
import { useRouter } from 'next/navigation';
import { Dialog } from 'radix-ui';
import { MagnifyingGlassIcon } from '@heroicons/react/24/outline';
import { adminPortal, cn } from './cn';

export type PaletteItem = { id: string; label: string; href: string; group: string; icon: ComponentType<SVGProps<SVGSVGElement>> };

/** Ctrl/Cmd+K: jump to any section, or search products. Replaces hunting through twenty sidebar links. */
export function CommandPalette({ open, onOpenChange, items, canSearchProducts }: {
  open: boolean; onOpenChange: (open: boolean) => void; items: PaletteItem[]; canSearchProducts: boolean;
}) {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);
  const results = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const sections = items.filter(item => !needle || `${item.label} ${item.group}`.toLowerCase().includes(needle));
    const search = canSearchProducts && needle ? [{ id: 'search', label: `Search products for “${query.trim()}”`, href: `/admin/products?q=${encodeURIComponent(query.trim().slice(0, 80))}`, group: 'Products', icon: MagnifyingGlassIcon }] : [];
    return [...search, ...sections];
  }, [items, query, canSearchProducts]);
  const go = (href: string) => { onOpenChange(false); router.push(href); };
  return (
    <Dialog.Root open={open} onOpenChange={value => { onOpenChange(value); if (!value) { setQuery(''); setActive(0); } }}>
      <Dialog.Portal container={adminPortal()}>
        <Dialog.Overlay className="fixed inset-0 z-[90] bg-ink/40" />
        <Dialog.Content aria-describedby={undefined}
          className="fixed left-1/2 top-[14vh] z-[91] w-[min(560px,calc(100vw-24px))] -translate-x-1/2 overflow-hidden rounded-lg bg-surface border border-line shadow-pop outline-none">
          <Dialog.Title className="sr-only">Quick search</Dialog.Title>
          <div className="flex items-center gap-3 border-b border-line px-5">
            <MagnifyingGlassIcon className="size-5 shrink-0 text-mute" aria-hidden="true" />
            <input autoFocus value={query} maxLength={80} placeholder="Go to a section or search products" aria-label="Quick search"
              onChange={event => { setQuery(event.target.value); setActive(0); }}
              onKeyDown={event => {
                if (event.key === 'ArrowDown') { event.preventDefault(); setActive(index => Math.min(results.length - 1, index + 1)); }
                else if (event.key === 'ArrowUp') { event.preventDefault(); setActive(index => Math.max(0, index - 1)); }
                else if (event.key === 'Enter' && results[active]) { event.preventDefault(); go(results[active]!.href); }
              }}
              className="h-14 min-h-0 flex-1 appearance-none !rounded-lg !bg-transparent !px-0 text-[15px] text-ink outline-none placeholder:text-mute !shadow-none !ring-0 focus-visible:!shadow-none" />
          </div>
          <ul role="listbox" aria-label="Results" className="m-0 max-h-[52vh] list-none overflow-y-auto p-2">
            {results.map((item, index) => {
              const Icon = item.icon;
              return (
                <li key={item.id} role="option" aria-selected={index === active}>
                  <button type="button" onClick={() => go(item.href)} onMouseMove={() => setActive(index)}
                    className={cn('flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-[13.5px] text-ink', index === active && 'bg-fill')}>
                    <Icon className="size-5 shrink-0" aria-hidden="true" />
                    <span className="min-w-0 flex-1 truncate">{item.label}</span>
                    <span className="text-xs text-mute">{item.group}</span>
                  </button>
                </li>
              );
            })}
            {!results.length ? <li className="px-3 py-8 text-center text-[13px] text-mute">Nothing matches “{query}”.</li> : null}
          </ul>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
