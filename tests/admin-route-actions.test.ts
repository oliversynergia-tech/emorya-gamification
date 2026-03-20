import assert from "node:assert/strict";
import test, { mock } from "node:test";

import {
  runCampaignPackAlertSuppressionClearRoute,
  runCampaignPackAlertSuppressionRoute,
  runCampaignPackBenchmarkOverrideClearRoute,
  runCampaignPackBenchmarkOverrideRoute,
  runCampaignPackCreateRoute,
  runCampaignPackLifecycleRoute,
  runCampaignPackNotificationAcknowledgeRoute,
  runEconomySettingsRoute,
  runEconomySettingsUpdateRoute,
  runQuestDefinitionCreateRoute,
  runQuestDefinitionDeleteRoute,
  runQuestDefinitionDirectoryRoute,
  runQuestDefinitionTemplateCreateRoute,
  runQuestDefinitionTemplateDeleteRoute,
  runQuestDefinitionTemplateDirectoryRoute,
  runQuestDefinitionTemplateUpdateRoute,
  runQuestDefinitionUpdateRoute,
  runRewardAssetDirectoryRoute,
  runRewardAssetSaveRoute,
  runRewardProgramDirectoryRoute,
  runRewardProgramSaveRoute,
  runSettlementAnalyticsRoute,
  runTokenSettlementRoute,
} from "../server/http/admin-route-actions.ts";

test("runQuestDefinitionDirectoryRoute returns quest directory payload", async () => {
  const services = {
    getQuestDefinitionDirectory: mock.fn(async () => [{ id: "quest-1" }]),
  };

  const result = await runQuestDefinitionDirectoryRoute(services);

  assert.equal(result.status, 200);
  assert.deepEqual(result.body, {
    ok: true,
    quests: [{ id: "quest-1" }],
  });
  assert.equal(services.getQuestDefinitionDirectory.mock.callCount(), 1);
});

test("runQuestDefinitionCreateRoute forwards create body", async () => {
  const services = {
    createQuestDefinition: mock.fn(async (input: Record<string, unknown>) => {
      assert.equal(input.slug, "starter-quest");
      return [{ id: "quest-2" }];
    }),
  };

  const result = await runQuestDefinitionCreateRoute({ slug: "starter-quest" }, services);

  assert.equal(result.status, 200);
  assert.deepEqual(result.body, {
    ok: true,
    quests: [{ id: "quest-2" }],
  });
});

test("runCampaignPackCreateRoute forwards the pack label", async () => {
  const services = {
    createCampaignPack: mock.fn(async (input: { label: string }) => {
      assert.equal(input.label, "March Bridge Pack");
      return {
        quests: [{ id: "quest-pack-1" }],
        packSummary: { packId: "pack-1", label: "March Bridge Pack", createdCount: 3 },
      };
    }),
  };

  const result = await runCampaignPackCreateRoute({ label: "March Bridge Pack" }, services);

  assert.equal(result.status, 200);
  assert.deepEqual(result.body, {
    ok: true,
    quests: [{ id: "quest-pack-1" }],
    packSummary: { packId: "pack-1", label: "March Bridge Pack", createdCount: 3 },
  });
});

test("runCampaignPackLifecycleRoute forwards lifecycle updates", async () => {
  const services = {
    updateCampaignPackLifecycle: mock.fn(async (input: { packId: string; lifecycleState: "draft" | "ready" | "live" }) => {
      assert.equal(input.packId, "pack-1");
      assert.equal(input.lifecycleState, "live");
      return {
        quests: [{ id: "quest-pack-1" }],
        packSummary: { packId: "pack-1", lifecycleState: "live", updatedCount: 3 },
      };
    }),
  };

  const result = await runCampaignPackLifecycleRoute(
    { packId: "pack-1", lifecycleState: "live" },
    services,
  );

  assert.equal(result.status, 200);
  assert.deepEqual(result.body, {
    ok: true,
    quests: [{ id: "quest-pack-1" }],
    packSummary: { packId: "pack-1", lifecycleState: "live", updatedCount: 3 },
  });
});

test("runCampaignPackNotificationAcknowledgeRoute forwards the delivery id", async () => {
  const services = {
    acknowledgeCampaignPackNotification: mock.fn(async (deliveryId: string) => {
      assert.equal(deliveryId, "delivery-1");
      return [{ id: "delivery-1", eventStatus: "acknowledged" }];
    }),
  };

  const result = await runCampaignPackNotificationAcknowledgeRoute("delivery-1", services);

  assert.equal(result.status, 200);
  assert.deepEqual(result.body, {
    ok: true,
    history: [{ id: "delivery-1", eventStatus: "acknowledged" }],
  });
});

