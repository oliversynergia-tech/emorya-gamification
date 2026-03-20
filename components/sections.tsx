import {
  getCampaignLaneVisualProfile,
  getCampaignPremiumJourney,
  getCampaignPremiumOffer,
  getCampaignSourceProfile,
} from "@/lib/campaign-source";
import { getTokenEffectLabel } from "@/lib/progression-rules";
import { getLevelProgress, getTierLabel } from "@/lib/progression";
import { getQuestStatusLabel, getQuestStatusNote } from "@/lib/quest-state";
import type { AdminOverviewData, DashboardData, Quest, QuestTrack, SubscriptionTier } from "@/lib/types";
import { CampaignPackAnalyticsPanel } from "@/components/campaign-pack-analytics-panel";
import { CampaignPackAlertPanel } from "@/components/campaign-pack-alert-panel";
import { CampaignPackAuditPanel } from "@/components/campaign-pack-audit-panel";
import { CampaignPackNotificationHistoryPanel } from "@/components/campaign-pack-notification-history-panel";
import { PayoutNotificationsPanel } from "@/components/payout-notifications-panel";
import { SourceLaneReportPanel } from "@/components/source-lane-report-panel";
import { TokenReceiptHistoryPanel } from "@/components/token-receipt-history-panel";

function tierClass(tier: SubscriptionTier) {
  return `tier-pill tier-pill--${tier}`;
}

function getTrackLabel(track: QuestTrack) {
  switch (track) {
    case "starter":
      return "Starter Track";
    case "daily":
      return "Daily Momentum";
    case "social":
      return "Social Growth";
    case "wallet":
      return "Wallet Track";
    case "referral":
      return "Referral Track";
    case "premium":
      return "Premium Track";
    case "ambassador":
      return "Ambassador Track";
    case "creative":
      return "Creator Track";
    case "campaign":
      return "Campaign Track";
    default:
      return "Quest Track";
  }
}

function getTrackDescription(track: QuestTrack) {
  switch (track) {
    case "starter":
      return "Low-friction onboarding wins that push identity and first momentum.";
    case "daily":
      return "Habit-forming quests designed to build streaks and weekly yield.";
    case "social":
      return "Community and distribution actions that unlock stronger growth lanes.";
    case "wallet":
      return "xPortal-linked actions that move users toward token-ready status.";
    case "referral":
      return "Team-building milestones with the strongest long-term upside.";
    case "premium":
      return "Higher-yield member quests that accelerate progression and rewards.";
    case "ambassador":
      return "High-trust creator and campaign-lead actions for top performers.";
    case "creative":
      return "Manual-review creative missions that build prestige and campaign energy.";
    case "campaign":
      return "Time-bound activations and ecosystem moments.";
    default:
      return "Progression-aligned quests grouped by the user journey.";
  }
}

function getCampaignSourceLabel(source: "direct" | "zealy" | "galxe" | "taskon") {
  switch (source) {
    case "zealy":
      return "Zealy";
    case "galxe":
      return "Galxe";
    case "taskon":
      return "TaskOn";
    default:
      return "Direct";
  }
}

function renderQuestCard(quest: Quest) {
  return (
    <article
      key={quest.id}
      className={`quest-card quest-card--board quest-card--state-${quest.status} ${quest.status === "locked" ? "quest-card--locked" : ""}`}
    >
      <div className="quest-card__meta">
        <span>{quest.category}</span>
        <span>{quest.tokenEffect && quest.tokenEffect !== "none" ? getTokenEffectLabel(quest) : `Lv ${quest.requiredLevel}+`}</span>
      </div>
      <h4>{quest.title}</h4>
      <p>{quest.description}</p>
      <small className="quest-card__note">
        {quest.status === "locked" && quest.unlockHint ? quest.unlockHint : getQuestStatusNote(quest.status)}
      </small>
      <div className="quest-card__footer">
        <span>{quest.projectedXp ?? quest.xpReward} XP</span>
        <strong>
          {quest.status === "locked"
            ? quest.requiredTier === "free"
              ? "Locked"
              : `${getTierLabel(quest.requiredTier)}`
            : getQuestStatusLabel(quest.status)}
        </strong>
      </div>
      {quest.projectedDirectTokenReward ? (
        <small>
          +{quest.projectedDirectTokenReward.amount} {quest.projectedDirectTokenReward.asset} direct reward
        </small>
      ) : null}
      {quest.timebox ? <small>{quest.timebox}</small> : null}
    </article>
  );
}

export function HeroSection({ data }: { data: DashboardData }) {
  const progress = getLevelProgress(data.user.totalXp);
  const campaignProfile = getCampaignSourceProfile(data.economy.campaignPreset.source);
  const laneVisualProfile = getCampaignLaneVisualProfile(
    data.user.campaignSource ?? data.economy.campaignPreset.source,
    data.economy.campaignPreset.source,
    data.user.campaignSource,
  );

  return (
    <section className="hero grid">
      <div className={`panel panel--hero ${laneVisualProfile.themeClass}`}>
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
        <div className="hero__actions">
          <a className="button button--primary" href="/dashboard">
            Open dashboard
          </a>
          <a className="button button--secondary" href="/admin">
            View admin panel
          </a>
        </div>
        <div className="stats-row">
          <div className="stat-card">
            <span>Primary goal</span>
            <strong>Annual Premium</strong>
          </div>
          <div className="stat-card">
            <span>User tier</span>
            <strong>{getTierLabel(data.user.tier)}</strong>
          </div>
          <div className="stat-card">
            <span>Time to next level</span>
            <strong>{progress.remainingXp} XP</strong>
          </div>
        </div>
      </div>
      <div className="panel panel--stack">
        <div className="metric-card">
          <span>Current streak</span>
          <strong>{data.user.currentStreak} days</strong>
          <small>Complete one quest today to keep it alive.</small>
        </div>
        <div className="metric-card">
          <span>XP multiplier</span>
          <strong>{data.user.xpMultiplier.toFixed(2)}x</strong>
          <small>Driven by the active XP economy settings.</small>
        </div>
        <div className="metric-card">
          <span>Prize draw</span>
          <strong>294 days</strong>
          <small>Premium subscription required for entry.</small>
        </div>
      </div>
    </section>
  );
}

