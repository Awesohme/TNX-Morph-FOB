const DATETIME_LOCAL_RE = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/;

export function toLocalDatetimeInput(value: string | null | undefined) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function datetimeLocalToIso(value: string | null | undefined, timezoneOffsetMinutes: string | number | null | undefined) {
  if (!value) return null;
  const match = value.match(DATETIME_LOCAL_RE);
  if (!match) return null;
  const [, year, month, day, hour, minute] = match;
  const offset = Number(timezoneOffsetMinutes ?? 0);
  const utcMs = Date.UTC(Number(year), Number(month) - 1, Number(day), Number(hour), Number(minute)) + offset * 60_000;
  const date = new Date(utcMs);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}
