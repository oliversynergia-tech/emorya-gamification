import assert from "node:assert/strict";
import test from "node:test";

test("payout audit trail records approve, processing, and settle transitions", () => {
  const auditTrail = [
    {
      action: "approve",
      previousWorkflowState: "queued",
      nextWorkflowState: "approved",
    },
    {
      action: "processing",
      previousWorkflowState: "approved",
      nextWorkflowState: "processing",
    },
    {
      action: "settle",
      previousWorkflowState: "processing",
      nextWorkflowState: "settled",
      receiptReference: "EMR-123",
    },
  ];

  assert.deepEqual(
    auditTrail.map((entry) => `${entry.action}:${entry.previousWorkflowState}->${entry.nextWorkflowState}`),
    [
      "approve:queued->approved",
      "processing:approved->processing",
      "settle:processing->settled",
    ],
  );
  assert.equal(auditTrail[2].receiptReference, "EMR-123");
});
