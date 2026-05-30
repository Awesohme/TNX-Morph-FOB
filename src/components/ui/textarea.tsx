import type { Ref, TextareaHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export function Textarea({
  className,
  ref,
  ...props
}: TextareaHTMLAttributes<HTMLTextAreaElement> & { ref?: Ref<HTMLTextAreaElement> }) {
  const ariaLabel = props["aria-label"] ?? (typeof props.placeholder === "string" ? props.placeholder : undefined);
  return (
    <textarea
      ref={ref}
      aria-label={ariaLabel}
      className={cn(
        "app-textarea",
        className,
      )}
      {...props}
    />
  );
}
