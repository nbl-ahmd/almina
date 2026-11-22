'use client';

import { useState, type ReactNode } from 'react';
import { Popover } from 'radix-ui';
import { EllipsisHorizontalIcon } from '@heroicons/react/24/outline';

/** Keep secondary actions out of the scanning path; portal within the admin font scope. */
export function RowActions({ label, children }: { label: string; children: ReactNode }) {
  const [container, setContainer] = useState<HTMLElement | null>(null);
  return (
    <span ref={node => setContainer(node?.closest<HTMLElement>('.admin-app') ?? null)}>
      <Popover.Root>
        <Popover.Trigger asChild>
          <button type="button" aria-label={`More actions for ${label}`}
            className="grid size-8 place-items-center rounded-lg border border-line-strong bg-surface text-ink hover:bg-soft data-[state=open]:bg-fill">
            <EllipsisHorizontalIcon className="size-[18px]" aria-hidden="true" />
          </button>
        </Popover.Trigger>
        <Popover.Portal container={container ?? undefined}>
          <Popover.Content align="end" sideOffset={6} collisionPadding={12} aria-label={`Actions for ${label}`}
            className="z-50 grid min-w-48 gap-0.5 rounded-xl bg-surface p-1.5 border border-line shadow-pop outline-none [&_a]:flex [&_a]:min-h-10 [&_a]:items-center [&_a]:rounded-xl [&_a]:px-3 [&_a]:text-[13px] [&_a]:font-medium [&_a]:text-ink [&_a]:no-underline hover:[&_a]:bg-fill [&_button]:flex [&_button]:min-h-10 [&_button]:w-full [&_button]:items-center [&_button]:justify-start [&_button]:rounded-xl [&_button]:border-0 [&_button]:bg-transparent [&_button]:px-3 [&_button]:text-[13px] [&_button]:font-medium [&_button]:text-ink hover:[&_button]:bg-fill [&_button.text-bad]:text-bad">
            {children}
          </Popover.Content>
        </Popover.Portal>
      </Popover.Root>
    </span>
  );
}
