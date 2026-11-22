'use client';
import type { ComponentProps } from 'react';
import { Tabs as TabsPrimitive } from 'radix-ui';
import { cn } from '../cn';

export const Tabs = TabsPrimitive.Root;
export function TabsList({ className, ...props }: ComponentProps<typeof TabsPrimitive.List>) {
  return <TabsPrimitive.List className={cn('mb-4 flex max-w-full gap-1 overflow-x-auto border-b border-line', className)} {...props} />;
}
export function TabsTrigger({ className, ...props }: ComponentProps<typeof TabsPrimitive.Trigger>) {
  return <TabsPrimitive.Trigger className={cn('-mb-px h-10 shrink-0 border-b-2 border-transparent px-3 text-[13px] font-medium text-mute outline-0 transition-colors hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-ink data-[state=active]:border-ink data-[state=active]:text-ink', className)} {...props} />;
}
export const TabsContent = TabsPrimitive.Content;
