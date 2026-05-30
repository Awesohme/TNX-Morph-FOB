import type { InputHTMLAttributes, Ref } from "react";
import { cn } from "@/lib/utils";

export function Input({
  className,
  ref,
  ...props
}: InputHTMLAttributes<HTMLInputElement> & { ref?: Ref<HTMLInputElement> }) {
  // Fall back to the placeholder as an accessible label when none is provided, so
  // placeholder-only inputs still have a name for screen readers.
  const ariaLabel = props["aria-label"] ?? (typeof props.placeholder === "string" ? props.placeholder : undefined);
  return (
    <input
      ref={ref}
      aria-label={ariaLabel}
      className={cn(
        "app-input",
        className,
      )}
      {...props}
    />
  );
}
