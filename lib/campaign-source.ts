import type { UserSnapshot } from "@/lib/types";

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