test("runCampaignPackAlertSuppressionRoute forwards suppression input", async () => {
  const services = {
    suppressCampaignPackAlert: mock.fn(async (input: {
      packId: string;
      label: string;
      title: string;
      hours: number;
      reason?: string | null;
    }) => {
      assert.equal(input.packId, "pack-1");
      assert.equal(input.title, "Wallet-link rate is soft");
      assert.equal(input.hours, 24);
      return [{ id: "suppression-1" }];
    }),
  };

  const result = await runCampaignPackAlertSuppressionRoute(
    {
      packId: "pack-1",
      label: "March Bridge Pack",
      title: "Wallet-link rate is soft",
      hours: 24,
      reason: "Investigating",
    },
    services,
  );

  assert.equal(result.status, 200);
  assert.deepEqual(result.body, {
    ok: true,
    suppressions: [{ id: "suppression-1" }],
  });
});

test("runCampaignPackAlertSuppressionClearRoute forwards the suppression id", async () => {
  const services = {
    clearCampaignPackAlertSuppression: mock.fn(async (suppressionId: string) => {
      assert.equal(suppressionId, "suppression-1");
      return [];
    }),
  };

  const result = await runCampaignPackAlertSuppressionClearRoute("suppression-1", services);

  assert.equal(result.status, 200);
  assert.deepEqual(result.body, {
    ok: true,
    suppressions: [],
  });
});

test("runCampaignPackBenchmarkOverrideRoute forwards benchmark overrides", async () => {
  const services = {
    saveCampaignPackBenchmarkOverride: mock.fn(async (input: {
      packId: string;
      label: string;
      benchmark: {
        walletLinkRateTarget: number;
        rewardEligibilityRateTarget: number;
        premiumConversionRateTarget: number;
        averageWeeklyXpTarget: number;
      };
      reason?: string | null;
    }) => {
      assert.equal(input.packId, "pack-1");
      assert.equal(input.label, "March Bridge Pack");
      assert.equal(input.benchmark.walletLinkRateTarget, 0.42);
      assert.equal(input.reason, "Flagship pack");
      return [{ id: "quest-pack-1" }];
    }),
  };

  const result = await runCampaignPackBenchmarkOverrideRoute(
    {
      packId: "pack-1",
      label: "March Bridge Pack",
      benchmark: {
        walletLinkRateTarget: 0.42,
        rewardEligibilityRateTarget: 0.31,
        premiumConversionRateTarget: 0.14,
        averageWeeklyXpTarget: 260,
      },
      reason: "Flagship pack",
    },
    services,
  );

  assert.equal(result.status, 200);
  assert.deepEqual(result.body, {
    ok: true,
    quests: [{ id: "quest-pack-1" }],
  });
});

test("runCampaignPackBenchmarkOverrideClearRoute forwards the pack id", async () => {
  const services = {
    clearCampaignPackBenchmarkOverride: mock.fn(async (packId: string) => {
      assert.equal(packId, "pack-1");
      return [];
    }),
  };

  const result = await runCampaignPackBenchmarkOverrideClearRoute("pack-1", services);

  assert.equal(result.status, 200);
  assert.deepEqual(result.body, {
    ok: true,
    quests: [],
  });
});

test("runQuestDefinitionUpdateRoute forwards quest id and body", async () => {
  const services = {
    updateQuestDefinition: mock.fn(async (questId: string, input: Record<string, unknown>) => {
      assert.equal(questId, "quest-3");
      assert.equal(input.slug, "updated-quest");
      return [{ id: "quest-3" }];
    }),
  };

  const result = await runQuestDefinitionUpdateRoute(
    {
      questId: "quest-3",
      body: { slug: "updated-quest" },
    },
    services,
  );

  assert.equal(result.status, 200);
  assert.deepEqual(result.body, {
    ok: true,
    quests: [{ id: "quest-3" }],
  });
});

test("runQuestDefinitionDeleteRoute forwards the quest id", async () => {
  const services = {
    deleteQuestDefinition: mock.fn(async (questId: string) => {
      assert.equal(questId, "quest-4");
      return [];
    }),
  };

  const result = await runQuestDefinitionDeleteRoute("quest-4", services);

  assert.equal(result.status, 200);
  assert.deepEqual(result.body, {
    ok: true,
    quests: [],
  });
});

