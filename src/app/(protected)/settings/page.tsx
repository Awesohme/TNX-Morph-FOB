import { Badge } from "@/components/ui/badge";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/server";

export default async function SettingsPage() {
  const supabase = await createClient();
  const [{ data: options }, { data: rules }, { data: templates }] = await Promise.all([
    supabase.from("config_options").select("category, label, value, is_active").eq("is_active", true).order("category").order("sort_order"),
    supabase.from("workflow_rules").select("module_key, trigger_event, field_name, comparator, expected_value, output_action, task_title, is_active").eq("is_active", true),
    supabase.from("message_templates").select("module_key, title, channel, is_active").eq("is_active", true),
  ]);

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
          Manage option lists, workflow automations, and internal message templates used across the cohort operations system.
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
            <p className="text-sm text-muted-foreground">Workflow rules</p>
            <p className="mt-2 text-4xl font-semibold tracking-tight">{rules?.length ?? 0}</p>
          </div>
        </Card>
        <Card>
          <div>
            <p className="text-sm text-muted-foreground">Message templates</p>
            <p className="mt-2 text-4xl font-semibold tracking-tight">{templates?.length ?? 0}</p>
          </div>
        </Card>
      </section>

      <section className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="space-y-4">
          <h2 className="font-display text-2xl font-semibold">Option libraries</h2>
          <div className="grid gap-4 md:grid-cols-2">
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
          </div>
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Workflow rules</CardTitle>
              <CardDescription>Rules generate internal follow-up tasks and timeline events.</CardDescription>
            </CardHeader>
            <div className="space-y-3">
              {(rules ?? []).map((rule) => (
                <div key={`${rule.module_key}-${rule.task_title}`} className="rounded-[1.25rem] border border-slate-200 bg-slate-50/70 p-4 text-sm">
                  <p className="font-medium text-slate-900">{rule.task_title}</p>
                  <p className="mt-1 text-muted-foreground">
                    {rule.module_key} • {rule.trigger_event} • {rule.field_name || "any field"} {rule.comparator} {rule.expected_value || "value"}
                  </p>
                </div>
              ))}
              {!rules?.length ? <p className="text-sm text-muted-foreground">Run the workflow migration to load default rules.</p> : null}
            </div>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Message templates</CardTitle>
              <CardDescription>Reusable note blocks for internal follow-up and coordination.</CardDescription>
            </CardHeader>
            <div className="space-y-3">
              {(templates ?? []).map((template) => (
                <div key={`${template.module_key}-${template.title}`} className="rounded-[1.25rem] border border-slate-200 bg-slate-50/70 p-4 text-sm">
                  <p className="font-medium text-slate-900">{template.title}</p>
                  <p className="mt-1 text-muted-foreground">
                    {template.module_key} • {template.channel}
                  </p>
                </div>
              ))}
              {!templates?.length ? <p className="text-sm text-muted-foreground">Run the workflow migration to load default templates.</p> : null}
            </div>
          </Card>
        </div>
      </section>
    </div>
  );
}
