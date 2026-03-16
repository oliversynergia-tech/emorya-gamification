import assert from "node:assert/strict";
import test, { mock } from "node:test";

import {
  runQuestDefinitionCreateRoute,
  runQuestDefinitionDeleteRoute,
  runQuestDefinitionDirectoryRoute,
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

test("runTokenSettlementRoute forwards settlement payload", async () => {
  const services = {
    settlePendingTokenRedemption: mock.fn(
      async (input: { redemptionId: string; receiptReference: string; settlementNote?: string | null }) => {
        assert.equal(input.redemptionId, "redemption-1");
        assert.equal(input.receiptReference, "EMR-SETTLED-1");
        assert.equal(input.settlementNote, "Manually paid");
        return [];
      },
    ),
  };

  const result = await runTokenSettlementRoute(
    {
      redemptionId: "redemption-1",
      body: {
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

test("runSettlementAnalyticsRoute forwards selected day window", async () => {
  const services = {
    getSettlementAnalytics: mock.fn(async (days?: number) => {
      assert.equal(days, 30);
      return { periodDays: 30, pendingCount: 2 };
    }),
  };

  const result = await runSettlementAnalyticsRoute({ days: 30 }, services);

  assert.equal(result.status, 200);
  assert.deepEqual(result.body, {
    ok: true,
    analytics: { periodDays: 30, pendingCount: 2 },
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
