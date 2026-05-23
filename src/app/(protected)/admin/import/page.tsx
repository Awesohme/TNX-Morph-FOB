import { ImportWorkbookForm, ResetTestDataForm } from "@/components/admin/admin-actions";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { requireRole } from "@/lib/auth";

export default async function AdminImportPage() {
  await requireRole("admin");

  return (
    <div className="space-y-6">
      <section className="rounded-[2rem] border border-white/70 bg-white/70 p-6 shadow-sm backdrop-blur md:p-8">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-muted-foreground">Admin tools</p>
        <h1 className="font-display text-4xl font-semibold tracking-tight md:text-5xl">Import and reset data</h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">
          Workbook import replaces current cohort operational data and writes an audit log. Reset removes rows marked as test data only.
        </p>
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Workbook import</CardTitle>
            <CardDescription>
              Upload the workbook file and paste the confirmation text exactly as shown below.
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
