import { normalizeTokenAsset } from "@/lib/economy-settings";
import { validateCampaignPackTemplates } from "@/lib/campaign-pack";
import { assertAdminUser, assertSuperAdminUser } from "@/server/auth/admin";
import { getAuthenticatedUser } from "@/server/services/auth-service";
import { transitionPendingTokenRedemptionWithDependencies } from "@/server/services/token-redemption-transition";
import {
  countUsersWithRole,
  findUserByEmailForRoleDirectory,
  grantUserRole,
  listAdminUsers,
  listUsersWithRoles,
  revokeUserRole,
} from "@/server/repositories/admin-repository";
import {
  acknowledgeModerationNotificationDelivery,
  listRecentModerationNotificationDeliveries,
} from "@/server/repositories/moderation-notification-repository";
import {
  getActiveEconomySettings,
  listEconomySettingsAudit,
  updateActiveEconomySettings,
} from "@/server/repositories/economy-settings-repository";
import {
  acknowledgeCampaignPackNotificationDelivery,
  clearCampaignPackAlertSuppression,
  createCampaignPackAlertSuppression,
  getCampaignPackAlertSuppressionById,
} from "@/server/repositories/campaign-pack-notification-repository";
import {
  clearCampaignPackBenchmarkOverride,
  getCampaignPackBenchmarkOverrideByPackId,
  upsertCampaignPackBenchmarkOverride,
} from "@/server/repositories/campaign-pack-admin-repository";
import { createCampaignPackAuditEntry } from "@/server/repositories/campaign-pack-audit-repository";
import {
  createRewardAsset,
  createRewardProgram,
  listRewardAssets,
  listRewardPrograms,
  updateRewardAsset,
  updateRewardProgram,
} from "@/server/repositories/reward-program-repository";
import {
  createQuestDefinitionForAdmin,
  deleteQuestDefinitionForAdmin,
  listQuestDefinitionsForAdmin,
  updateCampaignPackLifecycleForAdmin,
  updateQuestDefinitionForAdmin,
} from "@/server/repositories/quest-definition-admin-repository";
import {
  createQuestDefinitionTemplateForAdmin,
  deleteQuestDefinitionTemplateForAdmin,
  listQuestDefinitionTemplatesForAdmin,
  updateQuestDefinitionTemplateForAdmin,
} from "@/server/repositories/quest-template-admin-repository";
import {
  approveTokenRedemption,
  cancelTokenRedemption,
  createTokenRedemptionAudit,
  failTokenRedemption,
  getTokenSettlementAnalytics,
  holdTokenRedemption,
  listPendingTokenSettlements,
  markTokenRedemptionProcessing,
  requeueTokenRedemption,
  settleTokenRedemption,
  updateTokenRedemptionAutomationMetadata,
} from "@/server/repositories/token-redemption-repository";
import type {
  EconomySettings,
  QuestDefinitionAdminItem,
  QuestDefinitionTemplateItem,
  RewardAsset,
  RewardProgram,
} from "@/lib/types";

export async function getRoleDirectory() {
  const currentUser = await getAuthenticatedUser();
  await assertSuperAdminUser(currentUser);

  return listUsersWithRoles();
}

export async function getAdminDirectory() {
  const currentUser = await getAuthenticatedUser();
  await assertSuperAdminUser(currentUser);

  return listAdminUsers();
}

export async function updateReviewerRole({
  userId,
  enabled,
}: {
  userId: string;
  enabled: boolean;
}) {
  const currentUser = await getAuthenticatedUser();
  await assertAdminUser(currentUser);
  if (!currentUser) {
    throw new Error("Admin access required.");
  }

  if (!currentUser) {
    throw new Error("You must be signed in to access admin controls.");
  }

  if (currentUser.id === userId && !enabled) {
    throw new Error("You cannot remove your own reviewer capability from this screen.");
  }

  if (enabled) {
    await grantUserRole({
      userId,
      role: "reviewer",
      grantedBy: currentUser.id,
    });
  } else {
    await revokeUserRole({
      userId,
      role: "reviewer",
    });
  }

  return listUsersWithRoles();
}

export async function grantAdminRole({
  email,
  confirmation,
}: {
  email: string;
  confirmation: string;
}) {
  const currentUser = await getAuthenticatedUser();
  await assertAdminUser(currentUser);

  if (!currentUser) {
    throw new Error("You must be signed in to access admin controls.");
  }

  if (confirmation.trim() !== "GRANT ADMIN") {
    throw new Error('Type "GRANT ADMIN" to confirm this action.');
  }

  const targetUser = await findUserByEmailForRoleDirectory(email.trim().toLowerCase());

  if (!targetUser) {
    throw new Error("No user was found for that email.");
  }

  if (targetUser.user_id === currentUser.id) {
    throw new Error("Use a different admin to grant your own elevated access.");
  }

  await grantUserRole({
    userId: targetUser.user_id,
    role: "admin",
    grantedBy: currentUser.id,
  });

  return {
    roleDirectory: await listUsersWithRoles(),
    adminDirectory: await listAdminUsers(),
  };
}

