"use client";

import { useActionState, useEffect, useState } from "react";
import { Megaphone, Plus } from "lucide-react";
import { sendAnnouncementAction } from "@/lib/actions/notifications";
import { initialAnnouncementState } from "@/lib/notification-state";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { SelectMenu } from "@/components/ui/select-menu";
import { ModalShell } from "@/components/ui/modal-shell";
import { useToast } from "@/components/ui/toast";

/**
 * "New announcement" button + modal. Blasts an announcement to community managers (lands
 * in their notifications + web push). On success it toasts, closes, and the parent page
 * revalidates to show the new entry in the sent list.
 */
export function AnnouncementModal({ cohorts }: { cohorts: Array<{ id: string; name: string }> }) {
  const [open, setOpen] = useState(false);
  const [state, action, isPending] = useActionState(sendAnnouncementAction, initialAnnouncementState);
  const { toast } = useToast();

  useEffect(() => {
    if (!state.message) return;
    toast(state.message, state.ok ? "success" : "error");
    if (state.ok) setOpen(false);
  }, [state, toast]);

  return (
    <>
      <Button type="button" onClick={() => setOpen(true)}>
        <Plus className="size-4" />
        New announcement
      </Button>

      <ModalShell
        open={open}
        onClose={() => setOpen(false)}
        title="New announcement"
        description="Send a message to community managers. It lands in their notifications and as a web push."
      >
        <form action={action} className="space-y-3">
          <div className="flex items-center gap-2 text-sm font-medium text-slate-700">
            <Megaphone className="size-4 text-slate-500" />
            Announcement to community managers
          </div>
          <Input name="title" placeholder="Announcement title" required />
          <Textarea name="body" placeholder="What do you want CMs to know?" rows={4} />
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
          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button loading={isPending}>Send announcement</Button>
          </div>
        </form>
      </ModalShell>
    </>
  );
}
