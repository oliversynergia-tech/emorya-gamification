import type { EvaluatedQuest, UserJourneyState } from "@/lib/types";

function getRecommendedTrackOrder(journeyState: UserJourneyState) {
  switch (journeyState) {
    case "signed_up_free":
      return ["starter", "daily", "social", "wallet", "referral", "premium", "campaign", "creative", "ambassador", "quiz"];
    case "activated_free":
      return ["daily", "wallet", "referral", "social", "premium", "campaign", "quiz", "creative", "ambassador", "starter"];
    case "reward_eligible_free":
      return ["wallet", "referral", "daily", "premium", "social", "campaign", "creative", "ambassador", "quiz", "starter"];
    case "monthly_premium":
      return ["premium", "referral", "daily", "wallet", "campaign", "social", "creative", "ambassador", "quiz", "starter"];
    case "annual_premium":
      return ["premium", "referral", "wallet", "campaign", "daily", "ambassador", "social", "creative", "quiz", "starter"];
    case "ambassador_candidate":
    case "ambassador":
      return ["ambassador", "referral", "wallet", "premium", "campaign", "daily", "creative", "social", "quiz", "starter"];
    default:
      return ["starter", "daily", "social", "wallet", "referral", "premium", "campaign", "creative", "ambassador", "quiz"];
  }
}

function computeTrackPriority(track: string, journeyState: UserJourneyState) {
  const order = getRecommendedTrackOrder(journeyState);
  const index = order.indexOf(track);
  return index === -1 ? order.length : index;
}

export function selectQuestBoard({
  quests,
  journeyState,
}: {
  quests: EvaluatedQuest[];
  journeyState: UserJourneyState;
}) {
  const active = quests
    .filter((quest) => quest.visible && (quest.status === "active" || quest.status === "in_progress" || quest.status === "rejected"))
    .sort((left, right) => {
      const priorityDelta = computeTrackPriority(left.track, journeyState) - computeTrackPriority(right.track, journeyState);
      if (priorityDelta !== 0) {
        return priorityDelta;
      }

      return right.sortScore - left.sortScore;
    })
    .slice(0, 15);

  const lockedPreviews = quests
    .filter((quest) => quest.visible && quest.status === "locked")
    .sort((left, right) => right.sortScore - left.sortScore)
    .slice(0, 5);

  return {
    active,
    lockedPreviews,
    quests: [...active, ...lockedPreviews],
  };
}
