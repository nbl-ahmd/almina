import type { ComponentProps } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../cn';

export const badgeVariants = cva('inline-flex items-center gap-1.5 whitespace-nowrap border px-2 py-0.5 text-xs font-medium', {
  variants: {
    tone: {
      neutral: 'border-line-strong bg-fill text-ink-2',
      brand: 'border-ok bg-fill text-ok',
      success: 'border-ok bg-ok-soft text-ok',
      warning: 'border-warn bg-warn-soft text-warn',
      danger: 'border-bad bg-bad-soft text-bad',
      info: 'border-info bg-info-soft text-info',
    },
  },
  defaultVariants: { tone: 'neutral' },
});
const dots = { neutral: 'bg-faint', brand: 'bg-ok', success: 'bg-ok', warning: 'bg-warn', danger: 'bg-bad', info: 'bg-info' } as const;
export type BadgeTone = NonNullable<VariantProps<typeof badgeVariants>['tone']>;

export function Badge({ tone = 'neutral', dot = false, className, children, ...props }: ComponentProps<'span'> & { tone?: BadgeTone; dot?: boolean }) {
  return <span data-slot="badge" className={cn(badgeVariants({ tone }), className)} {...props}>{dot ? <span aria-hidden="true" className={cn('size-1.5', dots[tone])} /> : null}{children}</span>;
}
