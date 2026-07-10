"use client";

import { useState } from "react";
import { Trash2, UserPlus, Users } from "lucide-react";
import { addCohortMemberAction, removeCohortMembershipAction } from "@/lib/actions/ops";
import { Button } from "@/components/ui/button";
import { ModalShell } from "@/components/ui/modal-shell";
import { DestructiveActionModal } from "@/components/ui/destructive-action-modal";
import { SelectMenu } from "@/components/ui/select-menu";
import { Badge } from "@/components/ui/badge";

type ProfileOption = {
  id: string;
  label: string;
  email: string | null;
  role: string;
};

type Membership = {
  id: string;
  user_id: string;
  role: string;
  label: string;
  email: string | null;
};

export function MemberManagementModal({
  cohortId,
  profiles,
  memberships,
}: {
  cohortId: string;
  profiles: ProfileOption[];
  memberships: Membership[];
}) {
  const [open, setOpen] = useState(false);
  const [profileId, setProfileId] = useState("");
  const [role, setRole] = useState("community_manager");
  const memberIds = new Set(memberships.map((membership) => membership.user_id));
  const availableProfiles = profiles.filter((profile) => !memberIds.has(profile.id));

  return (
    <>
      <Button type="button" variant="outline" onClick={() => setOpen(true)}>
        <Users className="size-4" />
        Member management
      </Button>

      <ModalShell
        open={open}
        onClose={() => setOpen(false)}
        title="Member management"
        description="Add and remove people assigned to this cohort."
      >
        <div className="space-y-5">
          <form action={addCohortMemberAction} className="grid gap-3 md:grid-cols-[1fr_0.8fr_auto]">
            <input type="hidden" name="cohortId" value={cohortId} />
            <SelectMenu
              name="profileId"
              value={profileId}
              onChange={setProfileId}
              placeholder="Select person"
              buttonClassName="h-11"
              options={availableProfiles.map((profile) => ({ value: profile.id, label: profile.label }))}
            />
            <SelectMenu
              name="role"
              value={role}
              onChange={setRole}
              buttonClassName="h-11"
              options={[
                { value: "admin", label: "Admin" },
                { value: "facilitator", label: "Facilitator" },
                { value: "community_manager", label: "Community manager" },
              ]}
            />
            <Button disabled={!profileId}>
              <UserPlus className="size-4" />
              Add
            </Button>
          </form>

          <div className="space-y-3">
            {memberships.length ? (
              memberships.map((membership) => (
                <div key={membership.id} className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="font-semibold text-slate-950">{membership.label}</p>
                    <p className="mt-1 text-sm text-muted-foreground">{membership.email || "No email available"}</p>
                    <Badge className="mt-3">{membership.role.replace("_", " ")}</Badge>
                  </div>
                  <DestructiveActionModal
                    title="Remove cohort member?"
                    description={`${membership.label} will lose access to this cohort. This does not delete their account.`}
                    action={removeCohortMembershipAction}
                    confirmLabel="Remove member"
                    pendingLabel="Removing member…"
                    trigger={<Button type="button" variant="outline" className="border-rose-200 text-rose-600 hover:bg-rose-50">
                      <Trash2 className="size-4" />
                      Remove
                    </Button>}
                  >
                    <input type="hidden" name="membershipId" value={membership.id} />
                  </DestructiveActionModal>
                </div>
              ))
            ) : (
              <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/70 p-5 text-sm text-muted-foreground">
                No members assigned yet.
              </div>
            )}
          </div>
        </div>
      </ModalShell>
    </>
  );
}
