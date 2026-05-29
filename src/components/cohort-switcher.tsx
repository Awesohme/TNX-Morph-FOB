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
      <Badge tone="blue">Cohort scope</Badge>
      {cohorts.map((cohort) => {
        const active = cohort.id === activeCohortId;
        return (
          <Link
            key={cohort.id}
            href={`${basePath}?cohort=${cohort.id}`}
            className={cn(
              "inline-flex items-center rounded-full border px-3 py-1.5 text-xs font-semibold transition",
              active ? "border-slate-950 bg-slate-950 text-white" : "border-slate-200 bg-white text-slate-600 hover:border-slate-400 hover:text-slate-950",
            )}
          >
            {cohort.name}
          </Link>
        );
      })}
    </div>
  );
}
