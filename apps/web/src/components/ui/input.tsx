import * as React from "react"
import { cn } from "cn"
import { controlStyles } from "./control-styles"
function Input({className,type,variant="default",...props}:React.ComponentProps<"input"> & {variant?:"default"|"code"}) {
 return <input type={type} data-slot="input" className={cn(controlStyles,"file:mr-3 file:border-0 file:bg-subtle file:text-ink",variant==="code"&&"min-h-14 bg-subtle text-center text-2xl tabular-nums tracking-[0.45em]",className)} {...props} />
}
export { Input }
