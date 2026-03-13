import { DashboardExperience } from "@/components/dashboard-experience";
import { SiteShell } from "@/components/site-shell";
import { resolveCurrentSession } from "@/server/auth/current-user";
import { loadDashboardOverview } from "@/server/services/platform-overview";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const session = await resolveCurrentSession();
  const data = await loadDashboardOverview(session?.user ?? null);

  return (
    <SiteShell eyebrow="Daily loop" currentUser={session?.user ?? null}>
      <DashboardExperience initialData={data} isAuthenticated={Boolean(session)} />
    </SiteShell>
  );
}
