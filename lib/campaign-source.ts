import type { CampaignEconomyOverride, QuestTrack, UserSnapshot } from "@/lib/types";

export function getCampaignSourceProfile(source: UserSnapshot["campaignSource"]) {
  switch (source) {
    case "zealy":
      return {
        label: "Zealy entrant",
        title: "Turn quest hunters into xPortal-linked Emorya members.",
        description:
          "This lane should feel like a fast bridge from campaign XP to wallet identity, weekly progress, and referral momentum.",
        accent: "Quest-to-wallet",
      };
    case "galxe":
      return {
        label: "Galxe entrant",
        title: "Move discovery users into recurring Emorya reward behavior.",
        description:
          "This lane emphasizes campaign completion, token readiness, and premium conversion instead of one-off participation.",
        accent: "Discovery-to-retention",
      };
    case "layer3":
      return {
        label: "Layer3 entrant",
        title: "Convert ecosystem learners into high-trust Emorya operators.",
        description:
          "This lane should highlight deeper mission ladders, xPortal identity, and stronger premium/referral upside.",
        accent: "Learning-to-loyalty",
      };
    default:
      return {
        label: "Direct entrant",
        title: "Guide users from first quest to premium and token readiness.",
        description:
          "This lane focuses on early gratification, wallet adoption, weekly progress, and referral-driven growth.",
        accent: "Direct-to-growth",
      };
  }
}

export function getCampaignPremiumOffer(source: UserSnapshot["campaignSource"]) {
  switch (source) {
    case "zealy":
      return {
        title: "Turn quest momentum into premium yield",
        summary: "Zealy users should feel the jump from campaign points into wallet-linked premium tracks immediately.",
        hooks: [
          "Monthly premium multiplies your campaign bridge XP and opens stronger referral conversion rewards.",
          "Annual premium is the fastest route from quest completions into direct-token reward moments.",
        ],
        cta: "Upgrade once the quest ladder starts converting into weekly reward pressure.",
      };
    case "galxe":
      return {
        title: "Convert discovery into recurring reward behavior",
        summary: "Galxe entrants need a clearer reason to stay after the first campaign touchpoint.",
        hooks: [
          "Monthly premium turns one-off discovery into recurring weekly reward accumulation.",
          "Annual premium makes referral conversions and claimed-to-settled payouts materially stronger.",
        ],
        cta: "Use premium to turn campaign discovery into retention and redemption velocity.",
      };
    case "layer3":
      return {
        title: "Push learning into high-trust premium progression",
        summary: "Layer3 users respond best when premium feels like access to deeper missions and stronger economics.",
        hooks: [
          "Monthly premium adds higher-yield mission tracks on top of the learning lane.",
          "Annual premium compounds XP, referral leverage, and direct-token upside for the most committed users.",
        ],
        cta: "Upgrade once you want deeper campaign ladders and higher reward density.",
      };
    default:
      return {
        title: "Use premium to accelerate the core Emorya ladder",
        summary: "Direct entrants should see premium as faster progression, better rewards, and stronger referral economics.",
        hooks: [
          "Monthly premium unlocks higher-yield quests and lifts XP and token conversion value.",
          "Annual premium creates the strongest referral upside and direct-token reward moments.",
        ],
        cta: "Upgrade when you want the fastest route from Starter Path to high-value reward lanes.",
      };
  }
}

