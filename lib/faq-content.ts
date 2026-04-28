export interface FaqItem {
  question: string;
  answer: string;
  category: string;
}

export const faqItems: FaqItem[] = [
  {
    category: "General",
    question: "What is XP and how do I earn it?",
    answer:
      "XP stands for experience points. You earn it by completing quests, referring friends, and maintaining streaks. The more XP you collect, the higher your level climbs.",
  },
  {
    category: "General",
    question: "How do levels work?",
    answer:
      "Your level is based on your total XP. As you level up, you unlock harder quests with bigger rewards. Some quests are only available at certain levels, so levelling up opens new parts of the platform.",
  },
  {
    category: "General",
    question: "What happens if I miss a day and lose my streak?",
    answer:
      "Your current streak resets to zero. Your longest streak is saved permanently, so that record stays on your profile. You can start building a new streak straight away.",
  },
  {
    category: "General",
    question: "Can I use the platform without connecting a wallet?",
    answer:
      "Yes. Most quests, all daily activities, and the full XP system work without a wallet. Connecting your xPortal wallet unlocks staking quests, APY boosts, and token reward eligibility, but it's not required to use the platform.",
  },
  {
    category: "General",
    question: "Is the platform free?",
    answer:
      "Yes. The free tier gives you full access to quests, the leaderboard, achievements, referrals, and daily activities. Premium subscribers earn XP and tokens faster (1.25x monthly, 1.5x annual), but the core experience is free.",
  },
  {
    category: "Quests",
    question: "How long does manual review take?",
    answer:
      "Usually within 24 hours. During busy periods like campaign sprints it may take a little longer, but the moderation team reviews submissions at least twice daily.",
  },
  {
    category: "Quests",
    question: "Why was my quest submission rejected?",
    answer:
      "The most common reasons: the screenshot was unclear, the link was private or broken, the action wasn't completed fully, or the proof didn't match what the quest asked for. Check any feedback left by the reviewer and resubmit with clearer evidence.",
  },
  {
    category: "Quests",
    question: "Can I redo a quest I failed?",
    answer:
      "For quizzes, yes. You can retry immediately. For manual-review quests that were rejected, you can resubmit with better proof. For one-time quests that were approved, they can't be repeated.",
  },
  {
    category: "Quests",
    question: "Why can't I see certain quests?",
    answer:
      "Some quests are locked behind requirements: a minimum level, a completed prerequisite quest, a connected wallet, a minimum streak, or a specific subscription tier. The quest card will tell you exactly what's needed to unlock it.",
  },
  {
    category: "Quests",
    question: 'What does "locked" mean on a quest?',
    answer:
      "It means you haven't met the requirements to attempt it yet. Each locked quest shows what you need: a higher level, a completed quest, a connected wallet, or something else. Meet the requirement and it unlocks automatically.",
  },
  {
    category: "Quests",
    question: "How do daily quests reset?",
    answer:
      "Daily quests reset at midnight UTC every day. If you completed a daily quest today, it will be available again tomorrow. Your progress on that specific quest doesn't carry over.",
  },
  {
    category: "Rewards & Wallet",
    question: "What are eligibility points?",
    answer:
      "Eligibility points track your progress toward qualifying for token rewards. Many quests award them alongside XP. You need 100 eligibility points to become eligible for token redemption when that feature activates.",
  },
  {
    category: "Rewards & Wallet",
    question: "When will token redemption be available?",
    answer:
      "Token redemption is not active yet. The platform currently runs on XP. When redemption activates, your accumulated eligibility points will convert to EMR tokens at a rate of 20 points per token. Keep earning points now so you're ready.",
  },
  {
    category: "Rewards & Wallet",
    question: "What's the difference between EMRS and EMR?",
    answer:
      "EMRS is the in-app reward currency you earn through calorie conversions in the Emorya app. EMR is the Emorya token on the MultiversX blockchain, earned through eligible quests, staking, and referral rewards. They serve different purposes in the ecosystem.",
  },
  {
    category: "Rewards & Wallet",
    question: "Do I need a wallet to use the platform?",
    answer:
      "No. You can complete most quests, earn XP, climb the leaderboard, and unlock achievements without a wallet. A wallet is only needed for staking quests and token-related features.",
  },
  {
    category: "Rewards & Wallet",
    question: "What is xPortal?",
    answer:
      "xPortal is the MultiversX wallet app. It's where you store, stake, and manage EMR tokens. You can download it from the App Store or Google Play. Connecting it to your Emorya account unlocks the staking quest ladder and token reward eligibility.",
  },
  {
    category: "Referrals",
    question: "How do I find my referral link?",
    answer:
      "Go to your profile page. Your referral code is displayed there, along with a share button that lets you copy your referral link or share it directly to X, Telegram, or WhatsApp.",
  },
  {
    category: "Referrals",
    question: "How much XP do I get for referring someone?",
    answer:
      "You earn 40 XP when someone signs up with your referral code. If they upgrade to Monthly Premium, you earn 150 XP. If they upgrade to Annual Premium, you earn 300 XP.",
  },
  {
    category: "Referrals",
    question: "Does my friend get anything when they use my referral link?",
    answer:
      "They get a personalised welcome experience showing your stats and progress, and they enter the platform with your activity as context. Campaign-source bonuses may also apply depending on how they found the link.",
  },
  {
    category: "Premium",
    question: "What do I get with Premium?",
    answer:
      "Premium subscribers earn XP faster and accumulate token eligibility points faster. Monthly Premium gives you 1.25x XP and 1.15x token multipliers. Annual Premium gives you 1.5x XP and 1.3x token multipliers, plus a direct 25 EMR token reward on upgrade.",
  },
  {
    category: "Premium",
    question: "Can I switch from Monthly to Annual?",
    answer:
      "Yes. Upgrading from Monthly to Annual applies the stronger multipliers immediately and awards the 25 EMR token bonus.",
  },
  {
    category: "Premium",
    question: "Do I lose progress if my Premium expires?",
    answer:
      "No. All XP, levels, achievements, and quest completions are permanent. You just return to the free-tier earning rates (1x XP, 1x tokens) until you renew.",
  },
];

export const faqCategories = [...new Set(faqItems.map((item) => item.category))];
