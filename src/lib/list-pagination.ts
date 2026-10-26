/** Keep each database response bounded while scanning lightweight summary/filter columns. */
export async function scanListRows<T>(load: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: { message: string } | null }>) {
  const rows: T[] = [];
  const batchSize = 500;
  for (let from = 0; ; from += batchSize) {
    const { data, error } = await load(from, from + batchSize - 1);
    if (error) return { data: [] as T[], error };
    rows.push(...(data ?? []));
    if (!data || data.length < batchSize) return { data: rows, error: null };
  }
}

export const LIST_PAGE_SIZE = 50;

/** Invalid and out-of-range pages are rejected by callers instead of hiding records. */
export function parseListPage(value: string | undefined) {
  if (value === undefined) return 1;
  if (!/^[1-9]\d*$/.test(value)) return null;
  const page = Number(value);
  return Number.isSafeInteger(page) ? page : null;
}

export function listPageHref(route: string, params: URLSearchParams, page: number) {
  const next = new URLSearchParams(params);
  next.set("page", String(page));
  return `${route}?${next.toString()}`;
}
