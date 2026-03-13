import { getLevelProgress } from "@/lib/progression";
import type {
  Achievement,
  ActivityItem,
  LeaderboardEntry,
  Quest,
  UserSnapshot,
} from "@/lib/types";

export const currentUser: UserSnapshot = {
  displayName: "Oliver",
  level: 8,
  totalXp: 4520,
  currentStreak: 14,
  nextLevelXp: getLevelProgress(4520).nextThreshold,
  tier: "free",
  rank: 34,
  referralCode: "EMORYA-8W3K9R",
  referral: {
    invitedCount: 2,
    convertedCount: 1,
    rewardXpEarned: 160,
    pendingConversionXp: 120,
    recentReferrals: [
      {
        displayName: "Aya",
        tier: "monthly",
        status: "converted",
        joinedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 18).toISOString(),
      },
      {
        displayName: "Nico",
        tier: "free",
        status: "joined",
        joinedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 16).toISOString(),
      },
    ],
  },
  connectedAccounts: [
    { platform: "X", connected: true, rewardXp: 15 },
    { platform: "Telegram", connected: true, rewardXp: 15 },
    { platform: "Discord", connected: true, rewardXp: 15 },
    { platform: "TikTok", connected: false, rewardXp: 20 },
    { platform: "Instagram", connected: false, rewardXp: 20 },
    { platform: "CoinMarketCap", connected: false, rewardXp: 20 },
  ],
};

export const quests: Quest[] = [
  {
    id: "social-01",
    title: "Share the movement reset",
    description: "Post Emorya's latest recovery story on X with the campaign hashtag.",
    category: "social",
    xpReward: 30,
    difficulty: "easy",
    verificationType: "social-oauth",
    status: "available",
    requiredLevel: 1,
    requiredTier: "free",
  },
  {
    id: "learn-01",
    title: "Premium economics quiz",
    description: "Finish a 5-question lesson on Premium benefits and annual savings.",
    category: "learn",
    xpReward: 45,
    difficulty: "medium",
    verificationType: "quiz",
    status: "available",
    requiredLevel: 2,
    requiredTier: "free",
  },
  {
    id: "app-01",
    title: "Log 8,000 steps in the app",
    description: "Upload your day summary or connect the Emorya API when available.",
    category: "app",
    xpReward: 60,
    difficulty: "medium",
    verificationType: "manual-review",
    status: "in-progress",
    requiredLevel: 6,
    requiredTier: "free",
  },
  {
    id: "creative-01",
    title: "Create a launch meme",
    description: "Submit a polished meme about momentum, movement, or recovery.",
    category: "creative",
    xpReward: 80,
    difficulty: "medium",
    verificationType: "manual-review",
    status: "available",
    requiredLevel: 7,
    requiredTier: "free",
  },
  {
    id: "visit-01",
    title: "Visit the premium explainer",
    description: "Open the premium benefits explainer and confirm the visit.",
    category: "learn",
    xpReward: 20,
    difficulty: "easy",
    verificationType: "link-visit",
    status: "available",
    requiredLevel: 1,
    requiredTier: "free",
    targetUrl: "https://example.com/premium-explainer",
  },
  {
    id: "staking-annual-01",
    title: "Strengthen the Core: 7-day stake hold",
    description: "Maintain an EMR staking position for seven days to unlock a large XP drop.",
    category: "staking",
    xpReward: 180,
    difficulty: "hard",
    verificationType: "wallet-check",
    status: "locked",
    requiredLevel: 9,
    requiredTier: "monthly",
    premiumPreview: true,
  },
  {
    id: "creative-annual-01",
    title: "Signature creator brief",
    description: "Publish a multi-post thread or short-form video tagged for the race campaign.",
    category: "creative",
    xpReward: 240,
    difficulty: "hard",
    verificationType: "manual-review",
    status: "locked",
    requiredLevel: 10,
    requiredTier: "annual",
    premiumPreview: true,
    timebox: "Ends in 2d 11h",
  },
];

export const achievements: Achievement[] = [
  {
    id: "zealy-veteran",
    name: "Zealy Veteran",
    description: "Recognised warm traffic from a prior campaign journey.",
    progress: 1,
    unlocked: true,
  },
  {
    id: "streak-machine",
    name: "Streak Machine",
    description: "Maintain a daily quest streak for 30 days.",
    progress: 0.47,
    unlocked: false,
  },
  {
    id: "premium-champion",
    name: "Premium Champion",
    description: "Annual Premium badge with top-tier leaderboard prestige.",
    progress: 0,
    unlocked: false,
  },
];

export const leaderboard: LeaderboardEntry[] = [
  { rank: 1, displayName: "Lina", level: 18, xp: 37140, badges: 12, tier: "annual", delta: 2 },
  { rank: 2, displayName: "Kairo", level: 17, xp: 35520, badges: 10, tier: "annual", delta: -1 },
  { rank: 3, displayName: "Mia", level: 16, xp: 34100, badges: 9, tier: "monthly", delta: 1 },
  { rank: 34, displayName: "Oliver", level: 8, xp: 4520, badges: 4, tier: "free", delta: 3 },
  { rank: 35, displayName: "Nico", level: 8, xp: 4485, badges: 4, tier: "free", delta: -2 },
  { rank: 36, displayName: "Aya", level: 8, xp: 4440, badges: 3, tier: "monthly", delta: 5 },
];

export const activityFeed: ActivityItem[] = [
  {
    id: "1",
    actor: "Lina",
    action: "earned Premium Champion",
    detail: "upgraded to Annual and unlocked 3 streak freezes",
    timeAgo: "2m ago",
  },
  {
    id: "2",
    actor: "Oliver",
    action: "completed Daily Complete",
    detail: "finished 3 featured quests for 25 bonus XP",
    timeAgo: "11m ago",
  },
  {
    id: "3",
    actor: "Mia",
    action: "submitted a creator brief",
    detail: "waiting for review in Be Creative",
    timeAgo: "17m ago",
  },
];

export const premiumMoments = [
  "Level 8 reached. The free loop is complete. Monthly unlocks the next quest lane.",
  "Annual saves 44 euros a year and doubles every XP event.",
  "Your 14-day streak is at risk protection territory. Annual includes 3 streak freezes.",
  "With 2x XP, your latest 60 XP challenge would have landed 120 XP instead.",
];

export const adminStats = [
  { label: "Pending Reviews", value: "18" },
  { label: "Free to Monthly CVR", value: "6.4%" },
  { label: "Monthly to Annual CVR", value: "28%" },
  { label: "Weekly Active Users", value: "4,182" },
];

export const reviewQueue = [
  {
    id: "review-1",
    questId: "creative-01",
    questTitle: "Create a launch meme",
    userDisplayName: "Oliver",
    userEmail: "oliver@emorya.com",
    verificationType: "manual-review" as const,
    submissionData: {
      contentUrl: "https://example.com/meme-post",
      note: "Draft meme ready for review",
    },
    status: "pending" as const,
    createdAt: new Date().toISOString(),
  },
];
