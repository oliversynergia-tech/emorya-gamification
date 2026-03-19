import type { AuthUser, EconomySettings, TokenSettlementItem } from "../../lib/types.ts";

type TransitionPendingTokenRedemptionDependencies = {
  getCurrentUser: () => Promise<AuthUser | null>;
  assertAdmin: (user: AuthUser | null | undefined) => Promise<void>;
  assertSuperAdmin: (user: AuthUser | null | undefined) => Promise<void>;
  getEconomySettings: () => Promise<EconomySettings>;
  listPendingSettlements: (limit?: number) => Promise<TokenSettlementItem[]>;
  approveRedemption: (input: { redemptionId: string; approvedBy: string }) => Promise<boolean>;
  markRedemptionProcessing: (input: { redemptionId: string; processingBy: string }) => Promise<boolean>;
  holdRedemption: (input: { redemptionId: string; heldBy: string; holdReason: string | null }) => Promise<boolean>;
  failRedemption: (input: { redemptionId: string; failedBy: string; lastError: string | null }) => Promise<boolean>;
  requeueRedemption: (input: { redemptionId: string }) => Promise<boolean>;
  cancelRedemption: (input: { redemptionId: string; cancelledBy: string; cancellationReason: string | null }) => Promise<boolean>;
  settleRedemption: (input: {
    redemptionId: string;
    settledBy: string;
    receiptReference: string;
    settlementNote: string | null;
  }) => Promise<boolean>;
  createAuditEntry: (input: {
    redemptionId: string;
    action: "approve" | "processing" | "settle" | "hold" | "fail" | "requeue" | "cancel";
    changedBy: string;
    previousWorkflowState: TokenSettlementItem["workflowState"];
    nextWorkflowState: TokenSettlementItem["workflowState"];
    receiptReference?: string | null;
    settlementNote?: string | null;
    metadata?: Record<string, string | number | boolean | null>;
  }) => Promise<void>;
};

