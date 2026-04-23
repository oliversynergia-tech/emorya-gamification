import { redirect } from "next/navigation";

import { DashboardExperience } from "@/components/dashboard-experience";
import { SiteShell } from "@/components/site-shell";
import { resolveCurrentSession } from "@/server/auth/current-user";
import { loadDashboardOverview } from "@/server/services/platform-overview";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const session = await resolveCurrentSession();

  if (!session) {
    redirect("/auth");
  }

  const data = await loadDashboardOverview(session.user);

  return (
    <SiteShell eyebrow="Daily loop" currentUser={session.user}>
      <DashboardExperience
        initialData={data}
        isAuthenticated
        walletAddresses={session.walletAddresses}
      />
    </SiteShell>
  );
}
