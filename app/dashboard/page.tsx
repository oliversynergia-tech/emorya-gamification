import { DashboardSnapshot, PremiumFunnelSection, QuestBoardSection } from "@/components/sections";
import { SiteShell } from "@/components/site-shell";
import { QuestActionsPanel } from "@/components/quest-actions-panel";
import { resolveCurrentSession } from "@/server/auth/current-user";
import { loadDashboardOverview } from "@/server/services/platform-overview";

export default async function DashboardPage() {
  const session = await resolveCurrentSession();
  const data = await loadDashboardOverview(session?.user ?? null);

  return (
    <SiteShell eyebrow="Daily loop" currentUser={session?.user ?? null}>
      <DashboardSnapshot data={data} />
      <QuestBoardSection data={data} />
      <QuestActionsPanel quests={data.quests} isAuthenticated={Boolean(session)} />
      <PremiumFunnelSection data={data} />
    </SiteShell>
  );
}
