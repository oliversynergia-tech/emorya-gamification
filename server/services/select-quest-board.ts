import type { EvaluatedQuest, UserJourneyState, UserProgressState } from "@/lib/types";

function injectCampaignPriority(order: string[], campaignSource: UserProgressState["campaignSource"]) {
  if (!campaignSource || campaignSource === "direct") {
    return order;
  }

  const withoutCampaign = order.filter((track) => track !== "campaign");
  withoutCampaign.splice(1, 0, "campaign");

  return withoutCampaign;
}

function getRecommendedTrackOrder(journeyState: UserJourneyState, campaignSource: UserProgressState["campaignSource"]) {
  switch (journeyState) {
    case "signed_up_free":
      return injectCampaignPriority(
        ["starter", "daily", "social", "wallet", "referral", "premium", "campaign", "creative", "ambassador", "quiz"],
        campaignSource,
      );
    case "activated_free":
      return injectCampaignPriority(
        ["daily", "wallet", "referral", "social", "premium", "campaign", "quiz", "creative", "ambassador", "starter"],
        campaignSource,
      );
    case "reward_eligible_free":
      return injectCampaignPriority(
        ["wallet", "referral", "daily", "premium", "social", "campaign", "creative", "ambassador", "quiz", "starter"],
        campaignSource,
      );
    case "monthly_premium":
      return injectCampaignPriority(
        ["premium", "referral", "daily", "wallet", "campaign", "social", "creative", "ambassador", "quiz", "starter"],
        campaignSource,
      );
    case "annual_premium":
      return injectCampaignPriority(
        ["premium", "referral", "wallet", "campaign", "daily", "ambassador", "social", "creative", "quiz", "starter"],
        campaignSource,
      );
    case "ambassador_candidate":
    case "ambassador":
      return injectCampaignPriority(
        ["ambassador", "referral", "wallet", "premium", "campaign", "daily", "creative", "social", "quiz", "starter"],
        campaignSource,
      );
    default:
      return injectCampaignPriority(
        ["starter", "daily", "social", "wallet", "referral", "premium", "campaign", "creative", "ambassador", "quiz"],
        campaignSource,
      );
  }
}

function computeTrackPriority(track: string, journeyState: UserJourneyState, campaignSource: UserProgressState["campaignSource"]) {
  const order = getRecommendedTrackOrder(journeyState, campaignSource);
  const index = order.indexOf(track);
  return index === -1 ? order.length : index;
}

function getTargetTracks(journeyState: UserJourneyState, campaignSource: UserProgressState["campaignSource"]) {
  switch (journeyState) {
    case "signed_up_free":
      return injectCampaignPriority(["starter", "daily", "social", "wallet", "referral"], campaignSource);
    case "activated_free":
      return injectCampaignPriority(["daily", "social", "wallet", "referral", "premium"], campaignSource);
    case "reward_eligible_free":
      return injectCampaignPriority(["daily", "wallet", "referral", "premium", "campaign"], campaignSource);
    case "monthly_premium":
      return injectCampaignPriority(["premium", "daily", "wallet", "referral", "campaign"], campaignSource);
    case "annual_premium":
      return injectCampaignPriority(["premium", "wallet", "referral", "campaign", "daily"], campaignSource);
    case "ambassador_candidate":
    case "ambassador":
      return injectCampaignPriority(["ambassador", "referral", "wallet", "premium", "campaign"], campaignSource);
    default:
      return injectCampaignPriority(["starter", "daily", "social", "wallet", "referral"], campaignSource);
  }
}

export function selectQuestBoard({
  quests,
  journeyState,
  campaignSource,
}: {
  quests: EvaluatedQuest[];
  journeyState: UserJourneyState;
  campaignSource: UserProgressState["campaignSource"];
}) {
  const activePool = quests
    .filter((quest) => quest.visible && (quest.status === "active" || quest.status === "in_progress" || quest.status === "rejected"))
    .sort((left, right) => {
      const priorityDelta =
        computeTrackPriority(left.track, journeyState, campaignSource) -
        computeTrackPriority(right.track, journeyState, campaignSource);
      if (priorityDelta !== 0) {
        return priorityDelta;
      }

      return right.sortScore - left.sortScore;
    });
  const selectedActive = new Map<string, EvaluatedQuest>();
  const targetTracks = getTargetTracks(journeyState, campaignSource);

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
    const priorityDelta =
      computeTrackPriority(left.track, journeyState, campaignSource) -
      computeTrackPriority(right.track, journeyState, campaignSource);
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
