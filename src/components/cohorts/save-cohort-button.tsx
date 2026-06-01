"use client";

import { useEffect, useRef } from "react";
import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui/button";
import { useModalShell } from "@/components/ui/modal-shell";
import { useToast } from "@/components/ui/toast";

/**
 * Submit button for the "Edit cohort details" form. The server action returns void and
 * throws on failure, so success = the form went pending → idle without an error. On that
 * transition we toast and close the edit modal, giving the save visible feedback.
 */
export function SaveCohortButton() {
  const { pending } = useFormStatus();
  const wasPending = useRef(false);
  const { toast } = useToast();
  const ref = useRef<HTMLButtonElement>(null);
  const modal = useModalShell();

  useEffect(() => {
    if (wasPending.current && !pending) {
      toast("Cohort details saved.");
      modal?.close();
    }
    wasPending.current = pending;
  }, [modal, pending, toast]);

  return (
    <div className="flex items-center gap-2">
      <Button
        type="button"
        variant="outline"
        onClick={() => modal?.close()}
      >
        Cancel
      </Button>
      <Button ref={ref} type="submit">
        Save changes
      </Button>
    </div>
  );
}
