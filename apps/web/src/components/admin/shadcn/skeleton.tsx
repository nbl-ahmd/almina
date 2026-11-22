import type { ComponentProps } from 'react';
import { cn } from '../cn';
export function Skeleton({ className, ...props }: ComponentProps<'span'>) {
  return <span aria-hidden="true" className={cn('block animate-pulse rounded-2xl bg-line motion-reduce:animate-none', className)} {...props} />;
}
