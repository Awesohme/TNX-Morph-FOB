"use client";

import { useFormStatus } from "react-dom";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { buttonVariants, type ButtonProps } from "@/components/ui/button-variants";

// Re-export so existing imports of buttonVariants/ButtonProps from "@/components/ui/button"
// keep working. Server components should import from button-variants directly.
export { buttonVariants };
export type { ButtonProps };

export function Button({ className, variant, size, ref, loading, disabled, children, ...props }: ButtonProps) {
  // A submit button inside a <form> reflects the form's pending state automatically.
  const { pending } = useFormStatus();
  const isSubmit = props.type === undefined || props.type === "submit";
  const showLoading = loading || (isSubmit && pending);

  return (
    <button
      ref={ref}
      disabled={disabled || showLoading}
      aria-busy={showLoading || undefined}
      className={cn(buttonVariants({ variant, size }), className)}
      {...props}
    >
      {showLoading ? <Loader2 className="size-4 animate-spin" aria-hidden /> : null}
      {children}
    </button>
  );
}
