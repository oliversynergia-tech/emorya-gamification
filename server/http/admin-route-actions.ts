import {
  handleCampaignPackAlertSuppressionClearRequest,
  handleCampaignPackAlertSuppressionRequest,
  handleCampaignPackCreateRequest,
  handleCampaignPackLifecycleRequest,
  handleCampaignPackNotificationAcknowledgeRequest,
  handleEconomySettingsRequest,
  handleEconomySettingsUpdateRequest,
  handleQuestDefinitionCreateRequest,
  handleQuestDefinitionDeleteRequest,
  handleQuestDefinitionDirectoryRequest,
  handleQuestDefinitionTemplateCreateRequest,
  handleQuestDefinitionTemplateDeleteRequest,
  handleQuestDefinitionTemplateDirectoryRequest,
  handleQuestDefinitionTemplateUpdateRequest,
  handleQuestDefinitionUpdateRequest,
  handleRewardAssetDirectoryRequest,
  handleRewardAssetSaveRequest,
  handleRewardProgramDirectoryRequest,
  handleRewardProgramSaveRequest,
  handleSettlementAnalyticsRequest,
  handleTokenSettlementRequest,
} from "./admin-handlers.ts";

export type AdminRouteActionServices = {
  getQuestDefinitionDirectory: () => Promise<unknown>;
  createQuestDefinition: (input: Record<string, unknown>) => Promise<unknown>;
  createCampaignPack: (input: { label: string }) => Promise<unknown>;
  updateCampaignPackLifecycle: (input: {
    packId: string;
    lifecycleState: "draft" | "ready" | "live";
  }) => Promise<unknown>;
  updateQuestDefinition: (questId: string, input: Record<string, unknown>) => Promise<unknown>;
  deleteQuestDefinition: (questId: string) => Promise<unknown>;
  getQuestDefinitionTemplateDirectory: () => Promise<unknown>;
  createQuestDefinitionTemplate: (input: Record<string, unknown>) => Promise<unknown>;
  updateQuestDefinitionTemplate: (templateId: string, input: Record<string, unknown>) => Promise<unknown>;
  deleteQuestDefinitionTemplate: (templateId: string) => Promise<unknown>;
  getEconomySettings: () => Promise<unknown>;
  saveEconomySettings: (input: Record<string, unknown>) => Promise<unknown>;
  getRewardAssetDirectory: () => Promise<unknown>;
  saveRewardAsset: (input: Record<string, unknown>, assetId?: string) => Promise<unknown>;
  getRewardProgramDirectory: () => Promise<unknown>;
  saveRewardProgram: (input: Record<string, unknown>, programId?: string) => Promise<unknown>;
  getSettlementAnalytics: (input: {
    days?: number;
    compareDays?: number;
    startDate?: string;
    endDate?: string;
    compareStartDate?: string;
    compareEndDate?: string;
  }) => Promise<unknown>;
  transitionPendingTokenRedemption: (input: {
    redemptionId: string;
    action: "approve" | "processing" | "settle" | "hold" | "fail" | "requeue" | "cancel";
    receiptReference: string;
    settlementNote?: string | null;
  }) => Promise<unknown>;
  saveTokenRedemptionAutomationMetadata: (input: {
    redemptionId: string;
    automationReceiptReference?: string | null;
    automationSettlementNote?: string | null;
    generateAutomationReceiptReference?: boolean;
  }) => Promise<unknown>;
  acknowledgeCampaignPackNotification: (deliveryId: string) => Promise<unknown>;
  suppressCampaignPackAlert: (input: {
    packId: string;
    label: string;
    title: string;
    hours: number;
    reason?: string | null;
  }) => Promise<unknown>;
  clearCampaignPackAlertSuppression: (suppressionId: string) => Promise<unknown>;
};

export async function runQuestDefinitionDirectoryRoute(
  services: Pick<AdminRouteActionServices, "getQuestDefinitionDirectory">,
) {
  return handleQuestDefinitionDirectoryRequest(services.getQuestDefinitionDirectory);
}

export async function runQuestDefinitionCreateRoute(
  body: Record<string, unknown>,
  services: Pick<AdminRouteActionServices, "createQuestDefinition">,
) {
  return handleQuestDefinitionCreateRequest(body, services.createQuestDefinition);
}

export async function runCampaignPackCreateRoute(
  body: { label?: string },
  services: Pick<AdminRouteActionServices, "createCampaignPack">,
) {
  return handleCampaignPackCreateRequest(body, services.createCampaignPack);
}

export async function runCampaignPackLifecycleRoute(
  body: { packId?: string; lifecycleState?: "draft" | "ready" | "live" },
  services: Pick<AdminRouteActionServices, "updateCampaignPackLifecycle">,
) {
  return handleCampaignPackLifecycleRequest(body, services.updateCampaignPackLifecycle);
}

export async function runCampaignPackNotificationAcknowledgeRoute(
  deliveryId: string,
  services: Pick<AdminRouteActionServices, "acknowledgeCampaignPackNotification">,
) {
  return handleCampaignPackNotificationAcknowledgeRequest(
    deliveryId,
    services.acknowledgeCampaignPackNotification,
  );
}

