import * as React from "react"
import { cn } from "cn"
import { controlStyles } from "./control-styles"
function Textarea({className,...props}:React.ComponentProps<"textarea">) {
 return <textarea data-slot="textarea" className={cn(controlStyles,"min-h-28 max-sm:min-h-28 pointer-coarse:min-h-28 resize-y",className)} {...props} />
}
export { Textarea }