export async function revokeAdminRole({
  userId,
  confirmation,
}: {
  userId: string;
  confirmation: string;
}) {
  const currentUser = await getAuthenticatedUser();
  await assertAdminUser(currentUser);

  if (!currentUser) {
    throw new Error("You must be signed in to access admin controls.");
  }

  if (confirmation.trim() !== "REVOKE ADMIN") {
    throw new Error('Type "REVOKE ADMIN" to confirm this action.');
  }

  if (currentUser.id === userId) {
    throw new Error("You cannot revoke your own admin role from this screen.");
  }

  const adminCount = await countUsersWithRole("admin");

  if (adminCount <= 1) {
    throw new Error("At least one standard admin must remain assigned.");
  }

  await revokeUserRole({
    userId,
    role: "admin",
  });

  return {
    roleDirectory: await listUsersWithRoles(),
    adminDirectory: await listAdminUsers(),
  };
}

function normalizeQuestDefinitionInput(input: Partial<Omit<QuestDefinitionAdminItem, "id" | "createdAt" | "updatedAt">>) {
  if (
    !input.slug ||
    !input.title ||
    !input.description ||
    !input.category ||
    !input.difficulty ||
    !input.verificationType ||
    !input.recurrence ||
    !input.requiredTier ||
    typeof input.requiredLevel !== "number" ||
    typeof input.xpReward !== "number"
  ) {
    throw new Error("Quest definition requires slug, title, description, category, difficulty, verificationType, recurrence, requiredTier, requiredLevel, and xpReward.");
  }

  return {
    slug: input.slug.trim(),
    title: input.title.trim(),
    description: input.description.trim(),
    category: input.category,
    difficulty: input.difficulty,
    verificationType: input.verificationType,
    recurrence: input.recurrence,
    requiredTier: input.requiredTier,
    requiredLevel: input.requiredLevel,
    xpReward: input.xpReward,
    isPremiumPreview: input.isPremiumPreview ?? false,
    isActive: input.isActive ?? true,
    metadata: input.metadata ?? {},
  };
}

export async function getQuestDefinitionDirectory() {
  const currentUser = await getAuthenticatedUser();
  await assertAdminUser(currentUser);

  return listQuestDefinitionsForAdmin();
}

export async function createQuestDefinition(
  input: Partial<Omit<QuestDefinitionAdminItem, "id" | "createdAt" | "updatedAt">>,
) {
  const currentUser = await getAuthenticatedUser();
  await assertAdminUser(currentUser);

  const normalized = normalizeQuestDefinitionInput(input);
  await createQuestDefinitionForAdmin(normalized);

  return listQuestDefinitionsForAdmin();
}

export async function createCampaignPack({
  label,
}: {
  label: string;
}) {
  const currentUser = await getAuthenticatedUser();
  await assertAdminUser(currentUser);

  const trimmedLabel = label.trim();
  if (!trimmedLabel) {
    throw new Error("Campaign pack label is required.");
  }

  const [templates, economySettings] = await Promise.all([
    listQuestDefinitionTemplatesForAdmin(),
    getActiveEconomySettings(),
  ]);

  const validationError = validateCampaignPackTemplates(
    templates,
    economySettings.differentiateUpstreamCampaignSources,
  );

  if (validationError) {
    throw new Error(validationError);
  }

  const requiredTemplates = [
    "Zealy bridge quest",
    "Galxe feeder quest",
    "TaskOn feeder quest",
  ] as const;
  const selectedTemplates = requiredTemplates
    .map((requiredLabel) => templates.find((template) => template.label === requiredLabel))
    .filter((template): template is QuestDefinitionTemplateItem => Boolean(template));

  if (selectedTemplates.length !== requiredTemplates.length) {
    throw new Error("The saved bridge/feeder templates are not available yet.");
  }

  const packCreatedAt = new Date().toISOString();
  const packId = `pack-${packCreatedAt.replace(/[:.]/g, "-").toLowerCase()}`;
  const slugPrefix = trimmedLabel
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
  const suffix = packCreatedAt.replace(/[:.]/g, "-").toLowerCase();

  for (const template of selectedTemplates) {
    const source =
      typeof template.metadata.campaignAttributionSource === "string"
        ? template.metadata.campaignAttributionSource
        : "campaign";

    await createQuestDefinitionForAdmin({
      slug: `${slugPrefix}-${source}-${suffix}`,
      title: `${trimmedLabel} · ${template.label}`,
      description: template.description,
      category: template.form.category,
      difficulty: template.form.difficulty,
      verificationType: template.form.verificationType,
      recurrence: template.form.recurrence,
      requiredTier: template.form.requiredTier,
      requiredLevel: template.form.requiredLevel,
      xpReward: template.form.xpReward,
      isPremiumPreview: template.form.isPremiumPreview,
      isActive: false,
      metadata: {
        ...template.metadata,
        campaignPackId: packId,
        campaignPackLabel: trimmedLabel,
        campaignPackCreatedAt: packCreatedAt,
        campaignPackTemplateLabel: template.label,
        campaignPackState: "draft",
      },
    });
  }

  await createCampaignPackAuditEntry({
    packId,
    label: trimmedLabel,
    action: "create_pack",
    detail: `Created campaign pack from ${selectedTemplates.length} saved bridge/feeder templates.`,
    changedBy: currentUser?.id ?? null,
    metadata: {
      templateLabels: selectedTemplates.map((template) => template.label),
      lifecycleState: "draft",
    },
  });

  return {
    quests: await listQuestDefinitionsForAdmin(),
    packSummary: {
      packId,
      label: trimmedLabel,
      createdCount: selectedTemplates.length,
    },
  };
}

