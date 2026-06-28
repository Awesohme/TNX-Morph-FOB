import { ExportDataForm, ImportWorkbookForm, NukeAllDataForm, SeedSelectedDataForm } from "@/components/admin/admin-actions";
import { Badge } from "@/components/ui/badge";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { requireRole } from "@/lib/auth";
import { cohortSeedCatalog, cohortSeedGroupLabels } from "@/lib/cohort-bootstrap";
import { getConfigHealth } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";

export default async function AdminExportPage() {
  await requireRole("admin");
  const health = getConfigHealth();
  const supabase = await createClient();
  const { data: cohorts } = await supabase.from("cohorts").select("id, name").order("created_at", { ascending: true });

  return (
    <div className="space-y-6">
      <section className="rounded-[2rem] border border-white/70 bg-white/70 p-6 shadow-sm backdrop-blur md:p-8">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-muted-foreground">Backups and diagnostics</p>
        <h1 className="font-display text-4xl font-semibold tracking-tight md:text-5xl">Keep the data portable.</h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">
          Export all operational tables to JSON and check redacted environment health without exposing secret values.
        </p>
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Legacy workbook restore</CardTitle>
            <CardDescription>Import a workbook into a chosen cohort and decide whether to replace or append operational data.</CardDescription>
          </CardHeader>
          <ImportWorkbookForm cohorts={cohorts ?? []} />
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>JSON export</CardTitle>
            <CardDescription>Admin-only export across all operational datasets.</CardDescription>
          </CardHeader>
          <ExportDataForm />
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Environment health</CardTitle>
            <CardDescription>Shows presence only. It never prints secrets or JWT values.</CardDescription>
          </CardHeader>
          <div className="space-y-3">
            {Object.entries(health).map(([key, value]) => (
              <div key={key} className="flex items-center justify-between rounded-2xl bg-muted px-4 py-3">
                <span className="text-sm font-medium">{key}</span>
                <Badge tone={value ? "green" : "red"}>{String(value)}</Badge>
              </div>
            ))}
          </div>
        </Card>
      </section>

      <section>
        <Card>
          <CardHeader>
            <CardTitle>Selective seed data</CardTitle>
            <CardDescription>
              Choose a cohort and add only the default options, templates, workflow rules, or plan weeks you want. Existing rows are skipped.
            </CardDescription>
          </CardHeader>
          <SeedSelectedDataForm
            cohorts={cohorts ?? []}
            seedCatalog={cohortSeedCatalog}
            groupLabels={cohortSeedGroupLabels}
          />
        </Card>
      </section>

      <section>
        <Card className="border-rose-200">
          <CardHeader>
            <CardTitle className="text-rose-700">Danger zone — start fresh</CardTitle>
            <CardDescription>
              Wipe all cohorts, participants, and operational data to hand a clean app to new users. Export a backup above first.
            </CardDescription>
          </CardHeader>
          <NukeAllDataForm />
        </Card>
      </section>
    </div>
  );
}
