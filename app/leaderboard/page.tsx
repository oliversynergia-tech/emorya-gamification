import { redirect } from "next/navigation";

import { MissionLink } from "@/components/mission-link";
import { LeaderboardSection } from "@/components/sections";
import { SiteShell } from "@/components/site-shell";
import { Tooltip } from "@/components/tooltip";
import { emptyStates } from "@/lib/empty-state-content";
import { tooltips } from "@/lib/tooltip-content";
import { resolveCurrentSession } from "@/server/auth/current-user";
import { loadDashboardOverview } from "@/server/services/platform-overview";

export const dynamic = "force-dynamic";

export default async function LeaderboardPage() {
  const session = await resolveCurrentSession();

  if (!session) {
    redirect("/auth");
  }

  const data = await loadDashboardOverview(session.user);
  const topEntry = data.leaderboard[0];
  const topReferralEntry = data.referralLeaderboard[0];
  const activeMissionPack = data.campaignPacks[0] ?? null;
  const weeklyProgressRemaining = data.user.weeklyProgress.nextThreshold
    ? Math.max(data.user.weeklyProgress.nextThreshold - data.user.weeklyProgress.xp, 0)
    : 0;

  return (
    <SiteShell eyebrow="Leaderboard" currentUser={session.user}>
      <section className="page-hero page-hero--leaderboard">
        <div className="panel panel--hero panel--hero-compact">
          <p className="eyebrow">Leaderboard</p>
          <h1>See how your progress stacks up this week.</h1>
          <p className="lede">Climb by completing quests, staying active, and bringing the right people into Emorya.</p>
          <div className="lane-chip-row">
            {["Complete quests", "Keep your streak alive", "Invite friends"].map((chip) => (
              <span key={chip} className="badge">
                {chip}
              </span>
            ))}
          </div>
          <p className="form-note">Every quest, streak, and referral can help move you up the board.</p>
          <p className="form-note">
            <a className="text-link" href="/leaderboard/public">
              Public view
            </a>
          </p>
        </div>
        <div className="panel panel--stack page-aside">
          <div className="metric-card">
            <span className="label-with-tooltip">
              <span>Current leader</span>
              <Tooltip text={tooltips.leaderboardAllTime} />
            </span>
            <strong>{topEntry ? topEntry.displayName : "No leader yet"}</strong>
            <small>{topEntry ? `${topEntry.xp.toLocaleString()} XP on the board.` : "Live rankings appear once users exist."}</small>
          </div>
          <div className="metric-card">
            <span className="label-with-tooltip">
              <span>Your current rank</span>
              <Tooltip text={tooltips.leaderboardRank} />
            </span>
            <strong>{data.user.rank > 0 ? `#${data.user.rank}` : emptyStates.leaderboardNotRanked.title}</strong>
            <small>
              {data.user.rank > 0
                ? "Climb by completing quests, keeping your streak alive, and inviting others in."
                : emptyStates.leaderboardNotRanked.message}
            </small>
          </div>
          <div className="metric-card">
            <span className="label-with-tooltip">
              <span>Top referrer</span>
              <Tooltip text={tooltips.leaderboardReferral} />
            </span>
            <strong>{topReferralEntry ? topReferralEntry.displayName : "No referral leader yet"}</strong>
            <small>{topReferralEntry ? `${topReferralEntry.xp.toLocaleString()} referrals on the invite board.` : "Referral standings appear once invite activity starts moving."}</small>
          </div>
          <div className="metric-card">
            <span className="label-with-tooltip">
              <span>Next rank push</span>
              <Tooltip text={tooltips.weeklyXp} />
            </span>
            <strong>{weeklyProgressRemaining > 0 ? `${weeklyProgressRemaining} XP to the next band` : "Next band reached"}</strong>
            <small>
              Keep quests, streaks, and referrals moving to gain ground quickly.
            </small>
          </div>
          {activeMissionPack ? (
            <div className="metric-card">
              <span>Current quest path</span>
              <strong>{activeMissionPack.label}</strong>
              <small>{activeMissionPack.leaderboardCallout}</small>
            </div>
          ) : null}
        </div>
      </section>
      <section className="grid">
        <section className="panel panel--glass">
          <div className="panel__header">
            <div>
              <p className="eyebrow">How it moves</p>
              <h2>What actually helps you climb</h2>
            </div>
          </div>
          <div className="economy-stack">
            <article className="economy-step-card economy-step-card--core">
              <div className="quest-card__meta">
                <span className="economy-badge economy-badge--core">XP core</span>
                <span>{data.user.totalXp.toLocaleString()} XP</span>
              </div>
              <strong>The leaderboard reflects real progress first.</strong>
              <p>Your rank moves with the quests you finish, the streaks you keep, and the progress you build over time.</p>
            </article>
            <article className="economy-step-card economy-step-card--rail">
              <div className="quest-card__meta">
                <span className="economy-badge economy-badge--rail">Rewards</span>
                <span>Coming soon</span>
              </div>
              <strong>Progress comes first. Rewards follow later.</strong>
              <p>For launch, XP is the main reward. Future reward options can expand after the progress loop is proven.</p>
            </article>
          </div>
          <div className="reward-ladder">
            <article className="reward-ladder__card">
              <span>1. Weekly progress</span>
              <strong>{data.user.weeklyProgress.xp} XP</strong>
              <small>{data.user.weeklyProgress.tierLabel} is the current output band.</small>
              <div className="reward-ladder__meter">
                <div
                  className="reward-ladder__fill"
                  style={{ width: `${Math.min(data.user.weeklyProgress.progress * 100, 100)}%` }}
                />
              </div>
            </article>
            <article className="reward-ladder__card">
              <span>2. Reward progress</span>
              <strong>{data.user.tokenProgram.eligibilityPoints} pts</strong>
              <small>{data.user.tokenProgram.status === "redeemable" ? "Future rewards are being prepared." : data.user.tokenProgram.nextStep}</small>
              <div className="reward-ladder__meter">
                <div
                  className="reward-ladder__fill reward-ladder__fill--gold"
                  style={{
                    width: `${Math.min(
                      (data.user.tokenProgram.eligibilityPoints /
                        Math.max(data.user.tokenProgram.nextRedemptionPoints ?? data.user.tokenProgram.minimumPoints, 1)) *
                        100,
                      100,
                    )}%`,
                  }}
                />
              </div>
            </article>
            <article className="reward-ladder__card">
              <span>3. Premium boost</span>
              <strong>
                {data.economy.xpMultipliers.monthly.toFixed(2)}x / {data.economy.xpMultipliers.annual.toFixed(2)}x XP
              </strong>
              <small>
                Premium keeps the launch focus on faster XP progress.
              </small>
            </article>
            <article className="reward-ladder__card">
              <span>4. Referral upside</span>
              <strong>+{data.user.referral.rewardPreview.monthlyPremiumReferral.xp} XP / +{data.user.referral.rewardPreview.annualPremiumReferral.xp} XP</strong>
              <small>
                Stronger referrals also create more XP upside as invited users keep progressing.
              </small>
            </article>
          </div>
          <div className="reward-visual-grid">
            <article className="reward-visual-card">
              <span>Reward progress</span>
              <strong>
                Coming soon
              </strong>
              <small>
                XP moves your position, and your rewards grow as you keep going.
              </small>
            </article>
            <article className="reward-visual-card">
              <span>Reward status</span>
              <strong>
                XP-first launch
              </strong>
              <div className="reward-state-bars">
                <div>
                  <span>Prepared</span>
                  <div className="reward-state-bars__track">
                    <div
                      className="reward-state-bars__fill"
                      style={{
                        width: `${Math.min(
                          data.user.starterPath.progress * 100,
                          100,
                        )}%`,
                      }}
                    />
                  </div>
                </div>
                <div>
                  <span>Future</span>
                  <div className="reward-state-bars__track">
                    <div
                      className="reward-state-bars__fill reward-state-bars__fill--gold"
                      style={{
                        width: `${Math.min(
                          data.user.rewardEligibility.eligible ? 100 : 0,
                          100,
                        )}%`,
                      }}
                    />
                  </div>
                </div>
              </div>
              <small>XP is live now. Token redemption remains disabled for launch.</small>
            </article>
          </div>
          <p className="form-note">
            The biggest jumps usually come from consistent weekly progress, strong referrals, and steady follow-through.
          </p>
          {activeMissionPack ? (
            <article className="achievement-card achievement-card--progress">
              <div>
                <strong>{activeMissionPack.label} is one of the biggest movers right now</strong>
                <p>{activeMissionPack.tierPhaseCopy}</p>
                <p>{activeMissionPack.leaderboardCallout}</p>
              </div>
              <div className="achievement-card__side">
                <span>{activeMissionPack.completedQuestCount}/{activeMissionPack.totalQuestCount} complete</span>
                <MissionLink
                  className="text-link"
                  href={activeMissionPack.ctaHref ?? "/dashboard#campaign-mission"}
                  packId={activeMissionPack.packId}
                  eventType="leaderboard_mission_cta"
                  ctaLabel={activeMissionPack.ctaLabel}
                  ctaVariant={activeMissionPack.ctaVariant}
                  missionView="active"
                >
                  {activeMissionPack.ctaLabel}
                </MissionLink>
              </div>
            </article>
          ) : null}
        </section>
      </section>
      <LeaderboardSection data={data} />
    </SiteShell>
  );
}
