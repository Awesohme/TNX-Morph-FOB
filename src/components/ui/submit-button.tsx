"use client";

import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui/button";

/**
 * Submit button that disables itself and shows a pending label while its parent <form>'s
 * server action is in flight. Prevents double-submits (e.g. uploading a resource 5×).
 */
export function SubmitButton({
  children,
  pendingLabel,
  className,
  variant,
  size,
}: {
  children: React.ReactNode;
  pendingLabel?: string;
  className?: string;
  variant?: "default" | "outline" | "ghost" | "secondary" | "destructive";
  size?: "sm" | "md" | "lg";
}) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} className={className} variant={variant} size={size}>
      {pending ? pendingLabel ?? "Saving…" : children}
    </Button>
  );
}
