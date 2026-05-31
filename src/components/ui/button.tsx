"use client";

import type { ButtonHTMLAttributes, Ref } from "react";
import { useFormStatus } from "react-dom";
import { Loader2 } from "lucide-react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

export const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 rounded-xl text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground shadow-sm hover:bg-primary/92",
        secondary: "bg-slate-100 text-slate-900 hover:bg-slate-200/80",
        outline: "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50",
        ghost: "text-slate-700 hover:bg-slate-100",
        destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/90",
      },
      size: {
        sm: "h-8 px-3.5",
        md: "h-10 px-4",
        lg: "h-11 px-5",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "md",
    },
  },
);

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> &
  VariantProps<typeof buttonVariants> & {
    ref?: Ref<HTMLButtonElement>;
    /**
     * Force the spinner + disabled state (for onClick/useTransition buttons).
     * Form submit buttons spin automatically via useFormStatus — no prop needed.
     */
    loading?: boolean;
  };

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
