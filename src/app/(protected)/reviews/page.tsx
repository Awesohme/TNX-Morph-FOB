import { redirect } from "next/navigation";

// "Reviews" was renamed to "Activities". Preserve old links/bookmarks by redirecting,
// carrying any query string (cohort/week/view) through to the new route.
export default async function ReviewsRedirect({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const qs = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (typeof value === "string") qs.set(key, value);
    else if (Array.isArray(value) && value[0]) qs.set(key, value[0]);
  }
  const query = qs.toString();
  redirect(query ? `/activities?${query}` : "/activities");
}
