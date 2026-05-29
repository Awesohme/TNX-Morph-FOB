import { NextRequest, NextResponse } from "next/server";
import { getServerEnv } from "@/lib/env";
import { dispatchDueReminders } from "@/lib/reminders";
import { generateScheduledTasks } from "@/lib/scheduled-tasks";
import { runGoogleSheetSync } from "@/lib/sync";

function isAuthorized(request: NextRequest) {
  const env = getServerEnv();
  const headerSecret = request.headers.get("x-reminder-secret");
  const authHeader = request.headers.get("authorization");
  const bearer = authHeader?.startsWith("Bearer ") ? authHeader.slice("Bearer ".length) : "";
  return Boolean(env.reminderCronSecret) && (headerSecret === env.reminderCronSecret || bearer === env.reminderCronSecret);
}

export async function POST(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ ok: false, message: "Unauthorized" }, { status: 401 });
  }
  const scheduled = await generateScheduledTasks();
  const result = await dispatchDueReminders();
  const syncResult = await runGoogleSheetSync();
  if (!result.configured) {
    return NextResponse.json(
      {
        ok: false,
        message: "Push notifications are not configured.",
        scheduledCreated: scheduled.created,
        scheduledSkipped: scheduled.skipped,
        syncConfigured: syncResult.configured,
        syncRuns: syncResult.runs,
      },
      { status: 400 },
    );
  }
  return NextResponse.json({
    ok: true,
    sent: result.sent,
    failed: result.failed,
    skipped: result.skipped,
    scheduledCreated: scheduled.created,
    scheduledSkipped: scheduled.skipped,
    syncConfigured: syncResult.configured,
    syncRuns: syncResult.runs,
  });
}
