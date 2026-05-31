"use client";

import { useEffect, useRef } from "react";
import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";

/**
 * Submit button for the "Edit cohort details" form. The server action returns void and
 * throws on failure, so success = the form went pending → idle without an error. On that
 * transition we toast and collapse the parent <details> panel, giving the save visible
 * feedback (previously it silently revalidated and looked like nothing happened).
 */
export function SaveCohortButton() {
  const { pending } = useFormStatus();
  const wasPending = useRef(false);
  const { toast } = useToast();
  const ref = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (wasPending.current && !pending) {
      toast("Cohort details saved.");
      ref.current?.closest("details")?.removeAttribute("open");
    }
    wasPending.current = pending;
  }, [pending, toast]);

  return (
    <div className="flex items-center gap-2">
      <Button
        type="button"
        variant="outline"
        onClick={() => ref.current?.closest("details")?.removeAttribute("open")}
      >
        Cancel
      </Button>
      <Button ref={ref} type="submit">
        Save changes
      </Button>
    </div>
  );
}
