import { getActiveBrandTheme } from "./brand-themes/index.ts";
import type { CampaignEconomyOverride, QuestTrack, UserSnapshot } from "@/lib/types";

export function getCampaignSourceProfile(source: UserSnapshot["campaignSource"]) {
  const activeThemeId = getActiveBrandTheme().id;

  switch (source) {
    case "zealy":
      return {
        label: "Zealy entrant",
        title: "Move campaign entrants into connected, returning Emorya users.",
        description:
          "This lane should quickly convert campaign momentum into account creation, wallet readiness, weekly progress, and repeat use.",
        accent: "Quest-to-wallet",
        mood: "bridge" as const,
      };
    case "galxe":
      return {
        label: "Galxe entrant",
        title: "Turn discovery traffic into connected users with real retention potential.",
        description:
          "This source is usually routed through the Zealy bridge first, so the journey should emphasize activation, reward readiness, and repeat participation rather than one-off completion.",
        accent: "Discovery-to-retention",
        mood: "feeder" as const,
      };
    case "taskon":
      return {
        label: "TaskOn entrant",
        title: "Convert TaskOn participants into activated users with stronger long-term intent.",
        description:
          "This source is usually routed through the Zealy bridge first, with the focus on activation, product familiarity, and deeper follow-through after the first campaign touch.",
        accent: "Tasks-to-loyalty",
        mood: "feeder" as const,
      };
    default:
      return {
        label: "Direct entrant",
        title:
          activeThemeId === "xportal"
            ? "From crypto newbie to super app native, one quest at a time."
            : activeThemeId === "multiversx"
              ? "Turn curious users into stakers, builders, and believers."
              : "Guide users from first touch into activation, loyalty, and reward readiness.",
        description:
          "This lane focuses on smooth onboarding, real app activation, weekly momentum, and growth through trust and referrals.",
        accent: "Direct-to-growth",
        mood: "direct" as const,
      };
  }
}

export function getCampaignLaneVisualProfile(
  source: UserSnapshot["campaignSource"],
  activeLane: UserSnapshot["campaignSource"] | "direct",
  attributionSource?: UserSnapshot["campaignSource"],
) {
  const isBridged = Boolean(attributionSource && attributionSource !== activeLane);

  if (source === "zealy" || activeLane === "zealy") {
    return {
      themeClass: "lane-theme--bridge",
      label: isBridged ? "Zealy bridge live" : "Zealy live",
      emphasis: "This lane should move people quickly from campaign entry into account setup, wallet identity, and repeat product use.",
      chips: ["Bridge lane", "Wallet-forward", "Retention ramp"],
    };
  }

  if (source === "galxe") {
    return {
      themeClass: "lane-theme--feeder",
      label: isBridged ? "Galxe feeder" : "Galxe live",
      emphasis: isBridged
        ? "Galxe attribution is being preserved, but the live conversion flow is intentionally routed through the stronger activation bridge."
        : "Galxe is running as its own live lane with discovery-to-activation pressure.",
      chips: ["Discovery source", isBridged ? "Zealy bridge" : "Live lane", "Campaign entry"],
    };
  }

  if (source === "taskon") {
    return {
      themeClass: "lane-theme--task",
      label: isBridged ? "TaskOn feeder" : "TaskOn live",
      emphasis: isBridged
        ? "TaskOn users are being funneled through the activation bridge, while preserving the intent and completion quality of the original source."
        : "TaskOn is running as its own live lane with stronger mission-depth and activation framing.",
      chips: ["Task source", isBridged ? "Zealy bridge" : "Live lane", "High-intent"],
    };
  }

  return {
    themeClass: "lane-theme--direct",
    label: "Direct lane",
    emphasis: "Direct users should feel the core activation ladder first, then momentum, then the higher-value commitment lanes.",
    chips: ["Direct entry", "Core ladder", "Premium ramp"],
  };
}

