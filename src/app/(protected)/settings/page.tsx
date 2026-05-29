import { Badge } from "@/components/ui/badge";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getCurrentUser, requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { removeCohortMembershipAction, sendDueRemindersNowAction, updateProfileAccessAction } from "@/lib/actions/ops";
import { PushSettingsCard } from "@/components/settings/push-settings-card";

export default async function SettingsPage() {
  const user = await getCurrentUser();
  if (!user) return null;

  const isAdmin = user.role === "admin";
  const supabase = await createClient();
  const [{ data: cohorts }, { data: memberships }, { data: profiles }, { data: reminderDeliveries }] = await Promise.all([
    supabase.from("cohorts").select("id, name, status").order("created_at", { ascending: true }),
    isAdmin
      ? supabase
          .from("cohort_members")
          .select("id, cohort_id, user_id, role")
          .order("created_at", { ascending: true })
      : Promise.resolve({ data: [] as Array<{ id: string; cohort_id: string; user_id: string; role: string }> }),
    isAdmin
      ? supabase.from("profiles").select("id, email, full_name, role, is_active").order("created_at", { ascending: true })
      : Promise.resolve({ data: [] as Array<{ id: string; email: string | null; full_name: string | null; role: string; is_active: boolean }> }),
    isAdmin
      ? supabase
          .from("reminder_deliveries")
          .select("id, delivery_kind, status, sent_at, error_message")
          .order("sent_at", { ascending: false })
          .limit(12)
      : Promise.resolve({ data: [] as Array<{ id: string; delivery_kind: string; status: string; sent_at: string; error_message: string | null }> }),
  ]);

  if (isAdmin) {
    await requireRole("admin");
  }

  const cohortNameById = Object.fromEntries((cohorts ?? []).map((cohort) => [cohort.id, cohort.name]));
  const membershipsByUser = (memberships ?? []).reduce<Record<string, Array<{ id: string; cohort_id: string; role: string }>>>((acc, membership) => {
    acc[membership.user_id] = acc[membership.user_id] ?? [];
    acc[membership.user_id].push({ id: membership.id, cohort_id: membership.cohort_id, role: membership.role });
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      <section className="rounded-[2rem] border border-white/70 bg-white/70 p-6 shadow-sm backdrop-blur md:p-8">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-muted-foreground">System settings</p>
        <h1 className="font-display text-4xl font-semibold tracking-tight md:text-5xl">Access, cohorts, and notifications</h1>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-muted-foreground">
          Keep team access tidy, attach people to cohorts, and manage push notifications from one operational page.
        </p>
      </section>

      <PushSettingsCard />

      {isAdmin ? (
        <>
          <section className="grid gap-4 md:grid-cols-3">
            <Card>
              <p className="text-sm text-muted-foreground">Profiles</p>
              <p className="mt-2 text-4xl font-semibold tracking-tight">{profiles?.length ?? 0}</p>
            </Card>
            <Card>
              <p className="text-sm text-muted-foreground">Cohorts</p>
              <p className="mt-2 text-4xl font-semibold tracking-tight">{cohorts?.length ?? 0}</p>
            </Card>
            <Card>
              <p className="text-sm text-muted-foreground">Active users</p>
              <p className="mt-2 text-4xl font-semibold tracking-tight">{profiles?.filter((profile) => profile.is_active).length ?? 0}</p>
            </Card>
          </section>

          <Card>
            <CardHeader>
              <CardTitle>Manual reminders</CardTitle>
              <CardDescription>Use the same reminder dispatcher as the cron route when you need to nudge the queue immediately.</CardDescription>
            </CardHeader>
            <form action={sendDueRemindersNowAction}>
              <button type="submit" className="inline-flex h-11 items-center justify-center rounded-full bg-slate-950 px-5 text-sm font-semibold text-white">
                Send due reminders now
              </button>
            </form>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Recent reminder deliveries</CardTitle>
              <CardDescription>Latest push reminder attempts across the app.</CardDescription>
            </CardHeader>
            <div className="space-y-3">
              {(reminderDeliveries ?? []).map((delivery) => (
                <div key={delivery.id} className="rounded-[1.2rem] border border-slate-200 bg-white p-3 text-sm">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge tone={delivery.status === "sent" ? "green" : delivery.status === "failed" ? "red" : "amber"}>{delivery.status}</Badge>
                    <Badge>{delivery.delivery_kind}</Badge>
                  </div>
                  <p className="mt-2 text-muted-foreground">{new Date(delivery.sent_at).toLocaleString()}</p>
                  {delivery.error_message ? <p className="mt-2 text-rose-700">{delivery.error_message}</p> : null}
                </div>
              ))}
              {!reminderDeliveries?.length ? <p className="text-sm text-muted-foreground">No reminder deliveries logged yet.</p> : null}
            </div>
          </Card>

          <section className="space-y-4">
            <div>
              <h2 className="font-display text-2xl font-semibold">Team access</h2>
              <p className="text-sm text-muted-foreground">Activate users, choose roles, and attach them to cohorts.</p>
            </div>
            <div className="space-y-4">
              {(profiles ?? []).map((profile) => (
                <Card key={profile.id} className="space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <h3 className="text-lg font-semibold text-slate-950">{profile.full_name || profile.email || "Unnamed user"}</h3>
                      <p className="text-sm text-muted-foreground">{profile.email || "No email available"}</p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Badge tone={profile.is_active ? "green" : "amber"}>{profile.is_active ? "Active" : "Pending"}</Badge>
                      <Badge tone="blue">{profile.role.replace("_", " ")}</Badge>
                    </div>
                  </div>

                  <form action={updateProfileAccessAction} className="grid gap-3 md:grid-cols-[1.1fr_1fr_1fr_auto]">
                    <input type="hidden" name="profileId" value={profile.id} />
                    <select
                      name="role"
                      defaultValue={profile.role}
                      className="h-11 rounded-[1.2rem] border border-slate-200 bg-white px-3 text-sm outline-none"
                    >
                      <option value="admin">Admin</option>
                      <option value="facilitator">Facilitator</option>
                      <option value="community_manager">Community manager</option>
                    </select>
                    <select
                      name="isActive"
                      defaultValue={profile.is_active ? "true" : "false"}
                      className="h-11 rounded-[1.2rem] border border-slate-200 bg-white px-3 text-sm outline-none"
                    >
                      <option value="true">Active</option>
                      <option value="false">Pending</option>
                    </select>
                    <select name="cohortId" defaultValue="" className="h-11 rounded-[1.2rem] border border-slate-200 bg-white px-3 text-sm outline-none">
                      <option value="">No new cohort assignment</option>
                      {(cohorts ?? []).map((cohort) => (
                        <option key={cohort.id} value={cohort.id}>
                          {cohort.name}
                        </option>
                      ))}
                    </select>
                    <button type="submit" className="inline-flex h-11 items-center justify-center rounded-full bg-slate-950 px-5 text-sm font-semibold text-white">
                      Save
                    </button>
                  </form>

                  <div className="flex flex-wrap gap-2">
                    {(membershipsByUser[profile.id] ?? []).length ? (
                      (membershipsByUser[profile.id] ?? []).map((membership) => (
                        <form key={membership.id} action={removeCohortMembershipAction} className="inline-flex">
                          <input type="hidden" name="membershipId" value={membership.id} />
                          <button type="submit" className="inline-flex items-center gap-2 rounded-full border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700">
                            {cohortNameById[membership.cohort_id] ?? "Unknown cohort"} · {membership.role.replace("_", " ")}
                          </button>
                        </form>
                      ))
                    ) : (
                      <p className="text-sm text-muted-foreground">No cohort memberships yet.</p>
                    )}
                  </div>
                </Card>
              ))}
            </div>
          </section>
        </>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Notifications</CardTitle>
            <CardDescription>Push notifications are managed per device. Team access controls are admin-only.</CardDescription>
          </CardHeader>
        </Card>
      )}
    </div>
  );
}
