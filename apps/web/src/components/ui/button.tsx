import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "cn"
import { Slot } from "radix-ui"

const buttonVariants = cva(
  "inline-flex shrink-0 items-center justify-center gap-2 rounded-xl border text-sm leading-5 font-semibold text-center cursor-pointer transition-[background-color,border-color,color,scale] duration-150 enabled:active:scale-[0.98] motion-reduce:transition-none motion-reduce:active:scale-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand disabled:pointer-events-none disabled:cursor-not-allowed disabled:border-border disabled:bg-control-disabled disabled:text-muted disabled:opacity-100 aria-invalid:border-sale [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  { variants: {
    variant: {
      default: "border-brand bg-brand text-primary-foreground enabled:hover:border-brand-hover enabled:hover:bg-brand-hover",
      accent: "border-brand bg-brand text-white enabled:hover:border-brand-hover enabled:hover:bg-brand-hover",
      soft: "border-brand/15 bg-brand/10 text-brand enabled:hover:border-brand enabled:hover:bg-brand enabled:hover:text-white",
      destructive: "border-sale bg-sale text-white enabled:hover:brightness-95",
      outline: "border-border bg-surface text-brand enabled:hover:border-control-hover enabled:hover:bg-subtle",
      secondary: "border-transparent bg-subtle text-ink enabled:hover:bg-accent",
      ghost: "border-transparent bg-transparent text-muted enabled:hover:bg-subtle enabled:hover:text-ink",
      link: "border-transparent bg-transparent text-teal enabled:hover:text-ink",
    },
    size: { default: "min-h-12 px-6 py-3", sm: "min-h-11 px-4 py-2 text-[length:var(--text-control-label)]", lg: "min-h-14 px-7 py-3.5 text-[length:var(--text-control-large)]", icon: "size-11 min-h-11 p-2", "icon-sm":"size-11 min-h-11 p-2", "icon-lg":"size-12 min-h-12 p-3", xs:"min-h-11 px-3 py-2 text-xs" },
    shape: { default:"rounded-xl", pill:"rounded-full", rounded:"rounded-2xl" },
  }, defaultVariants: { variant:"default", size:"default", shape:"default" } }
)
function Button({className, variant="default", size="default", shape="default", asChild=false, ...props}:React.ComponentProps<"button"> & VariantProps<typeof buttonVariants> & {asChild?:boolean}) {
 const Comp=asChild?Slot.Root:"button";
 return <Comp data-slot="button" data-variant={variant} data-size={size} data-shape={shape} className={cn(buttonVariants({variant,size,shape}),className)} {...props} />
}
export { Button, buttonVariants }
