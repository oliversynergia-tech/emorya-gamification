export const tooltips = {
  xp: "Points you earn by completing quests. The more XP you collect, the higher your level.",
  level: "Your overall progress. Higher levels unlock harder quests with bigger rewards.",
  currentStreak:
    "The number of days in a row you've completed at least one quest. Missing a day resets it to zero.",
  longestStreak: "The best streak you've ever hit. This one never resets.",
  eligibilityPoints:
    "Progress toward token reward qualification. Many quests award these alongside XP. You need 100 to become eligible.",
  emrs: "The in-app reward currency you earn through calorie conversions in the Emorya app.",
  emr: "The Emorya token. Earned through eligible quests, staking, and referral rewards.",
  totalXp: "All XP you've earned across every quest, referral, and streak bonus since you joined.",
  referralCode: "Your personal invite code. Anyone who signs up with this code counts as your referral.",
  referrals: "The number of people who signed up using your referral code.",
  leaderboardRank: "Your position on the all-time leaderboard, based on total XP.",
  subscriptionTier:
    "Your current plan. Free users earn at base rates. Monthly earns 1.25x XP. Annual earns 1.5x XP.",
  questsCompleted: "Total number of quests you've finished and had approved.",
  questStatusAvailable: "This quest is ready for you to start.",
  questStatusLocked: "You haven't met the requirements yet. Check what's needed below the quest title.",
  questStatusPendingReview: "Your submission has been received. The team will review it, usually within 24 hours.",
  questStatusApproved: "Done. Your XP and any rewards have been added to your account.",
  questStatusRejected: "Your submission didn't meet the requirements. Check the feedback and try again.",
  questStatusCompletedOneTime: "You've already completed this quest. One-time quests can't be repeated.",
  questStatusResetsDaily: "This quest resets every day at midnight UTC. Complete it again tomorrow for more XP.",
  questStatusResetsWeekly: "This quest resets every Monday. You can complete it once per week.",
  questStatusResetsMonthly: "This quest resets on the 1st of each month.",
  verificationLinkVisit: "Click the link to complete this quest. No submission needed.",
  verificationManualReview:
    "Submit your proof and the team will review it. You'll get a notification when it's approved.",
  verificationQuiz: "Answer the questions correctly to complete this quest. You can retry if you don't pass.",
  verificationWalletCheck:
    "This quest checks your connected wallet automatically. Make sure your xPortal wallet is linked first.",
  verificationTextSubmission: "Write a short response and submit it. The team will review what you've written.",
  verificationApiCheck: "This quest verifies your action on an external platform automatically.",
  difficultyEasy: "Quick to complete. A few minutes at most.",
  difficultyMedium: "Takes some effort. You might need to prepare something or spend time in the app.",
  difficultyHard: "A real challenge. These take sustained commitment over days or weeks.",
  activeQuests: "Quests you can complete right now based on your level and progress.",
  dailyProgress: "How many of today's daily quests you've completed so far.",
  weeklyXp: "XP earned this week, Monday to Sunday.",
  walletConnected: "Your xPortal wallet is linked. Staking quests and token rewards are available.",
  walletNotConnected:
    "No wallet linked yet. Connect your xPortal wallet to unlock staking quests and reward eligibility.",
  xpMultiplier: "Premium subscribers earn XP faster. Monthly gets 1.25x, Annual gets 1.5x.",
  tokenMultiplier:
    "Premium subscribers earn token eligibility points faster. Monthly gets 1.15x, Annual gets 1.3x.",
  premiumQuest: "This quest is only available to Premium subscribers.",
  premiumPreview: "You can see this quest but can't complete it until you upgrade to Premium.",
  leaderboardAllTime: "Lifetime rankings based on total XP earned since joining.",
  leaderboardWeekly: "Rankings based on XP earned this week. Resets every Monday.",
  leaderboardMonthly: "Rankings based on XP earned this calendar month. Resets on the 1st.",
  leaderboardReferral: "Rankings based on how many people you've referred. Updated regularly.",
} as const;

export type TooltipKey = keyof typeof tooltips;
