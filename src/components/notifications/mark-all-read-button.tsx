"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { CheckCheck } from "lucide-react";
import { markAllNotificationsReadAction } from "@/lib/actions/notifications";
import { NOTIFICATIONS_UPDATED_EVENT } from "@/lib/notification-state";
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
          window.dispatchEvent(new Event(NOTIFICATIONS_UPDATED_EVENT));
          router.refresh();
        })
      }
    >
      <CheckCheck className="size-4" />
      {isPending ? "Marking…" : "Mark all read"}
    </Button>
  );
}
