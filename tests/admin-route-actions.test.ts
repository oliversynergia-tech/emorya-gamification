import assert from "node:assert/strict";
import test, { mock } from "node:test";

import {
  runQuestDefinitionCreateRoute,
  runQuestDefinitionDeleteRoute,
  runQuestDefinitionDirectoryRoute,
  runQuestDefinitionUpdateRoute,
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
