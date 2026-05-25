import { ImportWorkbookForm, ResetTestDataForm } from "@/components/admin/admin-actions";
import { TemplateImportManager } from "@/components/admin/template-import-manager";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { requireRole } from "@/lib/auth";
import { getImportDatasetSummaries } from "@/lib/import-config";
import { createClient } from "@/lib/supabase/server";

export default async function AdminImportPage() {
  await requireRole("admin");
  const supabase = await createClient();
  const { data: cohorts } = await supabase.from("cohorts").select("id, name, status").order("created_at", { ascending: true });
  const datasets = getImportDatasetSummaries();

  return (
    <div className="space-y-6">
      <section className="rounded-[2rem] border border-white/70 bg-white/70 p-6 shadow-sm backdrop-blur md:p-8">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-muted-foreground">Admin tools</p>
        <h1 className="font-display text-4xl font-semibold tracking-tight md:text-5xl">Import and reset data</h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">
          Bulk import operational datasets with templates and validation. The workbook remains available only as a legacy migration path.
        </p>
      </section>

      <TemplateImportManager datasets={datasets} cohorts={cohorts ?? []} />

      <section className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Legacy workbook migration</CardTitle>
            <CardDescription>
              Use this only to migrate the old control sheet. For ongoing operations, use the dataset import templates above.
            </CardDescription>
          </CardHeader>
          <ImportWorkbookForm />
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Reset test data</CardTitle>
            <CardDescription>
              Deletes rows marked as test data only. Imported operational data remains unchanged.
            </CardDescription>
          </CardHeader>
          <ResetTestDataForm />
        </Card>
      </section>
    </div>
  );
}