export async function transitionPendingTokenRedemptionWithDependencies(
  {
    redemptionId,
    action,
    receiptReference,
    settlementNote,
  }: {
    redemptionId: string;
    action: "approve" | "processing" | "settle" | "hold" | "fail" | "requeue" | "cancel";
    receiptReference: string;
    settlementNote?: string | null;
  },
  dependencies: TransitionPendingTokenRedemptionDependencies,
) {
  const currentUser = await dependencies.getCurrentUser();
  await dependencies.assertAdmin(currentUser);

  if (!currentUser) {
    throw new Error("You must be signed in to access admin controls.");
  }

  const economySettings = await dependencies.getEconomySettings();

  if (!economySettings.settlementProcessingEnabled) {
    throw new Error("Settlement processing is currently disabled in payout controls.");
  }

  if (action === "approve") {
    await dependencies.assertAdmin(currentUser);
  } else if (action === "hold") {
    await dependencies.assertAdmin(currentUser);
  } else {
    await dependencies.assertSuperAdmin(currentUser);
  }

  const queueBefore = await dependencies.listPendingSettlements(100);
  const existingEntry = queueBefore.find((entry) => entry.id === redemptionId);

  if (!existingEntry) {
    throw new Error("Token redemption not found or already settled.");
  }

  if (action === "settle" && !receiptReference.trim()) {
    throw new Error("Settlement requires a receiptReference.");
  }

  if (action === "settle" && economySettings.settlementNotesRequired && !settlementNote?.trim()) {
    throw new Error("Settlement note is required while payout controls require notes.");
  }

  if (action === "approve") {
    const approved = await dependencies.approveRedemption({
      redemptionId,
      approvedBy: currentUser.id,
    });

    if (!approved) {
      throw new Error("Token redemption not found or is not in a queued state.");
    }
    await dependencies.createAuditEntry({
      redemptionId,
      action,
      changedBy: currentUser.id,
      previousWorkflowState: existingEntry.workflowState,
      nextWorkflowState: "approved",
      metadata: {
        source: existingEntry.source,
        asset: existingEntry.asset,
      },
    });
  } else if (action === "processing") {
    if (economySettings.payoutMode === "manual") {
      throw new Error("Processing state is only available when payout mode is review_required or automation_ready.");
    }

    const processing = await dependencies.markRedemptionProcessing({
      redemptionId,
      processingBy: currentUser.id,
    });

    if (!processing) {
      throw new Error("Token redemption not found or is not ready to move into processing.");
    }
    await dependencies.createAuditEntry({
      redemptionId,
      action,
      changedBy: currentUser.id,
      previousWorkflowState: existingEntry.workflowState,
      nextWorkflowState: "processing",
      metadata: {
        source: existingEntry.source,
        asset: existingEntry.asset,
      },
    });
  } else if (action === "hold") {
    const normalizedSettlementNote = settlementNote?.trim() ? settlementNote.trim() : null;

    const held = await dependencies.holdRedemption({
      redemptionId,
      heldBy: currentUser.id,
      holdReason: normalizedSettlementNote,
    });

    if (!held) {
      throw new Error("Token redemption cannot be placed on hold from its current workflow state.");
    }

    await dependencies.createAuditEntry({
      redemptionId,
      action,
      changedBy: currentUser.id,
      previousWorkflowState: existingEntry.workflowState,
      nextWorkflowState: "held",
      settlementNote: normalizedSettlementNote,
      metadata: {
        source: existingEntry.source,
        asset: existingEntry.asset,
      },
    });
  } else if (action === "fail") {
    const normalizedSettlementNote = settlementNote?.trim() ? settlementNote.trim() : null;

    const failed = await dependencies.failRedemption({
      redemptionId,
      failedBy: currentUser.id,
      lastError: normalizedSettlementNote,
    });

    if (!failed) {
      throw new Error("Token redemption cannot be marked failed from its current workflow state.");
    }

    await dependencies.createAuditEntry({
      redemptionId,
      action,
      changedBy: currentUser.id,
      previousWorkflowState: existingEntry.workflowState,
      nextWorkflowState: "failed",
      settlementNote: normalizedSettlementNote,
      metadata: {
        source: existingEntry.source,
        asset: existingEntry.asset,
      },
    });
  } else if (action === "requeue") {
    const requeued = await dependencies.requeueRedemption({
      redemptionId,
    });

    if (!requeued) {
      throw new Error("Token redemption cannot be requeued from its current workflow state.");
    }

    await dependencies.createAuditEntry({
      redemptionId,
      action,
      changedBy: currentUser.id,
      previousWorkflowState: existingEntry.workflowState,
      nextWorkflowState: "queued",
      metadata: {
        source: existingEntry.source,
        asset: existingEntry.asset,
      },
    });
  } else if (action === "cancel") {
    const normalizedSettlementNote = settlementNote?.trim() ? settlementNote.trim() : null;

    const cancelled = await dependencies.cancelRedemption({
      redemptionId,
      cancelledBy: currentUser.id,
      cancellationReason: normalizedSettlementNote,
    });

    if (!cancelled) {
      throw new Error("Token redemption cannot be cancelled from its current workflow state.");
    }

    await dependencies.createAuditEntry({
      redemptionId,
      action,
      changedBy: currentUser.id,
      previousWorkflowState: existingEntry.workflowState,
      nextWorkflowState: "cancelled",
      settlementNote: normalizedSettlementNote,
      metadata: {
        source: existingEntry.source,
        asset: existingEntry.asset,
      },
    });
  } else {
    const normalizedReceiptReference = receiptReference.trim();
    const normalizedSettlementNote = settlementNote?.trim() ? settlementNote.trim() : null;

    const settled = await dependencies.settleRedemption({
      redemptionId,
      settledBy: currentUser.id,
      receiptReference: normalizedReceiptReference,
      settlementNote: normalizedSettlementNote,
    });

    if (!settled) {
      throw new Error("Token redemption not found or already settled.");
    }
    await dependencies.createAuditEntry({
      redemptionId,
      action,
      changedBy: currentUser.id,
      previousWorkflowState: existingEntry.workflowState,
      nextWorkflowState: "settled",
      receiptReference: normalizedReceiptReference,
      settlementNote: normalizedSettlementNote,
      metadata: {
        source: existingEntry.source,
        asset: existingEntry.asset,
      },
    });
  }

  return dependencies.listPendingSettlements();
}
