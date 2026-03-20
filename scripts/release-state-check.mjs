import { resolve } from "path";
import { fileURLToPath } from "url";

import { createDbToolContext } from "./db-tools.mjs";

const rootDir = resolve(fileURLToPath(new URL("..", import.meta.url)));
const { withClient } = createDbToolContext(rootDir);

const requiredCampaignSources = ["direct", "zealy", "galxe", "taskon"];
const requiredSettlementColumns = [
  "receipt_reference",
  "settlement_note",
  "workflow_state",
  "approved_at",
  "approved_by",
  "processing_started_at",
  "processing_by",
  "held_at",
  "held_by",
  "hold_reason",
  "failed_at",
  "failed_by",
  "last_error",
  "cancelled_at",
  "cancelled_by",
  "cancellation_reason",
  "retry_count",
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
    "weeklyTargetXpOffset",
    "premiumUpsellBonusMultiplier",
    "leaderboardMomentumBonus",
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
           direct_annual_referral_enabled, differentiate_upstream_campaign_sources, minimum_eligibility_points,
           points_per_token, xp_multiplier_free, xp_multiplier_monthly, xp_multiplier_annual,
           token_multiplier_free, token_multiplier_monthly, token_multiplier_annual,
           annual_referral_direct_token_amount, campaign_alert_channels, campaign_overrides
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

    const activeProgramSummaryResult = await client.query(
      `SELECT COUNT(*)::int AS total,
              COUNT(*) FILTER (WHERE redemption_enabled = TRUE)::int AS redemption_total,
              COUNT(*) FILTER (WHERE direct_rewards_enabled = TRUE)::int AS direct_total
       FROM reward_programs programs
       INNER JOIN reward_assets assets ON assets.id = programs.reward_asset_id
       WHERE programs.is_active = TRUE
         AND assets.is_active = TRUE
         AND assets.symbol = $1`,
      [String(economy.payout_asset)],
    );
    const activeProgramSummary = activeProgramSummaryResult.rows[0] ?? {
      total: 0,
      redemption_total: 0,
      direct_total: 0,
    };

    if (Number(activeProgramSummary.total ?? 0) < 1) {
      errors.push("At least one active reward program must exist for the active payout asset.");
    }

    if (economy.redemption_enabled === true && Number(activeProgramSummary.redemption_total ?? 0) < 1) {
      errors.push("Redemption is enabled but no active reward program supports redemption for the active payout asset.");
    }

    if (economy.direct_rewards_enabled === true && Number(activeProgramSummary.direct_total ?? 0) < 1) {
      errors.push("Direct rewards are enabled but no active reward program supports direct rewards for the active payout asset.");
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

    if (economy.direct_rewards_enabled === false) {
      for (const key of [
        "direct_annual_referral_enabled",
        "direct_premium_flash_enabled",
        "direct_ambassador_enabled",
      ]) {
        if (economy[key] === true) {
          errors.push(`${key} cannot remain enabled while direct_rewards_enabled is false.`);
        }
      }
    }

    if (payoutMode === "manual" && economy.settlement_notes_required === true) {
      errors.push("settlement_notes_required should stay off while payout_mode is manual.");
    }

    if (payoutMode === "automation_ready" && economy.redemption_enabled !== true) {
      errors.push("automation_ready payout mode requires redemption_enabled to stay true.");
    }

    if (typeof economy.differentiate_upstream_campaign_sources !== "boolean") {
      errors.push("economy_settings.differentiate_upstream_campaign_sources must be a boolean.");
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
    const campaignAlertChannels = economy.campaign_alert_channels ?? {};

    for (const source of requiredCampaignSources) {
      validateOverrideObject(source, campaignOverrides[source], errors);
    }

    if (typeof campaignAlertChannels.inboxEnabled !== "boolean") {
      errors.push("campaign_alert_channels.inboxEnabled must be a boolean.");
    }
    for (const key of ["webhookUrl", "emailRecipient", "slackWebhookUrl", "discordWebhookUrl"]) {
      const value = campaignAlertChannels[key];
      if (!(value === null || value === undefined || typeof value === "string")) {
        errors.push(`campaign_alert_channels.${key} must be null or a string.`);
      }
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
     WHERE filename IN ('013_add_token_redemption_settlement_details.sql', '014_add_campaign_overrides_and_referral_direct_rewards.sql', '016_add_reward_assets_and_programs.sql', '017_add_payout_operation_controls.sql', '018_add_quest_definition_templates.sql', '019_expand_campaign_override_funnel_presets.sql', '020_add_token_redemption_workflow_states.sql', '021_add_upstream_campaign_differentiation.sql', '022_add_bridge_and_feeder_templates.sql', '024_expand_payout_exception_workflow.sql', '027_add_campaign_alert_channels_to_economy.sql')
     ORDER BY filename ASC`,
  );
  const appliedMigrations = new Set(migrationResult.rows.map((row) => String(row.filename)));

  for (const filename of [
    "013_add_token_redemption_settlement_details.sql",
    "014_add_campaign_overrides_and_referral_direct_rewards.sql",
    "016_add_reward_assets_and_programs.sql",
    "017_add_payout_operation_controls.sql",
    "018_add_quest_definition_templates.sql",
    "019_expand_campaign_override_funnel_presets.sql",
    "020_add_token_redemption_workflow_states.sql",
    "021_add_upstream_campaign_differentiation.sql",
    "022_add_bridge_and_feeder_templates.sql",
    "024_expand_payout_exception_workflow.sql",
    "027_add_campaign_alert_channels_to_economy.sql",
  ]) {
    if (!appliedMigrations.has(filename)) {
      errors.push(`Required migration not applied: ${filename}`);
    }
  }

  const templateResult = await client.query(
    `SELECT label, metadata, is_active
     FROM quest_definition_templates
     ORDER BY label ASC`,
  );

  for (const row of templateResult.rows) {
    const metadata = row.metadata ?? {};
    const label = String(row.label);
    const kind = typeof metadata.campaignTemplateKind === "string" ? metadata.campaignTemplateKind : null;
    const source = typeof metadata.campaignAttributionSource === "string" ? metadata.campaignAttributionSource : null;
    const lane = typeof metadata.campaignExperienceLane === "string" ? metadata.campaignExperienceLane : null;
    const rewardProgramId = typeof metadata.rewardProgramId === "string" ? metadata.rewardProgramId : null;

    if (!kind) {
      continue;
    }

    if (!source || !lane) {
      errors.push(`Quest template "${label}" is missing campaignAttributionSource or campaignExperienceLane.`);
    }

    if (rewardProgramId) {
      const rewardProgramResult = await client.query(
        `SELECT COUNT(*)::int AS count FROM reward_programs WHERE id = $1`,
        [rewardProgramId],
      );
      if (Number(rewardProgramResult.rows[0]?.count ?? 0) < 1) {
        errors.push(`Quest template "${label}" points to a missing reward program.`);
      }
    }

    if (kind === "bridge" && source !== lane) {
      errors.push(`Bridge template "${label}" must use the same attribution source and experience lane.`);
    }

    if (kind === "feeder") {
      if (!["galxe", "taskon"].includes(String(source))) {
        errors.push(`Feeder template "${label}" must use galxe or taskon attribution.`);
      }

      if (lane !== "zealy") {
        errors.push(`Feeder template "${label}" must point at the zealy experience lane.`);
      }
    }
  }

  if (economy?.differentiate_upstream_campaign_sources === true) {
    const liveQuestResult = await client.query(
      `SELECT slug, title, metadata
       FROM quest_definitions
       WHERE is_active = TRUE`,
    );

    for (const row of liveQuestResult.rows) {
      const metadata = row.metadata ?? {};
      const kind = typeof metadata.campaignTemplateKind === "string" ? metadata.campaignTemplateKind : null;
      const source = typeof metadata.campaignAttributionSource === "string" ? metadata.campaignAttributionSource : null;
      const lane = typeof metadata.campaignExperienceLane === "string" ? metadata.campaignExperienceLane : null;

      if (kind === "feeder" && (source === "galxe" || source === "taskon") && lane === "zealy") {
        errors.push(
          `Active quest "${row.slug}" is still configured as a Zealy feeder while upstream source differentiation is enabled.`,
        );
      }
    }
  }

  const activePackQuestResult = await client.query(
    `SELECT slug, metadata, is_active
     FROM quest_definitions
     WHERE is_active = TRUE
       AND metadata ? 'campaignPackId'`,
  );
  const packMap = new Map();
  for (const row of activePackQuestResult.rows) {
    const metadata = row.metadata ?? {};
    const packId = typeof metadata.campaignPackId === "string" ? metadata.campaignPackId : null;
    if (!packId) {
      continue;
    }
    const source = typeof metadata.campaignAttributionSource === "string" ? metadata.campaignAttributionSource : null;
    const lane = typeof metadata.campaignExperienceLane === "string" ? metadata.campaignExperienceLane : null;
    const kind = typeof metadata.campaignTemplateKind === "string" ? metadata.campaignTemplateKind : null;
    const rewardProgramId = typeof metadata.rewardProgramId === "string" ? metadata.rewardProgramId : null;
    const packEntry =
      packMap.get(packId) ??
      {
        bridgeCount: 0,
        feederSources: new Set(),
        invalidFeeder: false,
        rewardProgramIds: new Set(),
      };
    if (kind === "bridge") {
      packEntry.bridgeCount += 1;
    }
    if (kind === "feeder") {
      if (source === "galxe" || source === "taskon") {
        packEntry.feederSources.add(source);
      }
      if (lane !== "zealy") {
        packEntry.invalidFeeder = true;
      }
    }
    if (rewardProgramId) {
      packEntry.rewardProgramIds.add(rewardProgramId);
    }
    packMap.set(packId, packEntry);
  }

  for (const [packId, packEntry] of packMap.entries()) {
    if (packEntry.bridgeCount < 1) {
      errors.push(`Campaign pack "${packId}" is missing a bridge quest.`);
    }
    if (!packEntry.feederSources.has("galxe") || !packEntry.feederSources.has("taskon")) {
      errors.push(`Campaign pack "${packId}" must include both Galxe and TaskOn feeder quests.`);
    }
    if (packEntry.invalidFeeder) {
      errors.push(`Campaign pack "${packId}" contains a feeder quest that does not point to the Zealy bridge lane.`);
    }
    for (const rewardProgramId of packEntry.rewardProgramIds) {
      const rewardProgramResult = await client.query(
        `SELECT COUNT(*)::int AS count
         FROM reward_programs
         WHERE id = $1
           AND is_active = TRUE`,
        [rewardProgramId],
      );
      if (Number(rewardProgramResult.rows[0]?.count ?? 0) < 1) {
        errors.push(`Campaign pack "${packId}" points to an inactive or missing reward program.`);
      }
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