test("runQuestDefinitionTemplateDirectoryRoute returns template payload", async () => {
  const services = {
    getQuestDefinitionTemplateDirectory: mock.fn(async () => [{ id: "template-1" }]),
  };

  const result = await runQuestDefinitionTemplateDirectoryRoute(services);

  assert.equal(result.status, 200);
  assert.deepEqual(result.body, {
    ok: true,
    templates: [{ id: "template-1" }],
  });
});

test("runQuestDefinitionTemplateCreateRoute forwards create body", async () => {
  const services = {
    createQuestDefinitionTemplate: mock.fn(async (input: Record<string, unknown>) => {
      assert.equal(input.label, "Starter template");
      return [{ id: "template-2" }];
    }),
  };

  const result = await runQuestDefinitionTemplateCreateRoute({ label: "Starter template" }, services);

  assert.equal(result.status, 200);
  assert.deepEqual(result.body, {
    ok: true,
    templates: [{ id: "template-2" }],
  });
});

test("runQuestDefinitionTemplateUpdateRoute forwards template id and body", async () => {
  const services = {
    updateQuestDefinitionTemplate: mock.fn(async (templateId: string, input: Record<string, unknown>) => {
      assert.equal(templateId, "template-3");
      assert.equal(input.label, "Updated template");
      return [{ id: "template-3" }];
    }),
  };

  const result = await runQuestDefinitionTemplateUpdateRoute(
    {
      templateId: "template-3",
      body: { label: "Updated template" },
    },
    services,
  );

  assert.equal(result.status, 200);
  assert.deepEqual(result.body, {
    ok: true,
    templates: [{ id: "template-3" }],
  });
});

test("runQuestDefinitionTemplateDeleteRoute forwards the template id", async () => {
  const services = {
    deleteQuestDefinitionTemplate: mock.fn(async (templateId: string) => {
      assert.equal(templateId, "template-4");
      return [];
    }),
  };

  const result = await runQuestDefinitionTemplateDeleteRoute("template-4", services);

  assert.equal(result.status, 200);
  assert.deepEqual(result.body, {
    ok: true,
    templates: [],
  });
});

test("runEconomySettingsRoute returns economy payload", async () => {
  const services = {
    getEconomySettings: mock.fn(async () => ({
      economySettings: { payoutAsset: "EMR" },
      rewardAssets: [{ id: "asset-1" }],
    })),
  };

  const result = await runEconomySettingsRoute(services);

  assert.equal(result.status, 200);
  assert.deepEqual(result.body, {
    ok: true,
    economySettings: { payoutAsset: "EMR" },
    rewardAssets: [{ id: "asset-1" }],
  });
});

test("runEconomySettingsUpdateRoute forwards the update body", async () => {
  const services = {
    saveEconomySettings: mock.fn(async (input: Record<string, unknown>) => {
      assert.equal(input.payoutAsset, "EGLD");
      assert.deepEqual(input.campaignAlertChannels, {
        inboxEnabled: true,
        webhookUrl: "https://example.com/campaign-alerts",
      });
      return {
        economySettings: { payoutAsset: "EGLD" },
      };
    }),
  };

  const result = await runEconomySettingsUpdateRoute(
    {
      payoutAsset: "EGLD",
      campaignAlertChannels: {
        inboxEnabled: true,
        webhookUrl: "https://example.com/campaign-alerts",
      },
    },
    services,
  );

  assert.equal(result.status, 200);
  assert.deepEqual(result.body, {
    ok: true,
    economySettings: { payoutAsset: "EGLD" },
  });
});

test("runTokenSettlementRoute forwards settlement payload", async () => {
  const services = {
    transitionPendingTokenRedemption: mock.fn(
      async (input: {
        redemptionId: string;
        action: "approve" | "processing" | "settle" | "hold" | "fail" | "requeue" | "cancel";
        receiptReference: string;
        settlementNote?: string | null;
      }) => {
        assert.equal(input.redemptionId, "redemption-1");
        assert.equal(input.action, "settle");
        assert.equal(input.receiptReference, "EMR-SETTLED-1");
        assert.equal(input.settlementNote, "Manually paid");
        return [];
      },
    ),
    saveTokenRedemptionAutomationMetadata: mock.fn(async () => {
      throw new Error("should not be called");
    }),
  };

  const result = await runTokenSettlementRoute(
    {
      redemptionId: "redemption-1",
      body: {
        action: "settle",
        receiptReference: "EMR-SETTLED-1",
        settlementNote: "Manually paid",
      },
    },
    services,
  );

  assert.equal(result.status, 200);
  assert.deepEqual(result.body, {
    ok: true,
    queue: [],
  });
});

