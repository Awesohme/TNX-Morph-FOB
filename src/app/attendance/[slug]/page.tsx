import Image from "next/image";
import { createAdminClient } from "@/lib/supabase/admin";
import { AttendanceForm } from "@/components/attendance/attendance-form";
import { isAttendanceOpen } from "@/lib/attendance-config";
import { getParticipantDisplayName } from "@/lib/participants";
import { resolvePublicCohort } from "@/lib/public-cohorts";

export const dynamic = "force-dynamic";

export default async function PublicAttendancePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const supabase = createAdminClient();

  const cohort = await resolvePublicCohort<{
    id: string;
    slug: string;
    name: string;
    attendance_open: boolean;
    attendance_opens_at: string | null;
    attendance_closes_at: string | null;
    attendance_week: string | null;
  }>(
    supabase,
    slug,
    "id, slug, name, attendance_open, attendance_opens_at, attendance_closes_at, attendance_week",
  );
  const open = isAttendanceOpen(cohort);
  const activeWeek = String(cohort?.attendance_week ?? "").trim();
  const sessionTopic = cohort && activeWeek
    ? await (async () => {
        const [{ data: planItem }, { data: sessionRow }] = await Promise.all([
          supabase
            .from("cohort_plan_items")
            .select("live_session_focus, theme")
            .eq("cohort_id", cohort.id)
            .eq("week_label", activeWeek)
            .maybeSingle(),
          supabase
            .from("session_readiness")
            .select("topic")
            .eq("cohort_id", cohort.id)
            .eq("week", activeWeek)
            .limit(1)
            .maybeSingle(),
        ]);

        return String(planItem?.live_session_focus || planItem?.theme || sessionRow?.topic || "").trim() || null;
      })()
    : null;

  const participants = cohort
    ? (
        await supabase
          .from("participants")
          .select("id, first_name, last_name, full_name")
          .eq("cohort_id", cohort.id)
          .order("full_name", { ascending: true })
      ).data ?? []
    : [];

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#fbfbfd] px-5 pb-20">
      <div className="relative -mx-5 bg-[#070614] px-5 pb-24 pt-12 text-center sm:pb-28 sm:pt-16">
        <Image src="/tnx-logo.png" alt="TNX Solve" width={148} height={28} className="mx-auto h-7 w-auto" priority />
        <p className="mt-9 text-[12px] font-medium uppercase tracking-[0.32em] text-[#04A0FF]">Morph by TNX</p>
        <h1 className="mt-3 text-[2.4rem] font-semibold leading-[1.05] tracking-tight text-white sm:text-[2.7rem]">
          Attendance
        </h1>
      </div>

      <div className="relative mx-auto -mt-16 max-w-xl">
        {!cohort ? (
          <CenteredCard title="Link not found" body="Please check the link your team shared with you." />
        ) : !open ? (
          <CenteredCard
            title="Attendance is closed"
            body={`Attendance for ${cohort.name} isn't open right now. Please check with your community manager for the sign-in window.`}
          />
        ) : !activeWeek ? (
          <CenteredCard
            title="No class open right now"
            body="There's no class accepting attendance at the moment. Please check back when your session starts."
          />
        ) : (
          <AttendanceForm
            cohortSlug={cohort.slug}
            cohortName={cohort.name}
            participants={participants.map((p) => ({
              id: p.id,
              name: getParticipantDisplayName(p),
            }))}
            activeWeek={activeWeek}
            sessionTopic={sessionTopic}
          />
        )}
      </div>
    </main>
  );
}

function CenteredCard({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-[28px] border border-slate-200/70 bg-white p-10 text-center shadow-[0_1px_40px_-12px_rgba(15,23,42,0.12)]">
      <h2 className="text-xl font-semibold tracking-tight text-slate-900">{title}</h2>
      <p className="mx-auto mt-3 max-w-sm text-[15px] leading-7 text-slate-500">{body}</p>
    </div>
  );
}
