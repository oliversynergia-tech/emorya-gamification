import { normalizeTokenAsset } from "@/lib/economy-settings";
import { assertAdminUser, assertSuperAdminUser } from "@/server/auth/admin";
import { getAuthenticatedUser } from "@/server/services/auth-service";
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
  createQuestDefinitionForAdmin,
  deleteQuestDefinitionForAdmin,
  listQuestDefinitionsForAdmin,
  updateQuestDefinitionForAdmin,
} from "@/server/repositories/quest-definition-admin-repository";
import type { QuestDefinitionAdminItem } from "@/lib/types";
import type { EconomySettings } from "@/lib/types";

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

  return {
    payoutAsset: normalizeTokenAsset(input.payoutAsset),
    redemptionEnabled: input.redemptionEnabled ?? false,
    directRewardsEnabled: input.directRewardsEnabled ?? true,
    directAnnualReferralEnabled: input.directAnnualReferralEnabled ?? true,
    directPremiumFlashEnabled: input.directPremiumFlashEnabled ?? true,
    directAmbassadorEnabled: input.directAmbassadorEnabled ?? true,
    minimumEligibilityPoints: Math.max(input.minimumEligibilityPoints, 0),
    pointsPerToken: Math.max(input.pointsPerToken, 1),
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
