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

function getTargetTracks(journeyState: UserJourneyState) {
  switch (journeyState) {
    case "signed_up_free":
      return ["starter", "daily", "social", "wallet", "referral"];
    case "activated_free":
      return ["daily", "social", "wallet", "referral", "premium"];
    case "reward_eligible_free":
      return ["daily", "wallet", "referral", "premium", "campaign"];
    case "monthly_premium":
      return ["premium", "daily", "wallet", "referral", "campaign"];
    case "annual_premium":
      return ["premium", "wallet", "referral", "campaign", "daily"];
    case "ambassador_candidate":
    case "ambassador":
      return ["ambassador", "referral", "wallet", "premium", "campaign"];
    default:
      return ["starter", "daily", "social", "wallet", "referral"];
  }
}

export function selectQuestBoard({
  quests,
  journeyState,
}: {
  quests: EvaluatedQuest[];
  journeyState: UserJourneyState;
}) {
  const activePool = quests
    .filter((quest) => quest.visible && (quest.status === "active" || quest.status === "in_progress" || quest.status === "rejected"))
    .sort((left, right) => {
      const priorityDelta = computeTrackPriority(left.track, journeyState) - computeTrackPriority(right.track, journeyState);
      if (priorityDelta !== 0) {
        return priorityDelta;
      }

      return right.sortScore - left.sortScore;
    });
  const selectedActive = new Map<string, EvaluatedQuest>();
  const targetTracks = getTargetTracks(journeyState);

  for (const track of targetTracks) {
    if (selectedActive.size >= 15) {
      break;
    }

    const perTrack = activePool.filter((quest) => quest.track === track).slice(0, 3);

    for (const quest of perTrack) {
      if (selectedActive.size >= 15) {
        break;
      }

      selectedActive.set(quest.id, quest);
    }
  }

  for (const quest of activePool) {
    if (selectedActive.size >= 15) {
      break;
    }

    if (!selectedActive.has(quest.id)) {
      selectedActive.set(quest.id, quest);
    }
  }

  const active = Array.from(selectedActive.values()).sort((left, right) => {
    const priorityDelta = computeTrackPriority(left.track, journeyState) - computeTrackPriority(right.track, journeyState);
    if (priorityDelta !== 0) {
      return priorityDelta;
    }

    return right.sortScore - left.sortScore;
  });

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
