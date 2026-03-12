import { DashboardSnapshot, PremiumFunnelSection, QuestBoardSection } from "@/components/sections";
import { SiteShell } from "@/components/site-shell";

export default function DashboardPage() {
  return (
    <SiteShell eyebrow="Daily loop">
      <DashboardSnapshot />
      <QuestBoardSection />
      <PremiumFunnelSection />
    </SiteShell>
  );
}
