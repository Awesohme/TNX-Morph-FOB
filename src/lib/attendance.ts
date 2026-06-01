export function normalizeAttendanceWeekLabel(value: unknown) {
  const raw = String(value ?? "").trim().replace(/\s+/g, " ");
  const match = raw.match(/^week\s*(\d+)$/i);
  if (match) return `Week ${match[1]}`;
  if (raw.toLowerCase() === "demo day") return "Demo Day";
  return raw;
}
