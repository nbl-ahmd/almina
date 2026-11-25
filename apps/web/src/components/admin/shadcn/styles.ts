import { cva, type VariantProps } from 'class-variance-authority';

/** Shared shadcn-style class recipes. Components and bare form elements use the same strings. */
export const focusRing = 'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink';

export const buttonVariants = cva(
  `inline-flex shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-lg font-medium no-underline transition-colors duration-150 disabled:pointer-events-none disabled:opacity-50 ${focusRing}`,
  {
    variants: {
      variant: {
        default: 'bg-ink text-white hover:bg-ink-2',
        primary: 'bg-ink text-white hover:bg-ink-2',
        dark: 'bg-ink text-white hover:bg-ink-2',
        outline: 'border border-line-strong bg-surface text-ink hover:bg-fill',
        secondary: 'bg-fill text-ink hover:bg-line',
        ghost: 'text-ink-2 hover:bg-fill',
        danger: 'bg-bad-soft text-bad hover:bg-bad-soft/70',
        destructive: 'bg-bad text-white hover:bg-bad/90',
        link: 'h-auto p-0 text-ink underline underline-offset-4 hover:text-ink-2',
      },
      size: { sm: 'h-8 px-3 text-[13px]', md: 'h-9 px-4 text-sm', lg: 'h-10 px-5 text-sm', icon: 'size-9 p-0' },
    },
    defaultVariants: { variant: 'outline', size: 'md' },
  },
);
export type ButtonStyle = VariantProps<typeof buttonVariants>;

const field = 'w-full rounded-lg border border-line-strong bg-surface text-sm text-ink outline-none transition-shadow placeholder:text-mute focus-visible:ring-2 focus-visible:ring-ink/80 disabled:cursor-not-allowed disabled:bg-fill disabled:opacity-60 aria-[invalid=true]:border-bad';
export const inputClass = `h-9 px-3 ${field}`;
export const selectClass = `h-9 appearance-none bg-[url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 20 20' fill='%2362626a'><path d='M5.2 7.5 10 12.3l4.8-4.8-1-1L10 10.3 6.2 6.5z'/></svg>")] bg-[length:16px] bg-[right_0.6rem_center] bg-no-repeat pl-3 pr-8 ${field}`;
export const textareaClass = `min-h-24 px-3 py-2 ${field}`;
/** A field label that stacks its control beneath it. */
export const labelClass = 'grid min-w-0 content-start gap-1.5 text-[13px] font-medium text-ink';
export const fileClass = 'w-full min-w-0 text-[13px] text-mute file:mr-3 file:cursor-pointer file:rounded-lg file:border file:border-solid file:border-line-strong file:bg-surface file:px-3 file:py-1.5 file:text-[13px] file:font-medium file:text-ink hover:file:bg-fill';

/** A selectable row in a list beside an editor: any number of lines, left aligned. */
export const listItemClass = `grid w-full gap-0.5 rounded-lg border !border-line bg-surface px-3 py-2 text-left text-[13px] text-ink break-words hover:bg-fill disabled:opacity-50 ${focusRing}`;
export const badgeVariants = cva('inline-flex items-center gap-1.5 whitespace-nowrap rounded-md px-2 py-0.5 text-xs font-medium', {
  variants: {
    tone: {
      neutral: 'bg-fill text-ink-2', brand: 'bg-fill text-ink', success: 'bg-ok-soft text-ok',
      warning: 'bg-warn-soft text-warn', danger: 'bg-bad-soft text-bad', info: 'bg-info-soft text-info',
    },
  },
  defaultVariants: { tone: 'neutral' },
});
