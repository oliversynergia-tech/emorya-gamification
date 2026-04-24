import type { QuestRuntimeContext, UnlockRule, UnlockRuleGroup, UserProgressState } from "@/lib/types";

function tierRank(tier: UserProgressState["subscriptionTier"]) {
  switch (tier) {
    case "annual":
      return 2;
    case "monthly":
      return 1;
    default:
      return 0;
  }
}

export function evaluateUnlockRule(
  rule: UnlockRule,
  state: UserProgressState,
  runtimeContext: QuestRuntimeContext,
) {
  switch (rule.type) {
    case "min_level":
      return state.level >= rule.value;
    case "min_streak":
      return state.currentStreak >= rule.value;
    case "wallet_linked":
      return state.walletLinked;
    case "starter_path_complete":
      return state.starterPathComplete;
    case "subscription_tier":
      return tierRank(state.subscriptionTier) >= tierRank(rule.value);
    case "connected_social_count":
      return state.connectedSocialCount >= rule.value;
    case "connected_social":
      return state.connectedSocials.includes(rule.value);
    case "successful_referrals":
      return state.successfulReferralCount >= rule.value;
    case "monthly_premium_referrals":
      return state.monthlyPremiumReferralCount >= rule.value;
    case "annual_premium_referrals":
      return state.annualPremiumReferralCount >= rule.value;
    case "ambassador_candidate":
      return state.ambassadorCandidate;
    case "ambassador_active":
      return state.ambassadorActive;
    case "campaign_source":
      return state.campaignSource === rule.value;
    case "trust_score_band":
      return rule.value === "high"
        ? state.trustScoreBand === "high"
        : state.trustScoreBand === "medium" || state.trustScoreBand === "high";
    case "wallet_age_days":
      return state.walletAgeDays >= rule.value;
    case "quest_completed":
      return state.completedQuestSlugs.includes(rule.value);
    case "quest_completed_today":
      return state.completedQuestSlugsToday.includes(rule.value);
    case "weekly_xp_min":
      return state.weeklyXp >= rule.value;
    case "runtime_flag":
      return runtimeContext[rule.value] === true;
    default:
      return true;
  }
}

export function getUnmetUnlockRules(
  rules: UnlockRuleGroup | undefined,
  state: UserProgressState,
  runtimeContext: QuestRuntimeContext,
) {
  const unmetAll = (rules?.all ?? []).filter((rule) => !evaluateUnlockRule(rule, state, runtimeContext));
  const anyRules = rules?.any ?? [];
  const anyPassed = anyRules.length === 0 || anyRules.some((rule) => evaluateUnlockRule(rule, state, runtimeContext));
  const unmetAny = anyPassed ? [] : anyRules;

  return {
    unmetAll,
    unmetAny,
  };
}

export function evaluateUnlockRuleGroup(
  rules: UnlockRuleGroup | undefined,
  state: UserProgressState,
  runtimeContext: QuestRuntimeContext,
) {
  const { unmetAll, unmetAny } = getUnmetUnlockRules(rules, state, runtimeContext);

  return {
    unlocked: unmetAll.length === 0 && unmetAny.length === 0,
    unmetAll,
    unmetAny,
  };
}