export async function updateCampaignPackLifecycle({
  packId,
  lifecycleState,
}: {
  packId: string;
  lifecycleState: "draft" | "ready" | "live";
}) {
  const currentUser = await getAuthenticatedUser();
  await assertAdminUser(currentUser);

  const updatedCount = await updateCampaignPackLifecycleForAdmin({
    packId,
    lifecycleState,
  });

  if (!updatedCount) {
    throw new Error("Campaign pack not found.");
  }

  await createCampaignPackAuditEntry({
    packId,
    label: packId,
    action: "update_lifecycle",
    detail: `Updated campaign pack lifecycle to ${lifecycleState}.`,
    changedBy: currentUser?.id ?? null,
    metadata: {
      lifecycleState,
      updatedCount,
    },
  });

  return {
    quests: await listQuestDefinitionsForAdmin(),
    packSummary: {
      packId,
      lifecycleState,
      updatedCount,
    },
  };
}

export async function saveCampaignPackBenchmarkOverride({
  packId,
  label,
  benchmark,
  reason,
}: {
  packId: string;
  label: string;
  benchmark: {
    walletLinkRateTarget: number;
    rewardEligibilityRateTarget: number;
    premiumConversionRateTarget: number;
    retainedActivityRateTarget: number;
    averageWeeklyXpTarget: number;
    zeroCompletionWeekThreshold: number;
  };
  reason?: string | null;
}) {
  const currentUser = await getAuthenticatedUser();
  await assertAdminUser(currentUser);
  if (!currentUser) {
    throw new Error("Admin access required.");
  }

  if (!packId.trim() || !label.trim()) {
    throw new Error("Campaign pack benchmark overrides require a pack id and label.");
  }

  await upsertCampaignPackBenchmarkOverride({
    packId: packId.trim(),
    label: label.trim(),
    benchmark: {
      walletLinkRateTarget: Math.max(benchmark.walletLinkRateTarget, 0),
      rewardEligibilityRateTarget: Math.max(benchmark.rewardEligibilityRateTarget, 0),
      premiumConversionRateTarget: Math.max(benchmark.premiumConversionRateTarget, 0),
      retainedActivityRateTarget: Math.max(benchmark.retainedActivityRateTarget, 0),
      averageWeeklyXpTarget: Math.max(Math.round(benchmark.averageWeeklyXpTarget), 0),
      zeroCompletionWeekThreshold: Math.max(Math.round(benchmark.zeroCompletionWeekThreshold), 1),
    },
    reason,
    updatedBy: currentUser.id,
  });

  await createCampaignPackAuditEntry({
    packId: packId.trim(),
    label: label.trim(),
    action: "save_benchmark_override",
    detail: "Saved custom benchmark override for the campaign pack.",
    changedBy: currentUser.id,
    metadata: {
      benchmark,
      reason: reason?.trim() || null,
    },
  });

  return listQuestDefinitionsForAdmin();
}

export async function removeCampaignPackBenchmarkOverride(packId: string) {
  const currentUser = await getAuthenticatedUser();
  await assertAdminUser(currentUser);
  if (!currentUser) {
    throw new Error("Admin access required.");
  }

  if (!packId.trim()) {
    throw new Error("Campaign pack benchmark override removal requires a pack id.");
  }

  const existingOverride = await getCampaignPackBenchmarkOverrideByPackId(packId.trim());

  await clearCampaignPackBenchmarkOverride({
    packId: packId.trim(),
  });

  await createCampaignPackAuditEntry({
    packId: packId.trim(),
    label: existingOverride?.label ?? packId.trim(),
    action: "clear_benchmark_override",
    detail: "Cleared the custom campaign pack benchmark override and returned to lane defaults.",
    changedBy: currentUser.id,
    metadata: {
      reason: existingOverride?.reason ?? null,
    },
  });

  return listQuestDefinitionsForAdmin();
}

export async function updateQuestDefinition(
  questId: string,
  input: Partial<Omit<QuestDefinitionAdminItem, "id" | "createdAt" | "updatedAt">>,
) {
  const currentUser = await getAuthenticatedUser();
  await assertAdminUser(currentUser);

  const normalized = normalizeQuestDefinitionInput(input);
  const updated = await updateQuestDefinitionForAdmin(questId, normalized);

  if (!updated) {
    throw new Error("Quest definition not found.");
  }

  return listQuestDefinitionsForAdmin();
}

export async function deleteQuestDefinition(questId: string) {
  const currentUser = await getAuthenticatedUser();
  await assertAdminUser(currentUser);

  const deleted = await deleteQuestDefinitionForAdmin(questId);

  if (!deleted) {
    throw new Error("Quest definition not found.");
  }

  return listQuestDefinitionsForAdmin();
}

function normalizeQuestDefinitionTemplateInput(
  input: Partial<Omit<QuestDefinitionTemplateItem, "id" | "createdAt" | "updatedAt">>,
) {
  if (!input.label || !input.description || !input.form) {
    throw new Error("Quest definition template requires label, description, and form.");
  }

  const form = input.form;

  if (
    !form.category ||
    !form.difficulty ||
    !form.verificationType ||
    !form.recurrence ||
    !form.requiredTier ||
    typeof form.requiredLevel !== "number" ||
    typeof form.xpReward !== "number"
  ) {
    throw new Error("Quest definition template form requires category, difficulty, verificationType, recurrence, requiredTier, requiredLevel, and xpReward.");
  }

  return {
    label: input.label.trim(),
    description: input.description.trim(),
    form: {
      category: form.category,
      difficulty: form.difficulty,
      verificationType: form.verificationType,
      recurrence: form.recurrence,
      requiredTier: form.requiredTier,
      requiredLevel: form.requiredLevel,
      xpReward: form.xpReward,
      isPremiumPreview: form.isPremiumPreview ?? false,
      isActive: form.isActive ?? true,
    },
    metadata: input.metadata ?? {},
    isActive: input.isActive ?? true,
  };
}

