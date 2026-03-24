import { defaultEconomySettings, getCampaignEconomyOverride, resolveCampaignExperienceSource } from "../../lib/economy-settings.ts";
import {
  buildRewardConfig,
  buildUnlockRules,
  createDefaultQuestRuntimeContext,
  inferQuestTrack,
  inferTokenEffect,
  mapQuestCadence,
} from "../../lib/progression-rules.ts";
import { getCampaignFeaturedTracks } from "../../lib/campaign-source.ts";
import { getBrandSafeQuestDescription, getBrandSafeQuestTitle } from "../../lib/brand-copy.ts";
import type {
  EconomySettings,
  EvaluatedQuest,
  Quest,
  QuestCadence,
  QuestCategory,
  SubscriptionTier,
  UserJourneyState,
  UserProgressState,
  VerificationType,
} from "../../lib/types.ts";
import { evaluateQuest } from "./evaluate-quest.ts";
import { selectQuestBoard } from "./select-quest-board.ts";

export type DashboardQuestRow = {
  id: string;
  slug: string;
  title: string;
  description: string;
  category: QuestCategory;
  xp_reward: number;
  difficulty: Quest["difficulty"];
  verification_type: VerificationType;
  required_level: number;
  required_tier: SubscriptionTier;
  is_premium_preview: boolean;
  recurrence: "one-time" | "daily" | "weekly" | "monthly";
  metadata: Record<string, unknown>;
  completion_status: "pending" | "approved" | "rejected" | null;
};

const EMORYA_LAUNCH_ORDER = new Map<string, number>([
  ["join-emorya-telegram", 1],
  ["follow-emorya-on-x", 2],
  ["download-the-emorya-app", 3],
  ["open-the-app-for-the-first-time", 4],
  ["create-emorya-account", 5],
  ["complete-daily-wheel-spin", 6],
  ["play-emoryan-adventure-game", 7],
  ["connect-your-xportal-wallet", 8],
  ["view-your-emrs-reward-path", 9],
  ["convert-your-first-calories", 10],
  ["upgrade-to-premium-monthly", 11],
  ["500-in-24", 12],
  ["weekly-warrior", 13],
  ["convert-2000-calories-to-emrs", 14],
  ["upgrade-to-annual", 15],
  ["emorya-marathon", 16],
  ["rate-emorya-on-the-app-store", 17],
  ["leave-your-first-emorya-review", 18],
  ["share-your-verified-progress-screenshot", 19],
  ["invite-your-first-accountability-partner", 20],
  ["refer-one-user-who-converts-calories", 21],
  ["this-weeks-ugc-challenge", 22],
  ["create-an-emorya-progress-reel", 23],
  ["join-emorya-discord", 24],
  ["like-this-weeks-emorya-post", 25],
  ["share-an-emorya-post", 26],
]);

function deriveCompletionStatus(quest: DashboardQuestRow): Quest["status"] {
  if (quest.completion_status === "approved") {
    return "completed";
  }

  if (quest.completion_status === "pending") {
    return "in-progress";
  }

  if (quest.completion_status === "rejected") {
    return "rejected";
  }

  return "available";
}

function mapEvaluatedQuestToQuest({
  quest,
  evaluatedQuest,
  cadence,
}: {
  quest: DashboardQuestRow;
  evaluatedQuest: EvaluatedQuest;
  cadence: QuestCadence;
}): Quest {
  return {
    id: quest.id,
    title: getBrandSafeQuestTitle(quest.title),
    description: getBrandSafeQuestDescription(quest.description),
    category: quest.category,
    track: evaluatedQuest.track,
    cadence,
    xpReward: quest.xp_reward,
    projectedXp: evaluatedQuest.projectedReward.xp,
    tokenEffect: evaluatedQuest.projectedReward.tokenEffect,
    projectedDirectTokenReward: evaluatedQuest.projectedReward.directTokenReward
      ? {
          asset: evaluatedQuest.projectedReward.directTokenReward.asset,
          amount: evaluatedQuest.projectedReward.directTokenReward.amount,
        }
      : undefined,
    difficulty: quest.difficulty,
    verificationType: quest.verification_type,
    status:
      evaluatedQuest.status === "active"
        ? "available"
        : evaluatedQuest.status === "in_progress"
          ? "in-progress"
          : evaluatedQuest.status === "cooldown"
            ? "locked"
            : evaluatedQuest.status,
    lockedReason: evaluatedQuest.lockedReason,
    unlockHint: evaluatedQuest.unlockHint,
    recommended: evaluatedQuest.sortScore >= 1000,
    requiredLevel: quest.required_level,
    requiredTier: quest.required_tier,
    premiumPreview: quest.is_premium_preview,
    timebox: typeof quest.metadata?.timebox === "string" ? quest.metadata.timebox : undefined,
    targetUrl: typeof quest.metadata?.targetUrl === "string" ? quest.metadata.targetUrl : undefined,
    campaignPackId: typeof quest.metadata?.campaignPackId === "string" ? quest.metadata.campaignPackId : undefined,
    campaignPackLabel: typeof quest.metadata?.campaignPackLabel === "string" ? quest.metadata.campaignPackLabel : undefined,
  };
}

