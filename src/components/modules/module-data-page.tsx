import { AlertCircle, Database, Plus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { QuickUpdate } from "@/components/modules/quick-update";
import { createClient } from "@/lib/supabase/server";
import { humanizeColumn, modules, type ModuleKey } from "@/lib/modules";

function toneFor(value: unknown) {
  const text = String(value ?? "").toLowerCase();
  if (text.includes("red") || text.includes("blocked") || text.includes("needs")) return "red";
  if (text.includes("amber") || text.includes("progress") || text.includes("review")) return "amber";
  if (text.includes("green") || text.includes("done") || text.includes("completed") || text.includes("closed")) return "green";
  return "neutral";
}

function formatValue(value: unknown) {
  if (value === null || value === undefined || value === "") return "—";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (typeof value === "number") {
    if (value > 0 && value <= 1) return `${Math.round(value * 100)}%`;
    return value.toLocaleString();
  }
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

export async function ModuleDataPage({ moduleKey }: { moduleKey: ModuleKey }) {
  const moduleConfig = modules.find((item) => item.key === moduleKey);
  if (!moduleConfig) throw new Error(`Unknown module: ${moduleKey}`);

  const supabase = await createClient();
  const { data, error } = await supabase
    .from(moduleConfig.table)
    .select("*")
    .order("created_at", { ascending: true })
    .limit(100);

  const rows = (data ?? []) as Array<Record<string, unknown> & { id: string }>;
  const Icon = moduleConfig.icon;

  return (
    <div className="space-y-6">
      <section className="overflow-hidden rounded-[2rem] border border-white/70 bg-white/70 shadow-sm backdrop-blur">
        <div className={`h-2 bg-gradient-to-r ${moduleConfig.accent}`} />
        <div className="flex flex-col gap-5 p-5 md:flex-row md:items-end md:justify-between md:p-7">
          <div className="flex gap-4">
            <div className={`grid size-14 shrink-0 place-items-center rounded-3xl bg-gradient-to-br ${moduleConfig.accent} text-white shadow-sm`}>
              <Icon className="size-6" />
            </div>
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-muted-foreground">Workbook module</p>
              <h1 className="font-display text-3xl font-semibold tracking-tight md:text-5xl">{moduleConfig.title}</h1>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">{moduleConfig.description}</p>
            </div>
          </div>
          <Button variant="secondary">
            <Plus className="size-4" />
            Add record
          </Button>
        </div>
      </section>

      {error ? (
        <Card className="border-rose-200 bg-rose-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-rose-700">
              <AlertCircle className="size-5" />
              Could not load module
            </CardTitle>
            <CardDescription>{error.message}</CardDescription>
          </CardHeader>
        </Card>
      ) : null}

      <Card className="overflow-hidden p-0">
        <div className="flex items-center justify-between border-b bg-white/70 px-5 py-4">
          <div>
            <h2 className="font-display text-xl font-semibold">Live records</h2>
            <p className="text-sm text-muted-foreground">{rows.length} rows loaded from Supabase</p>
          </div>
          <Badge tone="blue">
            <Database className="mr-1 size-3" />
            {moduleConfig.table}
          </Badge>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                {moduleConfig.columns.map((column) => (
                  <th key={column} className="px-5 py-3 font-semibold">
                    {humanizeColumn(column)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y">
              {rows.map((row) => (
                <tr key={row.id} className="bg-white/55 align-top transition hover:bg-white">
                  {moduleConfig.columns.map((column) => (
                    <td key={column} className="max-w-[22rem] px-5 py-4">
                      {["risk", "mvp_status", "demo_status", "review_status", "status", "priority"].includes(column) ? (
                        <QuickUpdate table={moduleConfig.table} id={row.id} field={column} value={row[column]} returnTo={moduleConfig.route} />
                      ) : ["risk", "status", "review_status", "priority"].includes(column) ? (
                        <Badge tone={toneFor(row[column])}>{formatValue(row[column])}</Badge>
                      ) : (
                        <span className="line-clamp-3 text-slate-700">{formatValue(row[column])}</span>
                      )}
                    </td>
                  ))}
                </tr>
              ))}
              {!rows.length ? (
                <tr>
                  <td colSpan={moduleConfig.columns.length} className="px-5 py-12 text-center text-muted-foreground">
                    No records yet. Use Admin Import to seed this module from the workbook.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