export async function getQuestDefinitionTemplateDirectory() {
  const currentUser = await getAuthenticatedUser();
  await assertAdminUser(currentUser);

  return listQuestDefinitionTemplatesForAdmin();
}

export async function createQuestDefinitionTemplate(
  input: Partial<Omit<QuestDefinitionTemplateItem, "id" | "createdAt" | "updatedAt">>,
) {
  const currentUser = await getAuthenticatedUser();
  await assertAdminUser(currentUser);

  const normalized = normalizeQuestDefinitionTemplateInput(input);
  await createQuestDefinitionTemplateForAdmin(normalized);

  return listQuestDefinitionTemplatesForAdmin();
}

export async function updateQuestDefinitionTemplate(
  templateId: string,
  input: Partial<Omit<QuestDefinitionTemplateItem, "id" | "createdAt" | "updatedAt">>,
) {
  const currentUser = await getAuthenticatedUser();
  await assertAdminUser(currentUser);

  const normalized = normalizeQuestDefinitionTemplateInput(input);
  const updated = await updateQuestDefinitionTemplateForAdmin(templateId, normalized);

  if (!updated) {
    throw new Error("Quest definition template not found.");
  }

  return listQuestDefinitionTemplatesForAdmin();
}

export async function deleteQuestDefinitionTemplate(templateId: string) {
  const currentUser = await getAuthenticatedUser();
  await assertAdminUser(currentUser);

  const deleted = await deleteQuestDefinitionTemplateForAdmin(templateId);

  if (!deleted) {
    throw new Error("Quest definition template not found.");
  }

  return listQuestDefinitionTemplatesForAdmin();
}

export async function getModerationNotificationHistory() {
  const currentUser = await getAuthenticatedUser();
  await assertAdminUser(currentUser);

  return listRecentModerationNotificationDeliveries();
}

export async function acknowledgeModerationNotification(deliveryId: string) {
  const currentUser = await getAuthenticatedUser();
  await assertAdminUser(currentUser);

  if (!currentUser) {
    throw new Error("You must be signed in to access admin controls.");
  }

  return acknowledgeModerationNotificationDelivery({
    deliveryId,
    acknowledgedBy: currentUser.id,
  });
}

export async function acknowledgeCampaignPackNotification(deliveryId: string) {
  const currentUser = await getAuthenticatedUser();
  await assertAdminUser(currentUser);

  if (!currentUser) {
    throw new Error("You must be signed in to access admin controls.");
  }

  return acknowledgeCampaignPackNotificationDelivery({
    deliveryId,
    acknowledgedBy: currentUser.id,
  });
}

export async function suppressCampaignPackAlert({
  packId,
  label,
  title,
  hours,
  reason,
}: {
  packId: string;
  label: string;
  title: string;
  hours: number;
  reason?: string | null;
}) {
  const currentUser = await getAuthenticatedUser();
  await assertSuperAdminUser(currentUser);

  if (!currentUser) {
    throw new Error("You must be signed in to access admin controls.");
  }

  if (!packId.trim() || !label.trim() || !title.trim() || !Number.isFinite(hours) || hours <= 0) {
    throw new Error("Campaign alert suppression requires packId, label, title, and a positive hour window.");
  }

  const suppressions = await createCampaignPackAlertSuppression({
    packId: packId.trim(),
    label: label.trim(),
    title: title.trim(),
    hours,
    reason,
    createdBy: currentUser.id,
  });

  await createCampaignPackAuditEntry({
    packId: packId.trim(),
    label: label.trim(),
    action: "suppress_alert",
    detail: `Suppressed "${title.trim()}" for ${hours} hours.`,
    changedBy: currentUser.id,
    metadata: {
      hours,
      title: title.trim(),
      reason: reason?.trim() || null,
    },
  });

  return suppressions;
}

export async function clearCampaignPackAlertSuppressionById(suppressionId: string) {
  const currentUser = await getAuthenticatedUser();
  await assertAdminUser(currentUser);

  if (!currentUser) {
    throw new Error("You must be signed in to access admin controls.");
  }

  const existingSuppression = await getCampaignPackAlertSuppressionById(suppressionId);
  const suppressions = await clearCampaignPackAlertSuppression({
    suppressionId,
    clearedBy: currentUser.id,
  });

  if (existingSuppression) {
    await createCampaignPackAuditEntry({
      packId: existingSuppression.packId,
      label: existingSuppression.label,
      action: "clear_alert_suppression",
      detail: `Cleared suppression for "${existingSuppression.title}".`,
      changedBy: currentUser.id,
      metadata: {
        title: existingSuppression.title,
        reason: existingSuppression.reason,
      },
    });
  }

  return suppressions;
}

export async function getTokenSettlementQueue() {
  const currentUser = await getAuthenticatedUser();
  await assertAdminUser(currentUser);

  return listPendingTokenSettlements();
}

