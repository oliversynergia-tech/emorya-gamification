export type DailyTip = {
  id: number;
  title: string;
  body: string;
  category: string;
};

export const dailyTips: DailyTip[] = [
  {
    id: 1,
    title: "Your streak is your superpower",
    body: "Every day you complete at least one quest, your streak grows. Longer streaks unlock harder quests with bigger XP rewards. Miss a day and it resets to zero.",
    category: "Streaks",
  },
  {
    id: 2,
    title: "Calories convert to EMRS",
    body: "The Emorya app tracks your calorie burn. Once you've burned enough, you can convert calories to EMRS, the in-app reward currency that fuels your progression.",
    category: "Rewards",
  },
  {
    id: 3,
    title: "Premium multiplies everything",
    body: "Free users earn at 1x. Monthly Premium earns at 1.25x XP and 1.15x tokens. Annual Premium earns at 1.5x XP and 1.3x tokens.",
    category: "Premium",
  },
  {
    id: 4,
    title: "Your wallet unlocks the next level",
    body: "Connecting your xPortal wallet unlocks staking quests, APY boosts, and token eligibility. It's where casual progress starts turning into deeper reward readiness.",
    category: "Wallet",
  },
  {
    id: 5,
    title: "Referrals reward both sides",
    body: "When you refer someone, you earn 40 XP when they sign up. If they upgrade to Monthly, you earn 150 XP. Annual upgrades push that to 300 XP.",
    category: "Referrals",
  },
  {
    id: 6,
    title: "The leaderboard resets weekly",
    body: "The all-time leaderboard tracks lifetime leaders, but the weekly board resets every Monday. One focused week of daily quests can move almost anyone into the top 20.",
    category: "Leaderboard",
  },
  {
    id: 7,
    title: "Achievements are permanent badges",
    body: "Unlike repeatable quests, achievements are earned once and stay on your profile. They become the clearest way to show what kind of player you are becoming.",
    category: "Achievements",
  },
  {
    id: 8,
    title: "Daily quests compound fast",
    body: "The current daily quest stack is worth about 235 XP per day. Over a 30-day month that can add up to roughly 7,050 XP from habits alone.",
    category: "Daily Quests",
  },
  {
    id: 9,
    title: "Staking thresholds unlock in steps",
    body: "Stake your first EMR, then reach Threshold A at 500 EMR, then Threshold B at 1,000 EMR, then APY boost status. Each step adds XP and eligibility progress.",
    category: "Staking",
  },
  {
    id: 10,
    title: "Eligibility points are your second currency",
    body: "XP shows your level. Eligibility points show your readiness for future token rewards. You need 100 eligibility points before token redemption opens.",
    category: "Token Economy",
  },
  {
    id: 11,
    title: "UGC quests earn the most social XP",
    body: "Original content about your Emorya journey, from progress posts to reels, pays more than simple follow-or-like quests. The strongest creative submissions run from 110 to 240 XP.",
    category: "Creative",
  },
  {
    id: 12,
    title: "The Emorya Marathon is the ultimate challenge",
    body: "500 calories a day for 30 consecutive days earns 3,000 XP and 160 eligibility points. It only unlocks once you reach level 8.",
    category: "Challenges",
  },
  {
    id: 13,
    title: "Your referral code is your growth engine",
    body: "Your referral code lives on your profile. Every person who signs up through it earns you XP, boosts your referral rank, and grows your network value.",
    category: "Referrals",
  },
  {
    id: 14,
    title: "Token redemption is coming",
    body: "Right now the launch path is XP-first. When redemption opens, your eligibility points convert to EMR at 20 points per token, so building points now still matters.",
    category: "Token Economy",
  },
];

export function getTodaysTip(date = new Date()): DailyTip {
  const startOfYear = new Date(date.getFullYear(), 0, 0);
  const dayOfYear = Math.floor((date.getTime() - startOfYear.getTime()) / (1000 * 60 * 60 * 24));
  return dailyTips[dayOfYear % dailyTips.length];
}