export async function runCampaignPackAlertSuppressionRoute(
  body: {
    packId?: string;
    label?: string;
    title?: string;
    hours?: number;
    reason?: string | null;
  },
  services: Pick<AdminRouteActionServices, "suppressCampaignPackAlert">,
) {
  return handleCampaignPackAlertSuppressionRequest(body, services.suppressCampaignPackAlert);
}

export async function runCampaignPackAlertSuppressionClearRoute(
  suppressionId: string,
  services: Pick<AdminRouteActionServices, "clearCampaignPackAlertSuppression">,
) {
  return handleCampaignPackAlertSuppressionClearRequest(
    suppressionId,
    services.clearCampaignPackAlertSuppression,
  );
}

export async function runQuestDefinitionUpdateRoute(
  {
    questId,
    body,
  }: {
    questId: string;
    body: Record<string, unknown>;
  },
  services: Pick<AdminRouteActionServices, "updateQuestDefinition">,
) {
  return handleQuestDefinitionUpdateRequest({ questId, body }, services.updateQuestDefinition);
}

export async function runQuestDefinitionDeleteRoute(
  questId: string,
  services: Pick<AdminRouteActionServices, "deleteQuestDefinition">,
) {
  return handleQuestDefinitionDeleteRequest(questId, services.deleteQuestDefinition);
}

export async function runQuestDefinitionTemplateDirectoryRoute(
  services: Pick<AdminRouteActionServices, "getQuestDefinitionTemplateDirectory">,
) {
  return handleQuestDefinitionTemplateDirectoryRequest(services.getQuestDefinitionTemplateDirectory);
}

export async function runQuestDefinitionTemplateCreateRoute(
  body: Record<string, unknown>,
  services: Pick<AdminRouteActionServices, "createQuestDefinitionTemplate">,
) {
  return handleQuestDefinitionTemplateCreateRequest(body, services.createQuestDefinitionTemplate);
}

export async function runQuestDefinitionTemplateUpdateRoute(
  {
    templateId,
    body,
  }: {
    templateId: string;
    body: Record<string, unknown>;
  },
  services: Pick<AdminRouteActionServices, "updateQuestDefinitionTemplate">,
) {
  return handleQuestDefinitionTemplateUpdateRequest(
    { templateId, body },
    services.updateQuestDefinitionTemplate,
  );
}

export async function runQuestDefinitionTemplateDeleteRoute(
  templateId: string,
  services: Pick<AdminRouteActionServices, "deleteQuestDefinitionTemplate">,
) {
  return handleQuestDefinitionTemplateDeleteRequest(templateId, services.deleteQuestDefinitionTemplate);
}

export async function runEconomySettingsRoute(
  services: Pick<AdminRouteActionServices, "getEconomySettings">,
) {
  return handleEconomySettingsRequest(services.getEconomySettings);
}

export async function runEconomySettingsUpdateRoute(
  body: Record<string, unknown>,
  services: Pick<AdminRouteActionServices, "saveEconomySettings">,
) {
  return handleEconomySettingsUpdateRequest(body, services.saveEconomySettings);
}

export async function runRewardAssetDirectoryRoute(
  services: Pick<AdminRouteActionServices, "getRewardAssetDirectory">,
) {
  return handleRewardAssetDirectoryRequest(services.getRewardAssetDirectory);
}

export async function runRewardAssetSaveRoute(
  {
    assetId,
    body,
  }: {
    assetId?: string;
    body: Record<string, unknown>;
  },
  services: Pick<AdminRouteActionServices, "saveRewardAsset">,
) {
  return handleRewardAssetSaveRequest({ assetId, body }, services.saveRewardAsset);
}

export async function runRewardProgramDirectoryRoute(
  services: Pick<AdminRouteActionServices, "getRewardProgramDirectory">,
) {
  return handleRewardProgramDirectoryRequest(services.getRewardProgramDirectory);
}

export async function runRewardProgramSaveRoute(
  {
    programId,
    body,
  }: {
    programId?: string;
    body: Record<string, unknown>;
  },
  services: Pick<AdminRouteActionServices, "saveRewardProgram">,
) {
  return handleRewardProgramSaveRequest({ programId, body }, services.saveRewardProgram);
}

export async function runSettlementAnalyticsRoute(
  input: {
    days?: number;
    compareDays?: number;
    startDate?: string;
    endDate?: string;
    compareStartDate?: string;
    compareEndDate?: string;
  },
  services: Pick<AdminRouteActionServices, "getSettlementAnalytics">,
) {
  return handleSettlementAnalyticsRequest(input, services.getSettlementAnalytics);
}

export async function runTokenSettlementRoute(
  {
    redemptionId,
    body,
  }: {
    redemptionId: string;
    body: {
      action?: "approve" | "processing" | "settle" | "hold" | "fail" | "requeue" | "cancel";
      receiptReference?: string;
      settlementNote?: string | null;
      automationReceiptReference?: string | null;
      automationSettlementNote?: string | null;
      generateAutomationReceiptReference?: boolean;
    };
  },
  services: Pick<
    AdminRouteActionServices,
    "transitionPendingTokenRedemption" | "saveTokenRedemptionAutomationMetadata"
  >,
) {
  return handleTokenSettlementRequest(
    {
      redemptionId,
      body,
    },
    {
      transitionPendingTokenRedemption: services.transitionPendingTokenRedemption,
      saveTokenRedemptionAutomationMetadata: services.saveTokenRedemptionAutomationMetadata,
    },
  );
}
