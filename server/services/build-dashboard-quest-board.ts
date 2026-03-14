import {
  buildRewardConfig,
  buildUnlockRules,
  createDefaultQuestRuntimeContext,
  inferQuestTrack,
  inferTokenEffect,
  mapQuestCadence,
} from "../../lib/progression-rules.ts";
import type {
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
  recurrence: "one-time" | "daily" | "weekly";
  metadata: Record<string, unknown>;
  completion_status: "pending" | "approved" | "rejected" | null;
};

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
    title: quest.title,
    description: quest.description,
    category: quest.category,
    track: evaluatedQuest.track,
    cadence,
    xpReward: quest.xp_reward,
    projectedXp: evaluatedQuest.projectedReward.xp,
    tokenEffect: evaluatedQuest.projectedReward.tokenEffect,
    projectedDirectTokenReward: evaluatedQuest.projectedReward.directTokenReward
      ? {
          asset: evaluatedQuest.projectedReward.directTokenReward.asset as "EMR" | "EGLD" | "PARTNER",
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
  };
}

export function buildDashboardQuestBoard({
  quests,
  userProgressState,
  journeyState,
}: {
  quests: DashboardQuestRow[];
  userProgressState: UserProgressState;
  journeyState: UserJourneyState;
}) {
  const runtimeContext = createDefaultQuestRuntimeContext();
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
          (track === "campaign" && userProgressState.campaignSource !== null && userProgressState.campaignSource !== "direct"))) ||
      (journeyState === "activated_free" &&
        (track === "daily" ||
          track === "wallet" ||
          track === "referral" ||
          (track === "campaign" && userProgressState.campaignSource !== null && userProgressState.campaignSource !== "direct"))) ||
      (journeyState === "reward_eligible_free" && (track === "wallet" || track === "referral" || track === "premium")) ||
      ((journeyState === "monthly_premium" || journeyState === "annual_premium") &&
        (track === "premium" || track === "referral" || track === "wallet"));

    evaluatedByQuestId.set(quest.id, {
      evaluatedQuest: evaluateQuest({
        id: quest.id,
        title: quest.title,
        track,
        completionStatus,
        rewardConfig,
        unlockRules,
        userState: userProgressState,
        runtimeContext,
        recommended,
        journeyState,
      }),
      cadence,
    });
  }

  const selectedBoard = selectQuestBoard({
    quests: Array.from(evaluatedByQuestId.values()).map((entry) => entry.evaluatedQuest),
    journeyState,
    campaignSource: userProgressState.campaignSource,
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
