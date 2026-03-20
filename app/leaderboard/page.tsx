import { LeaderboardSection } from "@/components/sections";
import { SiteShell } from "@/components/site-shell";
import { getCampaignLaneVisualProfile, getCampaignSourceProfile } from "@/lib/campaign-source";
import { resolveCurrentSession } from "@/server/auth/current-user";
import { loadDashboardOverview } from "@/server/services/platform-overview";

export const dynamic = "force-dynamic";

export default async function LeaderboardPage() {
  const session = await resolveCurrentSession();
  const data = await loadDashboardOverview(session?.user ?? null);
  const campaignProfile = getCampaignSourceProfile(data.economy.campaignPreset.source);
  const laneVisualProfile = getCampaignLaneVisualProfile(
    data.user.campaignSource ?? data.economy.campaignPreset.source,
    data.economy.campaignPreset.source,
    data.user.campaignSource,
  );
  const topEntry = data.leaderboard[0];
  const topReferralEntry = data.referralLeaderboard[0];
  const campaignPreset = data.economy.campaignPreset;
  const activeMissionPack = data.campaignPacks[0] ?? null;

  return (
    <SiteShell eyebrow="Competitive pressure" currentUser={session?.user ?? null}>
      <section className="page-hero page-hero--leaderboard">
        <div className={`panel panel--hero panel--hero-compact ${laneVisualProfile.themeClass}`}>
          <p className="eyebrow">{campaignProfile.label}</p>
          <h2>{campaignProfile.title}</h2>
          <p className="lede">
            {campaignProfile.description}
          </p>
          <div className="lane-chip-row">
            {laneVisualProfile.chips.map((chip) => (
              <span key={chip} className="badge">
                {chip}
              </span>
            ))}
          </div>
          <p className="form-note">{laneVisualProfile.emphasis}</p>
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
          <div className="metric-card">
            <span>Premium delta</span>
            <strong>
              {data.economy.xpMultipliers.monthly.toFixed(2)}x / {data.economy.xpMultipliers.annual.toFixed(2)}x
            </strong>
            <small>
              Monthly and annual tiers accelerate both XP accumulation and token yield on the active economy program.
            </small>
          </div>
          <div className="metric-card">
            <span>Campaign lane</span>
            <strong>{campaignProfile.accent}</strong>
            <small>
              {data.user.campaignSource
                ? data.user.campaignSource === campaignPreset.source
                  ? `${campaignPreset.source} entrants should see that lane’s campaign quests near the top of the board.`
                  : `${data.user.campaignSource} traffic is currently attributed upstream, but the live competitive and quest pressure is being routed through the ${campaignPreset.source} bridge lane.`
                : "Direct entrants see the default Starter and Daily Momentum pressure first."}
            </small>
          </div>
          <div className="metric-card">
            <span>Lane reward preset</span>
            <strong>
              +{(campaignPreset.questXpBoost * 100).toFixed(0)}% XP / +{(campaignPreset.tokenYieldBoost * 100).toFixed(0)}% yield
            </strong>
            <small>
              Active lane {campaignPreset.source}, attribution {campaignPreset.attributionSource}, weekly shaping {campaignPreset.weeklyTargetOffset} XP, premium pressure {campaignPreset.premiumUpsellMultiplier.toFixed(2)}x, featured tracks {campaignPreset.featuredTracks.join(", ")}.
            </small>
          </div>
          {activeMissionPack ? (
            <div className="metric-card">
              <span>Live mission carryover</span>
              <strong>{activeMissionPack.label}</strong>
              <small>
                {activeMissionPack.leaderboardCallout} Next move: {activeMissionPack.ctaLabel.toLowerCase()}.
              </small>
            </div>
          ) : null}
        </div>
      </section>
      <section className="grid">
        <section className="panel panel--glass">
          <div className="panel__header">
            <div>
              <p className="eyebrow">Reward ladder</p>
              <h3>Why climbing the board matters in an XP-first economy</h3>
            </div>
          </div>
          <div className="economy-stack">
            <article className="economy-step-card economy-step-card--core">
              <div className="quest-card__meta">
                <span className="economy-badge economy-badge--core">XP core</span>
                <span>{data.user.totalXp.toLocaleString()} XP</span>
              </div>
              <strong>The leaderboard is a progression ladder first.</strong>
              <p>Rank, streaks, weekly output, and premium pressure all reinforce the XP engine before rewards settle anywhere else.</p>
            </article>
            <article className="economy-step-card economy-step-card--rail">
              <div className="quest-card__meta">
                <span className="economy-badge economy-badge--rail">Reward rail</span>
                <span>{data.user.tokenProgram.asset}</span>
              </div>
              <strong>Tokens stay downstream from performance.</strong>
              <p>Eligibility, partner assets, and payout workflow turn that XP momentum into configurable redemption and direct-reward outcomes.</p>
            </article>
          </div>
          <div className="reward-ladder">
            <article className="reward-ladder__card">
              <span>1. Weekly XP</span>
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
              <span>2. Eligibility bank</span>
              <strong>{data.user.tokenProgram.eligibilityPoints} pts</strong>
              <small>{data.user.tokenProgram.status === "redeemable" ? "Redemption is unlocked." : data.user.tokenProgram.nextStep}</small>
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
              <span>3. Premium lift</span>
              <strong>
                {data.economy.xpMultipliers.monthly.toFixed(2)}x / {data.economy.xpMultipliers.annual.toFixed(2)}x XP
              </strong>
              <small>
                Token yield also scales to {data.economy.tokenMultipliers.monthly.toFixed(2)}x /{" "}
                {data.economy.tokenMultipliers.annual.toFixed(2)}x.
              </small>
            </article>
            <article className="reward-ladder__card">
              <span>4. Reward rail upside</span>
              <strong>+{data.user.referral.rewardPreview.monthlyPremiumReferral.xp} XP / +{data.user.referral.rewardPreview.annualPremiumReferral.xp} XP</strong>
              <small>
                Annual conversions also project{" "}
                {data.user.referral.rewardPreview.annualPremiumReferral.directTokenReward
                  ? `${data.user.referral.rewardPreview.annualPremiumReferral.directTokenReward.amount} ${data.user.referral.rewardPreview.annualPremiumReferral.directTokenReward.asset}`
                  : "direct token upside"}
                .
              </small>
            </article>
          </div>
          <div className="reward-visual-grid">
            <article className="reward-visual-card">
              <span>Configured reward rail</span>
              <strong>
                {data.user.tokenProgram.projectedRedemptionAmount} {data.user.tokenProgram.asset}
              </strong>
              <small>
                XP drives position, eligibility points drive redemption readiness, and the configured rail determines how rewards settle.
              </small>
            </article>
            <article className="reward-visual-card">
              <span>Rail settlement</span>
              <strong>
                {data.user.tokenProgram.claimedBalance} claimed / {data.user.tokenProgram.settledBalance} settled
              </strong>
              <div className="reward-state-bars">
                <div>
                  <span>Claimed</span>
                  <div className="reward-state-bars__track">
                    <div
                      className="reward-state-bars__fill"
                      style={{
                        width: `${Math.min(
                          (data.user.tokenProgram.claimedBalance /
                            Math.max(data.user.tokenProgram.claimedBalance + data.user.tokenProgram.settledBalance, 1)) *
                            100,
                          100,
                        )}%`,
                      }}
                    />
                  </div>
                </div>
                <div>
                  <span>Settled</span>
                  <div className="reward-state-bars__track">
                    <div
                      className="reward-state-bars__fill reward-state-bars__fill--gold"
                      style={{
                        width: `${Math.min(
                          (data.user.tokenProgram.settledBalance /
                            Math.max(data.user.tokenProgram.claimedBalance + data.user.tokenProgram.settledBalance, 1)) *
                            100,
                          100,
                        )}%`,
                      }}
                    />
                  </div>
                </div>
              </div>
              <small>Claimed means reserved. Settled means payout completed.</small>
            </article>
          </div>
          <p className="form-note">
            Leaderboard pressure is only one layer. The stronger loop is weekly XP, referral quality, and xPortal-linked reward readiness, with tokens acting as configurable payout rails rather than the main progression currency.
          </p>
          {activeMissionPack ? (
            <article className="achievement-card achievement-card--progress">
              <div>
                <strong>{activeMissionPack.label} is your live competitive mission</strong>
                <p>{activeMissionPack.tierPhaseCopy}</p>
                <p>{activeMissionPack.leaderboardCallout}</p>
              </div>
              <div className="achievement-card__side">
                <span>{activeMissionPack.completedQuestCount}/{activeMissionPack.totalQuestCount} complete</span>
                <a className="text-link" href={activeMissionPack.ctaHref ?? "/dashboard#campaign-mission"}>
                  {activeMissionPack.ctaLabel}
                </a>
              </div>
            </article>
          ) : null}
        </section>
      </section>
      <LeaderboardSection data={data} />
    </SiteShell>
  );
}
