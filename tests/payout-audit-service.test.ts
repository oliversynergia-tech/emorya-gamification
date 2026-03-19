import assert from "node:assert/strict";
import test from "node:test";

import type { EconomySettings, TokenSettlementItem } from "../lib/types.ts";
import { transitionPendingTokenRedemptionWithDependencies } from "../server/services/token-redemption-transition.ts";

function createEconomySettings(overrides: Partial<EconomySettings> = {}): EconomySettings {
  return {
    id: "economy-1",
    payoutAsset: "EMR",
    payoutMode: "review_required",
    redemptionEnabled: true,
    settlementProcessingEnabled: true,
    directRewardQueueEnabled: true,
    settlementNotesRequired: false,
    directRewardsEnabled: true,
    directAnnualReferralEnabled: true,
    directPremiumFlashEnabled: true,
    directAmbassadorEnabled: true,
    minimumEligibilityPoints: 100,
    pointsPerToken: 10,
    xpTierMultipliers: {
      free: 1,
      monthly: 1.25,
      annual: 1.5,
    },
    tokenTierMultipliers: {
      free: 1,
      monthly: 1.25,
      annual: 1.5,
    },
    referralSignupBaseXp: 20,
    referralMonthlyConversionBaseXp: 150,
    referralAnnualConversionBaseXp: 300,
    annualReferralDirectTokenAmount: 25,
    campaignOverrides: {},
    differentiateUpstreamCampaignSources: false,
    updatedAt: "2026-03-17T00:00:00.000Z",
    ...overrides,
  };
}

function createSettlement(overrides: Partial<TokenSettlementItem> = {}): TokenSettlementItem {
  return {
    id: "redemption-1",
    userDisplayName: "Oliver",
    userEmail: "oliver@example.com",
    asset: "EMR",
    assetName: "Emorya",
    rewardAssetId: "asset-1",
    rewardProgramId: "program-1",
    rewardProgramName: "Default Program",
    tokenAmount: 25,
    eligibilityPointsSpent: 250,
    source: "zealy",
    workflowState: "queued",
    createdAt: "2026-03-17T00:00:00.000Z",
    approvedAt: null,
    approvedByDisplayName: null,
    processingStartedAt: null,
    processingByDisplayName: null,
    heldAt: null,
    heldByDisplayName: null,
    holdReason: null,
    failedAt: null,
    failedByDisplayName: null,
    lastError: null,
    cancelledAt: null,
    cancelledByDisplayName: null,
    cancellationReason: null,
    retryCount: 0,
    settledAt: null,
    receiptReference: null,
    settlementNote: null,
    settledByDisplayName: null,
    metadata: {},
    ...overrides,
  };
}

function createDependencies(options?: {
  currentUser?: { id: string } | null;
  economySettings?: EconomySettings;
  queue?: TokenSettlementItem[];
  approveResult?: boolean;
  processingResult?: boolean;
  settleResult?: boolean;
}) {
  const auditCalls: Array<Record<string, unknown>> = [];
  const approveCalls: Array<Record<string, unknown>> = [];
  const processingCalls: Array<Record<string, unknown>> = [];
  const holdCalls: Array<Record<string, unknown>> = [];
  const failCalls: Array<Record<string, unknown>> = [];
  const requeueCalls: Array<Record<string, unknown>> = [];
  const cancelCalls: Array<Record<string, unknown>> = [];
  const settleCalls: Array<Record<string, unknown>> = [];
  const listCalls: number[] = [];

  const queue = options?.queue ?? [createSettlement()];

  return {
    auditCalls,
    approveCalls,
    processingCalls,
    holdCalls,
    failCalls,
    requeueCalls,
    cancelCalls,
    settleCalls,
    listCalls,
    dependencies: {
      getCurrentUser: async () => options?.currentUser ?? { id: "admin-1" },
      assertAdmin: async () => undefined,
      assertSuperAdmin: async () => undefined,
      getEconomySettings: async () => options?.economySettings ?? createEconomySettings(),
      listPendingSettlements: async (limit = 20) => {
        listCalls.push(limit);
        return queue;
      },
      approveRedemption: async (input: Record<string, unknown>) => {
        approveCalls.push(input);
        return options?.approveResult ?? true;
      },
      markRedemptionProcessing: async (input: Record<string, unknown>) => {
        processingCalls.push(input);
        return options?.processingResult ?? true;
      },
      holdRedemption: async (input: Record<string, unknown>) => {
        holdCalls.push(input);
        return true;
      },
      failRedemption: async (input: Record<string, unknown>) => {
        failCalls.push(input);
        return true;
      },
      requeueRedemption: async (input: Record<string, unknown>) => {
        requeueCalls.push(input);
        return true;
      },
      cancelRedemption: async (input: Record<string, unknown>) => {
        cancelCalls.push(input);
        return true;
      },
      settleRedemption: async (input: Record<string, unknown>) => {
        settleCalls.push(input);
        return options?.settleResult ?? true;
      },
      createAuditEntry: async (input: Record<string, unknown>) => {
        auditCalls.push(input);
      },
    },
  };
}

