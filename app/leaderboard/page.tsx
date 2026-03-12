import { LeaderboardSection } from "@/components/sections";
import { SiteShell } from "@/components/site-shell";

export default function LeaderboardPage() {
  return (
    <SiteShell eyebrow="Competitive pressure">
      <LeaderboardSection />
    </SiteShell>
  );
}
