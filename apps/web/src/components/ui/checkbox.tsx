"use client"

import * as React from "react"
import { cn } from "cn"
import { CheckIcon } from "@heroicons/react/24/solid"
import { Checkbox as CheckboxPrimitive } from "radix-ui"

function Checkbox({
  className,
  ...props
}: React.ComponentProps<typeof CheckboxPrimitive.Root>) {
  return (
    <CheckboxPrimitive.Root
      data-slot="checkbox"
      className={cn(
        "peer inline-flex size-5 min-h-5 shrink-0 items-center justify-center rounded-[6px] border border-control-border bg-surface p-0 text-white transition-colors duration-(--motion-feedback) motion-reduce:transition-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand disabled:cursor-not-allowed disabled:bg-control-disabled disabled:opacity-100 aria-invalid:border-sale data-[state=checked]:border-brand data-[state=checked]:bg-brand data-[state=checked]:text-white",
        className
      )}
      {...props}
    >
      <CheckboxPrimitive.Indicator
        data-slot="checkbox-indicator"
        className="grid place-content-center text-current transition-none"
      >
        <CheckIcon className="size-3.5" />
      </CheckboxPrimitive.Indicator>
    </CheckboxPrimitive.Root>
  )
}

export { Checkbox }