export function getCampaignPremiumOffer(source: UserSnapshot["campaignSource"]) {
  switch (source) {
    case "zealy":
      return {
        title: "Turn campaign momentum into higher-value progression",
        summary: "Zealy users should feel a clear step up from campaign entry into wallet-linked premium progress and stronger reward potential.",
        hooks: [
          "Monthly premium multiplies your campaign bridge XP and opens stronger referral conversion rewards.",
          "Annual premium is the fastest route from quest completions into direct-token reward moments.",
        ],
        cta: "Upgrade once the activation ladder starts turning into weekly reward momentum.",
      };
    case "galxe":
      return {
        title: "Convert discovery into recurring, higher-value use",
        summary: "Galxe entrants usually pass through the activation bridge, so premium should reinforce the move from discovery into repeat behavior and stronger reward value.",
        hooks: [
          "Monthly premium turns one-off discovery into recurring weekly reward accumulation.",
          "Annual premium makes referral conversions and claimed-to-settled payouts materially stronger.",
        ],
        cta: "Use premium to turn campaign discovery into retention and redemption velocity.",
      };
    case "taskon":
      return {
        title: "Push task momentum into higher-trust premium progression",
        summary: "TaskOn entrants usually pass through the activation bridge first, but can still be moved into a stronger premium progression path once intent is clear.",
        hooks: [
          "Monthly premium adds higher-yield mission tracks on top of the task-completion lane.",
          "Annual premium compounds XP, referral leverage, and direct-token upside for the most committed users.",
        ],
        cta: "Upgrade once you want deeper campaign ladders and higher reward density.",
      };
    default:
      return {
        title: "Use premium to accelerate the core progression path",
        summary: "Direct entrants should see premium as faster activation follow-through, better rewards, and stronger referral economics.",
        hooks: [
          "Monthly premium unlocks higher-yield quests and lifts XP and token conversion value.",
          "Annual premium creates the strongest referral upside and direct-token reward moments.",
        ],
        cta: "Upgrade when you want the fastest route from activation into the highest-value reward lanes.",
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
        lanePressure: `Galxe attribution is currently being translated into a Zealy-style bridge lane that pushes ${featuredTracks}, with ${premiumPressure} and ${weeklyShift} to keep discovery users returning.`,
      };
    case "taskon":
      return {
        recommendedTier: "annual" as const,
        nextAction: "Position premium as access to the deeper, higher-trust progression lane.",
        monthlyReason: "Monthly is still useful, but mostly as a proof step into higher-yield mission depth.",
        annualReason: "Annual is the real fit for TaskOn when platform differentiation is active, because the strongest upside comes from long-horizon mission depth, referrals, and token moments.",
        pathSteps: [
          "Move the user from task completion and wallet identity into deeper mission completion.",
          "Use Monthly only if they need a softer first commitment.",
          "Push Annual once trust, mission depth, and direct-reward upside are visible.",
        ],
        lanePressure: `TaskOn attribution is currently being translated into a bridge lane that elevates ${featuredTracks} and uses ${premiumPressure} with ${weeklyShift} to frame premium as the serious progression lane.`,
      };
    default:
      return {
        recommendedTier: "monthly" as const,
        nextAction: "Use premium as the faster route through the core progression ladder.",
        monthlyReason: "Monthly is the best first step for direct users because it immediately improves XP yield and quest value without a heavy commitment.",
        annualReason: "Annual should be presented as the high-conviction choice once referrals, streaks, and direct-token moments are already proving out.",
        pathSteps: [
          "Complete the activation ladder and expose the premium upside early.",
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
    ["ambassador", source === "taskon" ? 1.8 : 0.5],
    ["creative", source === "taskon" ? 1.4 : 0.4],
    ["campaign", source && source !== "direct" ? 2 + override.leaderboardMomentumBonus * 10 : 0.5],
    ["quiz", source === "taskon" ? 1.5 : 0.6],
  ]);

  return Array.from(scores.entries())
    .sort((left, right) => right[1] - left[1])
    .slice(0, 3)
    .map(([track]) => track);
}
