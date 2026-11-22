'use client';
import type { ComponentProps } from 'react';
import { Select as SelectPrimitive } from 'radix-ui';
import { CheckIcon, ChevronDownIcon } from '@heroicons/react/24/outline';
import { adminPortal, cn } from '../cn';

export const Select = SelectPrimitive.Root;
export const SelectValue = SelectPrimitive.Value;
export function SelectTrigger({ className, children, ...props }: ComponentProps<typeof SelectPrimitive.Trigger>) {
  return (
    <SelectPrimitive.Trigger className={cn('inline-flex h-11 items-center justify-between gap-2 rounded-lg bg-surface px-4 text-sm font-medium text-ink shadow-card outline-0 focus-visible:outline-2 focus-visible:outline-ink disabled:opacity-50', className)} {...props}>
      {children}
      <SelectPrimitive.Icon><ChevronDownIcon className="size-4 text-mute" aria-hidden="true" /></SelectPrimitive.Icon>
    </SelectPrimitive.Trigger>
  );
}
export function SelectContent({ className, children, ...props }: ComponentProps<typeof SelectPrimitive.Content>) {
  return (
    <SelectPrimitive.Portal container={adminPortal()}>
      <SelectPrimitive.Content position="popper" sideOffset={6} className={cn('z-[95] min-w-[var(--radix-select-trigger-width)] overflow-hidden rounded-2xl bg-surface p-1.5 shadow-pop', className)} {...props}>
        <SelectPrimitive.Viewport>{children}</SelectPrimitive.Viewport>
      </SelectPrimitive.Content>
    </SelectPrimitive.Portal>
  );
}
export function SelectItem({ className, children, ...props }: ComponentProps<typeof SelectPrimitive.Item>) {
  return (
    <SelectPrimitive.Item className={cn('flex min-h-10 cursor-pointer select-none items-center justify-between gap-3 rounded-xl px-3 text-[13px] font-medium text-ink outline-none data-[highlighted]:bg-fill', className)} {...props}>
      <SelectPrimitive.ItemText>{children}</SelectPrimitive.ItemText>
      <SelectPrimitive.ItemIndicator><CheckIcon className="size-4" aria-hidden="true" /></SelectPrimitive.ItemIndicator>
    </SelectPrimitive.Item>
  );
}
