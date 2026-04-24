const allowedTracks = new Set([
  "starter",
  "daily",
  "social",
  "wallet",
  "referral",
  "premium",
  "ambassador",
  "quiz",
  "creative",
  "campaign",
]);

const allowedTokenEffects = new Set([
  "none",
  "eligibility_progress",
  "token_bonus",
  "direct_token_reward",
]);

const allowedUnlockRuleTypes = new Set([
  "min_level",
  "min_streak",
  "wallet_linked",
  "starter_path_complete",
  "subscription_tier",
  "connected_social_count",
  "connected_social",
  "successful_referrals",
  "monthly_premium_referrals",
  "annual_premium_referrals",
  "ambassador_candidate",
  "ambassador_active",
  "campaign_source",
  "trust_score_band",
  "wallet_age_days",
  "quest_completed",
  "weekly_xp_min",
  "runtime_flag",
]);

function isRecord(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function validateRewardConfig(slug, rewardConfig, xpReward, errors) {
  if (!isRecord(rewardConfig)) {
    errors.push(`${slug}: metadata.rewardConfig must be an object.`);
    return;
  }

  if (!isRecord(rewardConfig.xp) || typeof rewardConfig.xp.base !== "number") {
    errors.push(`${slug}: metadata.rewardConfig.xp.base must be a number.`);
  } else if (rewardConfig.xp.base !== xpReward) {
    errors.push(`${slug}: metadata.rewardConfig.xp.base (${rewardConfig.xp.base}) must match xp_reward (${xpReward}).`);
  }

  if (
    rewardConfig.tokenEffect !== undefined &&
    !allowedTokenEffects.has(rewardConfig.tokenEffect)
  ) {
    errors.push(`${slug}: metadata.rewardConfig.tokenEffect is not supported.`);
  }

  if (rewardConfig.tokenEligibility !== undefined) {
    if (!isRecord(rewardConfig.tokenEligibility) || typeof rewardConfig.tokenEligibility.progressPoints !== "number") {
      errors.push(`${slug}: metadata.rewardConfig.tokenEligibility.progressPoints must be a number.`);
    }
  }

  if (rewardConfig.tokenBonus !== undefined) {
    if (!isRecord(rewardConfig.tokenBonus) || typeof rewardConfig.tokenBonus.multiplier !== "number") {
      errors.push(`${slug}: metadata.rewardConfig.tokenBonus.multiplier must be a number.`);
    }
  }

  if (rewardConfig.directTokenReward !== undefined) {
    if (
      !isRecord(rewardConfig.directTokenReward) ||
      typeof rewardConfig.directTokenReward.amount !== "number" ||
      typeof rewardConfig.directTokenReward.requiresWallet !== "boolean" ||
      typeof rewardConfig.directTokenReward.asset !== "string" ||
      !String(rewardConfig.directTokenReward.asset).trim()
    ) {
      errors.push(`${slug}: metadata.rewardConfig.directTokenReward must include asset, amount, and requiresWallet.`);
    }
  }
}

function validateUnlockRuleGroup(slug, unlockRules, errors) {
  if (!isRecord(unlockRules)) {
    errors.push(`${slug}: metadata.unlockRules must be an object.`);
    return;
  }

  for (const key of ["all", "any"]) {
    if (unlockRules[key] === undefined) {
      continue;
    }

    if (!Array.isArray(unlockRules[key])) {
      errors.push(`${slug}: metadata.unlockRules.${key} must be an array when present.`);
      continue;
    }

    for (const rule of unlockRules[key]) {
      if (!isRecord(rule) || typeof rule.type !== "string") {
        errors.push(`${slug}: metadata.unlockRules.${key} entries must be objects with a type.`);
        continue;
      }

      if (!allowedUnlockRuleTypes.has(rule.type)) {
        errors.push(`${slug}: metadata.unlockRules.${key} contains unsupported rule type "${rule.type}".`);
      }
    }
  }
}

export function validateQuestDefinitionRow(row) {
  const slug = String(row.slug ?? "unknown-quest");
  const metadata = isRecord(row.metadata) ? row.metadata : {};
  const xpReward = Number(row.xp_reward ?? row.xpReward ?? 0);
  const errors = [];

  if (!allowedTracks.has(String(metadata.track ?? ""))) {
    errors.push(`${slug}: metadata.track is required and must be a supported quest track.`);
  }

  if (!isRecord(metadata.rewardConfig)) {
    errors.push(`${slug}: metadata.rewardConfig is required.`);
  } else {
    validateRewardConfig(slug, metadata.rewardConfig, xpReward, errors);
  }

  if (!isRecord(metadata.unlockRules)) {
    errors.push(`${slug}: metadata.unlockRules is required.`);
  } else {
    validateUnlockRuleGroup(slug, metadata.unlockRules, errors);
  }

  if (metadata.previewConfig !== undefined) {
    if (!isRecord(metadata.previewConfig)) {
      errors.push(`${slug}: metadata.previewConfig must be an object when present.`);
    } else if (
      metadata.previewConfig.desirability !== undefined &&
      typeof metadata.previewConfig.desirability !== "number"
    ) {
      errors.push(`${slug}: metadata.previewConfig.desirability must be a number when present.`);
    }
  }

  return errors;
}

export function validateQuestDefinitionRows(rows) {
  return rows.flatMap((row) => validateQuestDefinitionRow(row));
}
