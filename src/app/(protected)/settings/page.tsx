import { Badge } from "@/components/ui/badge";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getCurrentUser, requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { sendDueRemindersNowAction } from "@/lib/actions/ops";
import { PushSettingsCard } from "@/components/settings/push-settings-card";
import { ProfileAccessCard } from "@/components/settings/profile-access-card";

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
      <section className="app-panel p-6 md:p-7">
        <p className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">System settings</p>
        <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">Access, cohorts, and notifications</h1>
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
              <p className="mt-2 text-3xl font-semibold tracking-tight">{profiles?.length ?? 0}</p>
            </Card>
            <Card>
              <p className="text-sm text-muted-foreground">Cohorts</p>
              <p className="mt-2 text-3xl font-semibold tracking-tight">{cohorts?.length ?? 0}</p>
            </Card>
            <Card>
              <p className="text-sm text-muted-foreground">Active users</p>
              <p className="mt-2 text-3xl font-semibold tracking-tight">{profiles?.filter((profile) => profile.is_active).length ?? 0}</p>
            </Card>
          </section>

          <details className="group app-panel">
            <summary className="cursor-pointer list-none">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-base font-semibold text-slate-950">Operational tools</p>
                  <p className="mt-1 text-sm text-slate-500">Manual reminder dispatch and delivery logs for admins.</p>
                </div>
                <Badge tone="blue">Admin</Badge>
              </div>
            </summary>
            <div className="mt-5 space-y-5 border-t border-slate-100 pt-5">
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-950">Manual reminders</p>
                  <p className="text-sm text-slate-500">Use the same reminder dispatcher as the cron route when you need to nudge the queue immediately.</p>
                </div>
                <form action={sendDueRemindersNowAction}>
                  <button type="submit" className="inline-flex h-11 items-center justify-center rounded-xl bg-slate-950 px-5 text-sm font-medium text-white">
                    Send due reminders now
                  </button>
                </form>
              </div>

              <div className="space-y-3">
                <p className="text-sm font-medium text-slate-950">Recent reminder deliveries</p>
                {(reminderDeliveries ?? []).map((delivery) => (
                  <div key={delivery.id} className="rounded-xl border border-slate-200 bg-white p-3 text-sm">
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
            </div>
          </details>

          <section className="space-y-4">
            <div>
              <h2 className="text-xl font-semibold">Team access</h2>
              <p className="text-sm text-muted-foreground">People first sign in, then you activate them and attach them to a cohort here.</p>
            </div>
            <Card className="space-y-2 bg-slate-50/70">
              <p className="text-sm font-medium text-slate-900">How to add a community manager</p>
              <p className="text-sm leading-6 text-slate-600">
                Ask them to create an account and sign in once. After that, they will appear here as a pending user. You can then set their role to community manager, activate access, and attach them to the right cohort.
              </p>
            </Card>
            <div className="space-y-4">
              {(profiles ?? []).map((profile) => (
                <ProfileAccessCard
                  key={profile.id}
                  profile={profile}
                  cohorts={cohorts ?? []}
                  memberships={membershipsByUser[profile.id] ?? []}
                  cohortNameById={cohortNameById}
                />
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
