import type { ComponentProps } from 'react';
import { Slot } from 'radix-ui';
import { cn } from '../cn';
import { buttonVariants, type ButtonStyle } from './styles';

export function Button({ className, variant, size, asChild = false, ...props }: ComponentProps<'button'> & ButtonStyle & { asChild?: boolean }) {
  const Comp = asChild ? Slot.Root : 'button';
  return <Comp data-slot="button" className={cn(buttonVariants({ variant, size }), className)} {...props} />;
}
