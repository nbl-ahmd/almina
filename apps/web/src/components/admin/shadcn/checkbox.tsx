'use client';
import type { ComponentProps } from 'react';
import { Checkbox as CheckboxPrimitive } from 'radix-ui';
import { CheckIcon, MinusIcon } from '@heroicons/react/24/solid';
import { cn } from '../cn';

export function Checkbox({ className, ...props }: ComponentProps<typeof CheckboxPrimitive.Root>) {
  return (
    <CheckboxPrimitive.Root data-slot="checkbox" className={cn('peer grid size-4 shrink-0 place-items-center rounded border border-line-strong bg-surface text-white outline-0 focus-visible:ring-2 focus-visible:ring-ink/80 disabled:opacity-50 data-[state=checked]:border-ink data-[state=checked]:bg-ink data-[state=indeterminate]:border-ink data-[state=indeterminate]:bg-ink', className)} {...props}>
      <CheckboxPrimitive.Indicator>{props.checked === 'indeterminate' ? <MinusIcon className="size-3" /> : <CheckIcon className="size-3" />}</CheckboxPrimitive.Indicator>
    </CheckboxPrimitive.Root>
  );
}
