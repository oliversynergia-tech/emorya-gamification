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
    <SiteShell eyebrow="Achievements" currentUser={session?.user ?? null}>
      <section className="page-hero page-hero--profile">
        <div className="panel panel--hero panel--hero-compact">
          <p className="eyebrow">Achievements</p>
          <h2>Celebrate the milestones that prove your progress is real.</h2>
          <p className="lede">
            This is where streaks, referrals, activation wins, and bigger milestones turn into visible proof that
            your journey is moving forward.
          </p>
        </div>
        <div className="panel panel--stack page-aside">
          <div className="metric-card">
            <span>Unlocked badges</span>
            <strong>{unlockedCount}</strong>
            <small>Your completed milestones now live together in one place.</small>
          </div>
          <div className="metric-card">
            <span>Closest next unlock</span>
            <strong>{nextAchievement ? nextAchievement.name : "All unlocked"}</strong>
            <small>{nextAchievement ? `${Math.round(nextAchievement.progress * 100)}% complete` : "You have cleared everything in the current set."}</small>
          </div>
        </div>
      </section>
      <AchievementsHubSection data={data} />
    </SiteShell>
  );
}
