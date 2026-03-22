import { AchievementsHubSection } from "@/components/sections";
import { SiteShell } from "@/components/site-shell";
import { resolveCurrentSession } from "@/server/auth/current-user";
import { loadDashboardOverview } from "@/server/services/platform-overview";

export const dynamic = "force-dynamic";

export default async function AchievementsPage() {
  const session = await resolveCurrentSession();
  const data = await loadDashboardOverview(session?.user ?? null);
  const unlockedCount = data.achievements.filter((achievement) => achievement.unlocked).length;
  const nextAchievement = data.achievements
    .filter((achievement) => !achievement.unlocked)
    .sort((left, right) => right.progress - left.progress)[0];

  return (
    <SiteShell eyebrow="Achievement hall" currentUser={session?.user ?? null}>
      <section className="page-hero page-hero--profile">
        <div className="panel panel--hero panel--hero-compact">
          <p className="eyebrow">Prestige surface</p>
          <h2>Turn progression into something players can admire, chase, and show off.</h2>
          <p className="lede">
            This page pulls achievements out of supporting panels and gives them a dedicated destination,
            anchored to streaks, referral pull, and premium identity.
          </p>
        </div>
        <div className="panel panel--stack page-aside">
          <div className="metric-card">
            <span>Unlocked badges</span>
            <strong>{unlockedCount}</strong>
            <small>Earned badges now have a standalone prestige surface.</small>
          </div>
          <div className="metric-card">
            <span>Closest next unlock</span>
            <strong>{nextAchievement ? nextAchievement.name : "All unlocked"}</strong>
            <small>{nextAchievement ? `${Math.round(nextAchievement.progress * 100)}% complete` : "Nothing left to chase in the current set."}</small>
          </div>
        </div>
      </section>
      <AchievementsHubSection data={data} />
    </SiteShell>
  );
}
