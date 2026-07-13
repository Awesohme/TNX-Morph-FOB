import { AppShell } from "@/components/app-shell";
import { PwaBootstrap } from "@/components/pwa-bootstrap";
import { PwaInstallPrompt } from "@/components/pwa-install-prompt";
import { requireUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function ProtectedLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const user = await requireUser();
  return (
    <>
      <PwaBootstrap />
      <PwaInstallPrompt />
      <AppShell user={user}>{children}</AppShell>
    </>
  );
}
