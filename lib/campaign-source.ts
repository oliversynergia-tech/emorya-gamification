import { getActiveBrandTheme } from "./brand-themes/index.ts";
import type { CampaignEconomyOverride, QuestTrack, UserSnapshot } from "@/lib/types";

export function getCampaignSourceProfile(source: UserSnapshot["campaignSource"]) {
  const activeThemeId = getActiveBrandTheme().id;

  switch (source) {
    case "zealy":
      return {
        label: "Zealy campaign",
        title: "Turn quest sign-ups into real Emorya users.",
        description:
          "This path helps new users get set up quickly, connect what they need, and build enough momentum to keep coming back.",
        accent: "Campaign to customer",
        mood: "bridge" as const,
      };
    case "galxe":
      return {
        label: "Galxe campaign",
        title: "Turn discovery traffic into connected users who actually return.",
        description:
          "This path turns first discovery into account setup, real product use, and the kind of repeat engagement that lasts.",
        accent: "Discovery to loyalty",
        mood: "feeder" as const,
      };
    case "taskon":
      return {
        label: "TaskOn campaign",
        title: "Convert high-intent participants into activated long-term users.",
        description:
          "This path carries early task momentum into product familiarity, repeat use, and deeper commitment over time.",
        accent: "Intent to commitment",
        mood: "feeder" as const,
      };
    default:
      return {
        label: "Direct experience",
        title:
          activeThemeId === "xportal"
            ? "From crypto newbie to super app native, one quest at a time."
            : activeThemeId === "multiversx"
              ? "Turn curious users into stakers, builders, and believers."
              : "Turn first interest into activation, loyalty, and real reward progress.",
        description:
          "Start smoothly, build real momentum, and grow through trust and referrals.",
        accent: "First touch to growth",
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
      label: isBridged ? "Zealy-guided experience" : "Zealy experience",
      emphasis: "Bring users smoothly from first interest into account setup, wallet connection, and repeat product use.",
      chips: ["Campaign start", "Connect your wallet", "Come back weekly"],
    };
  }

  if (source === "galxe") {
    return {
      themeClass: "lane-theme--feeder",
      label: isBridged ? "Galxe-led experience" : "Galxe experience",
      emphasis: isBridged
        ? "Galxe remains the source while the current experience focuses on stronger activation and repeat use."
        : "Galxe is currently running as its own discovery-to-activation experience.",
      chips: ["Discovery", isBridged ? "Stronger onboarding" : "Live campaign", "Build momentum"],
    };
  }

  if (source === "taskon") {
    return {
      themeClass: "lane-theme--task",
      label: isBridged ? "TaskOn-led experience" : "TaskOn experience",
      emphasis: isBridged
        ? "TaskOn remains the source while the current experience pushes faster onboarding and stronger follow-through."
        : "TaskOn is currently running as its own high-intent experience with a stronger push toward activation.",
      chips: ["High intent", isBridged ? "Faster setup" : "Live campaign", "Stay engaged"],
    };
  }

  return {
    themeClass: "lane-theme--direct",
    label: "Core experience",
    emphasis: "Start with activation, build weekly momentum, then open the higher-value commitment and reward paths.",
    chips: ["Get started", "Build momentum", "Unlock more"],
  };
}

export function getCampaignPremiumOffer(source: UserSnapshot["campaignSource"]) {
  switch (source) {
    case "zealy":
      return {
        title: "Turn campaign momentum into higher-value progression",
        summary: "Zealy users should feel a clear step up from campaign entry into stronger rewards, better weekly progress, and deeper commitment.",
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
        cta: "Use premium to turn early discovery into stronger retention and reward progress.",
      };
    case "taskon":
      return {
        title: "Push task momentum into higher-trust premium progression",
        summary: "TaskOn users often arrive with strong intent, so premium should feel like the deeper version of an experience they already value.",
        hooks: [
          "Monthly premium adds higher-yield missions on top of the core task flow.",
          "Annual premium compounds XP, referral leverage, and direct-token upside for the most committed users.",
        ],
        cta: "Upgrade once you want deeper challenges and stronger rewards.",
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
    : "extra premium urgency";
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
        lanePressure: `Zealy is currently emphasizing ${featuredTracks} while adding ${premiumPressure} and ${weeklyShift}.`,
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
          "Promote Annual when referrals and reward history start to matter.",
        ],
        lanePressure: `Galxe is currently emphasizing ${featuredTracks}, with ${premiumPressure} and ${weeklyShift} helping discovery users come back.`,
      };
    case "taskon":
      return {
        recommendedTier: "annual" as const,
        nextAction: "Position premium as the deeper, higher-trust version of the experience.",
        monthlyReason: "Monthly is still useful, but mostly as a proof step into higher-yield mission depth.",
        annualReason: "Annual is the real fit for TaskOn when platform differentiation is active, because the strongest upside comes from long-horizon mission depth, referrals, and token moments.",
        pathSteps: [
          "Move the user from task completion and wallet identity into deeper mission completion.",
          "Use Monthly only if they need a softer first commitment.",
          "Push Annual once trust, mission depth, and direct-reward upside are visible.",
        ],
        lanePressure: `TaskOn is currently emphasizing ${featuredTracks}, with ${premiumPressure} and ${weeklyShift} framing premium as the serious next step.`,
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
        lanePressure: `Direct onboarding is currently emphasizing ${featuredTracks}, with ${premiumPressure} and ${weeklyShift} strengthening the premium path.`,
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
