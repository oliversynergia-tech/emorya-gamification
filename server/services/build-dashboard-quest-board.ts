import type { BrandThemeId } from "@/lib/brand-themes";
import { questVisibleForBrand } from "../../lib/quest-portability.ts";
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
  QuestTaskBlock,
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
  ["complete-your-profile", 6],
  ["confirm-your-starter-setup", 7],
  ["complete-daily-wheel-spin", 8],
  ["play-emoryan-adventure-game", 9],
  ["download-xportal", 10],
  ["open-or-create-your-xportal-wallet", 11],
  ["connect-your-xportal-wallet", 12],
  ["view-your-emrs-reward-path", 13],
  ["convert-your-first-calories", 14],
  ["complete-the-full-activation-ladder", 15],
  ["stake-your-first-emr", 16],
  ["upgrade-to-premium-monthly", 17],
  ["500-in-24", 18],
  ["reach-staking-threshold-a", 19],
  ["weekly-warrior", 20],
  ["convert-2000-calories-to-emrs", 21],
  ["upgrade-to-annual", 22],
  ["reach-staking-threshold-b", 23],
  ["unlock-apy-boost-status", 24],
  ["strengthen-the-core-30-day-hold", 25],
  ["referred-staker-bonus", 26],
  ["emorya-marathon", 27],
  ["rate-emorya-on-the-app-store", 28],
  ["leave-your-first-emorya-review", 29],
  ["share-your-verified-progress-screenshot", 30],
  ["invite-your-first-accountability-partner", 31],
  ["refer-one-user-who-converts-calories", 32],
  ["this-weeks-ugc-challenge", 33],
  ["create-an-emorya-progress-reel", 34],
  ["join-emorya-discord", 35],
  ["like-this-weeks-emorya-post", 36],
  ["share-an-emorya-post", 37],
]);

function normalizeQuestTaskBlocks(metadata: Record<string, unknown>): QuestTaskBlock[] | undefined {
  const rawTaskBlocks = metadata.taskBlocks;
  if (!Array.isArray(rawTaskBlocks)) {
    return undefined;
  }

  const taskBlocks = rawTaskBlocks.reduce<QuestTaskBlock[]>((allTasks, rawTask, index) => {
    if (!rawTask || typeof rawTask !== "object") {
      return allTasks;
    }

    const task = rawTask as Record<string, unknown>;
    const label = typeof task.label === "string" ? task.label.trim() : "";
    if (!label) {
      return allTasks;
    }

    allTasks.push({
      id:
        typeof task.id === "string" && task.id.trim().length > 0
          ? task.id.trim()
          : `task-${index + 1}`,
      label,
      description: typeof task.description === "string" ? task.description : undefined,
      platformLabel: typeof task.platformLabel === "string" ? task.platformLabel : undefined,
      ctaLabel: typeof task.ctaLabel === "string" ? task.ctaLabel : undefined,
      targetUrl: typeof task.targetUrl === "string" ? task.targetUrl : undefined,
      helpUrl: typeof task.helpUrl === "string" ? task.helpUrl : undefined,
      verificationReferenceUrl:
        typeof task.verificationReferenceUrl === "string" ? task.verificationReferenceUrl : undefined,
      proofType: typeof task.proofType === "string" ? task.proofType : undefined,
      proofInstructions: typeof task.proofInstructions === "string" ? task.proofInstructions : undefined,
      required: typeof task.required === "boolean" ? task.required : true,
    });

    return allTasks;
  }, []);

  return taskBlocks.length > 0 ? taskBlocks : undefined;
}

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
    slug: quest.slug,
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
    platformLabel: typeof quest.metadata?.platformLabel === "string" ? quest.metadata.platformLabel : undefined,
    ctaLabel: typeof quest.metadata?.ctaLabel === "string" ? quest.metadata.ctaLabel : undefined,
    targetUrl: typeof quest.metadata?.targetUrl === "string" ? quest.metadata.targetUrl : undefined,
    helpUrl: typeof quest.metadata?.helpUrl === "string" ? quest.metadata.helpUrl : undefined,
    verificationReferenceUrl:
      typeof quest.metadata?.verificationReferenceUrl === "string" ? quest.metadata.verificationReferenceUrl : undefined,
    proofType: typeof quest.metadata?.proofType === "string" ? quest.metadata.proofType : undefined,
    proofInstructions: typeof quest.metadata?.proofInstructions === "string" ? quest.metadata.proofInstructions : undefined,
    taskBlocks: normalizeQuestTaskBlocks(quest.metadata),
    campaignPackId: typeof quest.metadata?.campaignPackId === "string" ? quest.metadata.campaignPackId : undefined,
    campaignPackLabel: typeof quest.metadata?.campaignPackLabel === "string" ? quest.metadata.campaignPackLabel : undefined,
  };
}

export function buildDashboardQuestBoard({
  quests,
  userProgressState,
  journeyState,
  settings = defaultEconomySettings,
  runtimeBrandThemeId = "emorya",
}: {
  quests: DashboardQuestRow[];
  userProgressState: UserProgressState;
  journeyState: UserJourneyState;
  settings?: EconomySettings;
  runtimeBrandThemeId?: BrandThemeId;
}) {
  const visibleQuests = quests.filter((quest) => questVisibleForBrand(quest.metadata, runtimeBrandThemeId));
  const runtimeContext = createDefaultQuestRuntimeContext();
  const activeCampaignLane = resolveCampaignExperienceSource(settings, userProgressState.campaignSource);
  const featuredTracks = getCampaignFeaturedTracks(
    activeCampaignLane,
    getCampaignEconomyOverride(settings, userProgressState.campaignSource),
  );
  const activeMissionPackIds = Array.from(
    new Set(
      quests
        .filter((quest) => questVisibleForBrand(quest.metadata, runtimeBrandThemeId))
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

  for (const quest of visibleQuests) {
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
