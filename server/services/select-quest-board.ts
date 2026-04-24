import type { EvaluatedQuest, UserJourneyState, UserProgressState } from "@/lib/types";

function compareQuestPriority(
  left: EvaluatedQuest,
  right: EvaluatedQuest,
  journeyState: UserJourneyState,
  campaignSource: UserProgressState["campaignSource"],
  featuredTracks?: string[],
) {
  const leftLaunchOrder = typeof left.launchOrder === "number" ? left.launchOrder : Number.POSITIVE_INFINITY;
  const rightLaunchOrder = typeof right.launchOrder === "number" ? right.launchOrder : Number.POSITIVE_INFINITY;
  if (leftLaunchOrder !== rightLaunchOrder) {
    return leftLaunchOrder - rightLaunchOrder;
  }

  const priorityDelta =
    computeTrackPriority(left.track, journeyState, campaignSource, featuredTracks) -
    computeTrackPriority(right.track, journeyState, campaignSource, featuredTracks);
  if (priorityDelta !== 0) {
    return priorityDelta;
  }

  return right.sortScore - left.sortScore;
}

function injectCampaignPriority(order: string[], campaignSource: UserProgressState["campaignSource"]) {
  if (!campaignSource || campaignSource === "direct") {
    return order;
  }

  const withoutCampaign = order.filter((track) => track !== "campaign");
  withoutCampaign.splice(1, 0, "campaign");

  return withoutCampaign;
}

function injectFeaturedTracks(order: string[], featuredTracks: string[] | undefined) {
  if (!featuredTracks || featuredTracks.length === 0) {
    return order;
  }

  const uniqueFeatured = featuredTracks.filter((track, index) => featuredTracks.indexOf(track) === index);
  const remainder = order.filter((track) => !uniqueFeatured.includes(track));
  return [...uniqueFeatured, ...remainder];
}

function getRecommendedTrackOrder(
  journeyState: UserJourneyState,
  campaignSource: UserProgressState["campaignSource"],
  featuredTracks?: string[],
) {
  switch (journeyState) {
    case "signed_up_free":
      return injectFeaturedTracks(injectCampaignPriority(
        ["starter", "daily", "social", "wallet", "referral", "premium", "campaign", "creative", "ambassador", "quiz"],
        campaignSource,
      ), featuredTracks);
    case "activated_free":
      return injectFeaturedTracks(injectCampaignPriority(
        ["daily", "wallet", "referral", "social", "premium", "campaign", "quiz", "creative", "ambassador", "starter"],
        campaignSource,
      ), featuredTracks);
    case "reward_eligible_free":
      return injectFeaturedTracks(injectCampaignPriority(
        ["wallet", "referral", "daily", "premium", "social", "campaign", "creative", "ambassador", "quiz", "starter"],
        campaignSource,
      ), featuredTracks);
    case "monthly_premium":
      return injectFeaturedTracks(injectCampaignPriority(
        ["premium", "referral", "daily", "wallet", "campaign", "social", "creative", "ambassador", "quiz", "starter"],
        campaignSource,
      ), featuredTracks);
    case "annual_premium":
      return injectFeaturedTracks(injectCampaignPriority(
        ["premium", "referral", "wallet", "campaign", "daily", "ambassador", "social", "creative", "quiz", "starter"],
        campaignSource,
      ), featuredTracks);
    case "ambassador_candidate":
    case "ambassador":
      return injectFeaturedTracks(injectCampaignPriority(
        ["ambassador", "referral", "wallet", "premium", "campaign", "daily", "creative", "social", "quiz", "starter"],
        campaignSource,
      ), featuredTracks);
    default:
      return injectFeaturedTracks(injectCampaignPriority(
        ["starter", "daily", "social", "wallet", "referral", "premium", "campaign", "creative", "ambassador", "quiz"],
        campaignSource,
      ), featuredTracks);
  }
}

function computeTrackPriority(
  track: string,
  journeyState: UserJourneyState,
  campaignSource: UserProgressState["campaignSource"],
  featuredTracks?: string[],
) {
  const order = getRecommendedTrackOrder(journeyState, campaignSource, featuredTracks);
  const index = order.indexOf(track);
  return index === -1 ? order.length : index;
}

function getTargetTracks(
  journeyState: UserJourneyState,
  campaignSource: UserProgressState["campaignSource"],
  featuredTracks?: string[],
) {
  switch (journeyState) {
    case "signed_up_free":
      return injectFeaturedTracks(injectCampaignPriority(["starter", "daily", "social", "wallet", "referral"], campaignSource), featuredTracks);
    case "activated_free":
      return injectFeaturedTracks(injectCampaignPriority(["daily", "social", "wallet", "referral", "premium"], campaignSource), featuredTracks);
    case "reward_eligible_free":
      return injectFeaturedTracks(injectCampaignPriority(["daily", "wallet", "referral", "premium", "campaign"], campaignSource), featuredTracks);
    case "monthly_premium":
      return injectFeaturedTracks(injectCampaignPriority(["premium", "daily", "wallet", "referral", "campaign"], campaignSource), featuredTracks);
    case "annual_premium":
      return injectFeaturedTracks(injectCampaignPriority(["premium", "wallet", "referral", "campaign", "daily"], campaignSource), featuredTracks);
    case "ambassador_candidate":
    case "ambassador":
      return injectFeaturedTracks(injectCampaignPriority(["ambassador", "referral", "wallet", "premium", "campaign"], campaignSource), featuredTracks);
    default:
      return injectFeaturedTracks(injectCampaignPriority(["starter", "daily", "social", "wallet", "referral"], campaignSource), featuredTracks);
  }
}

export function selectQuestBoard({
  quests,
  journeyState,
  campaignSource,
  featuredTracks,
}: {
  quests: EvaluatedQuest[];
  journeyState: UserJourneyState;
  campaignSource: UserProgressState["campaignSource"];
  featuredTracks?: string[];
}) {
  const activePool = quests
    .filter((quest) => quest.visible && (quest.status === "active" || quest.status === "in_progress" || quest.status === "rejected"))
    .sort((left, right) => compareQuestPriority(left, right, journeyState, campaignSource, featuredTracks));
  const selectedActive = new Map<string, EvaluatedQuest>();
  const targetTracks = getTargetTracks(journeyState, campaignSource, featuredTracks);
  const launchOrderedActive = activePool.filter((quest) => typeof quest.launchOrder === "number");

  if (launchOrderedActive.length > 0) {
    for (const quest of launchOrderedActive.slice(0, 15)) {
      selectedActive.set(quest.id, quest);
    }
  } else {
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
    return compareQuestPriority(left, right, journeyState, campaignSource, featuredTracks);
  });

  const lockedPreviews = quests
    .filter((quest) => quest.visible && quest.status === "locked")
    .sort((left, right) => compareQuestPriority(left, right, journeyState, campaignSource, featuredTracks))
    .slice(0, 5);

  return {
    active,
    lockedPreviews,
    quests: [...active, ...lockedPreviews],
  };
}
