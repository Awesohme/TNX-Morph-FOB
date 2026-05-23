import { ImportWorkbookForm, ResetTestDataForm } from "@/components/admin/admin-actions";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { requireRole } from "@/lib/auth";

export default async function AdminImportPage() {
  await requireRole("admin");

  return (
    <div className="space-y-6">
      <section className="rounded-[2rem] border border-white/70 bg-white/70 p-6 shadow-sm backdrop-blur md:p-8">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-muted-foreground">Admin tools</p>
        <h1 className="font-display text-4xl font-semibold tracking-tight md:text-5xl">Import and reset safely.</h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">
          Workbook import clears existing cohort operational rows before seeding fresh data, then writes an audit log. Use the exact confirmation phrase so accidental clicks stay harmless.
        </p>
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Workbook import</CardTitle>
            <CardDescription>
              Upload the workbook, or leave the picker empty to use the current local Morph workbook path.
            </CardDescription>
          </CardHeader>
          <ImportWorkbookForm />
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Reset test data</CardTitle>
            <CardDescription>
              Deletes rows marked as test data only. Production workbook imports are not removed by this tool.
            </CardDescription>
          </CardHeader>
          <ResetTestDataForm />
        </Card>
      </section>
    </div>
  );
}
