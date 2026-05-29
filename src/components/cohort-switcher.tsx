import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export function CohortSwitcher({
  cohorts,
  activeCohortId,
  basePath,
}: {
  cohorts: Array<{ id: string; name: string }>;
  activeCohortId?: string | null;
  basePath: string;
}) {
  if (!cohorts.length) return null;

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Badge tone="blue">Cohort</Badge>
      {cohorts.map((cohort) => {
        const active = cohort.id === activeCohortId;
        return (
          <Link
            key={cohort.id}
            href={`${basePath}?cohort=${cohort.id}`}
            className={cn(
              "inline-flex items-center rounded-xl border px-3 py-1.5 text-xs font-medium transition",
              active ? "border-slate-900 bg-slate-900 text-white" : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50 hover:text-slate-950",
            )}
          >
            {cohort.name}
          </Link>
        );
      })}
    </div>
  );
}