test("approve transition writes audit entry with previous and next workflow state", async () => {
  const harness = createDependencies();

  await transitionPendingTokenRedemptionWithDependencies(
    {
      redemptionId: "redemption-1",
      action: "approve",
      receiptReference: "",
    },
    harness.dependencies,
  );

  assert.equal(harness.approveCalls.length, 1);
  assert.deepEqual(harness.approveCalls[0], {
    redemptionId: "redemption-1",
    approvedBy: "admin-1",
  });
  assert.equal(harness.auditCalls.length, 1);
  assert.deepEqual(harness.auditCalls[0], {
    redemptionId: "redemption-1",
    action: "approve",
    changedBy: "admin-1",
    previousWorkflowState: "queued",
    nextWorkflowState: "approved",
    metadata: {
      source: "zealy",
      asset: "EMR",
    },
  });
  assert.deepEqual(harness.listCalls, [100, 20]);
});

test("processing transition uses super-admin path and writes processing audit entry", async () => {
  let superAdminChecks = 0;
  const harness = createDependencies({
    queue: [createSettlement({ workflowState: "approved" })],
  });
  harness.dependencies.assertSuperAdmin = async () => {
    superAdminChecks += 1;
  };

  await transitionPendingTokenRedemptionWithDependencies(
    {
      redemptionId: "redemption-1",
      action: "processing",
      receiptReference: "",
    },
    harness.dependencies,
  );

  assert.equal(superAdminChecks, 1);
  assert.equal(harness.processingCalls.length, 1);
  assert.deepEqual(harness.processingCalls[0], {
    redemptionId: "redemption-1",
    processingBy: "admin-1",
  });
  assert.deepEqual(harness.auditCalls[0], {
    redemptionId: "redemption-1",
    action: "processing",
    changedBy: "admin-1",
    previousWorkflowState: "approved",
    nextWorkflowState: "processing",
    metadata: {
      source: "zealy",
      asset: "EMR",
    },
  });
});

test("settle transition trims receipt and note before writing audit entry", async () => {
  const harness = createDependencies({
    queue: [createSettlement({ workflowState: "processing" })],
  });

  await transitionPendingTokenRedemptionWithDependencies(
    {
      redemptionId: "redemption-1",
      action: "settle",
      receiptReference: "  EMR-123  ",
      settlementNote: "  settled manually  ",
    },
    harness.dependencies,
  );

  assert.equal(harness.settleCalls.length, 1);
  assert.deepEqual(harness.settleCalls[0], {
    redemptionId: "redemption-1",
    settledBy: "admin-1",
    receiptReference: "EMR-123",
    settlementNote: "settled manually",
  });
  assert.deepEqual(harness.auditCalls[0], {
    redemptionId: "redemption-1",
    action: "settle",
    changedBy: "admin-1",
    previousWorkflowState: "processing",
    nextWorkflowState: "settled",
    receiptReference: "EMR-123",
    settlementNote: "settled manually",
    metadata: {
      source: "zealy",
      asset: "EMR",
    },
  });
});

test("missing queue entry fails before any audit write", async () => {
  const harness = createDependencies({
    queue: [],
  });

  await assert.rejects(
    transitionPendingTokenRedemptionWithDependencies(
      {
        redemptionId: "redemption-1",
        action: "approve",
        receiptReference: "",
      },
      harness.dependencies,
    ),
    /Token redemption not found or already settled/,
  );

  assert.equal(harness.approveCalls.length, 0);
  assert.equal(harness.auditCalls.length, 0);
});

test("failed repository transition does not write an audit entry", async () => {
  const harness = createDependencies({
    approveResult: false,
  });

  await assert.rejects(
    transitionPendingTokenRedemptionWithDependencies(
      {
        redemptionId: "redemption-1",
        action: "approve",
        receiptReference: "",
      },
      harness.dependencies,
    ),
    /not in a queued state/,
  );

  assert.equal(harness.approveCalls.length, 1);
  assert.equal(harness.auditCalls.length, 0);
});

test("hold transition writes hold reason to audit entry", async () => {
  const harness = createDependencies({
    queue: [createSettlement({ workflowState: "processing" })],
  });

  await transitionPendingTokenRedemptionWithDependencies(
    {
      redemptionId: "redemption-1",
      action: "hold",
      receiptReference: "",
      settlementNote: "waiting on partner confirmation",
    },
    harness.dependencies,
  );

  assert.deepEqual(harness.holdCalls[0], {
    redemptionId: "redemption-1",
    heldBy: "admin-1",
    holdReason: "waiting on partner confirmation",
  });
  assert.deepEqual(harness.auditCalls[0], {
    redemptionId: "redemption-1",
    action: "hold",
    changedBy: "admin-1",
    previousWorkflowState: "processing",
    nextWorkflowState: "held",
    settlementNote: "waiting on partner confirmation",
    metadata: {
      source: "zealy",
      asset: "EMR",
    },
  });
});

test("requeue transition resets failed payouts back to queued", async () => {
  const harness = createDependencies({
    queue: [createSettlement({ workflowState: "failed" })],
  });

  await transitionPendingTokenRedemptionWithDependencies(
    {
      redemptionId: "redemption-1",
      action: "requeue",
      receiptReference: "",
    },
    harness.dependencies,
  );

  assert.deepEqual(harness.requeueCalls[0], {
    redemptionId: "redemption-1",
  });
  assert.deepEqual(harness.auditCalls[0], {
    redemptionId: "redemption-1",
    action: "requeue",
    changedBy: "admin-1",
    previousWorkflowState: "failed",
    nextWorkflowState: "queued",
    metadata: {
      source: "zealy",
      asset: "EMR",
    },
  });
});
