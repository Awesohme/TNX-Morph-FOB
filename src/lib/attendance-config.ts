export type AttendanceState = { ok: boolean; message: string; action?: "signed_in" | "signed_out" };
export const initialAttendanceState: AttendanceState = { ok: false, message: "" };

export type AttendanceWindow = {
  attendance_open?: boolean | null;
  attendance_opens_at?: string | null;
  attendance_closes_at?: string | null;
};

/**
 * Attendance is open when the master toggle is on AND now is within any set window bounds.
 * Unset opens_at/closes_at mean that side of the window is unbounded.
 */
export function isAttendanceOpen(cohort: AttendanceWindow | null | undefined, now: Date = new Date()): boolean {
  if (!cohort?.attendance_open) return false;
  const ms = now.getTime();
  if (cohort.attendance_opens_at && ms < new Date(cohort.attendance_opens_at).getTime()) return false;
  if (cohort.attendance_closes_at && ms > new Date(cohort.attendance_closes_at).getTime()) return false;
  return true;
}
