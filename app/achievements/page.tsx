import { redirect } from "next/navigation";

import { OnboardingHint } from "@/components/onboarding-hint";
import { AchievementsHubSection } from "@/components/sections";
import { SiteShell } from "@/components/site-shell";
import { onboardingHints, onboardingHintWindowMs } from "@/lib/onboarding-hints";
import { resolveCurrentSession } from "@/server/auth/current-user";
import { loadDashboardOverview } from "@/server/services/platform-overview";

export const dynamic = "force-dynamic";

export default async function AchievementsPage() {
  const session = await resolveCurrentSession();

  if (!session) {
    redirect("/auth");
  }

  const data = await loadDashboardOverview(session.user);
  const unlockedCount = data.achievements.filter((achievement) => achievement.unlocked).length;
  const nextAchievement = data.achievements
    .filter((achievement) => !achievement.unlocked)
    .sort((left, right) => right.progress - left.progress)[0];
  const isNewUser =
    Number.isFinite(Date.parse(data.user.createdAt)) &&
    Date.parse(data.user.createdAt) > Date.now() - onboardingHintWindowMs;

  return (
    <SiteShell eyebrow="Achievements" currentUser={session.user}>
      <OnboardingHint
        hintKey={onboardingHints.achievements.hintKey}
        title={onboardingHints.achievements.title}
        body={onboardingHints.achievements.body}
        isNewUser={isNewUser}
        userId={data.user.userId}
      />
      <section className="page-hero page-hero--achievements">
        <div className="panel panel--hero panel--hero-compact page-hero__single">
          <p className="eyebrow">Achievements</p>
          <h1>Celebrate the milestones that prove your progress is real.</h1>
          <p className="lede">
            This is where streaks, referrals, activation wins, and bigger milestones show up as visible progress.
          </p>
          <div className="info-grid">
            <div className="info-card">
              <span>Unlocked badges</span>
              <strong>{unlockedCount}</strong>
            </div>
            <div className="info-card">
              <span>Closest next unlock</span>
              <strong>{nextAchievement ? nextAchievement.name : "All unlocked"}</strong>
              <small>{nextAchievement ? `${Math.round(nextAchievement.progress * 100)}% complete` : "You have cleared everything in the current set."}</small>
            </div>
          </div>
        </div>
      </section>
      <AchievementsHubSection data={data} />
    </SiteShell>
  );
}
