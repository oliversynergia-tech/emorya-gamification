import {
  getCampaignPremiumJourney,
  getCampaignPremiumOffer,
} from "@/lib/campaign-source";
import { getTokenEffectLabel } from "@/lib/progression-rules";
import { getLevelProgress, getTierLabel } from "@/lib/progression";
import { getQuestStatusLabel, getQuestStatusNote } from "@/lib/quest-state";
import type { AdminOverviewData, DashboardData, Quest, SubscriptionTier } from "@/lib/types";
import { CampaignPackAnalyticsPanel } from "@/components/campaign-pack-analytics-panel";
import { CampaignPackAlertPanel } from "@/components/campaign-pack-alert-panel";
import { CampaignPackAuditPanel } from "@/components/campaign-pack-audit-panel";
import { CampaignMissionInboxPanel } from "@/components/campaign-mission-inbox-panel";
import { CampaignMissionCtaAnalyticsPanel } from "@/components/campaign-mission-cta-analytics-panel";
import { CampaignPackNotificationHistoryPanel } from "@/components/campaign-pack-notification-history-panel";
import { MissionLink } from "@/components/mission-link";
import { MissionEventHistoryPanel } from "@/components/mission-event-history-panel";
import { MissionPackDetailPanel } from "@/components/mission-pack-detail-panel";
import { PayoutNotificationsPanel } from "@/components/payout-notifications-panel";
import { ProfileMissionRecapPanel } from "@/components/profile-mission-recap-panel";
import { SourceLaneReportPanel } from "@/components/source-lane-report-panel";
import { TokenReceiptHistoryPanel } from "@/components/token-receipt-history-panel";

const QUEST_BOARD_PHASES = [
  {
    key: "activation",
    eyebrow: "Core path",
    title: "Activation ladder",
    description: "Start here to get set up, unlock your account, and open the strongest next steps.",
    slugs: [
      "download-the-emorya-app",
      "open-the-app-for-the-first-time",
      "create-emorya-account",
      "complete-your-profile",
      "confirm-your-starter-setup",
      "complete-daily-wheel-spin",
      "play-emoryan-adventure-game",
      "download-xportal",
      "open-or-create-your-xportal-wallet",
      "connect-your-xportal-wallet",
      "view-your-emrs-reward-path",
      "convert-your-first-calories",
      "complete-the-full-activation-ladder",
    ],
  },
  {
    key: "momentum",
    eyebrow: "Repeat use",
    title: "Daily momentum",
    description: "Keep coming back, build your streak, and turn early progress into a real routine.",
    slugs: [
      "500-in-24",
      "weekly-warrior",
      "convert-2000-calories-to-emrs",
      "emorya-marathon",
    ],
  },
  {
    key: "commitment",
    eyebrow: "Optional extras",
    title: "Commitment and staking",
    description: "Go deeper with premium and staking once you are ready for bigger upside.",
    slugs: [
      "upgrade-to-premium-monthly",
      "upgrade-to-annual",
      "stake-your-first-emr",
      "reach-staking-threshold-a",
      "reach-staking-threshold-b",
      "unlock-apy-boost-status",
      "strengthen-the-core-30-day-hold",
      "referred-staker-bonus",
    ],
  },
  {
    key: "growth",
    eyebrow: "Amplification",
    title: "Community and growth",
    description: "Share progress, invite others, and grow your place in the Emorya community.",
    slugs: [
      "rate-emorya-on-the-app-store",
      "leave-your-first-emorya-review",
      "share-your-verified-progress-screenshot",
      "invite-your-first-accountability-partner",
      "refer-one-user-who-converts-calories",
      "this-weeks-ugc-challenge",
      "create-an-emorya-progress-reel",
      "join-emorya-telegram",
      "join-emorya-discord",
      "follow-emorya-on-x",
      "like-this-weeks-emorya-post",
      "share-an-emorya-post",
    ],
  },
] as const;

function tierClass(tier: SubscriptionTier) {
  return `tier-pill tier-pill--${tier}`;
}

function getMissionCueForPack(pack: DashboardData["campaignPacks"][number]) {
  if (pack.nextQuestActionable && pack.nextQuestTitle) {
    return {
      badge: "Ready now",
      note: `${pack.nextQuestTitle} is the cleanest live move right now.`,
      tone: "ready",
    } as const;
  }
  return {
    badge: "Next step",
    note: "Check the next mission step to keep your progress moving.",
    tone: "planning",
  } as const;
}

