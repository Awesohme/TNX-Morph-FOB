import { ExportDataForm } from "@/components/admin/admin-actions";
import { Badge } from "@/components/ui/badge";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { requireRole } from "@/lib/auth";
import { getConfigHealth } from "@/lib/env";

export default async function AdminExportPage() {
  await requireRole("admin");
  const health = getConfigHealth();

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
    </div>
  );
}
