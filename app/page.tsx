import { DashboardSnapshot, HeroSection, LeaderboardSection, PremiumFunnelSection, ProfileSection, QuestBoardSection } from "@/components/sections";
import { SiteShell } from "@/components/site-shell";

export default function HomePage() {
  return (
    <SiteShell eyebrow="Fresh scaffold from the Emorya build brief">
      <HeroSection />
      <DashboardSnapshot />
      <PremiumFunnelSection />
      <QuestBoardSection />
      <LeaderboardSection />
      <ProfileSection />
    </SiteShell>
  );
}
