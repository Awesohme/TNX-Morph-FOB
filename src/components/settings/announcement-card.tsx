"use client";

import { useActionState, useEffect } from "react";
import { Megaphone } from "lucide-react";
import { sendAnnouncementAction } from "@/lib/actions/notifications";
import { initialAnnouncementState } from "@/lib/notification-state";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { SelectMenu } from "@/components/ui/select-menu";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";

/**
 * Admin announcement blast to community managers — lands in their notifications (+ web push).
 */
export function AnnouncementCard({ cohorts }: { cohorts: Array<{ id: string; name: string }> }) {
  const [state, action, isPending] = useActionState(sendAnnouncementAction, initialAnnouncementState);
  const { toast } = useToast();

  useEffect(() => {
    if (state.message) toast(state.message, state.ok ? "success" : "error");
  }, [state, toast]);

  return (
    <Card className="space-y-4">
      <div className="flex items-center gap-2">
        <Megaphone className="size-4 text-slate-700" />
        <p className="text-sm font-medium text-slate-950">Announcement to community managers</p>
      </div>
      <form action={action} className="space-y-3">
        <Input name="title" placeholder="Announcement title" required />
        <Textarea name="body" placeholder="What do you want CMs to know?" rows={3} />
        <SelectMenu
          name="cohortId"
          defaultValue=""
          placeholder="All cohorts' CMs"
          buttonClassName="h-11"
          options={[
            { value: "", label: "All cohorts' CMs" },
            ...cohorts.map((c) => ({ value: c.id, label: `${c.name} CMs` })),
          ]}
        />
        <div className="flex justify-end">
          <Button disabled={isPending}>{isPending ? "Sending…" : "Send announcement"}</Button>
        </div>
      </form>
    </Card>
  );
}
