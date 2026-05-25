import Link from "next/link";
import { AlertCircle, ArrowUpRight, Database, Plus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ModuleRecordsTable } from "@/components/workflow/module-records-table";
import { createClient } from "@/lib/supabase/server";
import { modules, type ModuleKey } from "@/lib/modules";
import { formatFieldValue, toSerializableModuleConfig } from "@/lib/workflow";
import { cn } from "@/lib/utils";

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
  const serializableModuleConfig = toSerializableModuleConfig(moduleConfig);
  const queueCards = moduleConfig.queueViews.map((queueView) => {
    const count = rows.filter((row) => String(row[queueView.field] ?? "") === String(queueView.value)).length;
    return { ...queueView, count };
  });

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
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-muted-foreground">Operations workspace</p>
              <h1 className="font-display text-3xl font-semibold tracking-tight md:text-5xl">{moduleConfig.title}</h1>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">
                {moduleConfig.description} Create records, assign ownership, manage follow-ups, and audit activity from the same workspace.
              </p>
            </div>
          </div>
          <Link href={`/records/${moduleConfig.key}/new`} className={cn(buttonVariants({ variant: "secondary" }))}>
            <Plus className="size-4" />
            New {moduleConfig.singularTitle.toLowerCase()}
          </Link>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <Card>
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Records in workspace</p>
              <p className="mt-2 text-4xl font-semibold tracking-tight">{rows.length}</p>
            </div>
            <Badge tone="blue">
              <Database className="mr-1 size-3" />
              {moduleConfig.table}
            </Badge>
          </div>
        </Card>
        {queueCards.slice(0, 2).map((queueCard) => (
          <Card key={queueCard.key}>
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm text-muted-foreground">{queueCard.label}</p>
                <p className="mt-2 text-4xl font-semibold tracking-tight">{queueCard.count}</p>
                <p className="mt-2 text-xs text-muted-foreground">
                  Current records where {queueCard.field.replaceAll("_", " ")} = {formatFieldValue(queueCard.value)}
                </p>
              </div>
              <ArrowUpRight className="mt-1 size-4 text-muted-foreground" />
            </div>
          </Card>
        ))}
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
            <h2 className="font-display text-xl font-semibold">Operational records</h2>
            <p className="text-sm text-muted-foreground">Select records for bulk changes or open a record to manage tasks, notes, and history.</p>
          </div>
          <Badge tone="blue">
            <Database className="mr-1 size-3" />
            {moduleConfig.table}
          </Badge>
        </div>
        {rows.length ? (
          <ModuleRecordsTable moduleConfig={serializableModuleConfig} rows={rows} />
        ) : (
          <div className="px-5 py-12 text-center text-muted-foreground">
            No records yet. Use Admin Import to load a dataset template or create the first record manually.
          </div>
        )}
      </Card>
    </div>
  );
}
