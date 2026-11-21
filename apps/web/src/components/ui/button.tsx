import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "cn"
import { Slot } from "radix-ui"

const buttonVariants = cva(
  "inline-flex shrink-0 items-center justify-center gap-2 rounded-xl border text-sm leading-5 font-semibold text-center cursor-pointer transition-[background-color,border-color,color,transform] duration-150 motion-reduce:transition-none focus-visible:outline-2 focus-visible:outline-offset-2  disabled:pointer-events-none disabled:cursor-not-allowed    disabled:opacity-100  [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  { variants: {
    variant: {
      default: "  text-white enabled:hover:opacity-90",
      accent: "    ",
      destructive: "  text-white enabled:hover:brightness-95",
      outline: "    ",
      secondary: "border-transparent   ",
      ghost: "border-transparent bg-transparent   ",
      link: "border-transparent bg-transparent  ",
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