test("runTokenSettlementRoute forwards automation metadata updates without an action", async () => {
  const services = {
    transitionPendingTokenRedemption: mock.fn(async () => {
      throw new Error("should not be called");
    }),
    saveTokenRedemptionAutomationMetadata: mock.fn(
      async (input: {
        redemptionId: string;
        automationReceiptReference?: string | null;
        automationSettlementNote?: string | null;
        generateAutomationReceiptReference?: boolean;
      }) => {
        assert.equal(input.redemptionId, "redemption-2");
        assert.equal(input.automationReceiptReference, "AUTO-SETTLED-2");
        assert.equal(input.automationSettlementNote, "Settled by worker");
        assert.equal(input.generateAutomationReceiptReference, undefined);
        return [];
      },
    ),
  };

  const result = await runTokenSettlementRoute(
    {
      redemptionId: "redemption-2",
      body: {
        automationReceiptReference: "AUTO-SETTLED-2",
        automationSettlementNote: "Settled by worker",
      },
    },
    services,
  );

  assert.equal(result.status, 200);
  assert.deepEqual(result.body, {
    ok: true,
    queue: [],
  });
});

test("runTokenSettlementRoute forwards generated automation receipt requests", async () => {
  const services = {
    transitionPendingTokenRedemption: mock.fn(async () => {
      throw new Error("should not be called");
    }),
    saveTokenRedemptionAutomationMetadata: mock.fn(
      async (input: {
        redemptionId: string;
        automationReceiptReference?: string | null;
        automationSettlementNote?: string | null;
        generateAutomationReceiptReference?: boolean;
      }) => {
        assert.equal(input.redemptionId, "redemption-3");
        assert.equal(input.generateAutomationReceiptReference, true);
        return [];
      },
    ),
  };

  const result = await runTokenSettlementRoute(
    {
      redemptionId: "redemption-3",
      body: {
        generateAutomationReceiptReference: true,
      },
    },
    services,
  );

  assert.equal(result.status, 200);
  assert.deepEqual(result.body, {
    ok: true,
    queue: [],
  });
});

test("runRewardAssetDirectoryRoute returns asset payload", async () => {
  const services = {
    getRewardAssetDirectory: mock.fn(async () => [{ id: "asset-1", symbol: "EMR" }]),
  };

  const result = await runRewardAssetDirectoryRoute(services);

  assert.equal(result.status, 200);
  assert.deepEqual(result.body, {
    ok: true,
    assets: [{ id: "asset-1", symbol: "EMR" }],
  });
});

test("runRewardAssetSaveRoute forwards create payload", async () => {
  const services = {
    saveRewardAsset: mock.fn(async (input: Record<string, unknown>) => {
      assert.equal(input.symbol, "EMR");
      return [{ id: "asset-1" }];
    }),
  };

  const result = await runRewardAssetSaveRoute({ body: { symbol: "EMR" } }, services);

  assert.equal(result.status, 200);
  assert.deepEqual(result.body, {
    ok: true,
    assets: [{ id: "asset-1" }],
  });
});

test("runRewardProgramDirectoryRoute returns program payload", async () => {
  const services = {
    getRewardProgramDirectory: mock.fn(async () => [{ id: "program-1", slug: "core-emr" }]),
  };

  const result = await runRewardProgramDirectoryRoute(services);

  assert.equal(result.status, 200);
  assert.deepEqual(result.body, {
    ok: true,
    programs: [{ id: "program-1", slug: "core-emr" }],
  });
});

test("runRewardProgramSaveRoute forwards update payload", async () => {
  const services = {
    saveRewardProgram: mock.fn(async (input: Record<string, unknown>, programId?: string) => {
      assert.equal(programId, "program-2");
      assert.equal(input.slug, "partner-egld");
      return [{ id: "program-2" }];
    }),
  };

  const result = await runRewardProgramSaveRoute(
    { programId: "program-2", body: { slug: "partner-egld" } },
    services,
  );

  assert.equal(result.status, 200);
  assert.deepEqual(result.body, {
    ok: true,
    programs: [{ id: "program-2" }],
  });
});

test("runRewardAssetSaveRoute surfaces validation failures", async () => {
  const services = {
    saveRewardAsset: mock.fn(async () => {
      throw new Error("Reward asset requires assetId, symbol, name, and decimals.");
    }),
  };

  const result = await runRewardAssetSaveRoute({ body: { symbol: "" } }, services);

  assert.equal(result.status, 400);
  assert.deepEqual(result.body, {
    ok: false,
    error: "Reward asset requires assetId, symbol, name, and decimals.",
  });
});

