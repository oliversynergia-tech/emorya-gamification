export type ShareData = {
  title: string;
  message: string;
  hashtags: string[];
  profileUrl: string;
  platform?: string;
  milestone?: string;
};

const milestoneQuestMap = {
  first_calorie_conversion: "share-first-calorie-conversion-celebration",
  weekly_warrior_complete: "share-your-7-day-streak-win",
  referral_signup: "share-your-referral-signup-win",
  premium_unlock: "share-your-premium-unlock",
  marathon_complete: "share-your-marathon-completion",
} as const;

export function getMilestoneQuestSlugForShare(milestone?: string | null) {
  if (!milestone) {
    return null;
  }

  return milestoneQuestMap[milestone as keyof typeof milestoneQuestMap] ?? null;
}

export function getSharePreset(
  milestone: string,
  userDisplayName: string,
  profileUrl: string,
): ShareData {
  switch (milestone) {
    case "first_calorie_conversion":
      return {
        title: "First Calorie Conversion!",
        message: "I just converted my first calories to EMRS on Emorya. The journey starts here.",
        hashtags: ["Emorya", "MoveToEarn"],
        profileUrl,
        milestone,
      };
    case "weekly_warrior_complete":
      return {
        title: "7-Day Streak Complete!",
        message: "7 days straight — 500 calories burned every single day. Weekly Warrior complete on Emorya.",
        hashtags: ["Emorya", "WeeklyWarrior", "Streak"],
        profileUrl,
        milestone,
      };
    case "referral_signup":
      return {
        title: "Referral Win!",
        message: "Someone I invited just joined Emorya and started their journey. Growing the community one invite at a time.",
        hashtags: ["Emorya", "Referral"],
        profileUrl,
        milestone,
      };
    case "referral_rank_climb":
      return {
        title: "Climbing the Referral Board!",
        message: `${userDisplayName} is climbing the Emorya referral leaderboard. Join through my link and let's keep moving together.`,
        hashtags: ["Emorya", "Referral"],
        profileUrl,
        milestone,
      };
    case "premium_unlock":
      return {
        title: "Premium Unlocked!",
        message: "Just upgraded to Emorya Premium. 1.5x XP, stronger rewards, and premium-only pathways unlocked.",
        hashtags: ["Emorya", "Premium"],
        profileUrl,
        milestone,
      };
    case "marathon_complete":
      return {
        title: "Emorya Marathon Complete!",
        message: "30 days. 500 calories a day. Every single day. The Emorya Marathon is done.",
        hashtags: ["Emorya", "EmoryaMarathon", "Challenge"],
        profileUrl,
        milestone,
      };
    case "duo_completion":
      return {
        title: "Accountability Duo Complete!",
        message: `${userDisplayName} and a referred friend just cleared the Accountability Duo challenge on Emorya. Shared momentum hits differently.`,
        hashtags: ["Emorya", "AccountabilityDuo", "Referral"],
        profileUrl,
        milestone,
      };
    case "streak_milestone":
      return {
        title: "Streak Milestone!",
        message: "Keeping the streak alive on Emorya. Consistency compounds.",
        hashtags: ["Emorya", "Streak"],
        profileUrl,
        milestone,
      };
    case "achievement_earned":
      return {
        title: "Achievement Unlocked!",
        message: "Just unlocked a new achievement on Emorya. Progress is progress.",
        hashtags: ["Emorya", "Achievement"],
        profileUrl,
        milestone,
      };
    default:
      return {
        title: "Emorya Progress",
        message: `${userDisplayName} is making progress on Emorya. Join me.`,
        hashtags: ["Emorya"],
        profileUrl,
        milestone: "generic",
      };
  }
}
