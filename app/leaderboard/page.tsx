import { LeaderboardSection } from "@/components/sections";
import { SiteShell } from "@/components/site-shell";
import { resolveCurrentSession } from "@/server/auth/current-user";
import { loadDashboardOverview } from "@/server/services/platform-overview";

export const dynamic = "force-dynamic";

export default async function LeaderboardPage() {
  const session = await resolveCurrentSession();
  const data = await loadDashboardOverview(session?.user ?? null);
  const topEntry = data.leaderboard[0];
  const topReferralEntry = data.referralLeaderboard[0];

  return (
    <SiteShell eyebrow="Competitive pressure" currentUser={session?.user ?? null}>
      <section className="page-hero page-hero--leaderboard">
        <div className="panel panel--hero panel--hero-compact">
          <p className="eyebrow">Live ranking</p>
          <h2>The board now reflects real user XP, not seeded placeholders.</h2>
          <p className="lede">
            All-time positions are derived from live totals, while snapshot history is used for movement and pressure.
            This page should feel more like a campaign arena than a static table.
          </p>
        </div>
        <div className="panel panel--stack page-aside">
          <div className="metric-card">
            <span>Current leader</span>
            <strong>{topEntry ? topEntry.displayName : "No leader yet"}</strong>
            <small>{topEntry ? `${topEntry.xp.toLocaleString()} XP on the board.` : "Live rankings appear once users exist."}</small>
          </div>
          <div className="metric-card">
            <span>Your current rank</span>
            <strong>#{data.user.rank}</strong>
            <small>Climb through verified quests, streaks, and referral rewards.</small>
          </div>
          <div className="metric-card">
            <span>Referral campaign lead</span>
            <strong>{topReferralEntry ? topReferralEntry.displayName : "No referral leader yet"}</strong>
            <small>{topReferralEntry ? `${topReferralEntry.xp.toLocaleString()} referral XP on the invite board.` : "Referral standings appear once invite rewards start moving."}</small>
          </div>
          <div className="metric-card">
            <span>Reward preview</span>
            <strong>{data.user.tokenProgram.projectedRedemptionAmount} {data.user.tokenProgram.asset}</strong>
            <small>
              {data.user.tokenProgram.status === "redeemable"
                ? "Projected redemption unlocked from current eligibility points."
                : `${Math.max((data.user.tokenProgram.nextRedemptionPoints ?? data.user.tokenProgram.minimumPoints) - data.user.tokenProgram.eligibilityPoints, 0)} more points to your next redemption step.`}
            </small>
          </div>
        </div>
      </section>
      <section className="grid">
        <section className="panel panel--glass">
          <div className="panel__header">
            <div>
              <p className="eyebrow">Reward ladder</p>
              <h3>Why climbing the board matters</h3>
            </div>
          </div>
          <div className="info-grid">
            <div className="info-card">
              <span>Weekly tier</span>
              <strong>{data.user.weeklyProgress.tierLabel}</strong>
            </div>
            <div className="info-card">
              <span>Eligibility points</span>
              <strong>{data.user.tokenProgram.eligibilityPoints}</strong>
            </div>
            <div className="info-card">
              <span>Monthly referral upside</span>
              <strong>+{data.user.referral.rewardPreview.monthlyPremiumReferral.xp} XP</strong>
            </div>
            <div className="info-card">
              <span>Annual referral upside</span>
              <strong>{data.user.referral.rewardPreview.annualPremiumReferral.directTokenReward?.amount} {data.user.referral.rewardPreview.annualPremiumReferral.directTokenReward?.asset}</strong>
            </div>
          </div>
          <p className="form-note">
            Leaderboard pressure is only one layer. The stronger loop is weekly XP, referral quality, and token-redemption readiness through the xPortal-linked reward path.
          </p>
        </section>
      </section>
      <LeaderboardSection data={data} />
    </SiteShell>
  );
}
