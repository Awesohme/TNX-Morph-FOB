import Link from "next/link";
import { LIST_PAGE_SIZE, listPageHref } from "@/lib/list-pagination";

export function ListPagination({ route, params, page, total }: { route: string; params: URLSearchParams; page: number; total: number }) {
  const pages = Math.max(1, Math.ceil(total / LIST_PAGE_SIZE));
  return (
    <nav aria-label="Record pages" className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 px-5 py-4 text-sm">
      <p>{total ? (page - 1) * LIST_PAGE_SIZE + 1 : 0}–{Math.min(page * LIST_PAGE_SIZE, total)} of {total} records · Page {page} of {pages}</p>
      <div className="flex gap-4">
        {page > 1 ? <Link href={listPageHref(route, params, page - 1)}>Previous</Link> : <span aria-disabled="true" className="text-slate-400">Previous</span>}
        {page < pages ? <Link href={listPageHref(route, params, page + 1)}>Next</Link> : <span aria-disabled="true" className="text-slate-400">Next</span>}
      </div>
    </nav>
  );
}