export function buildDashboardQuestBoard({
  quests,
  userProgressState,
  journeyState,
  settings = defaultEconomySettings,
}: {
  quests: DashboardQuestRow[];
  userProgressState: UserProgressState;
  journeyState: UserJourneyState;
  settings?: EconomySettings;
}) {
  const runtimeContext = createDefaultQuestRuntimeContext();
  const activeCampaignLane = resolveCampaignExperienceSource(settings, userProgressState.campaignSource);
  const featuredTracks = getCampaignFeaturedTracks(
    activeCampaignLane,
    getCampaignEconomyOverride(settings, userProgressState.campaignSource),
  );
  const activeMissionPackIds = Array.from(
    new Set(
      quests
        .filter((quest) =>
          quest.metadata?.campaignPackId &&
          quest.metadata?.campaignPackState === "live" &&
          (quest.metadata?.campaignExperienceLane === activeCampaignLane ||
            quest.metadata?.campaignAttributionSource === (userProgressState.campaignSource ?? "direct")),
        )
        .map((quest) => String(quest.metadata.campaignPackId)),
    ),
  );
  const evaluatedByQuestId = new Map<string, { evaluatedQuest: EvaluatedQuest; cadence: QuestCadence }>();

  for (const quest of quests) {
    const track = inferQuestTrack({
      slug: quest.slug,
      category: quest.category,
      verificationType: quest.verification_type,
      isPremiumPreview: quest.is_premium_preview,
      metadata: quest.metadata,
    });
    const cadence = mapQuestCadence(quest.recurrence, quest.metadata);
    const tokenEffect = inferTokenEffect(track, quest.metadata);
    const rewardConfig = buildRewardConfig({
      baseXp: quest.xp_reward,
      tokenEffect,
      metadata: quest.metadata,
    });
    const unlockRules = buildUnlockRules({
      requiredLevel: quest.required_level,
      requiredTier: quest.required_tier,
      isPremiumPreview: quest.is_premium_preview,
      track,
      metadata: quest.metadata,
    });
    const completionStatus = deriveCompletionStatus(quest);
    const recommended =
      (journeyState === "signed_up_free" &&
        (track === "starter" ||
          track === "wallet" ||
          track === "social" ||
          (track === "campaign" && activeCampaignLane !== "direct"))) ||
      (journeyState === "activated_free" &&
        (track === "daily" ||
          track === "wallet" ||
          track === "referral" ||
          (track === "campaign" && activeCampaignLane !== "direct"))) ||
      (journeyState === "reward_eligible_free" && (track === "wallet" || track === "referral" || track === "premium")) ||
      ((journeyState === "monthly_premium" || journeyState === "annual_premium") &&
        (track === "premium" || track === "referral" || track === "wallet")) ||
      featuredTracks.includes(track) ||
      (typeof quest.metadata?.campaignPackId === "string" && activeMissionPackIds.includes(quest.metadata.campaignPackId));

    evaluatedByQuestId.set(quest.id, {
      evaluatedQuest: evaluateQuest({
        id: quest.id,
        title: quest.title,
        track,
        launchOrder: EMORYA_LAUNCH_ORDER.get(quest.slug),
        completionStatus,
        rewardConfig,
        unlockRules,
        userState: userProgressState,
        runtimeContext,
        recommended,
        journeyState,
        settings,
      }),
      cadence,
    });
  }

  const selectedBoard = selectQuestBoard({
    quests: Array.from(evaluatedByQuestId.values()).map((entry) => entry.evaluatedQuest),
    journeyState,
    campaignSource: activeCampaignLane,
    featuredTracks,
  });

  return selectedBoard.quests
    .map((selectedQuest) => {
      const quest = quests.find((row) => row.id === selectedQuest.id);
      const evaluated = evaluatedByQuestId.get(selectedQuest.id);

      if (!quest || !evaluated) {
        return null;
      }

      return mapEvaluatedQuestToQuest({
        quest,
        evaluatedQuest: evaluated.evaluatedQuest,
        cadence: evaluated.cadence,
      });
    })
    .filter((quest): quest is Quest => quest !== null);
}
