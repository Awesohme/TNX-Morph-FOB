import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function RequiredIndicator({ className }: { className?: string }) {
  return (
    <span
      aria-label="required"
      className={cn("inline-flex items-center text-sm font-semibold leading-none text-rose-600", className)}
    >
      *
    </span>
  );
}

export function RequiredLabel({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <span className={cn("inline-flex flex-wrap items-center gap-1", className)}>
      <span>{children}</span>
      <RequiredIndicator />
    </span>
  );
}
