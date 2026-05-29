export function PageLoading() {
  return (
    <div className="min-h-screen bg-transparent">
      <div className="fixed inset-x-0 top-0 z-[100] h-0.5 overflow-hidden bg-transparent">
        <div className="h-full w-1/3 animate-[page-loader_1.1s_ease-in-out_infinite] rounded-full bg-slate-950" />
      </div>
      <div className="px-4 py-6 lg:px-8 lg:py-8">
        <div className="app-panel h-24 animate-pulse bg-slate-100/80" />
      </div>
    </div>
  );
}
