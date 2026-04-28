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
  "quest_completed_today",
  "weekly_xp_min",
  "runtime_flag",
]);

const allowedVerificationTypes = new Set([
  "social-oauth",
  "wallet-check",
  "quiz",
  "manual-review",
  "link-visit",
  "completion-check",
  "api-check",
  "text-submission",
]);

function isRecord(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function getVerificationType(row) {
  return String(row.verification_type ?? row.verificationType ?? "");
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

function validateCompletionCheck(slug, row, errors) {
  if (getVerificationType(row) !== "completion-check") {
    return;
  }

  if (!Array.isArray(row.metadata.completionCheckSlugs) || row.metadata.completionCheckSlugs.length === 0) {
    errors.push(`${slug}: completion-check quests must include metadata.completionCheckSlugs with at least one quest slug.`);
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

function validateQuizQuestions(slug, metadata, row, errors) {
  if (getVerificationType(row) !== "quiz") {
    return;
  }

  if (!Array.isArray(metadata.questions) || metadata.questions.length === 0) {
    errors.push(`${slug}: quiz quests must include metadata.questions with at least one question.`);
    return;
  }

  for (const [index, question] of metadata.questions.entries()) {
    if (!isRecord(question)) {
      errors.push(`${slug}: metadata.questions[${index}] must be an object.`);
      continue;
    }

    if (typeof question.id !== "string" || !question.id.trim()) {
      errors.push(`${slug}: metadata.questions[${index}].id must be a non-empty string.`);
    }

    if (typeof question.text !== "string" || !question.text.trim()) {
      errors.push(`${slug}: metadata.questions[${index}].text must be a non-empty string.`);
    }

    if (!Array.isArray(question.options) || question.options.length < 2) {
      errors.push(`${slug}: metadata.questions[${index}].options must include at least two choices.`);
    } else if (question.options.some((option) => typeof option !== "string" || !option.trim())) {
      errors.push(`${slug}: metadata.questions[${index}].options must only contain non-empty strings.`);
    }

    if (!Number.isInteger(question.correctIndex)) {
      errors.push(`${slug}: metadata.questions[${index}].correctIndex must be an integer.`);
    } else if (Array.isArray(question.options) && (question.correctIndex < 0 || question.correctIndex >= question.options.length)) {
      errors.push(`${slug}: metadata.questions[${index}].correctIndex must point at a valid option.`);
    }
  }

  if (typeof metadata.totalQuestions === "number" && metadata.totalQuestions !== metadata.questions.length) {
    errors.push(`${slug}: metadata.totalQuestions must match metadata.questions.length.`);
  }

  if (typeof metadata.passScore !== "number" || metadata.passScore < 1 || metadata.passScore > metadata.questions.length) {
    errors.push(`${slug}: metadata.passScore must be between 1 and the total question count.`);
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

  if (!allowedVerificationTypes.has(getVerificationType(row))) {
    errors.push(`${slug}: verification_type must be a supported verification lane.`);
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

  validateQuizQuestions(slug, metadata, row, errors);
  validateCompletionCheck(slug, row, errors);

  return errors;
}

export function validateQuestDefinitionRows(rows) {
  return rows.flatMap((row) => validateQuestDefinitionRow(row));
}