export function getCampaignPremiumJourney(
  source: UserSnapshot["campaignSource"],
  options?: {
    featuredTracks?: string[];
    premiumUpsellMultiplier?: number;
    weeklyTargetOffset?: number;
  },
) {
  const featuredTracks = options?.featuredTracks?.length ? options.featuredTracks.join(", ") : "premium, referral, and wallet";
  const premiumPressure = options?.premiumUpsellMultiplier
    ? `${(options.premiumUpsellMultiplier * 100 - 100).toFixed(0)}% extra premium urgency`
    : "lane-specific premium urgency";
  const weeklyShift = options?.weeklyTargetOffset
    ? `${options.weeklyTargetOffset > 0 ? "+" : ""}${options.weeklyTargetOffset} XP weekly target shaping`
    : "weekly target shaping";

  switch (source) {
    case "zealy":
      return {
        recommendedTier: "monthly" as const,
        nextAction: "Convert a quest entrant into a recurring premium user while momentum is high.",
        monthlyReason: "Monthly is the cleanest bridge from campaign XP into repeat wallet-linked premium loops.",
        annualReason: "Annual becomes the strongest move once the user is already completing bridge quests and ready for direct-token upside.",
        pathSteps: [
          "Create the account and finish the campaign bridge starter quests.",
          "Push Monthly when wallet-link and weekly momentum become visible.",
          "Escalate to Annual after referral or direct-token interest appears.",
        ],
        lanePressure: `Zealy is currently pushing ${featuredTracks} while adding ${premiumPressure} and ${weeklyShift}.`,
      };
    case "galxe":
      return {
        recommendedTier: "monthly" as const,
        nextAction: "Turn one-off discovery into a repeating premium habit before the user drifts out.",
        monthlyReason: "Monthly works best here because it converts discovery traffic into weekly return behavior quickly.",
        annualReason: "Annual should be framed as the deeper retention step once repeated reward behavior is already established.",
        pathSteps: [
          "Capture the signup and make the first weekly reward band feel attainable.",
          "Use Monthly to create recurring reward accumulation and retention.",
          "Promote Annual when referrals and redemption history start to matter.",
        ],
        lanePressure: `Galxe is currently leaning on ${featuredTracks}, with ${premiumPressure} and ${weeklyShift} to keep discovery users returning.`,
      };
    case "layer3":
      return {
        recommendedTier: "annual" as const,
        nextAction: "Position premium as access to the deeper, higher-trust progression lane.",
        monthlyReason: "Monthly is still useful, but mostly as a proof step into higher-yield mission depth.",
        annualReason: "Annual is the real fit for Layer3 because the strongest upside comes from long-horizon mission depth, referrals, and token moments.",
        pathSteps: [
          "Move the user from learning and wallet identity into deeper mission completion.",
          "Use Monthly only if they need a softer first commitment.",
          "Push Annual once trust, mission depth, and direct-reward upside are visible.",
        ],
        lanePressure: `Layer3 is elevating ${featuredTracks} and using ${premiumPressure} with ${weeklyShift} to frame premium as the serious progression lane.`,
      };
    default:
      return {
        recommendedTier: "monthly" as const,
        nextAction: "Use premium as the faster route through the core Emorya progression ladder.",
        monthlyReason: "Monthly is the best first step for direct users because it immediately improves XP yield and quest value without a heavy commitment.",
        annualReason: "Annual should be presented as the high-conviction choice once referrals, streaks, and direct-token moments are already proving out.",
        pathSteps: [
          "Complete Starter Path and expose the premium upside early.",
          "Convert to Monthly when weekly momentum and better quest yield become clear.",
          "Offer Annual as the strongest route once the user wants the best reward economics.",
        ],
        lanePressure: `Direct onboarding is pushing ${featuredTracks} while applying ${premiumPressure} and ${weeklyShift} to the premium ladder.`,
      };
  }
}

export function getCampaignFeaturedTracks(
  source: UserSnapshot["campaignSource"],
  override: CampaignEconomyOverride,
): QuestTrack[] {
  const scores = new Map<QuestTrack, number>([
    ["starter", source === "direct" ? 2 : 0.5],
    ["daily", Math.max(1, Math.abs(override.weeklyTargetXpOffset) / 10)],
    ["social", 1],
    ["wallet", 1 + override.eligibilityPointsMultiplierBonus * 10 + override.questXpMultiplierBonus * 5],
    ["referral", 1 + (override.monthlyConversionBonusXp + override.annualConversionBonusXp) / 50],
    ["premium", 1 + override.premiumUpsellBonusMultiplier * 10],
    ["ambassador", source === "layer3" ? 1.8 : 0.5],
    ["creative", source === "layer3" ? 1.4 : 0.4],
    ["campaign", source && source !== "direct" ? 2 + override.leaderboardMomentumBonus * 10 : 0.5],
    ["quiz", source === "layer3" ? 1.5 : 0.6],
  ]);

  return Array.from(scores.entries())
    .sort((left, right) => right[1] - left[1])
    .slice(0, 3)
    .map(([track]) => track);
}
