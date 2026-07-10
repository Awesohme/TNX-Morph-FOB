"use client";

import { useState } from "react";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ModalShell } from "@/components/ui/modal-shell";

type ServerAction = (formData: FormData) => void | Promise<void>;

/**
 * Keeps irreversible server actions behind the same confirmation and pending UI.
 * The modal remains visible while the action is in flight, so feedback is never
 * lost behind a background refresh.
 */
export function DestructiveActionModal({
  trigger,
  title,
  description,
  action,
  children,
  confirmLabel = "Delete",
  pendingLabel = "Deleting…",
}: {
  trigger: React.ReactNode;
  title: string;
  description: string;
  action: ServerAction;
  children?: React.ReactNode;
  confirmLabel?: string;
  pendingLabel?: string;
}) {
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  function close() {
    if (!isSubmitting) setOpen(false);
  }

  return (
    <>
      <span onClick={() => setOpen(true)}>{trigger}</span>
      <ModalShell
        open={open}
        onClose={close}
        title={title}
        description={description}
        widthClassName="max-w-md"
        disableClose={isSubmitting}
      >
        <form action={action} onSubmit={() => setIsSubmitting(true)} className="space-y-5">
          {children}
          <div className="flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={close} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button loading={isSubmitting} className="bg-rose-600 text-white hover:bg-rose-700">
              <AlertTriangle className="size-4" />
              {isSubmitting ? pendingLabel : confirmLabel}
            </Button>
          </div>
        </form>
      </ModalShell>
    </>
  );
}
