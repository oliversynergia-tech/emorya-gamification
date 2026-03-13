import type {
  EvaluatedQuest,
  QuestRuntimeContext,
  QuestStatus,
  RewardConfig,
  UnlockRuleGroup,
  UserJourneyState,
  UserProgressState,
} from "@/lib/types";
import { evaluateUnlockRuleGroup } from "@/server/services/evaluate-unlock-rules";
import { generateUnlockHint } from "@/server/services/generate-unlock-hint";
import { projectQuestReward } from "@/server/services/project-quest-reward";

export function evaluateQuest({
  id,
  title,
  track,
  completionStatus,
  rewardConfig,
  unlockRules,
  userState,
  runtimeContext,
  recommended,
  journeyState,
}: {
  id: string;
  title: string;
  track: EvaluatedQuest["track"];
  completionStatus: QuestStatus;
  rewardConfig: RewardConfig;
  unlockRules: UnlockRuleGroup;
  userState: UserProgressState;
  runtimeContext: QuestRuntimeContext;
  recommended?: boolean;
  journeyState: UserJourneyState;
}): EvaluatedQuest {
  const unlockEvaluation = evaluateUnlockRuleGroup(unlockRules, userState, runtimeContext);
  const projectedReward = projectQuestReward({
    rewardConfig,
    subscriptionTier: userState.subscriptionTier,
    runtimeContext,
    walletLinked: userState.walletLinked,
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
    status,
    visible: status !== "completed" || track === "daily",
    lockedReason: status === "locked" ? "Requirements not met yet." : null,
    unlockHint,
    projectedReward,
    sortScore,
  };
}
