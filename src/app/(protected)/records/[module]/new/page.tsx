import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { createRecordStateAction } from "@/lib/actions/records";
import { createClient } from "@/lib/supabase/server";
import { cohortWeekLabels } from "@/lib/cohort-weeks";
import { getModuleByParam, toSerializableModuleConfig } from "@/lib/workflow";
import { getParticipantDisplayName } from "@/lib/participants";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button-variants";
import { Card } from "@/components/ui/card";
import { RecordForm } from "@/components/workflow/record-form";

export default async function NewRecordPage({
  params,
  searchParams,
}: {
  params: Promise<{ module: string }>;
  searchParams: Promise<{ cohort?: string }>;
}) {
  const { module } = await params;
  const { cohort: requestedCohortId } = await searchParams;
  const moduleConfig = getModuleByParam(module);
  const serializableModuleConfig = toSerializableModuleConfig(moduleConfig);
  const supabase = await createClient();
  const { data: cohorts, error } = await supabase.from("cohorts").select("id, name, status, week_count").order("created_at", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  const cohort = cohorts?.find((item) => item.id === requestedCohortId) ?? cohorts?.find((item) => item.status === "active") ?? cohorts?.[0];
  if (!cohort) {
    return (
      <div className="space-y-6">
        <section className="overflow-hidden rounded-[2rem] border border-white/70 bg-white/70 p-6 shadow-sm backdrop-blur md:p-8">
          <Link href={moduleConfig.route} className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground transition hover:text-slate-950">
            <ArrowLeft className="size-4" />
            Back to {moduleConfig.title}
          </Link>
          <div className="mt-5">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-muted-foreground">Create record</p>
            <h1 className="font-display text-4xl font-semibold tracking-tight md:text-5xl">New {moduleConfig.singularTitle}</h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">
              Add the first cohort before creating records so every record has a cohort workspace.
            </p>
          </div>
        </section>

        <Card className="space-y-4">
          <div>
            <h2 className="text-lg font-semibold text-slate-950">No cohorts yet</h2>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              A cohort is required before adding participants, activities, community reports, or other operational records.
            </p>
          </div>
          <Link href="/cohorts" className={buttonVariants()}>
            Create first cohort
          </Link>
        </Card>
      </div>
    );
  }

  // Participants for the CM report multiselect (silent/stuck students).
  let participantsForForm: Array<{ id: string; name: string }> = [];
  if (moduleConfig.key === "community") {
    const { data: parts } = await supabase
      .from("participants")
      .select("id, first_name, last_name, full_name")
      .eq("cohort_id", cohort.id)
      .order("full_name", { ascending: true });
    participantsForForm = (parts ?? []).map((p) => ({ id: p.id, name: getParticipantDisplayName(p) }));
  }

  let fieldOptions: Record<string, Array<{ value: string; label: string }>> = {};
  if (moduleConfig.key === "sessions") {
    const [{ data: planRows }, { data: profiles }] = await Promise.all([
      supabase
        .from("cohort_plan_items")
        .select("week_label, sort_order")
        .eq("cohort_id", cohort.id)
        .order("sort_order", { ascending: true }),
      supabase
        .from("profiles")
        .select("id, full_name, email")
        .eq("is_active", true)
        .order("full_name", { ascending: true }),
    ]);
    fieldOptions = {
      week: cohortWeekLabels(planRows, cohort.week_count).map((label) => ({ value: label, label })),
      support_assigned_id: [
        { value: "", label: "Unassigned" },
        ...(profiles ?? []).map((profile) => ({
          value: profile.id,
          label: profile.full_name || profile.email || "Unknown user",
        })),
      ],
    };
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
        <RecordForm
          moduleConfig={serializableModuleConfig}
          stateAction={createRecordStateAction}
          cohortId={cohort.id}
          submitLabel={`Create ${moduleConfig.singularTitle}`}
          participants={participantsForForm}
          fieldOptions={fieldOptions}
        />
      </Card>
    </div>
  );
}
