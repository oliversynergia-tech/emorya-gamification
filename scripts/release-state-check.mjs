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
];

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
    SELECT payout_asset, redemption_enabled, direct_rewards_enabled,
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
    if (!["EMR", "EGLD", "PARTNER"].includes(String(economy.payout_asset))) {
      errors.push("economy_settings.payout_asset must be EMR, EGLD, or PARTNER.");
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
     WHERE filename IN ('013_add_token_redemption_settlement_details.sql', '014_add_campaign_overrides_and_referral_direct_rewards.sql')
     ORDER BY filename ASC`,
  );
  const appliedMigrations = new Set(migrationResult.rows.map((row) => String(row.filename)));

  for (const filename of [
    "013_add_token_redemption_settlement_details.sql",
    "014_add_campaign_overrides_and_referral_direct_rewards.sql",
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