export async function getSettlementAnalytics(input?: {
  days?: number;
  compareDays?: number;
  startDate?: string;
  endDate?: string;
  compareStartDate?: string;
  compareEndDate?: string;
}) {
  const currentUser = await getAuthenticatedUser();
  await assertAdminUser(currentUser);

  return getTokenSettlementAnalytics(input);
}

export async function transitionPendingTokenRedemption({
  redemptionId,
  action,
  receiptReference,
  settlementNote,
}: {
  redemptionId: string;
  action: "approve" | "processing" | "settle" | "hold" | "fail" | "requeue" | "cancel";
  receiptReference: string;
  settlementNote?: string | null;
}) {
  return transitionPendingTokenRedemptionWithDependencies({
    redemptionId,
    action,
    receiptReference,
    settlementNote,
  }, {
    getCurrentUser: getAuthenticatedUser,
    assertAdmin: assertAdminUser,
    assertSuperAdmin: assertSuperAdminUser,
    getEconomySettings: getActiveEconomySettings,
    listPendingSettlements: listPendingTokenSettlements,
    approveRedemption: approveTokenRedemption,
    markRedemptionProcessing: markTokenRedemptionProcessing,
    holdRedemption: holdTokenRedemption,
    failRedemption: failTokenRedemption,
    requeueRedemption: requeueTokenRedemption,
    cancelRedemption: cancelTokenRedemption,
    settleRedemption: settleTokenRedemption,
    createAuditEntry: createTokenRedemptionAudit,
  });
}

function buildAutomationReceiptReference(redemptionId: string) {
  const dateTag = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  return `AUTO-${dateTag}-${redemptionId.slice(0, 8).toUpperCase()}`;
}

export async function saveTokenRedemptionAutomationMetadata({
  redemptionId,
  automationReceiptReference,
  automationSettlementNote,
  generateAutomationReceiptReference,
}: {
  redemptionId: string;
  automationReceiptReference?: string | null;
  automationSettlementNote?: string | null;
  generateAutomationReceiptReference?: boolean;
}) {
  const currentUser = await getAuthenticatedUser();
  await assertAdminUser(currentUser);

  const resolvedReceiptReference =
    generateAutomationReceiptReference && !automationReceiptReference?.trim()
      ? buildAutomationReceiptReference(redemptionId)
      : automationReceiptReference;

  const updated = await updateTokenRedemptionAutomationMetadata({
    redemptionId,
    automationReceiptReference: resolvedReceiptReference,
    automationSettlementNote,
    generatedBy: currentUser?.id ?? null,
  });

  if (!updated) {
    throw new Error("Token redemption not found.");
  }

  return listPendingTokenSettlements();
}

