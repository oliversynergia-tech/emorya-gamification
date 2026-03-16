import { resolve } from "path";
import { fileURLToPath } from "url";

import { createDbToolContext } from "./db-tools.mjs";

const rootDir = resolve(fileURLToPath(new URL("..", import.meta.url)));
const { withClient } = createDbToolContext(rootDir);

const requiredCampaignSources = ["direct", "zealy", "galxe", "layer3"];
const requiredSettlementColumns = [
  "receipt_reference",
  "settlement_note",
  "settled_at",
  "settled_by",
  "reward_asset_id",
  "reward_program_id",
];

const approvedRanges = {
  minimumEligibilityPoints: { min: 50, max: 5000 },
  pointsPerToken: { min: 1, max: 500 },
  xpMultiplierMonthly: { min: 1, max: 3 },
  xpMultiplierAnnual: { min: 1, max: 5 },
  tokenMultiplierMonthly: { min: 1, max: 3 },
  tokenMultiplierAnnual: { min: 1, max: 4 },
  annualReferralDirectTokenAmount: { min: 0, max: 500 },
};

function isNumber(value) {
  return typeof value === "number" && Number.isFinite(value);
}

function validateOverrideObject(source, value, errors) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    errors.push(`campaignOverrides.${source} must be an object.`);
    return;
  }

  for (const key of [
    "signupBonusXp",
    "monthlyConversionBonusXp",
    "annualConversionBonusXp",
    "annualDirectTokenBonus",
    "questXpMultiplierBonus",
    "eligibilityPointsMultiplierBonus",
    "tokenYieldMultiplierBonus",
    "minimumEligibilityPointsOffset",
    "directTokenRewardBonus",
  ]) {
    if (!isNumber(value[key])) {
      errors.push(`campaignOverrides.${source}.${key} must be a number.`);
    }
  }
}

