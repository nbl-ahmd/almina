import type { ComponentProps } from "react";

function Input({ variant = "default", ...props }: ComponentProps<"input"> & { variant?: "default" | "code" }) {
  return <input data-slot="input" data-variant={variant} {...props} />;
}

export { Input };
