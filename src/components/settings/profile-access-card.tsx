"use client";

import { useState } from "react";
import { PencilLine, UserPlus } from "lucide-react";
import { removeCohortMembershipAction, updateProfileAccessAction } from "@/lib/actions/ops";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ModalShell } from "@/components/ui/modal-shell";

type CohortOption = { id: string; name: string };
type Membership = { id: string; cohort_id: string; role: string };

export function ProfileAccessCard({
  profile,
  cohorts,
  memberships,
  cohortNameById,
}: {
  profile: { id: string; email: string | null; full_name: string | null; role: string; is_active: boolean };
  cohorts: CohortOption[];
  memberships: Membership[];
  cohortNameById: Record<string, string>;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Card className="space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h3 className="text-base font-semibold text-slate-950">{profile.full_name || profile.email || "Unnamed user"}</h3>
            <p className="text-sm text-muted-foreground">{profile.email || "No email available"}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge tone={profile.is_active ? "green" : "amber"}>{profile.is_active ? "Active" : "Pending"}</Badge>
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
          <Button type="button" variant="outline" onClick={() => setOpen(true)}>
            <PencilLine className="size-4" />
            Edit access
          </Button>
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
          <select name="role" defaultValue={profile.role} className="app-select h-11">
            <option value="admin">Admin</option>
            <option value="facilitator">Facilitator</option>
            <option value="community_manager">Community manager</option>
          </select>
          <select name="isActive" defaultValue={profile.is_active ? "true" : "false"} className="app-select h-11">
            <option value="true">Active</option>
            <option value="false">Pending</option>
          </select>
          <select name="cohortId" defaultValue="" className="app-select h-11 md:col-span-2">
            <option value="">No new cohort assignment</option>
            {cohorts.map((cohort) => (
              <option key={cohort.id} value={cohort.id}>
                {cohort.name}
              </option>
            ))}
          </select>
          <div className="flex justify-end gap-3 md:col-span-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button>Save access</Button>
          </div>
        </form>
      </ModalShell>
    </>
  );
}