export function DashboardSnapshot({
  data,
  missionView = "active",
  onMissionViewChange,
}: {
  data: DashboardData;
  missionView?: "active" | "completed" | "all";
  onMissionViewChange?: (view: "active" | "completed" | "all") => void;
}) {
  const progress = getLevelProgress(data.user.totalXp);
  const campaignProfile = getCampaignSourceProfile(data.economy.campaignPreset.source);
  const laneVisualProfile = getCampaignLaneVisualProfile(
    data.user.campaignSource ?? data.economy.campaignPreset.source,
    data.economy.campaignPreset.source,
    data.user.campaignSource,
  );
  const unlockedAchievements = data.achievements.filter((achievement) => achievement.unlocked);
  const upcomingAchievements = data.achievements
    .filter((achievement) => !achievement.unlocked)
    .sort((left, right) => right.progress - left.progress)
    .slice(0, 2);

  return (
    <section className="grid grid--dashboard">
      <div className="panel">
        <div className="panel__header">
          <div>
            <p className="eyebrow">Player state</p>
            <h3>{data.user.displayName}</h3>
          </div>
          <span className={tierClass(data.user.tier)}>{getTierLabel(data.user.tier)}</span>
        </div>
        <div className="xp-meter">
          <div className="xp-meter__meta">
            <span>Level {progress.level}</span>
            <span>{data.user.totalXp} XP</span>
          </div>
          <div className="xp-meter__track">
            <div className="xp-meter__fill" style={{ width: `${progress.progress * 100}%` }} />
          </div>
          <small>{progress.remainingXp} XP to Level {progress.level + 1}</small>
        </div>
        <div className="info-grid">
          <div className="info-card">
            <span>Rank</span>
            <strong>#{data.user.rank}</strong>
          </div>
          <div className="info-card">
            <span>Referral code</span>
            <strong>{data.user.referralCode}</strong>
          </div>
          <div className="info-card">
            <span>Invited</span>
            <strong>{data.user.referral.invitedCount}</strong>
          </div>
          <div className="info-card">
            <span>Referral XP</span>
            <strong>{data.user.referral.rewardXpEarned}</strong>
          </div>
          <div className="info-card">
            <span>Referral rank</span>
            <strong>#{data.user.referral.rank}</strong>
          </div>
          <div className="info-card">
            <span>Journey state</span>
            <strong>{data.user.journeyState.replaceAll("_", " ")}</strong>
          </div>
          <div className="info-card">
            <span>Campaign lane</span>
            <strong>{laneVisualProfile.label}</strong>
          </div>
        </div>
        <article className={`achievement-card lane-summary-card ${laneVisualProfile.themeClass}`}>
          <div>
            <strong>{laneVisualProfile.label}</strong>
            <p>{laneVisualProfile.emphasis}</p>
          </div>
          <div className="achievement-card__side">
            <span>{campaignProfile.accent}</span>
          </div>
        </article>
        <div className="panel panel--glass">
          <div className="panel__header">
            <div>
              <p className="eyebrow">Starter path</p>
              <h3>{data.user.starterPath.complete ? "Starter Path complete" : "Progress toward reward eligibility"}</h3>
            </div>
            <span className={`badge ${data.user.starterPath.complete ? "badge--pink" : ""}`}>
              {Math.round(data.user.starterPath.progress * 100)}%
            </span>
          </div>
          <div className="achievement-list">
            {data.user.starterPath.steps.map((step) => (
              <article key={step.label} className="achievement-card">
                <div>
                  <strong>{step.label}</strong>
                  <p>{step.detail}</p>
                </div>
                <span className={step.complete ? "badge badge--pink" : "badge"}>{step.complete ? "Done" : "Open"}</span>
              </article>
            ))}
          </div>
        </div>
        {data.user.campaignSource ? (
          <div className="panel panel--glass">
            <div className="panel__header">
              <div>
                <p className="eyebrow">Campaign bridge ladder</p>
                <h3>
                  {data.user.campaignSource === data.economy.campaignPreset.source
                    ? `${data.user.campaignSource} onboarding path`
                    : `${data.user.campaignSource} to ${data.economy.campaignPreset.source} bridge path`}
                </h3>
              </div>
              <span className="badge badge--pink">Source aware</span>
            </div>
            <p className="form-note">
              {data.user.campaignSource === data.economy.campaignPreset.source
                ? `This account is running the ${data.economy.campaignPreset.source} lane directly.`
                : `Attribution is preserved as ${data.user.campaignSource}, but the live onboarding flow is currently being routed through ${data.economy.campaignPreset.source}.`}
            </p>
            <div className="achievement-list">
              <article className="achievement-card">
                <div>
                  <strong>Arrival captured</strong>
                  <p>Emorya now recognizes this account as a {data.user.campaignSource} entrant.</p>
                </div>
                <span className="badge badge--pink">Done</span>
              </article>
              <article className="achievement-card">
                <div>
                  <strong>Bridge into xPortal</strong>
                  <p>Wallet linking moves this sourced user into the full token and campaign path.</p>
                </div>
                <span className={data.user.starterPath.steps.some((step) => step.label === "Connect xPortal" && step.complete) ? "badge badge--pink" : "badge"}>
                  {data.user.starterPath.steps.some((step) => step.label === "Connect xPortal" && step.complete) ? "Done" : "Next"}
                </span>
              </article>
              <article className="achievement-card">
                <div>
                  <strong>Complete Starter Path</strong>
                  <p>Turns campaign curiosity into an Emorya-native habit and referral-ready account.</p>
                </div>
                <span className={data.user.starterPath.complete ? "badge badge--pink" : "badge"}>
                  {data.user.starterPath.complete ? "Done" : "Open"}
                </span>
              </article>
              <article className="achievement-card">
                <div>
                  <strong>Reach reward eligibility</strong>
                  <p>Level 5 plus trust and wallet linkage opens the deeper campaign reward lanes.</p>
                </div>
                <span className={data.user.rewardEligibility.eligible ? "badge badge--pink" : "badge"}>
                  {data.user.rewardEligibility.eligible ? "Live" : "Pending"}
                </span>
              </article>
            </div>
          </div>
        ) : null}
        {data.campaignPacks.length > 0 ? (
          <div className="panel panel--glass">
            <div className="panel__header">
              <div>
                <p className="eyebrow">Active campaign mission</p>
                <h3>Your live pack progress</h3>
              </div>
              <span className="badge badge--pink">{data.campaignPacks.length} active</span>
            </div>
            <div className="review-actions">
              <button className={`button ${missionView === "active" ? "button--primary" : "button--secondary"}`} type="button" onClick={() => onMissionViewChange?.("active")}>
                Active packs
              </button>
              <button className={`button ${missionView === "completed" ? "button--primary" : "button--secondary"}`} type="button" onClick={() => onMissionViewChange?.("completed")}>
                Completed packs
              </button>
              <button className={`button ${missionView === "all" ? "button--primary" : "button--secondary"}`} type="button" onClick={() => onMissionViewChange?.("all")}>
                All mission views
              </button>
            </div>
            <div className="achievement-list">
              {data.campaignPacks.map((pack) => (
                <article key={pack.packId} className="achievement-card">
                  <div>
                    <strong>{pack.label}</strong>
                    <p>
                      {pack.kind === "feeder"
                        ? `${getCampaignSourceLabel(pack.attributionSource)} feeder flowing into ${getCampaignSourceLabel(pack.activeLane)}.`
                        : pack.kind === "bridge"
                          ? `${getCampaignSourceLabel(pack.activeLane)} bridge mission.`
                          : `${getCampaignSourceLabel(pack.attributionSource)} mission pack.`}{" "}
                      {pack.rewardFocus}
                    </p>
                    <p className="form-note">
                      <span className={`badge ${pack.milestone.tone === "success" ? "badge--pink" : ""}`}>{pack.badgeLabel}</span>
                    </p>
                    <div className="xp-meter campaign-pack-meter">
                      <div className="xp-meter__meta">
                        <span>Pack progress</span>
                        <span>{pack.completedQuestCount}/{pack.totalQuestCount} complete</span>
                      </div>
                      <div className="xp-meter__track">
                        <div
                          className="xp-meter__fill"
                          style={{ width: `${pack.totalQuestCount > 0 ? (pack.completedQuestCount / pack.totalQuestCount) * 100 : 0}%` }}
                        />
                      </div>
                      <small>
                        {pack.inProgressQuestCount} in progress, {pack.openQuestCount} open, {pack.rejectedQuestCount} rejected.
                      </small>
                    </div>
                    <div className="reward-state-bars">
                      <div>
                        <span>First win</span>
                        <div className="reward-state-bars__track">
                          <div
                            className="reward-state-bars__fill"
                            style={{ width: `${pack.completedQuestCount > 0 ? 100 : 0}%` }}
                          />
                        </div>
                      </div>
                      <div>
                        <span>Halfway</span>
                        <div className="reward-state-bars__track">
                          <div
                            className="reward-state-bars__fill"
                            style={{ width: `${pack.totalQuestCount > 1 && pack.completedQuestCount >= Math.ceil(pack.totalQuestCount / 2) ? 100 : Math.min((pack.completedQuestCount / Math.max(Math.ceil(pack.totalQuestCount / 2), 1)) * 100, 100)}%` }}
                          />
                        </div>
                      </div>
                      <div>
                        <span>Pack complete</span>
                        <div className="reward-state-bars__track">
                          <div
                            className="reward-state-bars__fill reward-state-bars__fill--gold"
                            style={{ width: `${pack.totalQuestCount > 0 ? (pack.completedQuestCount / pack.totalQuestCount) * 100 : 0}%` }}
                          />
                        </div>
                    </div>
                    </div>
                    <p className="form-note">{pack.nextAction}</p>
                    <p className="form-note">{pack.sequenceReason}</p>
                    <p className="form-note">{pack.leaderboardCallout}</p>
                    <p className="form-note">{pack.weeklyGoal.label}</p>
                    {pack.urgency ? <p className="form-note">Mission window: {pack.urgency}</p> : null}
                    {pack.directRewardSummary ? (
                      <p className="form-note">
                        Direct reward path: {pack.directRewardSummary.amount} {pack.directRewardSummary.asset} is attached to this mission route.
                      </p>
                    ) : null}
                    <p className="form-note">{pack.benchmarkNote}</p>
                    {pack.premiumNudge ? <p className="form-note">{pack.premiumNudge}</p> : null}
                    <div className="hero__actions">
                      <a
                        className="button button--secondary"
                        href={
                          pack.nextQuestId
                            ? pack.nextQuestActionable
                              ? `#quest-action-${pack.nextQuestId}`
                              : "#quest-board"
                            : "#quest-board"
                        }
                      >
                        {pack.ctaLabel}
                      </a>
                      {pack.milestone.label === "Halfway complete" || pack.milestone.label === "Pack complete" ? (
                        <a className="button button--secondary" href="/leaderboard#referral-board">
                          Invite from this milestone
                        </a>
                      ) : null}
                    </div>
                  </div>
                  <div className="achievement-card__side">
                    <span>
                      {pack.completedQuestCount}/{pack.totalQuestCount} complete
                    </span>
                    <span>{pack.inProgressQuestCount} in progress</span>
                    <span>{pack.openQuestCount} open</span>
                  </div>
                </article>
              ))}
            </div>
            <div className="info-grid">
              {data.campaignPacks.map((pack) => (
                <div key={`${pack.packId}-summary`} className="info-card">
                  <span>{pack.label}</span>
                  <strong>{pack.nextQuestTitle ?? "Pack complete"}</strong>
                  <small>
                    Tracks:{" "}
                    {pack.featuredTracks.length > 0
                      ? pack.featuredTracks.map((track) => getTrackLabel(track)).join(", ")
                      : "Campaign"}
                  </small>
                </div>
              ))}
            </div>
          </div>
        ) : null}
        {data.campaignNotifications.length > 0 ? (
          <div className="panel panel--glass">
            <div className="panel__header">
              <div>
                <p className="eyebrow">Campaign notifications</p>
                <h3>Live pack updates</h3>
              </div>
              <span className="badge">{data.campaignNotifications.length} live</span>
            </div>
            <div className="achievement-list">
              {data.campaignNotifications.map((notification) => (
                <article key={notification.id} className="achievement-card">
                  <div>
                    <strong>{notification.title}</strong>
                    <p>{notification.detail}</p>
                    {notification.ctaLabel ? (
                      <div className="hero__actions">
                        <a
                          className="button button--secondary"
                          href={notification.ctaHref ?? (notification.ctaQuestId ? `#quest-action-${notification.ctaQuestId}` : "#quest-board")}
                        >
                          {notification.ctaLabel}
                        </a>
                      </div>
                    ) : null}
                  </div>
                  <div className="achievement-card__side">
                    <span className={`badge ${notification.tone === "success" ? "badge--pink" : ""}`}>
                      {notification.tone}
                    </span>
                  </div>
                </article>
              ))}
            </div>
          </div>
        ) : null}
        {data.campaignPackHistory.length > 0 ? (
          <div className="panel panel--glass">
            <div className="panel__header">
              <div>
                <p className="eyebrow">Completed campaign packs</p>
                <h3>Recent campaign wins</h3>
              </div>
              <span className="badge badge--pink">{data.campaignPackHistory.length} archived</span>
            </div>
            {data.campaignPacks.length === 0 ? (
              <div className="review-actions">
                <button className={`button ${missionView === "active" ? "button--primary" : "button--secondary"}`} type="button" onClick={() => onMissionViewChange?.("active")}>
                  Active packs
                </button>
                <button className={`button ${missionView === "completed" ? "button--primary" : "button--secondary"}`} type="button" onClick={() => onMissionViewChange?.("completed")}>
                  Completed packs
                </button>
                <button className={`button ${missionView === "all" ? "button--primary" : "button--secondary"}`} type="button" onClick={() => onMissionViewChange?.("all")}>
                  All mission views
                </button>
              </div>
            ) : null}
            <div className="achievement-list">
              {data.campaignPackHistory.map((pack) => (
                <article key={`history-${pack.packId}`} className="achievement-card">
                  <div>
                    <strong>{pack.label}</strong>
                    <p>{pack.summary}</p>
                    <p className="form-note">
                      {pack.kind === "feeder"
                        ? `${getCampaignSourceLabel(pack.attributionSource)} feeder into ${getCampaignSourceLabel(pack.activeLane)}.`
                        : `${getCampaignSourceLabel(pack.activeLane)} lane pack.`}
                    </p>
                  </div>
                  <div className="achievement-card__side">
                    <span>{pack.totalQuestCount} missions</span>
                    <span>{pack.totalXpAwarded} XP</span>
                    <span>{pack.referralQuestCount} referral quests</span>
                    <span>{pack.premiumQuestCount} premium quests</span>
                    <span>{pack.completedAt ? new Date(pack.completedAt).toLocaleDateString() : "Completed"}</span>
                  </div>
                </article>
              ))}
            </div>
          </div>
        ) : null}
        <div className="panel panel--glass">
          <div className="panel__header">
            <div>
              <p className="eyebrow">Weekly reward band</p>
              <h3>{data.user.weeklyProgress.tierLabel}</h3>
            </div>
            <span className="badge">{data.user.weeklyProgress.xp} XP</span>
          </div>
          <div className="xp-meter">
            <div className="xp-meter__meta">
              <span>{data.user.weeklyProgress.currentThreshold} XP band</span>
              <span>{data.user.weeklyProgress.maxThreshold} XP weekly max</span>
            </div>
            <div className="xp-meter__track">
              <div className="xp-meter__fill" style={{ width: `${data.user.weeklyProgress.progress * 100}%` }} />
            </div>
            <small>
              {data.user.weeklyProgress.nextThreshold
                ? `${Math.max(data.user.weeklyProgress.nextThreshold - data.user.weeklyProgress.xp, 0)} XP to the next weekly milestone`
                : "You are at the top weekly reward band."}
            </small>
          </div>
          <p className="form-note">
            {data.user.rewardEligibility.eligible
              ? `Reward eligible with ${data.user.rewardEligibility.trustScoreBand} trust status.`
              : `Next requirement: ${data.user.rewardEligibility.nextRequirement ?? "keep progressing"}.`}
          </p>
          <p className="form-note">
            Active lane focus: {data.economy.campaignPreset.featuredTracks.join(", ")}. Weekly thresholds are being shaped by {data.economy.campaignPreset.weeklyTargetOffset} XP for this source.
          </p>
          {data.campaignPacks[0] ? (
            <p className="form-note">
              Active mission goal: {data.campaignPacks[0].weeklyGoal.targetXp} XP this week. {data.campaignPacks[0].weeklyGoal.label}
            </p>
          ) : null}
        </div>
        <div className="panel panel--glass">
          <div className="panel__header">
            <div>
              <p className="eyebrow">Token conversion</p>
              <h3>{data.user.tokenProgram.status === "redeemable" ? "Redemption unlocked" : "Eligibility pipeline"}</h3>
            </div>
            <span className="badge badge--pink">{data.user.tokenProgram.eligibilityPoints} pts</span>
          </div>
          <div className="economy-stack">
            <article className="economy-step-card economy-step-card--core">
              <div className="quest-card__meta">
                <span className="economy-badge economy-badge--core">XP core</span>
                <span>{data.user.totalXp.toLocaleString()} XP</span>
              </div>
              <strong>XP is the main progression currency.</strong>
              <p>Levels, streaks, weekly bands, quest ordering, and referral momentum are all driven here first.</p>
            </article>
            <article className="economy-step-card economy-step-card--bridge">
              <div className="quest-card__meta">
                <span className="economy-badge economy-badge--bridge">Eligibility bridge</span>
                <span>{data.user.tokenProgram.eligibilityPoints} pts</span>
              </div>
              <strong>Eligibility points convert XP momentum into reward readiness.</strong>
              <p>xPortal linkage, trust, and recurring activity turn progression into redeemable reward state.</p>
            </article>
            <article className="economy-step-card economy-step-card--rail">
              <div className="quest-card__meta">
                <span className="economy-badge economy-badge--rail">Reward rail</span>
                <span>{data.user.tokenProgram.asset}</span>
              </div>
              <strong>Tokens are configurable payout rails layered on top.</strong>
              <p>Reward programs, partner assets, and direct payouts shape settlement without replacing XP as the core loop.</p>
            </article>
          </div>
          <div className="info-grid">
            <div className="info-card">
              <span>Projected redemption</span>
              <strong>
                {data.user.tokenProgram.projectedRedemptionAmount} {data.user.tokenProgram.asset}
              </strong>
            </div>
            <div className="info-card">
              <span>Minimum unlock</span>
              <strong>{data.user.tokenProgram.minimumPoints} pts</strong>
            </div>
            <div className="info-card">
              <span>Tier multiplier</span>
              <strong>{data.user.tokenProgram.tierMultiplier.toFixed(2)}x</strong>
            </div>
            <div className="info-card">
              <span>Status</span>
              <strong>{data.user.tokenProgram.status.replaceAll("_", " ")}</strong>
            </div>
            <div className="info-card">
              <span>Claimed</span>
              <strong>{data.user.tokenProgram.claimedBalance} {data.user.tokenProgram.asset}</strong>
            </div>
            <div className="info-card">
              <span>Settled</span>
              <strong>{data.user.tokenProgram.settledBalance} {data.user.tokenProgram.asset}</strong>
            </div>
          </div>
          <p className="form-note">{data.user.tokenProgram.nextStep}</p>
          {data.user.tokenProgram.nextRedemptionPoints ? (
            <p className="form-note">
              {Math.max(data.user.tokenProgram.nextRedemptionPoints - data.user.tokenProgram.eligibilityPoints, 0)} more
              eligibility points to the next redemption step.
            </p>
          ) : null}
          {data.user.tokenProgram.scheduledDirectRewards.length > 0 ? (
            <div className="achievement-list">
              {data.user.tokenProgram.scheduledDirectRewards.map((reward) => (
                <article key={`${reward.asset}-${reward.amount}`} className="achievement-card">
                  <div>
                    <strong>Scheduled direct reward</strong>
                    <p>
                      Partner and campaign quests can bypass XP conversion when direct payout rules apply.
                      {reward.rewardProgramName ? ` ${reward.rewardProgramName} is attached to this lane.` : ""}
                    </p>
                  </div>
                  <div className="achievement-card__side">
                    <span>{reward.amount} {reward.asset}</span>
                  </div>
                </article>
              ))}
            </div>
          ) : null}
          {data.user.tokenProgram.assetBreakdown.length > 0 ? (
            <div className="achievement-list">
              {data.user.tokenProgram.assetBreakdown.map((asset) => (
                <article key={asset.asset} className="achievement-card">
                  <div>
                    <strong>{asset.asset} payout mix</strong>
                    <p>{asset.receiptCount} receipts across claimed and settled reward flow.</p>
                  </div>
                  <div className="achievement-card__side">
                    <span>{asset.claimedAmount.toFixed(2)} claimed</span>
                    <span>{asset.settledAmount.toFixed(2)} settled</span>
                    <span>{asset.totalAmount.toFixed(2)} total</span>
                  </div>
                </article>
              ))}
            </div>
          ) : null}
          {data.user.tokenProgram.programBreakdown.length > 0 ? (
            <div className="achievement-list">
              {data.user.tokenProgram.programBreakdown.map((program) => (
                <article key={`${program.rewardProgramName}-${program.asset}`} className="achievement-card">
                  <div>
                    <strong>{program.rewardProgramName}</strong>
                    <p>
                      {program.asset} payouts from this reward rail.
                    </p>
                  </div>
                  <div className="achievement-card__side">
                    <span>{program.claimedAmount.toFixed(2)} claimed</span>
                    <span>{program.settledAmount.toFixed(2)} settled</span>
                    <span>{program.receiptCount} receipts</span>
                  </div>
                </article>
              ))}
            </div>
          ) : null}
          {data.user.tokenProgram.redemptionHistory.length > 0 ? (
            <div className="achievement-list">
              {data.user.tokenProgram.redemptionHistory.map((entry) => (
                <article key={`${entry.asset}-${entry.createdAt}-${entry.tokenAmount}`} className="achievement-card">
                  <div>
                    <strong>{entry.status === "settled" ? "Settled redemption" : "Claimed redemption"}</strong>
                    <p>
                      {entry.eligibilityPointsSpent} eligibility points spent via {entry.source}.
                      {entry.rewardProgramName ? ` ${entry.rewardProgramName}.` : ""}
                      {entry.receiptReference ? ` Receipt: ${entry.receiptReference}.` : ""}
                      {entry.settlementNote ? ` ${entry.settlementNote}` : ""}
                    </p>
                  </div>
                  <div className="achievement-card__side">
                    <span>{entry.tokenAmount} {entry.asset}</span>
                    <span>{new Date(entry.createdAt).toLocaleDateString()}</span>
                    <span>{entry.status === "settled" && entry.settledAt ? `Settled ${new Date(entry.settledAt).toLocaleDateString()}` : "Awaiting payout"}</span>
                  </div>
                </article>
              ))}
            </div>
          ) : null}
        </div>
        <PayoutNotificationsPanel
          notifications={data.user.tokenProgram.notifications}
          scheduledDirectRewards={data.user.tokenProgram.scheduledDirectRewards}
          title="Claimed, settled, and scheduled reward events"
        />
        <div className="panel panel--glass">
          <div className="panel__header">
            <div>
              <p className="eyebrow">Reward economy</p>
              <h3>XP-first progression with configurable reward rails</h3>
            </div>
            <span className="badge badge--pink">{data.economy.payoutAsset}</span>
          </div>
          <p className="form-note">
            The product loop stays XP-first. Premium, referrals, partner assets, and direct payouts only accelerate or settle value after the progression layer is already doing the work.
          </p>
          <div className="reward-ladder">
            <article className="reward-ladder__card">
              <span>1. Earn XP</span>
              <strong>{data.user.weeklyProgress.xp} XP</strong>
              <small>{data.user.weeklyProgress.tierLabel} band this week.</small>
              <div className="reward-ladder__meter">
                <div
                  className="reward-ladder__fill"
                  style={{ width: `${Math.min(data.user.weeklyProgress.progress * 100, 100)}%` }}
                />
              </div>
            </article>
            <article className="reward-ladder__card">
              <span>2. Build eligibility</span>
              <strong>{data.user.tokenProgram.eligibilityPoints} pts</strong>
              <small>{data.user.tokenProgram.nextStep}</small>
              <div className="reward-ladder__meter">
                <div
                  className="reward-ladder__fill reward-ladder__fill--gold"
                  style={{
                    width: `${Math.min(
                      (data.user.tokenProgram.eligibilityPoints / Math.max(data.user.tokenProgram.nextRedemptionPoints ?? data.user.tokenProgram.minimumPoints, 1)) * 100,
                      100,
                    )}%`,
                  }}
                />
              </div>
            </article>
            <article className="reward-ladder__card">
              <span>3. Add accelerators</span>
              <strong>+{data.user.referral.rewardPreview.monthlyPremiumReferral.xp} / +{data.user.referral.rewardPreview.annualPremiumReferral.xp} XP</strong>
              <small>
                Premium and referral loops multiply the XP engine first. Annual referral also projects{" "}
                {data.user.referral.rewardPreview.annualPremiumReferral.directTokenReward
                  ? `${data.user.referral.rewardPreview.annualPremiumReferral.directTokenReward.amount} ${data.user.referral.rewardPreview.annualPremiumReferral.directTokenReward.asset}`
                  : "direct token upside"}
                .
              </small>
            </article>
            <article className="reward-ladder__card">
              <span>4. Settle through rails</span>
              <strong>{data.economy.xpMultipliers.monthly.toFixed(2)}x / {data.economy.xpMultipliers.annual.toFixed(2)}x XP</strong>
              <small>{data.economy.tokenMultipliers.monthly.toFixed(2)}x / {data.economy.tokenMultipliers.annual.toFixed(2)}x token yield across the active reward program and partner asset rails.</small>
            </article>
          </div>
        </div>
        <div className="referral-summary">
          <div className="quest-card__meta">
            <span>{data.user.referral.convertedCount} converted</span>
            <span>{data.user.referral.pendingConversionXp} XP still available</span>
          </div>
          {data.user.referral.recentReferrals.length ? (
            <div className="referral-list">
              {data.user.referral.recentReferrals.map((referral) => (
                <article key={`${referral.displayName}-${referral.joinedAt}`} className="referral-item">
                  <div>
                    <strong>{referral.displayName}</strong>
                    <small>{referral.status === "converted" ? "Premium conversion" : "Joined with your code"}</small>
                  </div>
                  <span className={tierClass(referral.tier)}>{getTierLabel(referral.tier)}</span>
                </article>
              ))}
            </div>
          ) : (
            <small className="form-note">No referred users yet. Share your code to start the referral loop.</small>
          )}
        </div>
        <div className="achievement-spotlight">
          <div className="panel__header">
            <div>
              <p className="eyebrow">Achievement spotlight</p>
              <h3>{unlockedAchievements.length} badges unlocked</h3>
            </div>
            <span className="badge badge--pink">Prestige</span>
          </div>
          <div className="achievement-grid">
            {data.campaignPacks.map((pack) => (
              <article key={`pack-badge-${pack.packId}`} className="achievement-card achievement-card--unlocked">
                <div className="quest-card__meta">
                  <span>Campaign badge</span>
                  <span>{pack.badgeLabel}</span>
                </div>
                <strong>{pack.label}</strong>
                <p>{pack.milestone.label}. {pack.sequenceReason}</p>
              </article>
            ))}
            {unlockedAchievements.slice(0, 2).map((achievement) => (
              <article key={achievement.id} className="achievement-card achievement-card--unlocked">
                <div className="quest-card__meta">
                  <span>Unlocked</span>
                  <span>100%</span>
                </div>
                <strong>{achievement.name}</strong>
                <p>{achievement.description}</p>
              </article>
            ))}
            {upcomingAchievements.map((achievement) => (
              <article key={achievement.id} className="achievement-card achievement-card--progress">
                <div className="quest-card__meta">
                  <span>In progress</span>
                  <span>{Math.round(achievement.progress * 100)}%</span>
                </div>
                <strong>{achievement.name}</strong>
                <p>{achievement.description}</p>
                <div className="achievement-progress">
                  <div className="achievement-progress__fill" style={{ width: `${achievement.progress * 100}%` }} />
                </div>
              </article>
            ))}
          </div>
        </div>
        <TokenReceiptHistoryPanel
          history={data.user.tokenProgram.redemptionHistory}
          title="Receipt and payout detail"
          eyebrow="Payout receipts"
        />
      </div>
      <div className="panel">
        <div className="panel__header">
          <div>
            <p className="eyebrow">Featured quests</p>
            <h3>Today&apos;s loop</h3>
          </div>
          <span className="badge">Up to 155 XP</span>
        </div>
        <div className="quest-list">
          {data.quests.slice(0, 4).map((quest) => (
            <article
              key={quest.id}
              className={`quest-card quest-card--state-${quest.status}`}
            >
              <div>
                <div className="quest-card__meta">
                  <span>{quest.category}</span>
                  <span>{quest.difficulty}</span>
                </div>
                <h4>{quest.title}</h4>
                <p>{quest.description}</p>
                <small className="quest-card__note">{getQuestStatusNote(quest.status)}</small>
              </div>
              <div className="quest-card__footer">
                <span>{quest.xpReward} XP</span>
                <strong>{getQuestStatusLabel(quest.status)}</strong>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

export function PremiumFunnelSection({ data }: { data: DashboardData }) {
  const premiumOffer = getCampaignPremiumOffer(data.economy.campaignPreset.source);
  const campaignPreset = data.economy.campaignPreset;
  const premiumRelevantPacks = data.campaignPacks.filter((pack) => pack.premiumNudge);
  const premiumJourney = getCampaignPremiumJourney(campaignPreset.source, {
    featuredTracks: campaignPreset.featuredTracks,
    premiumUpsellMultiplier: campaignPreset.premiumUpsellMultiplier,
    weeklyTargetOffset: campaignPreset.weeklyTargetOffset,
  });

  return (
    <section className="grid grid--funnel">
      <div className="panel">
        <div className="panel__header">
          <div>
            <p className="eyebrow">Conversion architecture</p>
            <h3>Premium moments woven into progression</h3>
          </div>
          <span className="badge badge--pink">Save 44 EUR annually</span>
        </div>
        <div className="moment-list">
          {data.premiumMoments.map((moment) => (
            <div key={moment} className="moment-item">
              {moment}
            </div>
          ))}
        </div>
        <div className="achievement-list">
          <article className="achievement-card achievement-card--unlocked">
            <div>
              <strong>{premiumOffer.title}</strong>
              <p>{premiumOffer.summary}</p>
            </div>
            <span className="badge badge--pink">{campaignPreset.source}</span>
          </article>
          {premiumOffer.hooks.map((hook) => (
            <article key={hook} className="achievement-card">
              <div>
                <strong>Campaign-specific premium hook</strong>
                <p>{hook}</p>
              </div>
            </article>
          ))}
          <article className="achievement-card">
            <div>
              <strong>Active lane pressure</strong>
              <p>
                {campaignPreset.source} currently adds {(campaignPreset.premiumUpsellMultiplier * 100 - 100).toFixed(0)}%
                extra premium urgency and shifts weekly targets by {campaignPreset.weeklyTargetOffset} XP.
              </p>
            </div>
            <span className="badge">
              {(campaignPreset.leaderboardMomentumMultiplier * 100 - 100).toFixed(0)}% board momentum
            </span>
          </article>
          {campaignPreset.attributionSource !== campaignPreset.source ? (
            <article className="achievement-card">
              <div>
                <strong>Attribution vs active lane</strong>
                <p>
                  Attribution remains {campaignPreset.attributionSource}, but premium framing is currently coming from the {campaignPreset.source} bridge lane.
                </p>
              </div>
            </article>
          ) : null}
          {premiumRelevantPacks.map((pack) => (
            <article key={`premium-pack-${pack.packId}`} className="achievement-card achievement-card--unlocked">
              <div>
                <strong>{pack.label} premium phase</strong>
                <p>{pack.premiumNudge}</p>
              </div>
              <span className="badge badge--pink">{pack.kind === "feeder" ? "Bridge upsell" : "Pack upsell"}</span>
            </article>
          ))}
          <article className="achievement-card achievement-card--unlocked">
            <div>
              <strong>Recommended premium sequence</strong>
              <p>{premiumJourney.nextAction}</p>
            </div>
            <span className="badge badge--pink">{premiumJourney.recommendedTier}</span>
          </article>
          {premiumJourney.pathSteps.map((step, index) => (
            <article key={step} className="achievement-card">
              <div>
                <strong>Step {index + 1}</strong>
                <p>{step}</p>
              </div>
            </article>
          ))}
        </div>
        <p className="form-note">{premiumOffer.cta}</p>
        <p className="form-note">{premiumJourney.lanePressure}</p>
      </div>
      <div className="panel">
        <div className="panel__header">
          <div>
            <p className="eyebrow">Tier ladder</p>
            <h3>Free to Annual</h3>
          </div>
        </div>
        <div className="tier-grid">
          <article className="tier-card">
            <span className={tierClass("free")}>Free</span>
            <strong>Levels 1-8</strong>
            <p>Habit building, social loops, quizzes, referrals, leaderboard visibility.</p>
          </article>
          <article className="tier-card">
            <span className={tierClass("monthly")}>Monthly</span>
            <strong>{data.economy.xpMultipliers.monthly.toFixed(2)}x XP</strong>
            <p>{premiumJourney.monthlyReason}</p>
          </article>
          <article className="tier-card">
            <span className={tierClass("annual")}>Annual</span>
            <strong>{data.economy.xpMultipliers.annual.toFixed(2)}x XP</strong>
            <p>{premiumJourney.annualReason}</p>
          </article>
        </div>
      </div>
    </section>
  );
}

export function QuestBoardSection({ data }: { data: DashboardData }) {
  const activePackIds = new Set(data.campaignPacks.map((pack) => pack.packId));
  const activeQuests = data.quests
    .filter((quest) => quest.status !== "locked")
    .sort((left, right) => {
      const leftPriority = left.campaignPackId && activePackIds.has(left.campaignPackId) ? 1 : 0;
      const rightPriority = right.campaignPackId && activePackIds.has(right.campaignPackId) ? 1 : 0;
      if (leftPriority !== rightPriority) {
        return rightPriority - leftPriority;
      }

      return Number(Boolean(right.recommended)) - Number(Boolean(left.recommended));
    });
  const lockedPreviews = data.quests.filter((quest) => quest.status === "locked");
  const orderedTracks: QuestTrack[] = ["starter", "daily", "social", "wallet", "referral", "premium", "creative", "ambassador", "campaign", "quiz"];
  const groupedActiveTracks = orderedTracks
    .map((track) => ({
      track,
      quests: activeQuests.filter((quest) => quest.track === track),
    }))
    .filter((group) => group.quests.length > 0);

  return (
    <section className="panel" id="quest-board">
      <div className="panel__header">
        <div>
          <p className="eyebrow">Quest board</p>
          <h3>Track-based progression view with active quests and previewed unlocks</h3>
        </div>
        <span className="badge">{activeQuests.length} active / {lockedPreviews.length} previewed</span>
      </div>
      <p className="form-note">
        Featured funnel tracks for the active {data.economy.campaignPreset.source} lane: {data.economy.campaignPreset.featuredTracks.join(", ")}.
      </p>
      <div className="track-board">
        {groupedActiveTracks.map((group) => (
          <section key={group.track} className="panel panel--glass">
            <div className="panel__header">
              <div>
                <p className="eyebrow">Active track</p>
                <h3>{getTrackLabel(group.track)}</h3>
              </div>
              <span className="badge">{group.quests.length} live</span>
            </div>
            <p className="form-note">{getTrackDescription(group.track)}</p>
            <div className="quest-grid">{group.quests.map(renderQuestCard)}</div>
          </section>
        ))}
        <section className="panel panel--glass">
          <div className="panel__header">
            <div>
              <p className="eyebrow">Locked previews</p>
              <h3>High-value tracks waiting behind the next milestone</h3>
            </div>
          </div>
          <div className="quest-grid">
            {lockedPreviews.map(renderQuestCard)}
          </div>
        </section>
      </div>
    </section>
  );
}

export function LeaderboardSection({ data }: { data: DashboardData }) {
  const topReferralEntry = data.referralLeaderboard[0];
  const annualDirectReward = data.user.referral.rewardPreview.annualPremiumReferral.directTokenReward;
  const campaignPreset = data.economy.campaignPreset;
  const rankPressurePack = data.campaignPacks[0] ?? null;

  return (
    <section className="grid grid--leaderboard">
      <div className="panel">
        <div className="panel__header">
          <div>
            <p className="eyebrow">All-time leaderboard</p>
            <h3>Social proof and pressure</h3>
          </div>
          <span className="badge">Weekly reset Monday 00:00 UTC</span>
        </div>
        <div className="leaderboard">
          {data.leaderboard.map((entry) => (
            <div key={`${entry.rank}-${entry.displayName}`} className={`leaderboard__row leaderboard__row--${entry.tier}`}>
              <span>#{entry.rank}</span>
              <strong>{entry.displayName}</strong>
              <span>Lv {entry.level}</span>
              <span>{entry.xp.toLocaleString()} XP</span>
              <span>{entry.delta > 0 ? `+${entry.delta}` : entry.delta}</span>
            </div>
          ))}
        </div>
        <div className="info-grid">
          <div className="info-card">
            <span>Reward rail projection</span>
            <strong>{data.user.tokenProgram.projectedRedemptionAmount} {data.user.tokenProgram.asset}</strong>
          </div>
          <div className="info-card">
            <span>Monthly XP uplift</span>
            <strong>{data.economy.xpMultipliers.monthly.toFixed(2)}x XP</strong>
          </div>
          <div className="info-card">
            <span>Annual XP uplift</span>
            <strong>{data.economy.xpMultipliers.annual.toFixed(2)}x XP</strong>
          </div>
          <div className="info-card">
            <span>Rail settlement</span>
            <strong>{data.user.tokenProgram.claimedBalance} / {data.user.tokenProgram.settledBalance}</strong>
          </div>
          <div className="info-card">
            <span>Lane momentum</span>
            <strong>{campaignPreset.leaderboardMomentumMultiplier.toFixed(2)}x</strong>
          </div>
          <div className="info-card">
            <span>Premium lane pressure</span>
            <strong>{campaignPreset.premiumUpsellMultiplier.toFixed(2)}x</strong>
          </div>
        </div>
        <div className="reward-visual-grid">
          <article className="reward-visual-card">
            <div className="quest-card__meta">
              <span>Progression core</span>
              <span>{data.user.tokenProgram.status}</span>
            </div>
            <strong>
              {data.user.totalXp.toLocaleString()} XP to {data.user.tokenProgram.eligibilityPoints} pts to{" "}
              {data.user.tokenProgram.projectedRedemptionAmount} {data.user.tokenProgram.asset}
            </strong>
            <div className="reward-ladder__meter">
              <div
                className="reward-ladder__fill"
                style={{ width: `${Math.min(data.user.weeklyProgress.progress * 100, 100)}%` }}
              />
            </div>
            <small>Leaderboard pressure feeds weekly XP first. Reward readiness is a second-layer consequence of that core progression engine.</small>
          </article>
          <article className="reward-visual-card">
            <div className="quest-card__meta">
              <span>Reward rail state</span>
              <span>{data.user.tokenProgram.asset}</span>
            </div>
            <strong>{data.user.tokenProgram.claimedBalance} claimed / {data.user.tokenProgram.settledBalance} settled</strong>
            <div className="reward-state-bars">
              <div>
                <span>Claimed</span>
                <div className="reward-state-bars__track">
                  <div
                    className="reward-state-bars__fill"
                    style={{
                      width: `${Math.min(
                        (data.user.tokenProgram.claimedBalance / Math.max(data.user.tokenProgram.claimedBalance + data.user.tokenProgram.settledBalance, 1)) * 100,
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
                        (data.user.tokenProgram.settledBalance / Math.max(data.user.tokenProgram.claimedBalance + data.user.tokenProgram.settledBalance, 1)) * 100,
                        100,
                      )}%`,
                    }}
                  />
                </div>
              </div>
            </div>
            <small>Claimed rewards are reserved. Settled rewards have completed the manual payout path.</small>
          </article>
          <article className="reward-visual-card">
            <div className="quest-card__meta">
              <span>{campaignPreset.source} reward preset</span>
              <span>{campaignPreset.attributionSource}</span>
            </div>
            <strong>
              +{(campaignPreset.questXpBoost * 100).toFixed(0)}% quest XP, +{(campaignPreset.eligibilityBoost * 100).toFixed(0)}%
              eligibility growth, +{(campaignPreset.tokenYieldBoost * 100).toFixed(0)}% token yield
            </strong>
            <div className="reward-ladder__meter">
              <div
                className="reward-ladder__fill reward-state-bars__fill--gold"
                style={{ width: `${Math.min((campaignPreset.leaderboardMomentumMultiplier / 1.5) * 100, 100)}%` }}
              />
            </div>
            <small>
              The active experience lane is not just copy. It changes how aggressively premium, weekly milestones, and leaderboard pressure are framed while keeping original attribution intact.
            </small>
          </article>
        </div>
        <p className="form-note">
          Rankings do not just signal vanity. Higher weekly output strengthens the XP core, and the configured reward rails decide how that value gets expressed and settled.
        </p>
      </div>
      <div className="panel">
        <div className="panel__header">
          <div>
            <p className="eyebrow">Referral campaign</p>
            <h3>Who is converting the strongest invite loop</h3>
          </div>
          <span className="badge badge--pink">#{data.user.referral.rank} for you</span>
        </div>
        <div className="referral-campaign-card" id="referral-board">
          <div className="quest-card__meta">
            <span>Current referral leader</span>
            <span>{topReferralEntry ? `${topReferralEntry.xp} XP` : "No referral XP yet"}</span>
          </div>
          <strong>{topReferralEntry ? topReferralEntry.displayName : "Campaign waiting for invites"}</strong>
          <p>
            Referral positions rank by earned invite XP first, then converted premium joins, so this board reflects actual conversion quality instead of raw sign-up volume.
          </p>
          <div className="info-grid">
            <div className="info-card">
              <span>Your referral rank</span>
              <strong>#{data.user.referral.rank}</strong>
            </div>
            <div className="info-card">
              <span>Converted joins</span>
              <strong>{data.user.referral.convertedCount}</strong>
            </div>
            <div className="info-card">
              <span>Earned referral XP</span>
              <strong>{data.user.referral.rewardXpEarned}</strong>
            </div>
            <div className="info-card">
              <span>Still available</span>
              <strong>{data.user.referral.pendingConversionXp}</strong>
            </div>
            <div className="info-card">
              <span>Annual referral direct reward</span>
              <strong>{annualDirectReward ? `${annualDirectReward.amount} ${annualDirectReward.asset}` : "Projected only"}</strong>
            </div>
          </div>
        </div>
        <div className="leaderboard leaderboard--referral">
          {data.referralLeaderboard.map((entry) => (
            <div key={`referral-${entry.rank}-${entry.displayName}`} className={`leaderboard__row leaderboard__row--${entry.tier}`}>
              <span>#{entry.rank}</span>
              <strong>{entry.displayName}</strong>
              <span>Lv {entry.level}</span>
              <span>{entry.xp.toLocaleString()} referral XP</span>
              <span>{entry.delta > 0 ? `+${entry.delta}` : entry.delta}</span>
            </div>
          ))}
        </div>
        {rankPressurePack ? (
          <div className="achievement-list">
            <article className="achievement-card">
              <div>
                <strong>{rankPressurePack.label} is shaping rank pressure</strong>
                <p>{rankPressurePack.leaderboardCallout}</p>
              </div>
              <div className="achievement-card__side">
                <span>{rankPressurePack.weeklyGoal.targetXp} XP pace</span>
                <span>{rankPressurePack.milestone.label}</span>
              </div>
            </article>
          </div>
        ) : null}
      </div>
      <TokenReceiptHistoryPanel
        history={data.user.tokenProgram.redemptionHistory}
        title="Reward receipts and settlement history"
        eyebrow="Token receipts"
      />
      <PayoutNotificationsPanel
        notifications={data.user.tokenProgram.notifications}
        scheduledDirectRewards={data.user.tokenProgram.scheduledDirectRewards}
        title="Reward status alerts"
        eyebrow="Payout status"
      />
      <div className="panel">
        <div className="panel__header">
          <div>
            <p className="eyebrow">Live activity</p>
            <h3>The platform should feel active</h3>
          </div>
        </div>
        <div className="activity-list">
          {data.activityFeed.map((item) => (
            <article key={item.id} className="activity-item">
              <strong>{item.actor}</strong>
              <p>
                {item.action} <span>{item.detail}</span>
              </p>
              <small>{item.timeAgo}</small>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

export function ProfileSection({ data }: { data: DashboardData }) {
  const unlockedAchievements = data.achievements.filter((achievement) => achievement.unlocked);
  const progressingAchievements = data.achievements
    .filter((achievement) => !achievement.unlocked)
    .sort((left, right) => right.progress - left.progress);

  return (
    <section className="grid grid--profile">
      <div className="panel">
        <div className="panel__header">
          <div>
            <p className="eyebrow">Profile</p>
            <h3>Identity and connected surfaces</h3>
          </div>
        </div>
        <div className="connections">
          {data.user.connectedAccounts.map((account) => (
            <div key={account.platform} className="connection-row">
              <div>
                <strong>{account.platform}</strong>
                <small>{account.connected ? "Connected" : `Connect for +${account.rewardXp} XP`}</small>
              </div>
              <span className={account.connected ? "connection-pill connection-pill--on" : "connection-pill"}>
                {account.connected ? "Live" : "Pending"}
              </span>
            </div>
          ))}
        </div>
      </div>
      <div className="panel">
        <div className="panel__header">
          <div>
            <p className="eyebrow">Referral loop</p>
            <h3>Invite performance</h3>
          </div>
          <span className="badge">{data.user.referralCode}</span>
        </div>
        <div className="info-grid">
          <div className="info-card">
            <span>Invited</span>
            <strong>{data.user.referral.invitedCount}</strong>
          </div>
          <div className="info-card">
            <span>Converted</span>
            <strong>{data.user.referral.convertedCount}</strong>
          </div>
          <div className="info-card">
            <span>Reward XP</span>
            <strong>{data.user.referral.rewardXpEarned}</strong>
          </div>
          <div className="info-card">
            <span>Still available</span>
            <strong>{data.user.referral.pendingConversionXp}</strong>
          </div>
        </div>
        <div className="achievement-list">
          <article className="achievement-card">
            <div>
              <strong>Monthly premium referral</strong>
              <p>XP reward plus token eligibility progress</p>
            </div>
            <div className="achievement-card__side">
              <span>+{data.user.referral.rewardPreview.monthlyPremiumReferral.xp} XP</span>
              <span>{data.user.referral.rewardPreview.monthlyPremiumReferral.tokenEffect.replaceAll("_", " ")}</span>
            </div>
          </article>
          <article className="achievement-card">
            <div>
              <strong>Annual premium referral</strong>
              <p>High XP, direct token reward, strongest team-growth outcome</p>
            </div>
            <div className="achievement-card__side">
              <span>+{data.user.referral.rewardPreview.annualPremiumReferral.xp} XP</span>
              <span>
                {data.user.referral.rewardPreview.annualPremiumReferral.directTokenReward?.amount}
                {" "}
                {data.user.referral.rewardPreview.annualPremiumReferral.directTokenReward?.asset}
              </span>
            </div>
          </article>
          {data.user.referral.rewardPreview.sourceBonuses.map((bonus) => (
            <article key={bonus.source} className="achievement-card">
              <div>
                <strong>{bonus.label}</strong>
                <p>
                  Signup {bonus.signupXp} XP, monthly {bonus.monthlyPremiumXp} XP, annual {bonus.annualPremiumXp} XP.
                </p>
              </div>
              <div className="achievement-card__side">
                <span>{bonus.source}</span>
                <span>
                  +{bonus.annualDirectTokenReward.amount} {bonus.annualDirectTokenReward.asset}
                </span>
              </div>
            </article>
          ))}
        </div>
        <p className="form-note">
          {data.user.campaignSource
            ? `Campaign source detected: ${data.user.campaignSource}. Matching campaign-track quests and referral bonuses will surface ahead of general quests.`
            : "Direct Emorya onboarding. Campaign-track quests will appear when you join a partner activation."}
        </p>
      </div>
      <div className="panel">
        <div className="panel__header">
          <div>
            <p className="eyebrow">Progress gates</p>
            <h3>Starter path and weekly reward status</h3>
          </div>
          <span className="badge">{data.user.weeklyProgress.tierLabel}</span>
        </div>
        <div className="achievement-list">
          <article className="achievement-card">
            <div>
              <strong>{data.user.starterPath.complete ? "Starter Path complete" : "Starter Path in progress"}</strong>
              <p>
                {Math.round(data.user.starterPath.progress * 100)}% complete.{" "}
                {data.user.rewardEligibility.eligible
                  ? "Reward eligibility is live."
                  : `Next requirement: ${data.user.rewardEligibility.nextRequirement ?? "keep progressing"}.`}
              </p>
            </div>
            <div className="achievement-card__side">
              <span>{data.user.rewardEligibility.trustScoreBand} trust</span>
              <span>{data.user.weeklyProgress.xp} weekly XP</span>
            </div>
          </article>
          <article className="achievement-card">
            <div>
              <strong>Token redemption path</strong>
              <p>
                {data.user.tokenProgram.eligibilityPoints} eligibility points banked.{" "}
                {data.user.tokenProgram.status === "redeemable"
                  ? `Projected redemption: ${data.user.tokenProgram.projectedRedemptionAmount} ${data.user.tokenProgram.asset}.`
                  : data.user.tokenProgram.nextStep}
              </p>
            </div>
            <div className="achievement-card__side">
              <span>{data.user.tokenProgram.status}</span>
              <span>{data.user.tokenProgram.tierMultiplier.toFixed(2)}x tier bonus</span>
            </div>
          </article>
          <article className="achievement-card">
            <div>
              <strong>Claimed vs settled</strong>
              <p>
                Claimed redemptions are reserved and awaiting payout. Settled balances already reached the user’s reward history.
              </p>
            </div>
            <div className="achievement-card__side">
              <span>{data.user.tokenProgram.claimedBalance} claimed</span>
              <span>{data.user.tokenProgram.settledBalance} settled</span>
            </div>
          </article>
          {data.user.tokenProgram.redemptionHistory.slice(0, 2).map((entry) => (
            <article key={entry.id} className="achievement-card">
              <div>
                <strong>{entry.status === "settled" ? "Latest settled payout" : "Latest claimed payout"}</strong>
                <p>
                  {entry.tokenAmount} {entry.asset} from {entry.source}.
                  {entry.receiptReference ? ` Receipt ${entry.receiptReference}.` : ""}
                </p>
              </div>
              <div className="achievement-card__side">
                <span>{new Date(entry.createdAt).toLocaleDateString()}</span>
                <span>{entry.status === "settled" && entry.settledAt ? "Receipt logged" : "Awaiting payout"}</span>
              </div>
            </article>
          ))}
          <PayoutNotificationsPanel
            notifications={data.user.tokenProgram.notifications}
            scheduledDirectRewards={data.user.tokenProgram.scheduledDirectRewards}
            title="Profile payout status"
            eyebrow="Payout notifications"
          />
        </div>
      </div>
      <div className="panel">
        <div className="panel__header">
          <div>
            <p className="eyebrow">Achievements</p>
            <h3>Prestige markers</h3>
          </div>
          <span className="badge">{unlockedAchievements.length} unlocked</span>
        </div>
        <div className="achievement-stack">
          <div className="achievement-group">
            <div className="quest-card__meta">
              <span>Unlocked badges</span>
              <span>{unlockedAchievements.length}</span>
            </div>
            <div className="achievement-list">
              {unlockedAchievements.map((achievement) => (
                <article key={achievement.id} className="achievement-card achievement-card--unlocked">
                  <div>
                    <strong>{achievement.name}</strong>
                    <p>{achievement.description}</p>
                  </div>
                  <span className="badge">Unlocked</span>
                </article>
              ))}
            </div>
          </div>
          <div className="achievement-group">
            <div className="quest-card__meta">
              <span>Closest next badges</span>
              <span>{progressingAchievements.length}</span>
            </div>
            <div className="achievement-list">
              {progressingAchievements.map((achievement) => (
                <article key={achievement.id} className="achievement-card achievement-card--progress">
                  <div>
                    <strong>{achievement.name}</strong>
                    <p>{achievement.description}</p>
                  </div>
                  <div className="achievement-card__side">
                    <span>{Math.round(achievement.progress * 100)}%</span>
                    <div className="achievement-progress">
                      <div
                        className="achievement-progress__fill"
                        style={{ width: `${achievement.progress * 100}%` }}
                      />
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </div>
          {!unlockedAchievements.length && !progressingAchievements.length ? (
            <p className="form-note">No achievements available yet.</p>
          ) : null}
        </div>
      </div>
    </section>
  );
}

export function AchievementsHubSection({ data }: { data: DashboardData }) {
  const unlockedAchievements = data.achievements.filter((achievement) => achievement.unlocked);
  const progressingAchievements = data.achievements
    .filter((achievement) => !achievement.unlocked)
    .sort((left, right) => right.progress - left.progress);
  const completionRate = data.achievements.length
    ? Math.round((unlockedAchievements.length / data.achievements.length) * 100)
    : 0;
  const nextAchievement = progressingAchievements[0] ?? null;

  return (
    <section className="grid grid--profile">
      <div className="panel">
        <div className="panel__header">
          <div>
            <p className="eyebrow">Progress overview</p>
            <h3>Prestige at a glance</h3>
          </div>
          <span className="badge badge--pink">{completionRate}% complete</span>
        </div>
        <div className="info-grid">
          <div className="info-card">
            <span>Unlocked</span>
            <strong>{unlockedAchievements.length}</strong>
          </div>
          <div className="info-card">
            <span>Total badges</span>
            <strong>{data.achievements.length}</strong>
          </div>
          <div className="info-card">
            <span>Current streak</span>
            <strong>{data.user.currentStreak} days</strong>
          </div>
          <div className="info-card">
            <span>Current tier</span>
            <strong>{getTierLabel(data.user.tier)}</strong>
          </div>
        </div>
        {nextAchievement ? (
          <div className="achievement-spotlight">
            <div className="panel__header">
              <div>
                <p className="eyebrow">Closest next unlock</p>
                <h3>{nextAchievement.name}</h3>
              </div>
              <span className="badge">{Math.round(nextAchievement.progress * 100)}%</span>
            </div>
            <p>{nextAchievement.description}</p>
            <div className="achievement-progress">
              <div
                className="achievement-progress__fill"
                style={{ width: `${nextAchievement.progress * 100}%` }}
              />
            </div>
          </div>
        ) : (
          <p className="form-note">Every currently tracked achievement is unlocked.</p>
        )}
      </div>
      <div className="panel">
        <div className="panel__header">
          <div>
            <p className="eyebrow">Unlocked badges</p>
            <h3>Your completed prestige markers</h3>
          </div>
        </div>
        <div className="achievement-list">
          {unlockedAchievements.length ? (
            unlockedAchievements.map((achievement) => (
              <article key={achievement.id} className="achievement-card achievement-card--unlocked">
                <div>
                  <strong>{achievement.name}</strong>
                  <p>{achievement.description}</p>
                </div>
                <span className="badge">Unlocked</span>
              </article>
            ))
          ) : (
            <p className="form-note">No unlocked badges yet. Keep pushing the quest loop.</p>
          )}
        </div>
      </div>
      <div className="panel">
        <div className="panel__header">
          <div>
            <p className="eyebrow">In progress</p>
            <h3>What to chase next</h3>
          </div>
        </div>
        <div className="achievement-list">
          {progressingAchievements.length ? (
            progressingAchievements.map((achievement) => (
              <article key={achievement.id} className="achievement-card achievement-card--progress">
                <div>
                  <strong>{achievement.name}</strong>
                  <p>{achievement.description}</p>
                </div>
                <div className="achievement-card__side">
                  <span>{Math.round(achievement.progress * 100)}%</span>
                  <div className="achievement-progress">
                    <div
                      className="achievement-progress__fill"
                      style={{ width: `${achievement.progress * 100}%` }}
                    />
                  </div>
                </div>
              </article>
            ))
          ) : (
            <p className="form-note">No active progress items right now.</p>
          )}
        </div>
      </div>
    </section>
  );
}

export function AdminSection({ data, canManageCampaignPacks = false }: { data: AdminOverviewData; canManageCampaignPacks?: boolean }) {
  return (
    <section className="panel admin-command-center">
      <div className="panel__header">
        <div>
          <p className="eyebrow">Admin control surface</p>
          <h3>Campaign and moderation summary</h3>
        </div>
        <p className="form-note">
          Use this top layer to spot campaign and moderation risk quickly. Payout operations now live in their own dedicated deck below.
        </p>
      </div>
      <div className="stats-row">
        {data.stats.map((stat) => (
          <div key={stat.label} className="stat-card">
            <span>{stat.label}</span>
            <strong>{stat.value}</strong>
          </div>
        ))}
      </div>
      <div className="admin-focus-grid">
        <article className="admin-focus-card">
          <span>Watch first</span>
          <strong>Queue health</strong>
          <small>Backlog, stale items, and reviewer load should stay inside the SLA window.</small>
        </article>
        <article className="admin-focus-card">
          <span>Watch next</span>
          <strong>Campaign operations</strong>
          <small>Bridge mode, pack readiness, and source quality determine whether the funnel is behaving as planned.</small>
        </article>
        <article className="admin-focus-card">
          <span>Watch last</span>
          <strong>Payout deck</strong>
          <small>Use the separate payout section for queue state, retries, exceptions, and settlement decisions.</small>
        </article>
      </div>
      <div className="admin-grid">
        <article className="admin-card">
          <strong>Quest management</strong>
          <p>Publish social, learn, app, staking, referral, and limited-time quests with tier gates.</p>
        </article>
        <article className="admin-card">
          <strong>Review queue</strong>
          <p>Moderate screenshots, UGC, and social submissions with XP adjustments and featured status.</p>
        </article>
        <article className="admin-card">
          <strong>Analytics</strong>
          <p>Track free-to-monthly and monthly-to-annual funnel movement alongside quest completion.</p>
        </article>
      </div>
      <div className="panel panel--glass admin-analytics">
        <div className="panel__header">
          <div>
            <p className="eyebrow">Queue health</p>
            <h3>Moderation SLA and backlog pressure</h3>
          </div>
          <span className="badge badge--pink">{data.queueMetrics.staleCount} stale</span>
        </div>
        {data.queueMetrics.alerts.length > 0 ? (
          <div className="admin-alert-stack">
            {data.queueMetrics.alerts.map((alert) => (
              <article
                key={`${alert.severity}-${alert.title}`}
                className={`admin-alert-card admin-alert-card--${alert.severity}`}
              >
                <div>
                  <p className="eyebrow">{alert.severity === "critical" ? "Immediate attention" : "Heads up"}</p>
                  <strong>{alert.title}</strong>
                </div>
                <p>{alert.detail}</p>
              </article>
            ))}
          </div>
        ) : (
          <p className="form-note">
            Queue age and backlog are currently inside the target moderation window.
          </p>
        )}
        <div className="info-grid">
          <div className="info-card">
            <span>Pending now</span>
            <strong>{data.queueMetrics.pendingCount}</strong>
          </div>
          <div className="info-card">
            <span>Oldest pending</span>
            <strong>{data.queueMetrics.oldestPendingMinutes} min</strong>
          </div>
          <div className="info-card">
            <span>Average age</span>
            <strong>{data.queueMetrics.averagePendingMinutes} min</strong>
          </div>
          <div className="info-card">
            <span>Over 24h</span>
            <strong>{data.queueMetrics.staleCount}</strong>
          </div>
        </div>
        <div className="achievement-list">
          {data.queueMetrics.byVerificationType.map((entry) => (
            <article key={entry.verificationType} className="achievement-card">
              <div>
                <strong>{entry.verificationType}</strong>
                <p>Pending items in this verification lane</p>
              </div>
              <div className="achievement-card__side">
                <strong>{entry.count}</strong>
              </div>
            </article>
          ))}
          {data.queueMetrics.byVerificationType.length === 0 ? (
            <p className="form-note">The pending queue is empty right now.</p>
          ) : null}
        </div>
      </div>
      <div className="panel panel--glass admin-analytics">
        <div className="panel__header">
          <div>
            <p className="eyebrow">Notification routing</p>
            <h3>Where moderation alerts can escalate next</h3>
          </div>
        </div>
        <div className="achievement-list">
          {data.moderationNotifications.map((notification) => (
            <article key={`${notification.channel}-${notification.destination}`} className="achievement-card">
              <div>
                <strong>{notification.title}</strong>
                <p>{notification.detail}</p>
              </div>
              <div className="achievement-card__side">
                <span>{notification.channel}</span>
                <span>{notification.status}</span>
              </div>
            </article>
          ))}
        </div>
      </div>
      <div className="panel panel--glass admin-analytics">
        <div className="panel__header">
          <div>
            <p className="eyebrow">Economy architecture</p>
            <h3>Progression core vs reward rails</h3>
          </div>
        </div>
        <div className="economy-stack economy-stack--admin">
          <article className="economy-step-card economy-step-card--core">
            <div className="quest-card__meta">
              <span className="economy-badge economy-badge--core">Core</span>
              <span>XP progression</span>
            </div>
            <strong>Levels, weekly pacing, quest ordering, and funnel pressure.</strong>
            <p>XP remains the primary progression system across direct, Zealy bridge, and optional live source lanes.</p>
          </article>
          <article className="economy-step-card economy-step-card--rail">
            <div className="quest-card__meta">
              <span className="economy-badge economy-badge--rail">Rails</span>
              <span>{data.campaignOperations.activeLaneMode === "bridged" ? "Bridge-ready" : "Split-lane ready"}</span>
            </div>
            <strong>Reward programs, partner assets, and payout operations.</strong>
            <p>These change how value is redeemed, scheduled, and settled without replacing the XP-first progression layer.</p>
          </article>
        </div>
      </div>
      <div className="panel panel--glass admin-analytics">
        <div className="panel__header">
          <div>
            <p className="eyebrow">Campaign operations</p>
            <h3>Bridge mode, template readiness, and source pack health</h3>
          </div>
          <span className="badge badge--pink">
            {data.campaignOperations.activeLaneMode === "bridged" ? "Zealy bridge mode" : "separate live lanes"}
          </span>
        </div>
        <div className="info-grid">
          <div className="info-card">
            <span>Saved templates</span>
            <strong>{data.campaignOperations.templateCounts.total}</strong>
          </div>
          <div className="info-card">
            <span>Bridge templates</span>
            <strong>{data.campaignOperations.templateCounts.bridge}</strong>
          </div>
          <div className="info-card">
            <span>Feeder templates</span>
            <strong>{data.campaignOperations.templateCounts.feeder}</strong>
          </div>
          <div className="info-card">
            <span>Campaign pack ready</span>
            <strong>{data.campaignOperations.packReady ? "Yes" : "No"}</strong>
          </div>
          <div className="info-card">
            <span>Generated packs</span>
            <strong>{data.campaignOperations.templateCounts.generatedPacks}</strong>
          </div>
          <div className="info-card">
            <span>Active generated packs</span>
            <strong>{data.campaignOperations.templateCounts.activeGeneratedPacks}</strong>
          </div>
        </div>
        <div className="achievement-list">
          {data.campaignOperations.sourceTemplateCounts.map((entry) => (
            <article key={entry.source} className="achievement-card">
              <div>
                <strong>{entry.source}</strong>
                <p>Saved campaign templates for this attribution source.</p>
              </div>
              <div className="achievement-card__side">
                <span>{entry.total} total</span>
                <span>{entry.active} active</span>
              </div>
            </article>
          ))}
        </div>
        <CampaignPackAlertPanel
          alerts={data.campaignOperations.alerts}
          suppressions={data.campaignOperations.suppressions}
          suppressionAnalytics={data.campaignOperations.suppressionAnalytics}
          canManage={canManageCampaignPacks}
        />
        <div className="achievement-list">
          {data.campaignOperations.partnerReporting.map((entry) => (
            <article key={`partner-${entry.packId}`} className="achievement-card">
              <div>
                <strong>{entry.label}</strong>
                <p>Partner snapshot for {entry.sources.join(", ")} with live-ready funnel metrics and {entry.benchmarkLane} benchmarks.</p>
                <small>
                  {entry.partnerSummaryHeadline} {entry.partnerSummaryDetail}
                </small>
              </div>
              <div className="achievement-card__side">
                <span>{entry.lifecycleState}</span>
                <span>{entry.benchmarkStatus}</span>
                <span>{entry.participantCount} participants</span>
                <span>{Math.round(entry.premiumConversionRate * 100)}% premium</span>
                <span>{Math.round(entry.likelyPackCausedPremiumConversionRate * 100)}% likely caused</span>
              </div>
            </article>
          ))}
        </div>
        <div className="achievement-list">
          {data.campaignOperations.notifications.map((notification) => (
            <article key={`${notification.channel}-${notification.destination}-campaign`} className="achievement-card">
              <div>
                <strong>{notification.title}</strong>
                <p>{notification.detail}</p>
              </div>
              <div className="achievement-card__side">
                <span>{notification.channel}</span>
                <span>{notification.status}</span>
              </div>
            </article>
          ))}
        </div>
        <CampaignPackNotificationHistoryPanel
          initialEntries={data.campaignOperations.notificationHistory}
          canManage={canManageCampaignPacks}
        />
        <CampaignPackAuditPanel entries={data.campaignOperations.audit} />
        <CampaignPackAnalyticsPanel
          packs={data.campaignOperations.packAnalytics}
          partnerReports={data.campaignOperations.partnerReporting}
          auditEntries={data.campaignOperations.audit}
          canManage={canManageCampaignPacks}
        />
      </div>
      <div className="panel panel--glass admin-analytics">
        <div className="panel__header">
          <div>
            <p className="eyebrow">Reviewer workload</p>
            <h3>Who is carrying moderation right now</h3>
          </div>
        </div>
        <div className="achievement-list">
          {data.reviewerWorkload.map((reviewer) => (
            <article key={reviewer.reviewerDisplayName} className="achievement-card">
              <div>
                <strong>{reviewer.reviewerDisplayName}</strong>
                <p>{reviewer.reviewCount} total reviews</p>
              </div>
              <div className="achievement-card__side">
                <span>{reviewer.approvals} approved</span>
                <span>{reviewer.rejections} rejected</span>
              </div>
            </article>
          ))}
          {data.reviewerWorkload.length === 0 ? (
            <p className="form-note">No reviewer workload data yet.</p>
          ) : null}
        </div>
      </div>
      <div className="panel panel--glass admin-analytics">
        <div className="panel__header">
          <div>
            <p className="eyebrow">Referral analytics</p>
            <h3>Invite performance and premium conversion pull</h3>
          </div>
          <span className="badge badge--pink">{Math.round(data.referralAnalytics.conversionRate * 100)}% conversion</span>
        </div>
        <div className="info-grid">
          <div className="info-card">
            <span>Total invited</span>
            <strong>{data.referralAnalytics.invitedCount}</strong>
          </div>
          <div className="info-card">
            <span>Total converted</span>
            <strong>{data.referralAnalytics.convertedCount}</strong>
          </div>
          <div className="info-card">
            <span>Referral XP earned</span>
            <strong>{data.referralAnalytics.rewardXpEarned}</strong>
          </div>
          <div className="info-card">
            <span>Pending referral XP</span>
            <strong>{data.referralAnalytics.pendingConversionXp}</strong>
          </div>
        </div>
        <div className="achievement-list">
          {data.referralAnalytics.topReferrers.map((referrer) => (
            <article key={referrer.displayName} className="achievement-card">
              <div>
                <strong>{referrer.displayName}</strong>
                <p>
                  {referrer.invitedCount} invited, {referrer.convertedCount} converted
                </p>
              </div>
              <div className="achievement-card__side">
                <span className={tierClass(referrer.tier)}>{getTierLabel(referrer.tier)}</span>
                <strong>{referrer.rewardXpEarned} XP</strong>
              </div>
            </article>
          ))}
          {data.referralAnalytics.topReferrers.length === 0 ? (
            <p className="form-note">No referral activity has been recorded yet.</p>
          ) : null}
        </div>
        <div className="achievement-list">
          {data.referralAnalytics.sourceBreakdown.map((source) => (
            <article key={source.source} className="achievement-card">
              <div>
                <strong>{source.source}</strong>
                <p>Attribution source among referred users</p>
              </div>
              <div className="achievement-card__side">
                <span>{source.invitedCount} invited</span>
                <span>{source.convertedCount} converted</span>
              </div>
            </article>
          ))}
        </div>
        <div className="achievement-list">
          {data.referralAnalytics.conversionWindows.map((window) => (
            <article key={window.label} className="achievement-card">
              <div>
                <strong>{window.label}</strong>
                <p>How quickly referred users move into paid tiers</p>
              </div>
              <div className="achievement-card__side">
                <strong>{window.count}</strong>
              </div>
            </article>
          ))}
        </div>
      </div>
      <div className="panel panel--glass admin-analytics">
        <div className="panel__header">
          <div>
            <p className="eyebrow">Source vs lane</p>
            <h3>Attribution source against active experience lane</h3>
          </div>
        </div>
        <div className="info-grid">
          {data.referralAnalytics.laneComparison.map((lane) => (
            <div key={lane.lane} className="info-card">
              <span>{lane.lane} lane</span>
              <strong>{lane.activeUsers} users</strong>
              <small>
                {lane.premiumCount} premium, {lane.annualCount} annual, {lane.attributedUsers} directly attributed.
              </small>
            </div>
          ))}
        </div>
        <div className="achievement-list">
          {data.referralAnalytics.attributionVsLane.map((entry) => (
            <article key={`${entry.attributionSource}-${entry.activeLane}`} className="achievement-card">
              <div>
                <strong>
                  {entry.attributionSource} {"->"} {entry.activeLane}
                </strong>
                <p>
                  {entry.userCount} users currently resolve through this pairing, with {Math.round(entry.conversionRate * 100)}%
                  already on a paid tier.
                </p>
              </div>
              <div className="achievement-card__side">
                <span>{entry.monthlyCount} monthly</span>
                <span>{entry.annualCount} annual</span>
              </div>
            </article>
          ))}
        </div>
      </div>
      <div className="panel panel--glass admin-analytics">
        <div className="panel__header">
          <div>
            <p className="eyebrow">Source quality</p>
            <h3>Which sources convert best before and after the Zealy bridge</h3>
          </div>
        </div>
        <div className="achievement-list">
          {data.referralAnalytics.sourceQuality.map((entry) => (
            <article key={`${entry.source}-${entry.activeLane}`} className="achievement-card">
              <div>
                <strong>
                  {entry.source} {"->"} {entry.activeLane}
                </strong>
                <p>
                  {entry.invitedCount} invited, {entry.convertedCount} premium, {entry.annualCount} annual.
                </p>
              </div>
              <div className="achievement-card__side">
                <span>{Math.round(entry.premiumConversionRate * 100)}% premium</span>
                <span>{Math.round(entry.annualConversionRate * 100)}% annual</span>
              </div>
            </article>
          ))}
        </div>
        <div className="achievement-list">
          {data.referralAnalytics.laneQuality.map((entry) => (
            <article key={entry.lane} className="achievement-card">
              <div>
                <strong>{entry.lane} lane quality</strong>
                <p>
                  {entry.invitedCount} invited routed through this lane, with {entry.convertedCount} paid and {entry.annualCount} annual.
                </p>
              </div>
              <div className="achievement-card__side">
                <span>{Math.round(entry.premiumConversionRate * 100)}% premium</span>
                <span>{Math.round(entry.annualConversionRate * 100)}% annual</span>
              </div>
            </article>
          ))}
        </div>
        <SourceLaneReportPanel entries={data.referralAnalytics.bridgeComparison} />
      </div>
      <div className="panel panel--glass admin-analytics">
        <div className="panel__header">
          <div>
            <p className="eyebrow">Lane preview</p>
            <h3>What the upstream toggle is currently resolving to</h3>
          </div>
          <span className="badge badge--pink">
            {data.economySettings.differentiateUpstreamCampaignSources ? "separate live lanes" : "zealy bridge mode"}
          </span>
        </div>
        <div className="achievement-list">
          {data.upstreamLanePreview.map((entry) => (
            <article key={entry.attributionSource} className="achievement-card">
              <div>
                <strong>
                  {entry.attributionSource} {"->"} {entry.activeLane}
                </strong>
                <p>{entry.detail}</p>
              </div>
              <div className="achievement-card__side">
                <span>{entry.differentiated ? "separate" : "bridged"}</span>
              </div>
            </article>
          ))}
        </div>
      </div>
      <div className="panel panel--glass admin-analytics">
        <div className="panel__header">
          <div>
            <p className="eyebrow">Review drill-down</p>
            <h3>Reviewer and quest-type performance</h3>
          </div>
        </div>
        <div className="achievement-list">
          {data.reviewInsights.byVerificationType.map((entry) => (
            <article key={entry.verificationType} className="achievement-card">
              <div>
                <strong>{entry.verificationType}</strong>
                <p>Pending, approved, and rejected flow by verification lane</p>
              </div>
              <div className="achievement-card__side">
                <span>P {entry.pendingCount}</span>
                <span>A {entry.approvedCount}</span>
                <span>R {entry.rejectedCount}</span>
              </div>
            </article>
          ))}
        </div>
        <div className="achievement-list">
          {data.reviewInsights.reviewerTypeMatrix.map((entry) => (
            <article key={`${entry.reviewerDisplayName}-${entry.verificationType}`} className="achievement-card">
              <div>
                <strong>{entry.reviewerDisplayName}</strong>
                <p>{entry.verificationType}</p>
              </div>
              <div className="achievement-card__side">
                <strong>{entry.reviewCount}</strong>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
