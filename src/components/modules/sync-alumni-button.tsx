"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Sparkles } from "lucide-react";
import { promoteEligibleAlumniAction } from "@/lib/actions/ops";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";

/**
 * Promotes qualifying participants (demo presented + all weekly assignments submitted) into
 * the Alumni list for this cohort.
 */
export function SyncAlumniButton({ cohortId }: { cohortId: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const { toast } = useToast();

  return (
    <Button
      type="button"
      variant="outline"
      disabled={isPending || !cohortId}
      onClick={() =>
        startTransition(async () => {
          try {
            const fd = new FormData();
            fd.set("cohortId", cohortId);
            await promoteEligibleAlumniAction(fd);
            toast("Alumni synced.");
            router.refresh();
          } catch {
            toast("Could not sync alumni.", "error");
          }
        })
      }
    >
      <Sparkles className="size-4" />
      {isPending ? "Syncing…" : "Sync alumni"}
    </Button>
  );
}
