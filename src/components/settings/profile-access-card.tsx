"use client";

import { useActionState, useEffect, useState } from "react";
import { Copy, PencilLine, Power, UserPlus } from "lucide-react";
import { removeCohortMembershipAction, setProfileActiveAction, updateProfileAccessAction } from "@/lib/actions/ops";
import { resetUserInviteAction, type ResetUserInviteState } from "@/lib/actions/settings";
import { inviteText } from "@/lib/invites";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { InviteDetails } from "@/components/settings/invite-details";
import { ModalShell } from "@/components/ui/modal-shell";
import { SelectMenu } from "@/components/ui/select-menu";
import { useToast } from "@/components/ui/toast";

type CohortOption = { id: string; name: string };
type Membership = { id: string; cohort_id: string; role: string };
const initialResetUserInviteState: ResetUserInviteState = { ok: false, message: "" };

export function ProfileAccessCard({
  profile,
  cohorts,
  memberships,
  cohortNameById,
  currentUserId,
}: {
  profile: { id: string; email: string | null; full_name: string | null; role: string; is_active: boolean; deactivated_at?: string | null };
  cohorts: CohortOption[];
  memberships: Membership[];
  cohortNameById: Record<string, string>;
  currentUserId: string;
}) {
  const [open, setOpen] = useState(false);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [resetState, resetAction] = useActionState(resetUserInviteAction, initialResetUserInviteState);
  const { toast } = useToast();
  const canResetInvite = Boolean(profile.email && profile.is_active && !profile.deactivated_at && profile.id !== currentUserId);

  useEffect(() => {
    if (!resetState.credentials) return;

    setInviteOpen(true);
    navigator.clipboard
      .writeText(inviteText(resetState.credentials))
      .then(() => toast("Invite copied."))
      .catch(() => toast("Invite regenerated. Use Copy invite to copy it.", "error"));
  }, [resetState.credentials, toast]);

  return (
    <>
      <Card className="space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h3 className="text-base font-semibold text-slate-950">{profile.full_name || profile.email || "Unnamed user"}</h3>
            <p className="text-sm text-muted-foreground">{profile.email || "No email available"}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge tone={profile.is_active ? "green" : profile.deactivated_at ? "red" : "amber"}>
              {profile.is_active ? "Active" : profile.deactivated_at ? "Deactivated" : "Pending"}
            </Badge>
            <Badge tone="blue">{profile.role.replace("_", " ")}</Badge>
          </div>
        </div>

        <div className="space-y-2">
          <p className="text-xs font-medium uppercase tracking-[0.12em] text-slate-500">Cohort memberships</p>
          <div className="flex flex-wrap gap-2">
            {memberships.length ? (
              memberships.map((membership) => (
                <form key={membership.id} action={removeCohortMembershipAction} className="inline-flex">
                  <input type="hidden" name="membershipId" value={membership.id} />
                  <button type="submit" className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50">
                    {cohortNameById[membership.cohort_id] ?? "Unknown cohort"} · {membership.role.replace("_", " ")}
                  </button>
                </form>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">No cohort memberships yet.</p>
            )}
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4">
          <div className="flex items-center gap-2 text-sm text-slate-500">
            <UserPlus className="size-4" />
            Edit role, activation, and cohort access after the account is created.
          </div>
          <div className="flex flex-wrap gap-2">
            {canResetInvite ? (
              <form action={resetAction}>
                <input type="hidden" name="profileId" value={profile.id} />
                <Button type="submit" variant="outline">
                  <Copy className="size-4" />
                  Copy invite
                </Button>
              </form>
            ) : null}
            <form action={setProfileActiveAction}>
              <input type="hidden" name="profileId" value={profile.id} />
              <input type="hidden" name="activate" value={profile.is_active ? "false" : "true"} />
              <Button
                type="submit"
                variant="outline"
                className={profile.is_active ? "border-rose-200 text-rose-600 hover:bg-rose-50" : "border-emerald-200 text-emerald-700 hover:bg-emerald-50"}
              >
                <Power className="size-4" />
                {profile.is_active ? "Deactivate" : "Reactivate"}
              </Button>
            </form>
            <Button type="button" variant="outline" onClick={() => setOpen(true)}>
              <PencilLine className="size-4" />
              Edit access
            </Button>
          </div>
          {resetState.message && !resetState.ok ? (
            <p className="basis-full text-sm text-rose-700">{resetState.message}</p>
          ) : null}
        </div>
      </Card>

      <ModalShell
        open={open}
        onClose={() => setOpen(false)}
        title="Edit access"
        description="Adjust role, activation, and optionally attach this person to one cohort."
      >
        <form action={updateProfileAccessAction} className="grid gap-3 md:grid-cols-[1.1fr_1fr]">
          <input type="hidden" name="profileId" value={profile.id} />
          <SelectMenu
            name="role"
            defaultValue={profile.role}
            buttonClassName="h-11"
            options={[
              { value: "admin", label: "Admin" },
              { value: "facilitator", label: "Facilitator" },
              { value: "community_manager", label: "Community manager" },
            ]}
          />
          <SelectMenu
            name="isActive"
            defaultValue={profile.is_active ? "true" : "false"}
            buttonClassName="h-11"
            options={[
              { value: "true", label: "Active" },
              { value: "false", label: "Pending" },
            ]}
          />
          <SelectMenu
            name="cohortId"
            defaultValue=""
            placeholder="No new cohort assignment"
            className="md:col-span-2"
            buttonClassName="h-11"
            options={cohorts.map((cohort) => ({ value: cohort.id, label: cohort.name }))}
          />
          <div className="flex justify-end gap-3 md:col-span-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button>Save access</Button>
          </div>
        </form>
      </ModalShell>

      <ModalShell
        open={inviteOpen}
        onClose={() => setInviteOpen(false)}
        title="Invite regenerated"
        description="A fresh temporary password was created for this user. Share this invite with them."
      >
        {resetState.credentials ? (
          <div className="space-y-4">
            <p className="text-sm font-medium text-emerald-700">{resetState.message}</p>
            <InviteDetails credentials={resetState.credentials} />
            <div className="flex justify-end">
              <Button type="button" variant="outline" onClick={() => setInviteOpen(false)}>
                Close
              </Button>
            </div>
          </div>
        ) : null}
      </ModalShell>
    </>
  );
}
