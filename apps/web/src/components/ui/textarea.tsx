import type { ComponentProps } from "react";

function Textarea(props: ComponentProps<"textarea">) {
  return <textarea data-slot="textarea" {...props} />;
}

export { Textarea };
