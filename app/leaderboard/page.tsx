import { MissionLink } from "@/components/mission-link";
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
    <SiteShell eyebrow="Leaderboard" currentUser={session?.user ?? null}>
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
            <span>Current campaign</span>
            <strong>{campaignProfile.accent}</strong>
            <small>
              {data.user.campaignSource
                ? data.user.campaignSource === campaignPreset.source
                  ? `${campaignPreset.source} users should see that campaign's strongest quests near the top of the board.`
                  : `${data.user.campaignSource} is still credited as the source, while the live competitive flow is currently being guided through ${campaignPreset.source}.`
                : "Direct users see the default activation and momentum journey first."}
            </small>
          </div>
          <div className="metric-card">
            <span>Campaign reward effect</span>
            <strong>
              +{(campaignPreset.questXpBoost * 100).toFixed(0)}% XP / +{(campaignPreset.tokenYieldBoost * 100).toFixed(0)}% yield
            </strong>
            <small>
              Active campaign {campaignPreset.source}, source credit {campaignPreset.attributionSource}, weekly shift {campaignPreset.weeklyTargetOffset} XP, premium pressure {campaignPreset.premiumUpsellMultiplier.toFixed(2)}x, featured tracks {campaignPreset.featuredTracks.join(", ")}.
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
              <p className="eyebrow">Why it matters</p>
              <h3>How leaderboard position connects to progress and rewards</h3>
            </div>
          </div>
          <div className="economy-stack">
            <article className="economy-step-card economy-step-card--core">
              <div className="quest-card__meta">
                <span className="economy-badge economy-badge--core">XP core</span>
                <span>{data.user.totalXp.toLocaleString()} XP</span>
              </div>
              <strong>The leaderboard reflects real progress first.</strong>
              <p>Rank, streaks, weekly output, and premium momentum all build on top of the same core XP system.</p>
            </article>
            <article className="economy-step-card economy-step-card--rail">
              <div className="quest-card__meta">
                <span className="economy-badge economy-badge--rail">Reward layer</span>
                <span>{data.user.tokenProgram.asset}</span>
              </div>
              <strong>Rewards come after progress has been earned.</strong>
              <p>Eligibility, partner assets, and payout flow turn that XP momentum into real redemption and direct-reward outcomes.</p>
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
              <span>2. Reward readiness</span>
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
              <span>4. Reward upside</span>
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
              <span>Reward preview</span>
              <strong>
                {data.user.tokenProgram.projectedRedemptionAmount} {data.user.tokenProgram.asset}
              </strong>
              <small>
                XP drives position, eligibility points drive reward readiness, and the active program determines how rewards settle.
              </small>
            </article>
            <article className="reward-visual-card">
              <span>Reward settlement</span>
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
            Leaderboard pressure is only one part of the story. The stronger loop is weekly XP, referral quality, and wallet-linked reward progress, with tokens acting as payouts rather than the main progression currency.
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
