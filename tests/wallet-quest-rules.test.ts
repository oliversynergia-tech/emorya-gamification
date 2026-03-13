import assert from "node:assert/strict";
import test from "node:test";

import { resolveWalletQuestVerification } from "../server/services/wallet-quest-rules.ts";

test("resolveWalletQuestVerification selects the only linked wallet when none is provided", () => {
  const linkedAt = "2026-03-01T00:00:00.000Z";

  const result = resolveWalletQuestVerification({
    linkedWallets: [{ walletAddress: "erd1examplewallet", linkedAt }],
    selectedWalletAddress: "",
    metadata: {},
  });

  assert.equal(result.walletAddress, "erd1examplewallet");
  assert.equal(result.linkedAt, linkedAt);
});

test("resolveWalletQuestVerification rejects unlinked wallet addresses", () => {
  assert.throws(
    () =>
      resolveWalletQuestVerification({
        linkedWallets: [{ walletAddress: "erd1linked", linkedAt: "2026-03-01T00:00:00.000Z" }],
        selectedWalletAddress: "erd1notlinked",
        metadata: {},
      }),
    /not linked to this account/,
  );
});

test("resolveWalletQuestVerification enforces required wallet age", () => {
  assert.throws(
    () =>
      resolveWalletQuestVerification({
        linkedWallets: [{ walletAddress: "erd1linked", linkedAt: new Date().toISOString() }],
        selectedWalletAddress: "erd1linked",
        metadata: { minLinkedWalletAgeDays: 7 },
      }),
    /at least 7 days/,
  );
});
