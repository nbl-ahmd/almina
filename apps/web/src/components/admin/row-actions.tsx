'use client';

import { useState, type ReactNode } from 'react';
import { Popover } from 'radix-ui';
import { EllipsisHorizontalIcon } from '@heroicons/react/24/outline';

/** Keep secondary actions out of the scanning path; portal within the admin theme. */
export function RowActions({ label, children }: { label: string; children: ReactNode }) {
  const [container, setContainer] = useState<HTMLElement | null>(null);
  return (
    <span ref={node => setContainer(node?.closest<HTMLElement>('.admin-app') ?? null)}>
      <Popover.Root>
        <Popover.Trigger asChild>
          <button type="button" className="admin-row-more" aria-label={`More actions for ${label}`}>
            <EllipsisHorizontalIcon width={18} height={18} aria-hidden="true" />
          </button>
        </Popover.Trigger>
        <Popover.Portal container={container ?? undefined}>
          <Popover.Content className="admin-row-popover" align="end" sideOffset={6} collisionPadding={12} aria-label={`Actions for ${label}`}>
            {children}
          </Popover.Content>
        </Popover.Portal>
      </Popover.Root>
    </span>
  );
}