await withClient(async (client) => {
  const errors = [];

  const economyResult = await client.query(`
    SELECT payout_asset, payout_mode, redemption_enabled, settlement_processing_enabled,
           direct_reward_queue_enabled, settlement_notes_required, direct_rewards_enabled,
           direct_annual_referral_enabled, minimum_eligibility_points,
           points_per_token, xp_multiplier_free, xp_multiplier_monthly, xp_multiplier_annual,
           token_multiplier_free, token_multiplier_monthly, token_multiplier_annual,
           annual_referral_direct_token_amount, campaign_overrides
    FROM economy_settings
    WHERE is_active = TRUE
    ORDER BY updated_at DESC
    LIMIT 1
  `);

  const economy = economyResult.rows[0];

  if (!economy) {
    errors.push("No active economy_settings row found.");
  } else {
    const rewardAssetResult = await client.query(
      `SELECT COUNT(*)::int AS count
       FROM reward_assets
       WHERE symbol = $1
         AND is_active = TRUE`,
      [String(economy.payout_asset)],
    );

    if (Number(rewardAssetResult.rows[0]?.count ?? 0) < 1) {
      errors.push("economy_settings.payout_asset must point to an active reward asset.");
    }

    const minimumPoints = Number(economy.minimum_eligibility_points);
    const pointsPerToken = Number(economy.points_per_token);
    const xpFree = Number(economy.xp_multiplier_free);
    const xpMonthly = Number(economy.xp_multiplier_monthly);
    const xpAnnual = Number(economy.xp_multiplier_annual);
    const tokenFree = Number(economy.token_multiplier_free);
    const tokenMonthly = Number(economy.token_multiplier_monthly);
    const tokenAnnual = Number(economy.token_multiplier_annual);
    const annualReferralDirectTokenAmount = Number(economy.annual_referral_direct_token_amount);
    const payoutMode = String(economy.payout_mode);

    if (!["manual", "review_required", "automation_ready"].includes(payoutMode)) {
      errors.push("economy_settings.payout_mode must be manual, review_required, or automation_ready.");
    }

    if (economy.settlement_processing_enabled === false && payoutMode === "automation_ready") {
      errors.push("automation_ready payout mode cannot be used while settlement_processing_enabled is false.");
    }

    if (economy.direct_reward_queue_enabled === false && economy.direct_rewards_enabled === true) {
      errors.push("direct_reward_queue_enabled cannot be false while direct rewards remain enabled.");
    }

    if (minimumPoints <= 0) {
      errors.push("economy_settings.minimum_eligibility_points must be greater than 0.");
    }

    if (pointsPerToken <= 0) {
      errors.push("economy_settings.points_per_token must be greater than 0.");
    }

    if (!(xpMonthly >= xpFree && xpAnnual >= xpMonthly)) {
      errors.push("XP multipliers must increase monotonically from free to monthly to annual.");
    }

    if (!(tokenMonthly >= tokenFree && tokenAnnual >= tokenMonthly)) {
      errors.push("Token multipliers must increase monotonically from free to monthly to annual.");
    }

    if (annualReferralDirectTokenAmount < 0) {
      errors.push("annual_referral_direct_token_amount cannot be negative.");
    }

    if (
      minimumPoints < approvedRanges.minimumEligibilityPoints.min ||
      minimumPoints > approvedRanges.minimumEligibilityPoints.max
    ) {
      errors.push("minimum_eligibility_points is outside the approved release range.");
    }

    if (pointsPerToken < approvedRanges.pointsPerToken.min || pointsPerToken > approvedRanges.pointsPerToken.max) {
      errors.push("points_per_token is outside the approved release range.");
    }

    if (
      xpMonthly < approvedRanges.xpMultiplierMonthly.min ||
      xpMonthly > approvedRanges.xpMultiplierMonthly.max ||
      xpAnnual < approvedRanges.xpMultiplierAnnual.min ||
      xpAnnual > approvedRanges.xpMultiplierAnnual.max
    ) {
      errors.push("XP multipliers drifted outside approved release ranges.");
    }

    if (
      tokenMonthly < approvedRanges.tokenMultiplierMonthly.min ||
      tokenMonthly > approvedRanges.tokenMultiplierMonthly.max ||
      tokenAnnual < approvedRanges.tokenMultiplierAnnual.min ||
      tokenAnnual > approvedRanges.tokenMultiplierAnnual.max
    ) {
      errors.push("Token multipliers drifted outside approved release ranges.");
    }

    if (
      annualReferralDirectTokenAmount < approvedRanges.annualReferralDirectTokenAmount.min ||
      annualReferralDirectTokenAmount > approvedRanges.annualReferralDirectTokenAmount.max
    ) {
      errors.push("annual_referral_direct_token_amount is outside the approved release range.");
    }

    if (
      economy.direct_rewards_enabled === true &&
      economy.direct_annual_referral_enabled === true &&
      annualReferralDirectTokenAmount <= 0
    ) {
      errors.push("Direct annual referral rewards are enabled but annual_referral_direct_token_amount is not greater than 0.");
    }

    const campaignOverrides = economy.campaign_overrides ?? {};

    for (const source of requiredCampaignSources) {
      validateOverrideObject(source, campaignOverrides[source], errors);
    }

    if (economy.redemption_enabled === true && minimumPoints < pointsPerToken) {
      errors.push("minimum_eligibility_points should not be lower than points_per_token while redemption is enabled.");
    }
  }

  const schemaResult = await client.query(
    `SELECT column_name
     FROM information_schema.columns
     WHERE table_schema = 'public'
       AND table_name = 'token_redemptions'`,
  );
  const presentColumns = new Set(schemaResult.rows.map((row) => String(row.column_name)));

  for (const column of requiredSettlementColumns) {
    if (!presentColumns.has(column)) {
      errors.push(`token_redemptions is missing required settlement column "${column}".`);
    }
  }

  const migrationResult = await client.query(
    `SELECT filename
     FROM schema_migrations
     WHERE filename IN ('013_add_token_redemption_settlement_details.sql', '014_add_campaign_overrides_and_referral_direct_rewards.sql', '016_add_reward_assets_and_programs.sql', '017_add_payout_operation_controls.sql')
     ORDER BY filename ASC`,
  );
  const appliedMigrations = new Set(migrationResult.rows.map((row) => String(row.filename)));

  for (const filename of [
    "013_add_token_redemption_settlement_details.sql",
    "014_add_campaign_overrides_and_referral_direct_rewards.sql",
    "016_add_reward_assets_and_programs.sql",
    "017_add_payout_operation_controls.sql",
  ]) {
    if (!appliedMigrations.has(filename)) {
      errors.push(`Required migration not applied: ${filename}`);
    }
  }

  if (errors.length > 0) {
    console.error("Release state validation failed:");
    for (const error of errors) {
      console.error(`- ${error}`);
    }
    process.exit(1);
  }

  console.log("Release state validation passed.");
});
