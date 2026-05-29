"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { CheckCheck } from "lucide-react";
import { markAllNotificationsReadAction } from "@/lib/actions/notifications";
import { Button } from "@/components/ui/button";

export function MarkAllReadButton() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  return (
    <Button
      type="button"
      variant="outline"
      disabled={isPending}
      onClick={() =>
        startTransition(async () => {
          await markAllNotificationsReadAction();
          router.refresh();
        })
      }
    >
      <CheckCheck className="size-4" />
      {isPending ? "Marking…" : "Mark all read"}
    </Button>
  );
}
