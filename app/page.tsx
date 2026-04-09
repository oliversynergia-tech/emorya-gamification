import { HeroSection, QuestBoardSection } from "@/components/sections";
import { SiteShell } from "@/components/site-shell";
import { resolveCurrentSession } from "@/server/auth/current-user";
import { loadDashboardOverview } from "@/server/services/platform-overview";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const session = await resolveCurrentSession();
  const data = await loadDashboardOverview(session?.user ?? null);

  return (
    <SiteShell currentUser={session?.user ?? null}>
      <HeroSection data={data} />
      <QuestBoardSection data={data} />
    </SiteShell>
  );
}