function normalizeEconomySettingsInput(input: Partial<Omit<EconomySettings, "id" | "updatedAt">>) {
  if (
    !input.payoutAsset ||
    typeof input.minimumEligibilityPoints !== "number" ||
    typeof input.pointsPerToken !== "number" ||
    !input.xpTierMultipliers ||
    !input.tokenTierMultipliers ||
    typeof input.referralSignupBaseXp !== "number" ||
    typeof input.referralMonthlyConversionBaseXp !== "number" ||
    typeof input.referralAnnualConversionBaseXp !== "number" ||
    typeof input.annualReferralDirectTokenAmount !== "number"
  ) {
    throw new Error("Economy settings require payoutAsset, thresholds, multipliers, and referral reward values.");
  }

  const payoutMode: EconomySettings["payoutMode"] =
    input.payoutMode === "review_required" || input.payoutMode === "automation_ready"
      ? input.payoutMode
      : "manual";

  return {
    payoutAsset: normalizeTokenAsset(input.payoutAsset),
    payoutMode,
    redemptionEnabled: input.redemptionEnabled ?? false,
    settlementProcessingEnabled: input.settlementProcessingEnabled ?? true,
    directRewardQueueEnabled: input.directRewardQueueEnabled ?? true,
    settlementNotesRequired: input.settlementNotesRequired ?? false,
    directRewardsEnabled: input.directRewardsEnabled ?? true,
    directAnnualReferralEnabled: input.directAnnualReferralEnabled ?? true,
    directPremiumFlashEnabled: input.directPremiumFlashEnabled ?? true,
    directAmbassadorEnabled: input.directAmbassadorEnabled ?? true,
    minimumEligibilityPoints: Math.max(input.minimumEligibilityPoints, 0),
    pointsPerToken: Math.max(input.pointsPerToken, 1),
    differentiateUpstreamCampaignSources: input.differentiateUpstreamCampaignSources ?? false,
    xpTierMultipliers: {
      free: Math.max(input.xpTierMultipliers.free, 1),
      monthly: Math.max(input.xpTierMultipliers.monthly, 1),
      annual: Math.max(input.xpTierMultipliers.annual, 1),
    },
    tokenTierMultipliers: {
      free: Math.max(input.tokenTierMultipliers.free, 1),
      monthly: Math.max(input.tokenTierMultipliers.monthly, 1),
      annual: Math.max(input.tokenTierMultipliers.annual, 1),
    },
    referralSignupBaseXp: Math.max(input.referralSignupBaseXp, 0),
    referralMonthlyConversionBaseXp: Math.max(input.referralMonthlyConversionBaseXp, 0),
    referralAnnualConversionBaseXp: Math.max(input.referralAnnualConversionBaseXp, 0),
    annualReferralDirectTokenAmount: Math.max(input.annualReferralDirectTokenAmount, 0),
    campaignAlertChannels: {
      inboxEnabled: input.campaignAlertChannels?.inboxEnabled ?? true,
      webhookUrl:
        typeof input.campaignAlertChannels?.webhookUrl === "string"
          ? input.campaignAlertChannels.webhookUrl.trim() || null
          : null,
      emailRecipient:
        typeof input.campaignAlertChannels?.emailRecipient === "string"
          ? input.campaignAlertChannels.emailRecipient.trim() || null
          : null,
      slackWebhookUrl:
        typeof input.campaignAlertChannels?.slackWebhookUrl === "string"
          ? input.campaignAlertChannels.slackWebhookUrl.trim() || null
          : null,
      discordWebhookUrl:
        typeof input.campaignAlertChannels?.discordWebhookUrl === "string"
          ? input.campaignAlertChannels.discordWebhookUrl.trim() || null
          : null,
    },
    campaignPackBenchmarks: {
      direct: {
        walletLinkRateTarget: Math.max(input.campaignPackBenchmarks?.direct?.walletLinkRateTarget ?? 0, 0),
        rewardEligibilityRateTarget: Math.max(input.campaignPackBenchmarks?.direct?.rewardEligibilityRateTarget ?? 0, 0),
        premiumConversionRateTarget: Math.max(input.campaignPackBenchmarks?.direct?.premiumConversionRateTarget ?? 0, 0),
        retainedActivityRateTarget: Math.max(input.campaignPackBenchmarks?.direct?.retainedActivityRateTarget ?? 0, 0),
        averageWeeklyXpTarget: Math.max(input.campaignPackBenchmarks?.direct?.averageWeeklyXpTarget ?? 0, 0),
        zeroCompletionWeekThreshold: Math.max(Math.round(input.campaignPackBenchmarks?.direct?.zeroCompletionWeekThreshold ?? 1), 1),
      },
      zealy: {
        walletLinkRateTarget: Math.max(input.campaignPackBenchmarks?.zealy?.walletLinkRateTarget ?? 0, 0),
        rewardEligibilityRateTarget: Math.max(input.campaignPackBenchmarks?.zealy?.rewardEligibilityRateTarget ?? 0, 0),
        premiumConversionRateTarget: Math.max(input.campaignPackBenchmarks?.zealy?.premiumConversionRateTarget ?? 0, 0),
        retainedActivityRateTarget: Math.max(input.campaignPackBenchmarks?.zealy?.retainedActivityRateTarget ?? 0, 0),
        averageWeeklyXpTarget: Math.max(input.campaignPackBenchmarks?.zealy?.averageWeeklyXpTarget ?? 0, 0),
        zeroCompletionWeekThreshold: Math.max(Math.round(input.campaignPackBenchmarks?.zealy?.zeroCompletionWeekThreshold ?? 1), 1),
      },
      galxe: {
        walletLinkRateTarget: Math.max(input.campaignPackBenchmarks?.galxe?.walletLinkRateTarget ?? 0, 0),
        rewardEligibilityRateTarget: Math.max(input.campaignPackBenchmarks?.galxe?.rewardEligibilityRateTarget ?? 0, 0),
        premiumConversionRateTarget: Math.max(input.campaignPackBenchmarks?.galxe?.premiumConversionRateTarget ?? 0, 0),
        retainedActivityRateTarget: Math.max(input.campaignPackBenchmarks?.galxe?.retainedActivityRateTarget ?? 0, 0),
        averageWeeklyXpTarget: Math.max(input.campaignPackBenchmarks?.galxe?.averageWeeklyXpTarget ?? 0, 0),
        zeroCompletionWeekThreshold: Math.max(Math.round(input.campaignPackBenchmarks?.galxe?.zeroCompletionWeekThreshold ?? 1), 1),
      },
      taskon: {
        walletLinkRateTarget: Math.max(input.campaignPackBenchmarks?.taskon?.walletLinkRateTarget ?? 0, 0),
        rewardEligibilityRateTarget: Math.max(input.campaignPackBenchmarks?.taskon?.rewardEligibilityRateTarget ?? 0, 0),
        premiumConversionRateTarget: Math.max(input.campaignPackBenchmarks?.taskon?.premiumConversionRateTarget ?? 0, 0),
        retainedActivityRateTarget: Math.max(input.campaignPackBenchmarks?.taskon?.retainedActivityRateTarget ?? 0, 0),
        averageWeeklyXpTarget: Math.max(input.campaignPackBenchmarks?.taskon?.averageWeeklyXpTarget ?? 0, 0),
        zeroCompletionWeekThreshold: Math.max(Math.round(input.campaignPackBenchmarks?.taskon?.zeroCompletionWeekThreshold ?? 1), 1),
      },
    },
    campaignOverrides: {
      direct: {
        signupBonusXp: Math.max(input.campaignOverrides?.direct?.signupBonusXp ?? 0, 0),
        monthlyConversionBonusXp: Math.max(input.campaignOverrides?.direct?.monthlyConversionBonusXp ?? 0, 0),
        annualConversionBonusXp: Math.max(input.campaignOverrides?.direct?.annualConversionBonusXp ?? 0, 0),
        annualDirectTokenBonus: Math.max(input.campaignOverrides?.direct?.annualDirectTokenBonus ?? 0, 0),
        questXpMultiplierBonus: Math.max(input.campaignOverrides?.direct?.questXpMultiplierBonus ?? 0, 0),
        eligibilityPointsMultiplierBonus: Math.max(input.campaignOverrides?.direct?.eligibilityPointsMultiplierBonus ?? 0, 0),
        tokenYieldMultiplierBonus: Math.max(input.campaignOverrides?.direct?.tokenYieldMultiplierBonus ?? 0, 0),
        minimumEligibilityPointsOffset: Number(input.campaignOverrides?.direct?.minimumEligibilityPointsOffset ?? 0),
        directTokenRewardBonus: Math.max(input.campaignOverrides?.direct?.directTokenRewardBonus ?? 0, 0),
        weeklyTargetXpOffset: Number(input.campaignOverrides?.direct?.weeklyTargetXpOffset ?? 0),
        premiumUpsellBonusMultiplier: Math.max(input.campaignOverrides?.direct?.premiumUpsellBonusMultiplier ?? 0, 0),
        leaderboardMomentumBonus: Math.max(input.campaignOverrides?.direct?.leaderboardMomentumBonus ?? 0, 0),
      },
      zealy: {
        signupBonusXp: Math.max(input.campaignOverrides?.zealy?.signupBonusXp ?? 0, 0),
        monthlyConversionBonusXp: Math.max(input.campaignOverrides?.zealy?.monthlyConversionBonusXp ?? 0, 0),
        annualConversionBonusXp: Math.max(input.campaignOverrides?.zealy?.annualConversionBonusXp ?? 0, 0),
        annualDirectTokenBonus: Math.max(input.campaignOverrides?.zealy?.annualDirectTokenBonus ?? 0, 0),
        questXpMultiplierBonus: Math.max(input.campaignOverrides?.zealy?.questXpMultiplierBonus ?? 0, 0),
        eligibilityPointsMultiplierBonus: Math.max(input.campaignOverrides?.zealy?.eligibilityPointsMultiplierBonus ?? 0, 0),
        tokenYieldMultiplierBonus: Math.max(input.campaignOverrides?.zealy?.tokenYieldMultiplierBonus ?? 0, 0),
        minimumEligibilityPointsOffset: Number(input.campaignOverrides?.zealy?.minimumEligibilityPointsOffset ?? 0),
        directTokenRewardBonus: Math.max(input.campaignOverrides?.zealy?.directTokenRewardBonus ?? 0, 0),
        weeklyTargetXpOffset: Number(input.campaignOverrides?.zealy?.weeklyTargetXpOffset ?? 0),
        premiumUpsellBonusMultiplier: Math.max(input.campaignOverrides?.zealy?.premiumUpsellBonusMultiplier ?? 0, 0),
        leaderboardMomentumBonus: Math.max(input.campaignOverrides?.zealy?.leaderboardMomentumBonus ?? 0, 0),
      },
      galxe: {
        signupBonusXp: Math.max(input.campaignOverrides?.galxe?.signupBonusXp ?? 0, 0),
        monthlyConversionBonusXp: Math.max(input.campaignOverrides?.galxe?.monthlyConversionBonusXp ?? 0, 0),
        annualConversionBonusXp: Math.max(input.campaignOverrides?.galxe?.annualConversionBonusXp ?? 0, 0),
        annualDirectTokenBonus: Math.max(input.campaignOverrides?.galxe?.annualDirectTokenBonus ?? 0, 0),
        questXpMultiplierBonus: Math.max(input.campaignOverrides?.galxe?.questXpMultiplierBonus ?? 0, 0),
        eligibilityPointsMultiplierBonus: Math.max(input.campaignOverrides?.galxe?.eligibilityPointsMultiplierBonus ?? 0, 0),
        tokenYieldMultiplierBonus: Math.max(input.campaignOverrides?.galxe?.tokenYieldMultiplierBonus ?? 0, 0),
        minimumEligibilityPointsOffset: Number(input.campaignOverrides?.galxe?.minimumEligibilityPointsOffset ?? 0),
        directTokenRewardBonus: Math.max(input.campaignOverrides?.galxe?.directTokenRewardBonus ?? 0, 0),
        weeklyTargetXpOffset: Number(input.campaignOverrides?.galxe?.weeklyTargetXpOffset ?? 0),
        premiumUpsellBonusMultiplier: Math.max(input.campaignOverrides?.galxe?.premiumUpsellBonusMultiplier ?? 0, 0),
        leaderboardMomentumBonus: Math.max(input.campaignOverrides?.galxe?.leaderboardMomentumBonus ?? 0, 0),
      },
      taskon: {
        signupBonusXp: Math.max(input.campaignOverrides?.taskon?.signupBonusXp ?? 0, 0),
        monthlyConversionBonusXp: Math.max(input.campaignOverrides?.taskon?.monthlyConversionBonusXp ?? 0, 0),
        annualConversionBonusXp: Math.max(input.campaignOverrides?.taskon?.annualConversionBonusXp ?? 0, 0),
        annualDirectTokenBonus: Math.max(input.campaignOverrides?.taskon?.annualDirectTokenBonus ?? 0, 0),
        questXpMultiplierBonus: Math.max(input.campaignOverrides?.taskon?.questXpMultiplierBonus ?? 0, 0),
        eligibilityPointsMultiplierBonus: Math.max(input.campaignOverrides?.taskon?.eligibilityPointsMultiplierBonus ?? 0, 0),
        tokenYieldMultiplierBonus: Math.max(input.campaignOverrides?.taskon?.tokenYieldMultiplierBonus ?? 0, 0),
        minimumEligibilityPointsOffset: Number(input.campaignOverrides?.taskon?.minimumEligibilityPointsOffset ?? 0),
        directTokenRewardBonus: Math.max(input.campaignOverrides?.taskon?.directTokenRewardBonus ?? 0, 0),
        weeklyTargetXpOffset: Number(input.campaignOverrides?.taskon?.weeklyTargetXpOffset ?? 0),
        premiumUpsellBonusMultiplier: Math.max(input.campaignOverrides?.taskon?.premiumUpsellBonusMultiplier ?? 0, 0),
        leaderboardMomentumBonus: Math.max(input.campaignOverrides?.taskon?.leaderboardMomentumBonus ?? 0, 0),
      },
    },
  };
}

