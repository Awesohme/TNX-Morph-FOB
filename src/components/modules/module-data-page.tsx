import Link from "next/link";
import { AlertCircle, ArrowUpRight, Database, Plus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CohortSwitcher } from "@/components/cohort-switcher";
import { ModuleRecordsTable } from "@/components/workflow/module-records-table";
import { getScopedCohort } from "@/lib/cohorts";
import { createClient } from "@/lib/supabase/server";
import { modules, type ModuleKey } from "@/lib/modules";
import { formatFieldValue, toSerializableModuleConfig } from "@/lib/workflow";
import { cn } from "@/lib/utils";

export async function ModuleDataPage({
  moduleKey,
  requestedCohortId,
}: {
  moduleKey: ModuleKey;
  requestedCohortId?: string | null;
}) {
  const moduleConfig = modules.find((item) => item.key === moduleKey);
  if (!moduleConfig) throw new Error(`Unknown module: ${moduleKey}`);

  const { cohorts, cohortId } = await getScopedCohort(requestedCohortId);
  const supabase = await createClient();
  const query = supabase.from(moduleConfig.table).select("*").order("created_at", { ascending: true }).limit(100);
  const { data, error } = cohortId ? await query.eq("cohort_id", cohortId) : await query;

  const rows = (data ?? []) as Array<Record<string, unknown> & { id: string }>;
  const Icon = moduleConfig.icon;
  const serializableModuleConfig = toSerializableModuleConfig(moduleConfig);
  const queueCards = moduleConfig.queueViews.map((queueView) => {
    const count = rows.filter((row) => String(row[queueView.field] ?? "") === String(queueView.value)).length;
    return { ...queueView, count };
  });

  return (
    <div className="space-y-6">
      <section className="app-panel overflow-hidden">
        <div className="flex flex-col gap-5 p-5 md:flex-row md:items-end md:justify-between md:p-6">
          <div className="flex gap-4">
            <div className="grid size-12 shrink-0 place-items-center rounded-2xl bg-slate-100 text-slate-700">
              <Icon className="size-5" />
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">Operations workspace</p>
              <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">{moduleConfig.title}</h1>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">
                {moduleConfig.description} Create records, assign ownership, manage follow-ups, and audit activity from the same workspace.
              </p>
              <div className="mt-4">
                <CohortSwitcher cohorts={cohorts.map((cohort) => ({ id: cohort.id, name: cohort.name }))} activeCohortId={cohortId} basePath={moduleConfig.route} />
              </div>
            </div>
          </div>
          <Link href={cohortId ? `/records/${moduleConfig.key}/new?cohort=${cohortId}` : `/records/${moduleConfig.key}/new`} className={cn(buttonVariants({ variant: "default" }))}>
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
              <p className="mt-2 text-3xl font-semibold tracking-tight">{rows.length}</p>
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
                <p className="mt-2 text-3xl font-semibold tracking-tight">{queueCard.count}</p>
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
        <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50/70 px-5 py-4">
          <div>
            <h2 className="text-xl font-semibold">Operational records</h2>
            <p className="text-sm text-muted-foreground">Select records for bulk changes or open a record to manage tasks, notes, and history.</p>
          </div>
          <Badge tone="blue">
            <Database className="mr-1 size-3" />
            {moduleConfig.table}
          </Badge>
        </div>
        {rows.length ? (
          <ModuleRecordsTable moduleConfig={serializableModuleConfig} rows={rows} activeCohortId={cohortId} />
        ) : (
          <div className="px-5 py-12 text-center text-muted-foreground">
            No records yet. Use Admin Import to load a dataset template or create the first record manually.
          </div>
        )}
      </Card>
    </div>
  );
}
