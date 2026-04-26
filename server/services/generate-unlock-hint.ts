import type { UnlockRule } from "@/lib/types";

function formatSingleRule(rule: UnlockRule) {
  switch (rule.type) {
    case "min_level":
      return `Reach Level ${rule.value}`;
    case "min_streak":
      return `Reach a ${rule.value}-day streak`;
    case "wallet_linked":
      return "Connect xPortal";
    case "starter_path_complete":
      return "Complete Activation Path";
    case "subscription_tier":
      return `Upgrade to ${rule.value === "annual" ? "Annual" : "Monthly"} Premium`;
    case "connected_social_count":
      return `Connect ${rule.value} social account${rule.value === 1 ? "" : "s"}`;
    case "connected_social":
      return `Connect your ${rule.value} account`;
    case "successful_referrals":
      return `Invite ${rule.value} successful referral${rule.value === 1 ? "" : "s"}`;
    case "monthly_premium_referrals":
      return `Drive ${rule.value} monthly premium referral${rule.value === 1 ? "" : "s"}`;
    case "annual_premium_referrals":
      return `Drive ${rule.value} annual premium referral${rule.value === 1 ? "" : "s"}`;
    case "ambassador_candidate":
      return "Qualify for Ambassador Candidate status";
    case "ambassador_active":
      return "Unlock Ambassador status";
    case "campaign_source":
      return `Available to ${rule.value} campaign entrants`;
    case "trust_score_band":
      return `Reach ${rule.value} trust status`;
    case "wallet_age_days":
      return `Keep your wallet linked for ${rule.value} days`;
    case "quest_completed":
      return "Complete the prerequisite quest first";
    case "quest_completed_today":
      return "Complete the required daily quest first";
    case "weekly_xp_min":
      return `Earn ${rule.value} XP this week`;
    case "runtime_flag":
      if (rule.value === "flashRewardDay") {
        return "Available on Flash Reward Days";
      }

      if (rule.value === "referralBoostWeek") {
        return "Available during Referral Boost Weeks";
      }

      return "Available while milestone sharing is live";
    default:
      return "Complete the required prerequisite";
  }
}

export function generateUnlockHint(rules: UnlockRule[]) {
  if (rules.length === 0) {
    return null;
  }

  return formatSingleRule(rules[0]);
}
