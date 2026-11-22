'use client';
import type { ComponentProps } from 'react';
import { ToggleGroup as Group } from 'radix-ui';
import { cn } from '../cn';

/** Segmented single-choice control (chips). */
export function ToggleGroup({ className, ...props }: ComponentProps<typeof Group.Root>) {
  return <Group.Root data-slot="toggle-group" className={cn('inline-flex rounded-lg bg-fill p-0.5', className)} {...props} />;
}
export function ToggleGroupItem({ className, ...props }: ComponentProps<typeof Group.Item>) {
  return <Group.Item data-slot="toggle-group-item" className={cn('h-7 rounded-md px-3 text-xs font-medium text-mute outline-0 transition-colors hover:text-ink focus-visible:outline-2 focus-visible:outline-ink data-[state=on]:bg-surface data-[state=on]:text-ink data-[state=on]:shadow-sm', className)} {...props} />;
}
