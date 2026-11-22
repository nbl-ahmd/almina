'use client';
import type { ComponentProps } from 'react';
import { Dialog as SheetPrimitive } from 'radix-ui';
import { XMarkIcon } from '@heroicons/react/24/outline';
import { cn } from '../cn';

export const Sheet = SheetPrimitive.Root;
export const SheetTrigger = SheetPrimitive.Trigger;
export const SheetClose = SheetPrimitive.Close;
export function SheetContent({ className, children, title, ...props }: ComponentProps<typeof SheetPrimitive.Content> & { title: string }) {
  return (
    <SheetPrimitive.Portal>
      <SheetPrimitive.Overlay className="fixed inset-0 z-[90] bg-ink/40" />
      <SheetPrimitive.Content aria-describedby={undefined} className={cn('fixed inset-y-0 right-0 z-[91] flex w-[min(440px,100vw)] flex-col border-l-2 border-line bg-surface outline-none', className)} {...props}>
        <div className="flex items-center justify-between border-b border-line px-5 py-4">
          <SheetPrimitive.Title className="m-0 text-base font-semibold">{title}</SheetPrimitive.Title>
          <SheetPrimitive.Close aria-label="Close" className="grid size-9 place-items-center border border-line outline-0 hover:bg-ink hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"><XMarkIcon className="size-5" aria-hidden="true" /></SheetPrimitive.Close>
        </div>
        {children}
      </SheetPrimitive.Content>
    </SheetPrimitive.Portal>
  );
}
