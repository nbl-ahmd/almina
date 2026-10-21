import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "cn"
import { Slot } from "radix-ui"

const buttonVariants = cva(
  "inline-flex shrink-0 items-center justify-center gap-2 rounded-xl border text-sm leading-5 font-semibold text-center cursor-pointer transition-[background-color,border-color,color,transform] duration-150 motion-reduce:transition-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink disabled:pointer-events-none disabled:cursor-not-allowed disabled:border-border disabled:bg-control-disabled disabled:text-muted disabled:opacity-100 aria-invalid:border-sale [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  { variants: {
    variant: {
      default: "border-ink bg-ink text-white enabled:hover:opacity-90",
      accent: "border-brand bg-brand text-ink enabled:hover:border-brand-hover enabled:hover:bg-brand-hover",
      destructive: "border-sale bg-sale text-white enabled:hover:brightness-95",
      outline: "border-border bg-surface text-ink enabled:hover:border-control-hover enabled:hover:bg-subtle",
      secondary: "border-transparent bg-subtle text-ink enabled:hover:bg-accent",
      ghost: "border-transparent bg-transparent text-muted enabled:hover:bg-subtle enabled:hover:text-ink",
      link: "border-transparent bg-transparent text-teal enabled:hover:text-ink",
    },
    size: { default: "min-h-12 px-6 py-3", sm: "min-h-11 px-4 py-2 text-[13px]", lg: "min-h-14 px-7 py-3.5 text-[15px]", icon: "size-11 min-h-11 p-2", "icon-sm":"size-11 min-h-11 p-2", "icon-lg":"size-12 min-h-12 p-3", xs:"min-h-11 px-3 py-2 text-xs" },
    shape: { default:"rounded-xl", pill:"rounded-full", rounded:"rounded-[14px]" },
  }, defaultVariants: { variant:"default", size:"default", shape:"default" } }
)
function Button({className, variant="default", size="default", shape="default", asChild=false, ...props}:React.ComponentProps<"button"> & VariantProps<typeof buttonVariants> & {asChild?:boolean}) {
 const Comp=asChild?Slot.Root:"button";
 return <Comp data-slot="button" data-variant={variant} data-size={size} className={cn(buttonVariants({variant,size,shape}),className)} {...props} />
}
export { Button, buttonVariants }
