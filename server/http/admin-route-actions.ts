import {
  handleQuestDefinitionCreateRequest,
  handleQuestDefinitionDeleteRequest,
  handleQuestDefinitionDirectoryRequest,
  handleQuestDefinitionUpdateRequest,
  handleRewardAssetDirectoryRequest,
  handleRewardAssetSaveRequest,
  handleRewardProgramDirectoryRequest,
  handleRewardProgramSaveRequest,
  handleTokenSettlementRequest,
} from "./admin-handlers.ts";

export type AdminRouteActionServices = {
  getQuestDefinitionDirectory: () => Promise<unknown>;
  createQuestDefinition: (input: Record<string, unknown>) => Promise<unknown>;
  updateQuestDefinition: (questId: string, input: Record<string, unknown>) => Promise<unknown>;
  deleteQuestDefinition: (questId: string) => Promise<unknown>;
  getRewardAssetDirectory: () => Promise<unknown>;
  saveRewardAsset: (input: Record<string, unknown>, assetId?: string) => Promise<unknown>;
  getRewardProgramDirectory: () => Promise<unknown>;
  saveRewardProgram: (input: Record<string, unknown>, programId?: string) => Promise<unknown>;
  settlePendingTokenRedemption: (input: {
    redemptionId: string;
    receiptReference: string;
    settlementNote?: string | null;
  }) => Promise<unknown>;
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

export async function runTokenSettlementRoute(
  {
    redemptionId,
    body,
  }: {
    redemptionId: string;
    body: {
      receiptReference?: string;
      settlementNote?: string | null;
    };
  },
  services: Pick<AdminRouteActionServices, "settlePendingTokenRedemption">,
) {
  return handleTokenSettlementRequest(
    {
      redemptionId,
      body,
    },
    services.settlePendingTokenRedemption,
  );
}
