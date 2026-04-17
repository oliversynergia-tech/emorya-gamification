import { getActiveBrandTheme } from "./brand-themes/index.ts";
import type { CampaignEconomyOverride, QuestTrack, UserSnapshot } from "@/lib/types";

export function getCampaignSourceProfile(source: UserSnapshot["campaignSource"]) {
  const activeThemeId = getActiveBrandTheme().id;

  switch (source) {
    case "zealy":
      return {
        label: "Getting started",
        title: "Get set up quickly and make your first progress count.",
        description:
          "Start with a few simple steps, connect what you need, and build enough momentum to keep coming back.",
        accent: "Fast start",
        mood: "bridge" as const,
      };
    case "galxe":
      return {
        label: "Welcome back",
        title: "Turn early interest into a routine you want to keep.",
        description:
          "Get your account ready, build a little momentum, and come back often enough for progress to stick.",
        accent: "From interest to routine",
        mood: "feeder" as const,
      };
    case "taskon":
      return {
        label: "Ready to go deeper",
        title: "Build on your early momentum and keep moving forward.",
        description:
          "Use your early momentum to unlock more, come back regularly, and move into the stronger parts of the experience.",
        accent: "Keep moving forward",
        mood: "feeder" as const,
      };
    default:
      return {
        label: "Get started",
        title:
          activeThemeId === "xportal"
            ? "From crypto newbie to super app native, one quest at a time."
            : activeThemeId === "multiversx"
              ? "Turn curious users into stakers, builders, and believers."
              : "Start strong, build momentum, and unlock more as you go.",
        description:
          "Get set up, keep your streak alive, and turn early progress into something real.",
        accent: "Start to progress",
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
      label: isBridged ? "Guided start" : "Fast start",
      emphasis: "Get your account ready, connect your wallet, and come back each week to keep moving.",
      chips: ["Get started", "Connect your wallet", "Come back weekly"],
    };
  }

  if (source === "galxe") {
    return {
      themeClass: "lane-theme--feeder",
      label: isBridged ? "Guided return" : "Welcome back",
      emphasis: isBridged
        ? "Start with a stronger setup, then keep building momentum through repeat use."
        : "Use your early interest to get set up and turn progress into a habit.",
      chips: ["Get set up", isBridged ? "Keep it moving" : "Build momentum", "Come back often"],
    };
  }

  if (source === "taskon") {
    return {
      themeClass: "lane-theme--task",
      label: isBridged ? "Momentum path" : "Keep progressing",
      emphasis: isBridged
        ? "Move from a quick start into stronger follow-through, repeat use, and bigger milestones."
        : "Keep your early momentum going and unlock the next layer of progress.",
      chips: ["Start strong", isBridged ? "Go deeper" : "Build momentum", "Stay engaged"],
    };
  }

  return {
    themeClass: "lane-theme--direct",
    label: "Core experience",
    emphasis: "Complete your setup, build weekly momentum, and unlock the next layer when you are ready.",
    chips: ["Get started", "Build momentum", "Unlock more"],
  };
}

export function getCampaignPremiumOffer(source: UserSnapshot["campaignSource"]) {
  switch (source) {
    case "zealy":
      return {
        title: "Keep your early progress moving",
        summary: "Once the basics are done, premium should feel like the easier way to keep progressing and earn more from the time you put in.",
        hooks: [
          "Monthly premium helps your quests go further and opens stronger weekly progress.",
          "Annual premium is the best fit once you know you want the full experience.",
        ],
        cta: "Upgrade once the activation ladder turns into a weekly routine.",
      };
    case "galxe":
      return {
        title: "Turn early progress into something stronger",
        summary: "Premium should feel like the natural next step once you are using the product regularly and want more value from that progress.",
        hooks: [
          "Monthly premium helps turn one-off activity into steady weekly growth.",
          "Annual premium makes the long-term version of the experience much stronger.",
        ],
        cta: "Upgrade when you want your regular progress to go further.",
      };
    case "taskon":
      return {
        title: "Take the next step when you want more from the experience",
        summary: "Premium should feel like the deeper version of something you already know you want to keep using.",
        hooks: [
          "Monthly premium opens a stronger set of quests and faster progress.",
          "Annual premium is the best fit for committed users who want the full upside.",
        ],
        cta: "Upgrade when you want deeper challenges and stronger rewards.",
      };
    default:
      return {
        title: "Use premium when you want to go further, faster",
        summary: "Premium should feel like the easier route to stronger progress, better rewards, and more value from your time in the app.",
        hooks: [
          "Monthly premium lifts your quest value and opens stronger weekly progress.",
          "Annual premium is the strongest choice once you know you want the full experience.",
        ],
        cta: "Upgrade when you want your progress to go further.",
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

  switch (source) {
    case "zealy":
      return {
        recommendedTier: "monthly" as const,
        nextAction: "Move from a quick start into a routine that keeps paying off.",
        monthlyReason: "Monthly is the easiest next step when you want more from the quests you are already doing.",
        annualReason: "Annual makes more sense once you already know you want the long-term version of the experience.",
        pathSteps: [
          "Create the account and finish the first setup steps.",
          "Move to Monthly when your weekly routine starts to feel real.",
          "Choose Annual once you know you want to stick with it.",
        ],
        lanePressure: `Right now the strongest progress is coming from ${featuredTracks}, with premium making that path more rewarding.`,
      };
    case "galxe":
      return {
        recommendedTier: "monthly" as const,
        nextAction: "Turn a one-off visit into a habit that keeps growing.",
        monthlyReason: "Monthly is the best next step when you want to turn occasional activity into steady progress.",
        annualReason: "Annual makes more sense once that routine is already established.",
        pathSteps: [
          "Finish the first setup steps and make the next milestone feel reachable.",
          "Use Monthly to make weekly progress easier to maintain.",
          "Choose Annual when the long-term version starts to feel worthwhile.",
        ],
        lanePressure: `Right now the strongest progress is coming from ${featuredTracks}, with premium helping you build on that faster.`,
      };
    case "taskon":
      return {
        recommendedTier: "annual" as const,
        nextAction: "Choose the deeper version of the experience when you know you want more from it.",
        monthlyReason: "Monthly is a good lighter step if you want to test the added value first.",
        annualReason: "Annual fits best once you know you want the full version and plan to stick with it.",
        pathSteps: [
          "Finish the key setup steps and keep your progress moving.",
          "Use Monthly if you want a lighter first commitment.",
          "Choose Annual once you want the strongest version of the experience.",
        ],
        lanePressure: `Right now the strongest progress is coming from ${featuredTracks}, with premium making the deeper path more valuable.`,
      };
    default:
      return {
        recommendedTier: "monthly" as const,
        nextAction: "Use premium as the faster route to stronger progress.",
        monthlyReason: "Monthly is the easiest first step when you want more value without a big commitment.",
        annualReason: "Annual is the stronger choice once you know you want the full version of the experience.",
        pathSteps: [
          "Complete the activation ladder and get your routine started.",
          "Move to Monthly when the extra value feels useful.",
          "Choose Annual once you know you want the full experience long-term.",
        ],
        lanePressure: `Right now the strongest progress is coming from ${featuredTracks}, with premium helping that progress go further.`,
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
