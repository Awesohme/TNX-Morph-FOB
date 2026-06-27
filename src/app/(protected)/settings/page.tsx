import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button-variants";
import { Card } from "@/components/ui/card";
import { getCurrentUser, requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { sendDueRemindersNowAction } from "@/lib/actions/ops";
import { PushSettingsCard } from "@/components/settings/push-settings-card";
import { ProfileAccessCard } from "@/components/settings/profile-access-card";
import { TeamAccessList } from "@/components/settings/team-access-list";
import { AutomationGuide } from "@/components/guides/automation-guide";
import { CreateCommunityManagerModal } from "@/components/settings/create-community-manager-modal";
import { SettingsTabs } from "@/components/settings/settings-tabs";
import { ReminderPrefsCard } from "@/components/settings/reminder-prefs-card";

export default async function SettingsPage() {
  const user = await getCurrentUser();
  if (!user) return null;

  const isAdmin = user.role === "admin";
  const supabase = await createClient();
  const [{ data: cohorts }, { data: memberships }, { data: profiles }, { data: reminderDeliveries }, { data: reminderPrefsRow }] = await Promise.all([
    supabase.from("cohorts").select("id, name, status, slug, submissions_open").order("created_at", { ascending: true }),
    isAdmin
      ? supabase
          .from("cohort_members")
          .select("id, cohort_id, user_id, role")
          .order("created_at", { ascending: true })
      : Promise.resolve({ data: [] as Array<{ id: string; cohort_id: string; user_id: string; role: string }> }),
    isAdmin
      ? supabase.from("profiles").select("id, email, full_name, role, is_active, deactivated_at").order("created_at", { ascending: true })
      : Promise.resolve({ data: [] as Array<{ id: string; email: string | null; full_name: string | null; role: string; is_active: boolean; deactivated_at: string | null }> }),
    isAdmin
      ? supabase
          .from("reminder_deliveries")
          .select("id, delivery_kind, status, sent_at, error_message")
          .order("sent_at", { ascending: false })
          .limit(12)
      : Promise.resolve({ data: [] as Array<{ id: string; delivery_kind: string; status: string; sent_at: string; error_message: string | null }> }),
    supabase
      .from("user_reminder_prefs")
      .select("remind_1d, remind_3h, remind_at_due, remind_overdue")
      .eq("user_id", user.id)
      .maybeSingle(),
  ]);

  const reminderPrefs = {
    remind_1d: reminderPrefsRow?.remind_1d ?? true,
    remind_3h: reminderPrefsRow?.remind_3h ?? false,
    remind_at_due: reminderPrefsRow?.remind_at_due ?? false,
    remind_overdue: reminderPrefsRow?.remind_overdue ?? true,
  };

  if (isAdmin) {
    await requireRole("admin");
  }

  const cohortNameById = Object.fromEntries((cohorts ?? []).map((cohort) => [cohort.id, cohort.name]));
  const hasCohorts = Boolean(cohorts?.length);
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

      <SettingsTabs
        tabs={[
          {
            key: "notifications",
            label: "Notifications",
            content: (
              <>
                <PushSettingsCard />
                <ReminderPrefsCard prefs={reminderPrefs} />
                <AutomationGuide />
              </>
            ),
          },
          {
            key: "team",
            label: "Team & Access",
            content: isAdmin ? (
              <section className="space-y-4">
                <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
                  <div>
                    <h2 className="text-xl font-semibold">Team access</h2>
                    <p className="text-sm text-muted-foreground">Create CM accounts, activate teammates, and control cohort access here.</p>
                  </div>
                  {hasCohorts ? (
                    <CreateCommunityManagerModal cohorts={(cohorts ?? []).map((cohort) => ({ id: cohort.id, name: cohort.name }))} />
                  ) : (
                    <Link href="/cohorts" className={buttonVariants()}>
                      Create first cohort
                    </Link>
                  )}
                </div>
                {hasCohorts ? (
                  <Card className="space-y-2 bg-slate-50/70">
                    <p className="text-sm font-medium text-slate-900">How to add a community manager</p>
                    <p className="text-sm leading-6 text-slate-600">
                      Create the account here, copy the temporary password once, and send the login details directly to the manager. They will be asked to create their own password after the first sign in.
                    </p>
                  </Card>
                ) : (
                  <Card className="space-y-2 bg-slate-50/70">
                    <p className="text-sm font-medium text-slate-900">No cohorts yet</p>
                    <p className="text-sm leading-6 text-slate-600">
                      Create the first cohort before adding community managers so each account can be assigned to a workspace.
                    </p>
                  </Card>
                )}
                <TeamAccessList
                  items={(profiles ?? []).map((profile) => ({
                    id: profile.id,
                    status: profile.is_active ? "active" : profile.deactivated_at ? "deactivated" : "pending",
                    card: (
                      <ProfileAccessCard
                        profile={profile}
                        cohorts={cohorts ?? []}
                        memberships={membershipsByUser[profile.id] ?? []}
                        cohortNameById={cohortNameById}
                        currentUserId={user.id}
                      />
                    ),
                  }))}
                />
              </section>
            ) : null,
          },
          {
            key: "tools",
            label: "Tools",
            content: isAdmin ? (
              <section className="space-y-5">
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

                <div className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-4 md:flex-row md:items-center md:justify-between">
                  <div>
                    <p className="text-sm font-medium text-slate-950">Backups &amp; danger zone</p>
                    <p className="text-sm text-slate-500">Export all data to JSON, check environment health, or wipe everything to start fresh.</p>
                  </div>
                  <Link href="/admin/export" className="inline-flex shrink-0 items-center gap-2 rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50">
                    Open admin tools
                  </Link>
                </div>
              </section>
            ) : null,
          },
        ]}
      />
    </div>
  );
}
