import { Badge } from "@/components/ui/badge";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/server";

export default async function SettingsPage() {
  const supabase = await createClient();
  const { data: options } = await supabase
    .from("config_options")
    .select("category, label, value, is_active")
    .eq("is_active", true)
    .order("category")
    .order("sort_order");

  const grouped = (options ?? []).reduce<Record<string, Array<{ label: string; value: string }>>>((acc, option) => {
    const key = String(option.category);
    acc[key] = acc[key] ?? [];
    acc[key].push({ label: String(option.label), value: String(option.value) });
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      <section className="rounded-[2rem] border border-white/70 bg-white/70 p-6 shadow-sm backdrop-blur md:p-8">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-muted-foreground">System configuration</p>
        <h1 className="font-display text-4xl font-semibold tracking-tight md:text-5xl">Operations settings</h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">
          Manage the labels and status libraries used across records, queues, and dashboards. Internal automation is being kept out of the main UI until manual workflows are fully stable.
        </p>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <Card>
          <div>
            <p className="text-sm text-muted-foreground">Active option groups</p>
            <p className="mt-2 text-4xl font-semibold tracking-tight">{Object.keys(grouped).length}</p>
          </div>
        </Card>
        <Card>
          <div>
            <p className="text-sm text-muted-foreground">Manual workflow mode</p>
            <p className="mt-2 text-4xl font-semibold tracking-tight">On</p>
          </div>
        </Card>
        <Card>
          <div>
            <p className="text-sm text-muted-foreground">Automation surfaces</p>
            <p className="mt-2 text-4xl font-semibold tracking-tight">Hidden</p>
          </div>
        </Card>
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        {Object.entries(grouped).map(([category, values]) => (
          <Card key={category}>
            <CardHeader>
              <CardTitle>{category.replaceAll("_", " ")}</CardTitle>
              <CardDescription>{values.length} active options</CardDescription>
            </CardHeader>
            <div className="flex flex-wrap gap-2">
              {values.map((option) => (
                <Badge key={`${category}-${option.value}`} tone="blue">
                  {option.label}
                </Badge>
              ))}
            </div>
          </Card>
        ))}
        {!Object.keys(grouped).length ? (
          <Card>
            <CardHeader>
              <CardTitle>No configuration loaded</CardTitle>
              <CardDescription>Run the base migration and import the workbook to seed configuration values.</CardDescription>
            </CardHeader>
          </Card>
        ) : null}
      </section>
    </div>
  );
}