function getDashboardPriorityAction(data: DashboardData) {
  const getFollowupLabelForHref = (href: string, fallback: string) => {
    if (href.includes("wallet-link-panel")) {
      return "Go to wallet";
    }
    if (href.includes("quest-board")) {
      return "Open mission board";
    }
    if (href === "/profile") {
      return "See premium options";
    }
    return fallback;
  };
  const getQuestBoardHref = (questId: string | null | undefined) => (questId ? `/dashboard#quest-${questId}` : "/dashboard#quest-board");

  const walletGatePack = data.campaignPacks.find((pack) => pack.ctaVariant === "wallet_gate");
  if (walletGatePack) {
    const followupHref = "/profile#wallet-link-panel";
    return {
      eyebrow: "Top action",
      title: "Connect your wallet to open the next step",
      detail: walletGatePack.nextAction,
      supporting: walletGatePack.unlockPreview,
      href: walletGatePack.ctaHref ?? "/profile#wallet-link-panel",
      label: walletGatePack.ctaLabel,
      packId: walletGatePack.packId,
      ctaVariant: walletGatePack.ctaVariant,
      packLabel: walletGatePack.label,
      timing: "wait for unlock",
      blockedStateLabel: "Wallet needed",
      stateCategory: "Important",
      stateMetricLabel: "Do this next",
      stateMetricValue: "Connect xPortal",
      secondaryMetricLabel: "Current goal",
      secondaryMetricValue: walletGatePack.weeklyGoal.label,
      followupLabel: "What opens after this",
      followupValue: walletGatePack.unlockRewardPreview,
      followupCtaLabel: getFollowupLabelForHref(followupHref, "See what opens next"),
      followupHref,
      followupCtaVariant: "priority_followup_review",
      followupIntentLabel: "See the next step",
    };
  }

  const premiumPack = data.campaignPacks.find(
    (pack) => pack.ctaVariant === "free_to_monthly" || pack.ctaVariant === "monthly_to_annual",
  );
  if (premiumPack) {
    const followupHref = "/profile";
    return {
      eyebrow: "Top action",
      title: "You are ready for the premium step",
      detail: premiumPack.premiumNudge ?? premiumPack.nextAction,
      supporting: premiumPack.unlockPreview,
      href: premiumPack.ctaHref ?? "/profile",
      label: premiumPack.ctaLabel,
      packId: premiumPack.packId,
      ctaVariant: premiumPack.ctaVariant,
      packLabel: premiumPack.label,
      timing: "this week",
      blockedStateLabel: "Upgrade step",
      stateCategory: "Important",
      stateMetricLabel: "Best next move",
      stateMetricValue: "Upgrade your plan",
      secondaryMetricLabel: "Current goal",
      secondaryMetricValue: premiumPack.weeklyGoal.label,
      followupLabel: "What opens after this",
      followupValue: premiumPack.unlockRewardPreview,
      followupCtaLabel: getFollowupLabelForHref(followupHref, "See premium options"),
      followupHref,
      followupCtaVariant: "priority_followup_review",
      followupIntentLabel: "See what changes",
    };
  }

  const returnPack = data.campaignPacks.find((pack) => pack.returnAction);
  if (returnPack) {
    const blockedStateLabel =
      returnPack.blockageState === "level"
        ? "More XP needed"
        : returnPack.blockageState === "trust"
          ? "More activity needed"
          : returnPack.blockageState === "starter_path"
            ? "Finish setup first"
            : returnPack.blockageState === "premium_phase"
              ? "Upgrade step"
              : returnPack.blockageState === "weekly_pace"
                ? "Behind this week"
                : returnPack.blockageState === "wallet_connection"
                  ? "Wallet needed"
                  : returnPack.returnWindow === "wait_for_unlock"
                    ? "Not open yet"
                    : "Ready now";
    const title =
      returnPack.blockageState === "wallet_connection"
        ? "Connect your wallet to reopen this mission"
        : returnPack.blockageState === "trust"
          ? "A little more activity will reopen this mission"
          : returnPack.blockageState === "level"
            ? "A quick XP push gets this mission moving again"
            : returnPack.blockageState === "starter_path"
              ? "Finish the activation ladder to reopen this mission"
              : returnPack.blockageState === "premium_phase"
                ? "This mission is ready for the premium step"
                : returnPack.blockageState === "weekly_pace"
                  ? "One strong return gets this mission back on pace"
                  : "One strong return move puts this pack back on pace";
    const supporting =
      returnPack.blockageState === "wallet_connection"
        ? "Wallet connection is still the thing standing between this mission and what opens next."
        : returnPack.blockageState === "trust"
          ? "A little more real activity is needed before the next step opens."
          : returnPack.blockageState === "level"
            ? "The next mission step is mainly waiting on more XP."
            : returnPack.blockageState === "starter_path"
              ? "Finishing setup is still the simplest way to open the next step."
              : returnPack.blockageState === "weekly_pace"
                ? returnPack.unlockRewardPreview
                : returnPack.unlockPreview;
    const eyebrow =
      returnPack.blockageState === "weekly_pace"
        ? "Return today"
        : returnPack.blockageState === "ready"
          ? "Resume mission"
          : "Coming up next";
    const stateMetric =
      returnPack.blockageState === "weekly_pace"
        ? {
            label: "Catch-up needed",
            value:
              returnPack.weeklyGoal.shortfallXp > 0
                ? `${returnPack.weeklyGoal.shortfallXp} XP behind target`
                : "On pace",
          }
        : returnPack.blockageState === "wallet_connection"
          ? { label: "Do this next", value: "Connect xPortal" }
          : returnPack.blockageState === "starter_path"
            ? { label: "Do this next", value: "Finish activation ladder" }
            : returnPack.blockageState === "level"
              ? { label: "Do this next", value: returnPack.weeklyGoal.label }
              : returnPack.blockageState === "trust"
                ? { label: "Do this next", value: "Stay active a little longer" }
                : returnPack.blockageState === "premium_phase"
                  ? { label: "Do this next", value: "Upgrade your plan" }
                  : returnPack.returnWindow === "wait_for_unlock"
                    ? { label: "Do this next", value: "Wait for the next opening" }
                    : { label: "Return window", value: returnPack.returnWindow.replaceAll("_", " ") };
    const secondaryMetric =
      returnPack.urgency
        ? { label: "Priority", value: returnPack.urgency }
        : { label: "Current goal", value: returnPack.weeklyGoal.label };
    const followupHref =
      returnPack.blockageState === "weekly_pace"
        ? getQuestBoardHref(returnPack.nextQuestId)
        : returnPack.blockageState === "ready"
          ? getQuestBoardHref(returnPack.nextQuestId)
          : returnPack.blockageState === "wallet_connection"
            ? "/profile#wallet-link-panel"
            : returnPack.blockageState === "starter_path"
              ? getQuestBoardHref(returnPack.nextQuestId)
              : returnPack.blockageState === "trust"
                ? getQuestBoardHref(returnPack.nextQuestId)
                : returnPack.blockageState === "premium_phase"
                  ? "/profile"
                  : "/profile#mission-recap";
    return {
      eyebrow,
      title,
      detail: returnPack.returnAction ?? returnPack.nextAction,
      supporting,
      href: returnPack.ctaHref ?? "#quest-board",
      label: returnPack.ctaLabel,
      packId: returnPack.packId,
      ctaVariant: returnPack.ctaVariant,
      packLabel: returnPack.label,
      timing:
        returnPack.returnWindow === "today"
          ? "today"
          : returnPack.returnWindow === "this_week"
            ? "this week"
            : "wait for unlock",
      blockedStateLabel,
      stateCategory:
        returnPack.blockageState === "weekly_pace"
          ? "Momentum recovery"
          : returnPack.blockageState === "ready"
            ? "Soft block"
            : "Hard block",
      stateMetricLabel: stateMetric.label,
      stateMetricValue: stateMetric.value,
      secondaryMetricLabel: secondaryMetric.label,
      secondaryMetricValue: secondaryMetric.value,
      followupLabel: "What opens after this",
      followupValue: returnPack.unlockRewardPreview,
      followupCtaLabel: getFollowupLabelForHref(
        followupHref,
        returnPack.blockageState === "weekly_pace"
          ? returnPack.returnWindow === "today"
            ? "Plan today's recovery"
            : "Plan this week's recovery"
          : returnPack.blockageState === "ready"
            ? "See what opens next"
            : returnPack.blockageState === "wallet_connection"
              ? "See the wallet gate"
              : returnPack.blockageState === "starter_path"
                ? "See the starter gate"
                : returnPack.blockageState === "trust"
                  ? "See the trust gate"
                  : returnPack.blockageState === "premium_phase"
                    ? "Review premium gate"
                    : "See the gated path",
      ),
      followupHref,
      followupCtaVariant:
        returnPack.blockageState === "weekly_pace" || returnPack.blockageState === "ready"
          ? "priority_followup_review"
          : "priority_followup_gate",
      followupIntentLabel:
        returnPack.blockageState === "weekly_pace" || returnPack.blockageState === "ready"
          ? "See what comes next"
          : "See what this unlocks",
    };
  }

  const nextPack = data.campaignPacks[0] ?? null;
  if (!nextPack) {
    return null;
  }

  const followupHref = getQuestBoardHref(nextPack.nextQuestId);

  return {
    eyebrow: "Top action",
    title: "Keep your current mission moving",
    detail: nextPack.nextAction,
    supporting: nextPack.unlockPreview,
    href: nextPack.ctaHref ?? "#quest-board",
    label: nextPack.ctaLabel,
    packId: nextPack.packId,
    ctaVariant: nextPack.ctaVariant,
    packLabel: nextPack.label,
    timing: "today",
    blockedStateLabel: "Ready now",
    stateCategory: "In progress",
    stateMetricLabel: "Best next move",
    stateMetricValue: nextPack.unlockPreview,
    secondaryMetricLabel: "Current goal",
    secondaryMetricValue: nextPack.weeklyGoal.label,
    followupLabel: "What opens after this",
    followupValue: nextPack.unlockRewardPreview,
    followupCtaLabel: getFollowupLabelForHref(followupHref, "See what opens next"),
    followupHref,
    followupCtaVariant: "priority_followup_review",
    followupIntentLabel: "See what comes next",
  };
}

