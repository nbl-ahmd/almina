'use client';
import { useId, useMemo, useState } from 'react';
import { Popover } from 'radix-ui';
import { CheckIcon, ChevronUpDownIcon, PlusIcon } from '@heroicons/react/24/outline';
import { adminPortal, cn } from '../cn';
import { inputClass } from './styles';

export type ComboOption = { value: string; label: string };

/** Searchable single-select. With `onCreate`, a query that matches nothing offers "Add “query”". */
export function Combobox({ name, value, onValueChange, options, placeholder = 'Select…', searchPlaceholder = 'Search…', onCreate, createNoun = 'item', loading = false, required, invalid, id, onOpen }: {
  name?: string; value: string; onValueChange: (value: string, option?: ComboOption) => void; options: ComboOption[];
  placeholder?: string; searchPlaceholder?: string; onCreate?: (label: string) => Promise<ComboOption>; createNoun?: string;
  loading?: boolean; required?: boolean; invalid?: boolean; id?: string; onOpen?: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const listId = useId();
  const needle = query.trim().toLowerCase();
  const matches = useMemo(() => options.filter(option => !needle || option.label.toLowerCase().includes(needle)).slice(0, 50), [options, needle]);
  const exact = options.some(option => option.label.toLowerCase() === needle);
  const canCreate = Boolean(onCreate && needle && !exact);
  const rows: (ComboOption | { create: true })[] = [...matches, ...(canCreate ? [{ create: true as const }] : [])];
  const selected = options.find(option => option.value === value);
  async function choose(index: number) {
    const row = rows[index];
    if (!row) return;
    if ('create' in row) {
      if (!onCreate) return;
      setBusy(true); setError('');
      try { const created = await onCreate(query.trim()); onValueChange(created.value, created); setOpen(false); setQuery(''); }
      catch (failure) { setError(failure instanceof Error ? failure.message : `Could not add the ${createNoun}.`); }
      finally { setBusy(false); }
    } else { onValueChange(row.value, row); setOpen(false); setQuery(''); }
  }
  return (
    <>
      {name ? <input type="hidden" name={name} value={value} required={required} /> : null}
      <Popover.Root open={open} onOpenChange={next => { setOpen(next); if (next) { onOpen?.(); setActive(0); } else { setQuery(''); setError(''); } }}>
        <Popover.Trigger asChild>
          <button type="button" id={id} role="combobox" aria-expanded={open} aria-controls={listId} aria-invalid={invalid || undefined}
            className={cn(inputClass, 'flex items-center justify-between gap-2 text-left', !selected && 'text-mute')}>
            <span className="truncate">{selected?.label ?? (value || placeholder)}</span>
            <ChevronUpDownIcon className="size-4 shrink-0 text-mute" aria-hidden="true" />
          </button>
        </Popover.Trigger>
        <Popover.Portal container={adminPortal()}>
          <Popover.Content align="start" sideOffset={6} collisionPadding={12} className="z-[95] w-[var(--radix-popover-trigger-width)] min-w-64 rounded-xl bg-surface p-1.5 shadow-pop outline-none">
            <input autoFocus value={query} placeholder={searchPlaceholder} aria-label={searchPlaceholder} aria-controls={listId}
              onChange={event => { setQuery(event.target.value); setActive(0); }}
              onKeyDown={event => {
                if (event.key === 'ArrowDown') { event.preventDefault(); setActive(index => Math.min(rows.length - 1, index + 1)); }
                else if (event.key === 'ArrowUp') { event.preventDefault(); setActive(index => Math.max(0, index - 1)); }
                else if (event.key === 'Enter') { event.preventDefault(); void choose(active); }
              }}
              className="mb-1 h-9 w-full rounded-lg border border-line bg-surface px-3 text-sm text-ink outline-none placeholder:text-mute focus-visible:ring-2 focus-visible:ring-ink/80" />
            <ul id={listId} role="listbox" className="m-0 max-h-60 list-none overflow-y-auto p-0">
              {rows.map((row, index) => (
                <li key={'create' in row ? '__create' : row.value} role="option" aria-selected={index === active}>
                  <button type="button" disabled={busy} onClick={() => void choose(index)} onMouseMove={() => setActive(index)}
                    className={cn('flex min-h-9 w-full items-center gap-2 rounded-lg px-3 text-left text-[13px] text-ink', index === active && 'bg-fill')}>
                    {'create' in row ? <><PlusIcon className="size-4 shrink-0" aria-hidden="true" /><span className="truncate">{busy ? 'Adding…' : `Add “${query.trim()}” as new ${createNoun}`}</span></>
                      : <><span className="min-w-0 flex-1 truncate">{row.label}</span>{row.value === value ? <CheckIcon className="size-4 shrink-0" aria-hidden="true" /> : null}</>}
                  </button>
                </li>
              ))}
              {!rows.length ? <li className="px-3 py-6 text-center text-[13px] text-mute">{loading ? 'Loading…' : 'No matches.'}</li> : null}
            </ul>
            {error ? <p role="alert" className="m-0 px-3 pb-1 pt-2 text-xs font-medium text-bad">{error}</p> : null}
          </Popover.Content>
        </Popover.Portal>
      </Popover.Root>
    </>
  );
}
