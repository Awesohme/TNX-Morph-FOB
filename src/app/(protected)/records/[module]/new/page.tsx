import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { createRecordAction } from "@/lib/actions/records";
import { createClient } from "@/lib/supabase/server";
import { getModuleByParam, toSerializableModuleConfig } from "@/lib/workflow";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { RecordForm } from "@/components/workflow/record-form";

export default async function NewRecordPage({
  params,
}: {
  params: Promise<{ module: string }>;
}) {
  const { module } = await params;
  const moduleConfig = getModuleByParam(module);
  const serializableModuleConfig = toSerializableModuleConfig(moduleConfig);
  const supabase = await createClient();
  const { data: cohorts, error } = await supabase.from("cohorts").select("id, name, status").order("created_at", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  const cohort = cohorts?.find((item) => item.status === "active") ?? cohorts?.[0];
  if (!cohort) {
    throw new Error("Create a cohort before adding records.");
  }

  return (
    <div className="space-y-6">
      <section className="overflow-hidden rounded-[2rem] border border-white/70 bg-white/70 p-6 shadow-sm backdrop-blur md:p-8">
        <Link href={moduleConfig.route} className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground transition hover:text-slate-950">
          <ArrowLeft className="size-4" />
          Back to {moduleConfig.title}
        </Link>
        <div className="mt-5 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-muted-foreground">Create record</p>
            <h1 className="font-display text-4xl font-semibold tracking-tight md:text-5xl">New {moduleConfig.singularTitle}</h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">
              Add a new {moduleConfig.singularTitle.toLowerCase()} to the operational system, then manage follow-up tasks and notes from its detail page.
            </p>
          </div>
          <Badge tone="blue">{cohort.name}</Badge>
        </div>
      </section>

      <Card>
        <RecordForm moduleConfig={serializableModuleConfig} action={createRecordAction} cohortId={cohort.id} submitLabel={`Create ${moduleConfig.singularTitle}`} />
      </Card>
    </div>
  );
}
