import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { getCurrentUser, requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { sendDueRemindersNowAction } from "@/lib/actions/ops";
import { runGoogleSheetSyncNowAction, saveGoogleSheetConfigAction } from "@/lib/actions/settings";
import { PushSettingsCard } from "@/components/settings/push-settings-card";
import { ProfileAccessCard } from "@/components/settings/profile-access-card";
import { TeamAccessList } from "@/components/settings/team-access-list";
import { AutomationGuide } from "@/components/guides/automation-guide";
import { CreateCommunityManagerModal } from "@/components/settings/create-community-manager-modal";
import { SettingsTabs } from "@/components/settings/settings-tabs";
import { SubmissionsControl } from "@/components/settings/submissions-control";
import { ReminderPrefsCard } from "@/components/settings/reminder-prefs-card";

const syncDatasets = [
  { key: "participants", label: "Participants" },
  { key: "reviews", label: "Reviews" },
  { key: "ops", label: "Ops" },
  { key: "sessions", label: "Sessions" },
  { key: "community", label: "CM reports" },
] as const;

export default async function SettingsPage() {
  const user = await getCurrentUser();
  if (!user) return null;

  const isAdmin = user.role === "admin";
  const supabase = await createClient();
  const { data: reminderPrefsRow } = await supabase
    .from("user_reminder_prefs")
    .select("remind_1d, remind_3h, remind_at_due, remind_overdue")
    .eq("user_id", user.id)
    .maybeSingle();
  const reminderPrefs = {
    remind_1d: reminderPrefsRow?.remind_1d ?? true,
    remind_3h: reminderPrefsRow?.remind_3h ?? false,
    remind_at_due: reminderPrefsRow?.remind_at_due ?? false,
    remind_overdue: reminderPrefsRow?.remind_overdue ?? true,
  };
  const [{ data: cohorts }, { data: memberships }, { data: profiles }, { data: reminderDeliveries }, { data: syncConfigs }, { data: syncRuns }] = await Promise.all([
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
    isAdmin
      ? supabase
          .from("google_sheet_sync_configs")
          .select("id, cohort_id, dataset_key, spreadsheet_id, sheet_name, enabled")
          .order("dataset_key", { ascending: true })
      : Promise.resolve({ data: [] as Array<{ id: string; cohort_id: string; dataset_key: string; spreadsheet_id: string; sheet_name: string; enabled: boolean }> }),
    isAdmin
      ? supabase
          .from("google_sheet_sync_runs")
          .select("id, cohort_id, dataset_key, status, rows_pulled, rows_pushed, started_at, finished_at, message")
          .order("started_at", { ascending: false })
          .limit(12)
      : Promise.resolve({
          data: [] as Array<{
            id: string;
            cohort_id: string | null;
            dataset_key: string;
            status: string;
            rows_pulled: number;
            rows_pushed: number;
            started_at: string;
            finished_at: string | null;
            message: string | null;
          }>,
        }),
  ]);

  if (isAdmin) {
    await requireRole("admin");
  }

  const cohortNameById = Object.fromEntries((cohorts ?? []).map((cohort) => [cohort.id, cohort.name]));
  const syncConfigByKey = Object.fromEntries(
    (syncConfigs ?? []).map((config) => [`${config.cohort_id}:${config.dataset_key}`, config]),
  ) as Record<string, { spreadsheet_id: string; sheet_name: string; enabled: boolean }>;
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
            key: "sync",
            label: "Sync",
            content: isAdmin ? (
              <section className="space-y-4">
                <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
                  <div>
                    <h2 className="text-xl font-semibold">Google Sheets sync</h2>
                    <p className="text-sm text-muted-foreground">Use Sheets as the operational source for participants, reviews, ops, sessions, and CM reports.</p>
                  </div>
                  <form action={runGoogleSheetSyncNowAction}>
                    <button type="submit" className="inline-flex h-11 items-center justify-center rounded-xl bg-slate-950 px-5 text-sm font-medium text-white">
                      Run full sync now
                    </button>
                  </form>
                </div>

                <div className="space-y-4">
                  {(cohorts ?? []).map((cohort) => (
                    <Card key={cohort.id} className="space-y-4">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <h3 className="text-base font-semibold text-slate-950">{cohort.name}</h3>
                          <p className="text-sm text-muted-foreground">Map each dataset to a spreadsheet ID and tab name, then sync on demand or via the daily cron.</p>
                        </div>
                        <Badge tone="blue">{cohort.status}</Badge>
                      </div>

                      <div className="grid gap-4 xl:grid-cols-2">
                        {syncDatasets.map((dataset) => {
                          const config = syncConfigByKey[`${cohort.id}:${dataset.key}`];
                          return (
                            <form key={dataset.key} action={saveGoogleSheetConfigAction} className="space-y-3 rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
                              <input type="hidden" name="cohortId" value={cohort.id} />
                              <input type="hidden" name="datasetKey" value={dataset.key} />
                              <div className="flex items-center justify-between gap-3">
                                <p className="text-sm font-medium text-slate-950">{dataset.label}</p>
                                <label className="inline-flex items-center gap-2 text-xs text-slate-600">
                                  <input type="checkbox" name="enabled" value="true" defaultChecked={config?.enabled ?? true} className="size-4" />
                                  Enabled
                                </label>
                              </div>
                              <input name="spreadsheetId" defaultValue={config?.spreadsheet_id ?? ""} placeholder="Spreadsheet ID" className="app-input h-11" />
                              <input name="sheetName" defaultValue={config?.sheet_name ?? ""} placeholder="Tab name" className="app-input h-11" />
                              <div className="flex flex-wrap justify-end gap-3">
                                <button type="submit" className="inline-flex h-10 items-center justify-center rounded-xl border border-slate-200 px-4 text-sm font-medium text-slate-700">
                                  Save mapping
                                </button>
                                <button formAction={runGoogleSheetSyncNowAction} className="inline-flex h-10 items-center justify-center rounded-xl bg-slate-950 px-4 text-sm font-medium text-white">
                                  Sync now
                                </button>
                              </div>
                            </form>
                          );
                        })}
                      </div>
                    </Card>
                  ))}
                </div>

                <Card className="space-y-3">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-medium text-slate-950">Recent sync runs</p>
                      <p className="text-sm text-muted-foreground">See whether the latest pulls and write-backs completed cleanly.</p>
                    </div>
                  </div>
                  {(syncRuns ?? []).length ? (
                    <div className="space-y-3">
                      {syncRuns?.map((run) => (
                        <div key={run.id} className="rounded-xl border border-slate-200 bg-white p-3 text-sm">
                          <div className="flex flex-wrap items-center gap-2">
                            <Badge tone={run.status === "completed" ? "green" : run.status === "failed" ? "red" : "amber"}>{run.status}</Badge>
                            <Badge>{run.dataset_key}</Badge>
                            <span className="text-muted-foreground">{cohortNameById[run.cohort_id ?? ""] ?? "All cohorts"}</span>
                          </div>
                          <p className="mt-2 text-muted-foreground">
                            Pulled {run.rows_pulled} · pushed {run.rows_pushed} · {new Date(run.started_at).toLocaleString()}
                          </p>
                          {run.message ? <p className="mt-2 text-rose-700">{run.message}</p> : null}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">No sync runs logged yet.</p>
                  )}
                </Card>

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
              </section>
            ) : null,
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
                  <CreateCommunityManagerModal cohorts={(cohorts ?? []).map((cohort) => ({ id: cohort.id, name: cohort.name }))} />
                </div>
                <Card className="space-y-2 bg-slate-50/70">
                  <p className="text-sm font-medium text-slate-900">How to add a community manager</p>
                  <p className="text-sm leading-6 text-slate-600">
                    Create the account here, copy the temporary password once, and send the login details directly to the manager. They will be asked to create their own password after the first sign in.
                  </p>
                </Card>
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
                <SubmissionsControl
                  cohorts={(cohorts ?? []).map((cohort) => ({
                    id: cohort.id,
                    name: cohort.name,
                    slug: cohort.slug,
                    submissions_open: cohort.submissions_open ?? false,
                  }))}
                />

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
              </section>
            ) : null,
          },
        ]}
      />
    </div>
  );
}
