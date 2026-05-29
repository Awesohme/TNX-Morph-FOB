/* eslint-disable @next/next/no-img-element */
export function PageLoading() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-5">
      <div className="relative grid place-items-center">
        <span className="absolute size-16 animate-ping rounded-full bg-[#04A0FF]/15" />
        <span className="absolute size-12 animate-[spin_1.2s_linear_infinite] rounded-full border-2 border-slate-200 border-t-[#0067FF]" />
        <img src="/tnx-logo.png" alt="TNX" className="relative h-5 w-auto animate-pulse" />
      </div>
      <p className="text-sm font-medium text-slate-400">Loading…</p>
    </div>
  );
}
