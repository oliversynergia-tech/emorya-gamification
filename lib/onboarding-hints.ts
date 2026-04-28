export interface OnboardingHintData {
  hintKey: string;
  title: string;
  body: string;
  secondaryAction?: {
    label: string;
    href?: string;
  };
}

export const onboardingHintWindowMs = 3 * 24 * 60 * 60 * 1000;

export const onboardingHints: Record<string, OnboardingHintData> = {
  dashboard: {
    hintKey: "dashboard",
    title: "Welcome to your dashboard",
    body: "This is your home base. Your XP, streak, and level are at the top. Your active quests and recent activity are below. Start with the quest board to earn your first XP.",
    secondaryAction: {
      label: "Go to quests",
      href: "/dashboard#quest-board",
    },
  },
  questBoard: {
    hintKey: "quest-board",
    title: "Your quest journey starts here",
    body: "Quests are grouped by type: daily, weekly, monthly, and one-time. Start with the ones at the top. They're designed to guide you through setup step by step. Locked quests unlock as you level up and complete earlier quests.",
  },
  leaderboard: {
    hintKey: "leaderboard",
    title: "This is the leaderboard",
    body: "Everyone is ranked by total XP. The weekly board resets every Monday, so a focused week of daily quests can put you in the top 20. Complete quests consistently and you'll climb.",
  },
  profile: {
    hintKey: "profile",
    title: "This is your profile",
    body: "Your stats, achievements, and referral code live here. Share your profile link to invite friends. You earn XP every time someone signs up with your referral code.",
    secondaryAction: {
      label: "Share your profile",
    },
  },
  achievements: {
    hintKey: "achievements",
    title: "Achievements are your milestones",
    body: "You earn badges by hitting targets: streaks, quest completions, referrals, and more. Each badge is permanent and shows on your public profile. Keep going and they'll stack up.",
  },
  firstQuestComplete: {
    hintKey: "first-quest-complete",
    title: "Nice work on your first quest",
    body: "That XP has been added to your total. Keep completing quests to level up and unlock new ones. Try to complete at least one quest every day to build your streak.",
  },
};