function renderQuestCard(quest: Quest) {
  return (
    <article
      key={quest.id}
      id={`quest-${quest.id}`}
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
        <span>{quest.xpReward} XP</span>
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
  const nextStep = data.user.starterPath.nextStepLabel ?? "Open your dashboard";
  const heroTitle = data.user.currentStreak > 0
    ? "Keep your progress moving every day."
    : "Get started, build momentum, and unlock more as you go.";
  const heroDescription = data.user.currentStreak > 0
    ? "Pick up where you left off, complete your next quest, and keep your streak alive."
    : "Start with a few simple steps, come back regularly, and watch your rewards and progress grow.";

  return (
    <section className="hero grid">
      <div className="panel panel--hero lane-theme--direct">
        <p className="eyebrow">Get started</p>
        <h2>{heroTitle}</h2>
        <p className="lede">
          {heroDescription}
        </p>
        <div className="lane-chip-row">
          <span className="badge">Complete quests</span>
          <span className="badge">Keep your streak</span>
          <span className="badge">Unlock more</span>
        </div>
        <p className="form-note">Open your dashboard to see the best next step.</p>
        <div className="hero__actions">
          <a className="button button--primary" href="/dashboard#quest-board">
            Start now
          </a>
        </div>
        <div className="stats-row">
          <div className="stat-card">
            <span>Best next step</span>
            <strong>{nextStep}</strong>
          </div>
          <div className="stat-card">
            <span>Current level</span>
            <strong>Level {progress.level}</strong>
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
}: {
  data: DashboardData;
  missionView?: "active" | "completed" | "all" | "reward";
}) {
  const progress = getLevelProgress(data.user.totalXp);
  const priorityAction = getDashboardPriorityAction(data);

  return (
    <section className="grid grid--dashboard">
      <div className="dashboard-column">
        <div className="panel">
          <div className="panel__header">
            <div>
              <p className="eyebrow">Your account</p>
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
              <span>Account status</span>
              <strong>{data.user.journeyState.replaceAll("_", " ")}</strong>
            </div>
            <div className="info-card">
              <span>Focus now</span>
              <strong>{data.economy.campaignPreset.featuredTracks[0] ?? "progress"}</strong>
            </div>
          </div>
        </div>
        <div className="panel panel--glass">
          <div className="panel__header">
            <div>
              <p className="eyebrow">Activation ladder</p>
              <h3>{data.user.starterPath.title}</h3>
            </div>
            <span className={`badge ${data.user.starterPath.complete ? "badge--pink" : ""}`}>
              {Math.round(data.user.starterPath.progress * 100)}%
            </span>
          </div>
          <p className="form-note">{data.user.starterPath.summary}</p>
          {data.user.starterPath.nextStepLabel ? (
            <p className="mission-cue mission-cue--planning">
              <strong>Next activation move</strong> {data.user.starterPath.nextStepLabel}. {data.user.starterPath.nextStepDetail}
            </p>
          ) : (
            <p className="mission-cue mission-cue--ready">
              <strong>{data.user.starterPath.completionLabel}</strong> {data.user.starterPath.completionDetail}
            </p>
          )}
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
        {data.campaignPacks.length > 0 ? (
          <div className="panel panel--glass" id="campaign-mission">
          <div className="panel__header">
            <div>
              <p className="eyebrow">Active missions</p>
              <h3>Your current mission progress</h3>
            </div>
            <span className="badge badge--pink">{data.campaignPacks.length} active</span>
          </div>
            <div className="achievement-list">
              {data.campaignPacks.slice(0, 2).map((pack) => (
                <article key={pack.packId} className={`achievement-card ${pack.urgency ? "achievement-card--urgent" : ""}`}>
                  {(() => {
                    const cue = getMissionCueForPack(pack);
                    return (
                  <>
                    <div>
                      <strong>{pack.label}</strong>
                      <p>{pack.rewardFocus || pack.nextAction}</p>
                    <div className="xp-meter campaign-pack-meter">
                      <div className="xp-meter__meta">
                        <span>Progress</span>
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
                    <p className={`mission-cue mission-cue--${cue.tone}`}>
                      <strong>Do this next</strong> {pack.nextAction}
                    </p>
                    <div className="hero__actions">
                      <MissionLink
                        className="button button--secondary"
                        href={pack.ctaHref ?? "#quest-board"}
                        packId={pack.packId}
                        eventType="dashboard_mission_cta"
                        ctaLabel={pack.ctaLabel}
                        ctaVariant={pack.ctaVariant}
                        missionView={missionView}
                      >
                        {pack.ctaLabel}
                      </MissionLink>
                      {pack.milestone.label === "Halfway complete" || pack.milestone.label === "Pack complete" ? (
                        <MissionLink
                          className="button button--secondary"
                          href="/leaderboard#referral-board"
                          packId={pack.packId}
                          eventType="dashboard_referral_cta"
                          ctaLabel="Invite from this milestone"
                          ctaVariant="referral_milestone"
                          missionView={missionView}
                        >
                          Invite from this milestone
                        </MissionLink>
                      ) : null}
                    </div>
                  </div>
                  <div className="achievement-card__side">
                    <span className={`badge ${pack.milestone.tone === "success" ? "badge--pink" : ""}`}>{pack.badgeLabel}</span>
                    <span>
                      {pack.completedQuestCount}/{pack.totalQuestCount} complete
                    </span>
                    <span>{pack.openQuestCount} open</span>
                    {pack.directRewardSummary ? (
                      <span>{pack.directRewardSummary.amount} {pack.directRewardSummary.asset}</span>
                    ) : (
                      <span>{cue.badge}</span>
                    )}
                  </div>
                  </>
                    );
                  })()}
                </article>
              ))}
            </div>
            {data.campaignPacks.length > 2 ? (
              <p className="form-note">
                {data.campaignPacks.length - 2} more mission{data.campaignPacks.length - 2 === 1 ? "" : "s"} continue below in your quest board.
              </p>
            ) : null}
          </div>
        ) : null}
      </div>
      <div className="dashboard-column">
        {priorityAction ? (
          <div className="panel">
          <div className="panel__header">
            <div>
              <p className="eyebrow">Next up</p>
              <h3>Your best next move</h3>
            </div>
            <span className="badge badge--pink">{priorityAction.packLabel}</span>
          </div>
            <div className="achievement-list">
              <article className="achievement-card">
                <div>
                  <strong>{priorityAction.title}</strong>
                  <p>{priorityAction.detail}</p>
                </div>
                <div className="achievement-card__side">
                  <span>{priorityAction.blockedStateLabel}</span>
                  <span>{priorityAction.stateMetricValue}</span>
                </div>
              </article>
              <article className="achievement-card">
                <div>
                  <strong>{priorityAction.followupCtaLabel}</strong>
                  <p>{priorityAction.supporting}</p>
                </div>
                <div className="achievement-card__side">
                  <span>{priorityAction.secondaryMetricValue}</span>
                  <span>{priorityAction.followupValue}</span>
                </div>
              </article>
            </div>
            <p className="mission-cue mission-cue--planning">
              <strong>{priorityAction.label}</strong> {priorityAction.followupIntentLabel}.
            </p>
            <div className="hero__actions">
              <MissionLink
                className="button button--primary"
                href={priorityAction.href}
                packId={priorityAction.packId}
                eventType="dashboard_priority_cta"
                ctaLabel={priorityAction.label}
                ctaVariant={priorityAction.ctaVariant}
                missionView={missionView}
              >
                {priorityAction.label}
              </MissionLink>
              <MissionLink
                className="button button--secondary"
                href={priorityAction.followupHref}
                packId={priorityAction.packId}
                eventType="dashboard_priority_profile_cta"
                ctaLabel={priorityAction.followupCtaLabel}
                ctaVariant={priorityAction.followupCtaVariant}
                missionView={missionView}
              >
                {priorityAction.followupCtaLabel}
              </MissionLink>
            </div>
          </div>
        ) : null}
        <div className="panel panel--glass">
          <div className="panel__header">
            <div>
              <p className="eyebrow">Progress and rewards</p>
              <h3>{data.user.tokenProgram.status === "redeemable" ? "Rewards are unlocked" : "How your progress is building"}</h3>
            </div>
            <span className="badge badge--pink">{data.user.tokenProgram.eligibilityPoints} pts</span>
          </div>
          <div className="economy-stack">
            <article className="economy-step-card economy-step-card--core">
              <div className="quest-card__meta">
                <span className="economy-badge economy-badge--core">XP core</span>
                <span>{data.user.totalXp.toLocaleString()} XP</span>
              </div>
              <strong>XP keeps everything moving.</strong>
              <p>Levels, streaks, weekly progress, and referrals all build from here.</p>
            </article>
            <article className="economy-step-card economy-step-card--bridge">
              <div className="quest-card__meta">
                <span className="economy-badge economy-badge--bridge">Reward progress</span>
                <span>{data.user.tokenProgram.eligibilityPoints} pts</span>
              </div>
              <strong>Your progress moves you closer to rewards.</strong>
              <p>Wallet connection, steady activity, and completed quests all help move this forward.</p>
            </article>
            <article className="economy-step-card economy-step-card--rail economy-step-card--full-span">
              <div className="quest-card__meta">
                <span className="economy-badge economy-badge--rail">Rewards</span>
                <span>{data.user.tokenProgram.asset}</span>
              </div>
              <strong>Rewards grow with your progress.</strong>
              <p>As your progress builds, the reward side of the experience becomes more meaningful.</p>
            </article>
          </div>
          <div className="info-grid">
            <div className="info-card">
              <span>Reward preview</span>
              <strong>
                {data.user.tokenProgram.projectedRedemptionAmount} {data.user.tokenProgram.asset}
              </strong>
            </div>
            <div className="info-card">
              <span>Minimum unlock</span>
              <strong>{data.user.tokenProgram.minimumPoints} pts</strong>
            </div>
            <div className="info-card">
              <span>Bonus multiplier</span>
              <strong>{data.user.tokenProgram.tierMultiplier.toFixed(2)}x</strong>
            </div>
            <div className="info-card">
              <span>Reward status</span>
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
              points to the next reward milestone.
            </p>
          ) : null}
          {data.user.tokenProgram.redemptionHistory.length > 0 ? (
            <div className="achievement-list">
              {data.user.tokenProgram.redemptionHistory.slice(0, 2).map((entry) => (
                <article key={`${entry.asset}-${entry.createdAt}-${entry.tokenAmount}`} className="achievement-card">
                  <div>
                    <strong>{entry.status === "settled" ? "Reward settled" : "Reward claimed"}</strong>
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
        <div className="panel panel--glass">
          <div className="panel__header">
            <div>
              <p className="eyebrow">Weekly progress</p>
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
                : "You are at the top weekly band."}
            </small>
          </div>
          <p className="form-note">
            {data.user.rewardEligibility.eligible
              ? "Your rewards path is open."
              : `Next reward step: ${data.user.rewardEligibility.nextRequirement ?? "keep progressing through activation and weekly progress"}.`}
          </p>
          <p className="form-note">
            Focus this week: {data.economy.campaignPreset.featuredTracks.join(", ")}.
          </p>
          {data.campaignPacks[0] ? (
            <p className="form-note">
              Active mission goal: {data.campaignPacks[0].weeklyGoal.targetXp} XP this week. {data.campaignPacks[0].weeklyGoal.label}
            </p>
          ) : null}
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
            <p className="eyebrow">Premium path</p>
            <h3>Why premium helps</h3>
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
                <strong>Premium benefit</strong>
                <p>{hook}</p>
              </div>
            </article>
          ))}
            <article className="achievement-card">
              <div>
                <strong>Campaign boost</strong>
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
                <strong>Current source</strong>
                <p>
                  Attribution remains {campaignPreset.attributionSource}, while premium offers are currently shaped by {campaignPreset.source}.
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
              <strong>Recommended upgrade sequence</strong>
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
            <p className="eyebrow">Membership tiers</p>
            <h3>Free, Monthly, and Annual</h3>
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
  const activeQuests = data.quests.filter((quest) => quest.status !== "locked");
  const lockedPreviews = data.quests.filter((quest) => quest.status === "locked");
  const groupedActivePhases = QUEST_BOARD_PHASES.map((phase) => ({
    ...phase,
    quests: activeQuests.filter((quest) => Boolean(quest.slug && phase.slugs.some((slug) => slug === quest.slug))),
  })).filter((group) => group.quests.length > 0);
  const phasedQuestIds = new Set(groupedActivePhases.flatMap((group) => group.quests.map((quest) => quest.id)));
  const overflowQuests = activeQuests.filter((quest) => !phasedQuestIds.has(quest.id));

  return (
    <section className="panel" id="quest-board">
      <div className="panel__header">
        <div>
          <p className="eyebrow">Quest board</p>
          <h3>Your quests, ordered by what matters most next</h3>
        </div>
        <span className="badge">{activeQuests.length} active / {lockedPreviews.length} previewed</span>
      </div>
      <p className="form-note">
        Start with activation, build consistency, then move into optional commitment, rewards, and growth quests.
      </p>
      <div className="track-board">
        {groupedActivePhases.map((group) => (
          <section key={group.key} className="panel panel--glass">
            <div className="panel__header">
              <div>
                <p className="eyebrow">{group.eyebrow}</p>
                <h3>{group.title}</h3>
              </div>
              <span className="badge">{group.quests.length} live</span>
            </div>
            <p className="form-note">{group.description}</p>
            <div className="quest-grid">{group.quests.map(renderQuestCard)}</div>
          </section>
        ))}
        {overflowQuests.length > 0 ? (
          <section className="panel panel--glass">
            <div className="panel__header">
              <div>
                <p className="eyebrow">Additional live quests</p>
                <h3>More active quests</h3>
              </div>
              <span className="badge">{overflowQuests.length} live</span>
            </div>
            <p className="form-note">These quests are still live, but they sit outside the main core flow.</p>
            
            <div className="quest-grid">{overflowQuests.map(renderQuestCard)}</div>
          </section>
        ) : null}
        <section className="panel panel--glass">
          <div className="panel__header">
            <div>
              <p className="eyebrow">Locked previews</p>
              <h3>What unlocks later</h3>
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
            <h3>See who is leading right now</h3>
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
              <span>Reward progress</span>
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
              <span>Reward status</span>
              <strong>{data.user.tokenProgram.claimedBalance} / {data.user.tokenProgram.settledBalance}</strong>
            </div>
          <div className="info-card">
            <span>Current momentum</span>
            <strong>{campaignPreset.leaderboardMomentumMultiplier.toFixed(2)}x</strong>
          </div>
          <div className="info-card">
            <span>Premium boost</span>
            <strong>{campaignPreset.premiumUpsellMultiplier.toFixed(2)}x</strong>
          </div>
        </div>
        <div className="reward-visual-grid">
          <article className="reward-visual-card">
            <div className="quest-card__meta">
              <span>Progress</span>
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
            <small>Leaderboard movement reflects the progress you are building through quests, streaks, and repeat activity.</small>
          </article>
          <article className="reward-visual-card">
            <div className="quest-card__meta">
              <span>Reward status</span>
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
            <small>Claimed rewards are reserved. Settled rewards have already completed payout.</small>
          </article>
          <article className="reward-visual-card">
            <div className="quest-card__meta">
              <span>Current boost mix</span>
              <span>Live settings</span>
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
            <small>Your current setup changes how quickly progress, reward progress, and yield build over time.</small>
          </article>
        </div>
        <p className="form-note">
          Strong rankings are built through weekly progress, better referral performance, and steady follow-through.
        </p>
      </div>
      <div className="panel">
        <div className="panel__header">
          <div>
            <p className="eyebrow">Referrals</p>
            <h3>Who is bringing in the strongest invites</h3>
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
            Referral rank reflects both the number of people you bring in and how far they go once they join.
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
                <strong>{rankPressurePack.label} is helping shape the board right now</strong>
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
      <div className="panel panel--full-span">
        <div className="panel__header">
          <div>
            <p className="eyebrow">Live activity</p>
            <h3>Recent activity</h3>
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
            <h3>Connections and account setup</h3>
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
      <ProfileMissionRecapPanel activePacks={data.campaignPacks} packHistory={data.campaignPackHistory} />
      <CampaignMissionInboxPanel
        notifications={data.campaignNotifications}
        activePacks={data.campaignPacks}
        missionView="reward"
        title="Mission inbox"
        eyebrow="Profile mission inbox"
      />
      <MissionPackDetailPanel
        activePacks={data.campaignPacks}
        packHistory={data.campaignPackHistory}
        missionView="reward"
        title="Mission detail"
        eyebrow="Profile mission detail"
      />
      <MissionEventHistoryPanel
        entries={data.missionEventHistory}
        activePacks={data.campaignPacks}
        packHistory={data.campaignPackHistory}
        missionView="reward"
      />
      <div className="panel">
        <div className="panel__header">
          <div>
            <p className="eyebrow">Referrals</p>
            <h3>Referral progress</h3>
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
              <strong>Monthly upgrade referral</strong>
              <p>Extra XP and added reward progress when one of your invites upgrades monthly.</p>
            </div>
            <div className="achievement-card__side">
              <span>+{data.user.referral.rewardPreview.monthlyPremiumReferral.xp} XP</span>
              <span>{data.user.referral.rewardPreview.monthlyPremiumReferral.tokenEffect.replaceAll("_", " ")}</span>
            </div>
          </article>
          <article className="achievement-card">
            <div>
              <strong>Annual upgrade referral</strong>
              <p>The strongest referral outcome, with more XP and the biggest added reward upside.</p>
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
                  Sign-up {bonus.signupXp} XP, monthly {bonus.monthlyPremiumXp} XP, annual {bonus.annualPremiumXp} XP.
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
            ? `You joined through ${data.user.campaignSource}. Matching quests and referral bonuses will show up first when they apply to you.`
            : "You joined directly. Partner-specific quests will appear later if you take part in one."}
        </p>
      </div>
      <div className="panel">
        <div className="panel__header">
          <div>
            <p className="eyebrow">Progress gates</p>
            <h3>Activation and reward progress</h3>
          </div>
          <span className="badge">{data.user.weeklyProgress.tierLabel}</span>
        </div>
        <div className="achievement-list">
          <article className="achievement-card">
            <div>
              <strong>{data.user.starterPath.title}</strong>
              <p>
                {Math.round(data.user.starterPath.progress * 100)}% complete.{" "}
                {data.user.rewardEligibility.eligible
                  ? "Reward eligibility is live."
                  : `Next reward gate: ${data.user.rewardEligibility.nextRequirement ?? "keep progressing through the activation ladder and weekly flow"}.`}
              </p>
            </div>
            <div className="achievement-card__side">
              <span>{data.user.rewardEligibility.trustScoreBand} trust</span>
              <span>{data.user.weeklyProgress.xp} weekly XP</span>
            </div>
          </article>
          <article className="achievement-card">
            <div>
              <strong>Reward progress</strong>
              <p>
                {data.user.tokenProgram.eligibilityPoints} eligibility points banked.{" "}
                {data.user.tokenProgram.status === "redeemable"
                  ? `Reward preview: ${data.user.tokenProgram.projectedRedemptionAmount} ${data.user.tokenProgram.asset}.`
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
              <strong>Claimed and settled rewards</strong>
              <p>
                Claimed rewards are reserved and awaiting payout. Settled balances have already been delivered.
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
            <h3>Achievements and milestones</h3>
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
            <h3>Your achievements at a glance</h3>
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
            <h3>Your completed achievements</h3>
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
            <p className="form-note">No achievements unlocked yet. Keep moving through the active quests.</p>
          )}
        </div>
      </div>
      <div className="panel">
        <div className="panel__header">
          <div>
            <p className="eyebrow">In progress</p>
            <h3>What to focus on next</h3>
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
        <CampaignMissionCtaAnalyticsPanel
          entries={data.campaignOperations.missionCtaAnalytics}
          tierEntries={data.campaignOperations.missionCtaByTier}
        />
        <div className="info-grid">
          {data.campaignOperations.returnWindowSummary.map((entry) => (
            <div key={entry.window} className="info-card">
              <span>
                {entry.window === "today"
                  ? "Return today"
                  : entry.window === "this_week"
                    ? "Return this week"
                    : "Wait for unlock"}
              </span>
              <strong>{entry.count}</strong>
            </div>
          ))}
          {data.campaignOperations.returnWindowTrend.map((entry) => (
            <div key={`trend-${entry.window}`} className="info-card">
              <span>
                {entry.window === "today"
                  ? "Today trend"
                  : entry.window === "this_week"
                    ? "This-week trend"
                    : "Unlock trend"}
              </span>
              <strong>
                {entry.delta >= 0 ? "+" : ""}
                {entry.delta}
              </strong>
            </div>
          ))}
        </div>
        <div className="achievement-list">
          {data.campaignOperations.returnWindowTrend.map((entry) => {
            const peak = Math.max(
              ...data.campaignOperations.returnWindowTrend.map((item) => Math.max(item.currentCount, item.previousCount)),
              1,
            );
            return (
              <article key={`return-window-chart-${entry.window}`} className="achievement-card">
                <div>
                  <strong>
                    {entry.window === "today"
                      ? "Return today"
                      : entry.window === "this_week"
                        ? "Return this week"
                        : "Wait for unlock"}
                  </strong>
                  <p>
                    Current {entry.currentCount} vs previous {entry.previousCount}. Delta {entry.delta >= 0 ? "+" : ""}
                    {entry.delta}.
                  </p>
                  <div className="reward-state-bars">
                    <div>
                      <span>Current</span>
                      <div className="reward-state-bars__track">
                        <div className="reward-state-bars__fill" style={{ width: `${(entry.currentCount / peak) * 100}%` }} />
                      </div>
                    </div>
                    <div>
                      <span>Previous</span>
                      <div className="reward-state-bars__track">
                        <div className="reward-state-bars__fill" style={{ width: `${(entry.previousCount / peak) * 100}%` }} />
                      </div>
                    </div>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
        <div className="achievement-list">
          {data.campaignOperations.missionInboxHistory.map((entry) => (
            <article key={entry.id} className="achievement-card">
              <div>
                <strong>{entry.displayName}</strong>
                <p>
                  {entry.status === "handled" ? "Handled" : "Snoozed"} a mission reminder for {entry.packLabel}.
                </p>
                <p className="form-note">{entry.detail}</p>
              </div>
              <div className="achievement-card__side">
                <span>{entry.status}</span>
                <span>{entry.until ? `until ${new Date(entry.until).toLocaleString()}` : "no expiry"}</span>
                <span>{new Date(entry.createdAt).toLocaleString()}</span>
              </div>
            </article>
          ))}
        </div>
        <div className="info-grid">
          {data.campaignOperations.missionReminderStatusTrend.map((entry) => (
            <div key={`reminder-status-${entry.status}`} className="info-card">
              <span>{entry.status === "handled" ? "Handled reminders" : "Snoozed reminders"}</span>
              <strong>
                {entry.delta >= 0 ? "+" : ""}
                {entry.delta}
              </strong>
            </div>
          ))}
          {data.campaignOperations.blockageSummary.map((entry) => (
            <div key={`blockage-${entry.state}`} className="info-card">
              <span>{entry.state.replaceAll("_", " ")}</span>
              <strong>{entry.count}</strong>
            </div>
          ))}
        </div>
        <div className="achievement-list">
          {data.campaignOperations.blockageTrend.map((entry) => (
            <article key={`blockage-trend-${entry.state}`} className="achievement-card">
              <div>
                <strong>{entry.state.replaceAll("_", " ")}</strong>
                <p>
                  Current {entry.currentCount} vs previous {entry.previousCount}. Delta {entry.delta >= 0 ? "+" : ""}
                  {entry.delta}.
                </p>
              </div>
            </article>
          ))}
        </div>
        <div className="achievement-list">
          {data.campaignOperations.reminderVariantSummary.map((entry) => (
            <article key={`reminder-variant-${entry.variant}`} className="achievement-card">
              <div>
                <strong>{entry.variant.replaceAll("_", " ")}</strong>
                <p>
                  {entry.handledCount} handled, {entry.snoozedCount} snoozed, {Math.round(entry.handledRate * 100)}% handled rate.
                </p>
              </div>
            </article>
          ))}
        </div>
        <div className="achievement-list">
          {data.campaignOperations.packAnalytics
            .filter((pack) => pack.activeQuestCount > 0 && pack.missionCtaSummary.recommendedBadge)
            .slice(0, 4)
            .map((pack) => (
              <article key={`pack-cta-quick-${pack.packId}`} className="achievement-card">
                <div>
                  <strong>{pack.label}</strong>
                  <p>{pack.missionCtaSummary.recommendedReason}</p>
                  <p className="form-note">{pack.operatorNextMove.title}</p>
                  <p className="form-note">{pack.operatorNextMove.detail}</p>
                  <p className="form-note">
                    Reminder effectiveness: {pack.reminderEffectiveness.handledCount} handled, {pack.reminderEffectiveness.snoozedCount} snoozed.
                  </p>
                </div>
                <div className="achievement-card__side">
                  <span>{pack.missionCtaSummary.recommendedBadge}</span>
                  <span>{pack.missionCtaSummary.recommendedVariant}</span>
                </div>
              </article>
            ))}
        </div>
        <div className="achievement-list">
          {data.campaignOperations.reminderScheduleSummary.map((entry) => (
            <article key={`reminder-schedule-${entry.schedule}`} className="achievement-card">
              <div>
                <strong>{entry.schedule.replaceAll("_", " ")}</strong>
                <p>
                  Current {entry.currentCount} vs previous {entry.previousCount}. Delta {entry.delta >= 0 ? "+" : ""}
                  {entry.delta}.
                </p>
              </div>
            </article>
          ))}
        </div>
        <div className="achievement-list">
          {data.campaignOperations.reminderVariantTrend.map((entry) => (
            <article key={`reminder-variant-trend-${entry.variant}`} className="achievement-card">
              <div>
                <strong>{entry.variant.replaceAll("_", " ")}</strong>
                <p>
                  Current {entry.currentCount} vs previous {entry.previousCount}. Delta {entry.delta >= 0 ? "+" : ""}
                  {entry.delta}.
                </p>
              </div>
            </article>
          ))}
        </div>
        <div className="achievement-list">
          {data.campaignOperations.reminderVariantByBlockage.map((entry) => (
            <article key={`reminder-variant-blockage-${entry.state}-${entry.variant}`} className="achievement-card">
              <div>
                <strong>
                  {entry.variant.replaceAll("_", " ")} on {entry.state.replaceAll("_", " ")}
                </strong>
                <p>
                  {entry.handledCount} handled, {entry.snoozedCount} snoozed.
                </p>
              </div>
            </article>
          ))}
        </div>
        <div className="achievement-list">
          {data.campaignOperations.reminderVariantScheduleSummary.map((entry) => (
            <article key={`reminder-variant-schedule-${entry.variant}-${entry.schedule}`} className="achievement-card">
              <div>
                <strong>
                  {entry.variant.replaceAll("_", " ")} on {entry.schedule.replaceAll("_", " ")}
                </strong>
                <p>
                  {entry.handledCount} handled, {entry.snoozedCount} snoozed.
                </p>
              </div>
            </article>
          ))}
        </div>
        <div className="achievement-list">
          {data.campaignOperations.blockageSuggestions.map((entry) => (
            <article key={`blockage-suggestion-${entry.state}`} className="achievement-card">
              <div>
                <strong>{entry.title}</strong>
                <p>{entry.detail}</p>
              </div>
            </article>
          ))}
        </div>
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