export async function getEconomySettings() {
  const currentUser = await getAuthenticatedUser();
  await assertAdminUser(currentUser);

  return {
    settings: await getActiveEconomySettings(),
    audit: await listEconomySettingsAudit(),
  };
}

function normalizeRewardAssetInput(input: Partial<Omit<RewardAsset, "id" | "createdAt" | "updatedAt">>) {
  if (!input.assetId || !input.symbol || !input.name || typeof input.decimals !== "number") {
    throw new Error("Reward asset requires assetId, symbol, name, and decimals.");
  }

  return {
    assetId: input.assetId.trim(),
    symbol: input.symbol.trim().toUpperCase(),
    name: input.name.trim(),
    decimals: Math.max(input.decimals, 0),
    iconUrl: input.iconUrl?.trim() || null,
    issuerName: input.issuerName?.trim() || null,
    isActive: input.isActive ?? true,
    isPartnerAsset: input.isPartnerAsset ?? false,
  };
}

function normalizeRewardProgramInput(input: Partial<Omit<RewardProgram, "id" | "assetSymbol" | "assetName" | "createdAt" | "updatedAt">>) {
  if (
    !input.slug ||
    !input.name ||
    !input.rewardAssetId ||
    typeof input.minimumEligibilityPoints !== "number" ||
    typeof input.pointsPerToken !== "number"
  ) {
    throw new Error("Reward program requires slug, name, rewardAssetId, minimumEligibilityPoints, and pointsPerToken.");
  }

  return {
    slug: input.slug.trim(),
    name: input.name.trim(),
    rewardAssetId: input.rewardAssetId,
    isActive: input.isActive ?? true,
    redemptionEnabled: input.redemptionEnabled ?? false,
    directRewardsEnabled: input.directRewardsEnabled ?? true,
    referralRewardsEnabled: input.referralRewardsEnabled ?? true,
    premiumRewardsEnabled: input.premiumRewardsEnabled ?? true,
    ambassadorRewardsEnabled: input.ambassadorRewardsEnabled ?? true,
    minimumEligibilityPoints: Math.max(input.minimumEligibilityPoints, 0),
    pointsPerToken: Math.max(input.pointsPerToken, 1),
    notes: input.notes?.trim() || null,
    startsAt: input.startsAt ?? null,
    endsAt: input.endsAt ?? null,
  };
}

