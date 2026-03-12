import { LeaderboardSection } from "@/components/sections";
import { SiteShell } from "@/components/site-shell";
import { resolveCurrentSession } from "@/server/auth/current-user";
import { loadDashboardOverview } from "@/server/services/platform-overview";

export default async function LeaderboardPage() {
  const session = await resolveCurrentSession();
  const data = await loadDashboardOverview(session?.user ?? null);

  return (
    <SiteShell eyebrow="Competitive pressure" currentUser={session?.user ?? null}>
      <LeaderboardSection data={data} />
    </SiteShell>
  );
}