test("runRewardAssetDirectoryRoute surfaces access failures", async () => {
  const services = {
    getRewardAssetDirectory: mock.fn(async () => {
      throw new Error("Admin access required.");
    }),
  };

  const result = await runRewardAssetDirectoryRoute(services);

  assert.equal(result.status, 403);
  assert.deepEqual(result.body, {
    ok: false,
    error: "Admin access required.",
  });
});

test("runRewardProgramSaveRoute surfaces missing program errors", async () => {
  const services = {
    saveRewardProgram: mock.fn(async () => {
      throw new Error("Reward program not found.");
    }),
  };

  const result = await runRewardProgramSaveRoute(
    { programId: "missing-program", body: { slug: "missing" } },
    services,
  );

  assert.equal(result.status, 404);
  assert.deepEqual(result.body, {
    ok: false,
    error: "Reward program not found.",
  });
});

test("runRewardProgramDirectoryRoute surfaces access failures", async () => {
  const services = {
    getRewardProgramDirectory: mock.fn(async () => {
      throw new Error("Admin access required.");
    }),
  };

  const result = await runRewardProgramDirectoryRoute(services);

  assert.equal(result.status, 403);
  assert.deepEqual(result.body, {
    ok: false,
    error: "Admin access required.",
  });
});

test("runEconomySettingsUpdateRoute surfaces validation failures", async () => {
  const services = {
    saveEconomySettings: mock.fn(async () => {
      throw new Error("Economy settings require payoutAsset, thresholds, multipliers, and referral reward values.");
    }),
  };

  const result = await runEconomySettingsUpdateRoute({}, services);

  assert.equal(result.status, 400);
  assert.deepEqual(result.body, {
    ok: false,
    error: "Economy settings require payoutAsset, thresholds, multipliers, and referral reward values.",
  });
});

test("runSettlementAnalyticsRoute forwards selected day window", async () => {
  const services = {
    getSettlementAnalytics: mock.fn(async (input: Record<string, unknown>) => {
      assert.equal(input.days, 30);
      assert.equal(input.compareDays, 7);
      return { periodDays: 30, pendingCount: 2 };
    }),
  };

  const result = await runSettlementAnalyticsRoute({ days: 30, compareDays: 7 }, services);

  assert.equal(result.status, 200);
  assert.deepEqual(result.body, {
    ok: true,
    analytics: { periodDays: 30, pendingCount: 2 },
  });
});

test("runSettlementAnalyticsRoute forwards custom date ranges", async () => {
  const services = {
    getSettlementAnalytics: mock.fn(async (input: Record<string, unknown>) => {
      assert.equal(input.startDate, "2026-03-01");
      assert.equal(input.endDate, "2026-03-15");
      assert.equal(input.compareStartDate, "2026-02-15");
      assert.equal(input.compareEndDate, "2026-02-29");
      return { periodDays: 15, pendingCount: 1 };
    }),
  };

  const result = await runSettlementAnalyticsRoute(
    {
      startDate: "2026-03-01",
      endDate: "2026-03-15",
      compareStartDate: "2026-02-15",
      compareEndDate: "2026-02-29",
    },
    services,
  );

  assert.equal(result.status, 200);
  assert.deepEqual(result.body, {
    ok: true,
    analytics: { periodDays: 15, pendingCount: 1 },
  });
});

test("runSettlementAnalyticsRoute rejects invalid comparison windows", async () => {
  const services = {
    getSettlementAnalytics: mock.fn(async () => ({ periodDays: 7 })),
  };

  const result = await runSettlementAnalyticsRoute({ days: 7, compareDays: 0 }, services);

  assert.equal(result.status, 400);
  assert.deepEqual(result.body, {
    ok: false,
    error: "compareDays must be a positive number.",
  });
});

test("runSettlementAnalyticsRoute rejects invalid day windows", async () => {
  const services = {
    getSettlementAnalytics: mock.fn(async () => ({ periodDays: 7 })),
  };

  const result = await runSettlementAnalyticsRoute({ days: 0 }, services);

  assert.equal(result.status, 400);
  assert.deepEqual(result.body, {
    ok: false,
    error: "days must be a positive number.",
  });
});

test("runSettlementAnalyticsRoute rejects partial custom date ranges", async () => {
  const services = {
    getSettlementAnalytics: mock.fn(async () => ({ periodDays: 7 })),
  };

  const result = await runSettlementAnalyticsRoute({ startDate: "2026-03-01" }, services);

  assert.equal(result.status, 400);
  assert.deepEqual(result.body, {
    ok: false,
    error: "Custom settlement analytics requires both startDate and endDate.",
  });
});