export async function getRewardAssetDirectory() {
  const currentUser = await getAuthenticatedUser();
  await assertAdminUser(currentUser);
  return listRewardAssets();
}

export async function saveRewardAsset(input: Partial<Omit<RewardAsset, "id" | "createdAt" | "updatedAt">>, assetId?: string) {
  const currentUser = await getAuthenticatedUser();
  await assertSuperAdminUser(currentUser);
  const normalized = normalizeRewardAssetInput(input);
  if (assetId) {
    const updated = await updateRewardAsset(assetId, normalized);
    if (!updated) {
      throw new Error("Reward asset not found.");
    }
  } else {
    await createRewardAsset(normalized);
  }
  return listRewardAssets();
}

export async function getRewardProgramDirectory() {
  const currentUser = await getAuthenticatedUser();
  await assertAdminUser(currentUser);
  return listRewardPrograms();
}

export async function saveRewardProgram(input: Partial<Omit<RewardProgram, "id" | "assetSymbol" | "assetName" | "createdAt" | "updatedAt">>, programId?: string) {
  const currentUser = await getAuthenticatedUser();
  await assertSuperAdminUser(currentUser);
  const normalized = normalizeRewardProgramInput(input);
  if (programId) {
    const updated = await updateRewardProgram(programId, normalized);
    if (!updated) {
      throw new Error("Reward program not found.");
    }
  } else {
    await createRewardProgram(normalized);
  }
  return listRewardPrograms();
}

export async function saveEconomySettings(
  input: Partial<Omit<EconomySettings, "id" | "updatedAt">>,
) {
  const currentUser = await getAuthenticatedUser();
  await assertSuperAdminUser(currentUser);

  if (!currentUser) {
    throw new Error("You must be signed in to access admin controls.");
  }

  const normalized = normalizeEconomySettingsInput(input);
  const settings = await updateActiveEconomySettings({
    changedBy: currentUser.id,
    next: normalized,
  });

  return {
    settings,
    audit: await listEconomySettingsAudit(),
  };
}
