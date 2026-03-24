import { defaultEconomySettings } from "../../lib/economy-settings.ts";
import type {
  EconomySettings,
  EvaluatedQuest,
  QuestRuntimeContext,
  QuestStatus,
  RewardConfig,
  UnlockRuleGroup,
  UserJourneyState,
  UserProgressState,
} from "../../lib/types.ts";
import { evaluateUnlockRuleGroup } from "./evaluate-unlock-rules.ts";
import { generateUnlockHint } from "./generate-unlock-hint.ts";
import { projectQuestReward } from "./project-quest-reward.ts";

export function evaluateQuest({
  id,
  title,
  track,
  launchOrder,
  completionStatus,
  rewardConfig,
  unlockRules,
  userState,
  runtimeContext,
  recommended,
  journeyState,
  settings = defaultEconomySettings,
}: {
  id: string;
  title: string;
  track: EvaluatedQuest["track"];
  launchOrder?: number;
  completionStatus: QuestStatus;
  rewardConfig: RewardConfig;
  unlockRules: UnlockRuleGroup;
  userState: UserProgressState;
  runtimeContext: QuestRuntimeContext;
  recommended?: boolean;
  journeyState: UserJourneyState;
  settings?: EconomySettings;
}): EvaluatedQuest {
  const unlockEvaluation = evaluateUnlockRuleGroup(unlockRules, userState, runtimeContext);
  const projectedReward = projectQuestReward({
    rewardConfig,
    track,
    subscriptionTier: userState.subscriptionTier,
    runtimeContext,
    walletLinked: userState.walletLinked,
    campaignSource: userState.campaignSource,
    settings,
  });

  let status: EvaluatedQuest["status"];

  switch (completionStatus) {
    case "completed":
      status = "completed";
      break;
    case "in-progress":
      status = "in_progress";
      break;
    case "rejected":
      status = unlockEvaluation.unlocked ? "rejected" : "locked";
      break;
    default:
      status = unlockEvaluation.unlocked ? "active" : "locked";
  }

  const unmetRules = [...unlockEvaluation.unmetAll, ...unlockEvaluation.unmetAny];
  const unlockHint = status === "locked" ? generateUnlockHint(unmetRules) : null;

  let sortScore = projectedReward.xp;

  if (recommended) {
    sortScore += 1000;
  }

  if (journeyState === "signed_up_free" && track === "starter") {
    sortScore += 500;
  }

  if (journeyState === "reward_eligible_free" && track === "wallet") {
    sortScore += 300;
  }

  return {
    id,
    title,
    track,
    launchOrder,
    status,
    visible: status !== "completed" || track === "daily",
    lockedReason: status === "locked" ? "Requirements not met yet." : null,
    unlockHint,
    projectedReward,
    sortScore,
  };
}
