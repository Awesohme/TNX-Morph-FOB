/* eslint-disable @next/next/no-img-element */
export function PageLoading() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <img src="/tnx-logo.png" alt="TNX" className="h-6 w-auto animate-pulse" />
    </div>
  );
}
