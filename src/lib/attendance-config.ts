export type AttendanceState = { ok: boolean; message: string; action?: "signed_in" | "signed_out" };
export const initialAttendanceState: AttendanceState = { ok: false, message: "" };
