import { randomUUID } from "crypto";
import { resolve } from "path";
import { fileURLToPath } from "url";

import { createDbToolContext } from "./db-tools.mjs";

const rootDir = resolve(fileURLToPath(new URL("..", import.meta.url)));
const { withClient } = createDbToolContext(rootDir);

const actorUserId = process.env.AUTOMATION_ACTOR_USER_ID?.trim() || null;
const dryRun = process.argv.includes("--dry-run");
const batchSizeArg = process.argv.find((arg) => arg.startsWith("--batch-size="));
const batchSize = Math.min(Math.max(Number(batchSizeArg?.split("=")[1] ?? 50), 1), 250);

if (!actorUserId) {
  console.error("AUTOMATION_ACTOR_USER_ID is required for automated payout processing.");
  process.exit(1);
}

await withClient(async (client) => {
  const settingsResult = await client.query(
    `SELECT payout_mode, settlement_processing_enabled, direct_reward_queue_enabled
     FROM economy_settings
     WHERE is_active = TRUE
     ORDER BY updated_at DESC
     LIMIT 1`,
  );
  const settings = settingsResult.rows[0];

  if (!settings) {
    console.log("No active economy settings found. Skipping payout processing.");
    return;
  }

  if (settings.payout_mode !== "automation_ready" || settings.settlement_processing_enabled !== true) {
    console.log("Payout automation is not active. Skipping payout processing.");
    return;
  }

  const queueResult = await client.query(
    `SELECT id, workflow_state, source, asset, metadata
     FROM token_redemptions
     WHERE status = 'claimed'
     ORDER BY created_at ASC
     LIMIT $1`,
    [batchSize],
  );

  const summary = {
    approved: 0,
    processing: 0,
    settled: 0,
    skipped: 0,
  };

  for (const row of queueResult.rows) {
    const metadata = row.metadata ?? {};
    let currentState = row.workflow_state;

    if (currentState === "queued") {
      summary.approved += 1;
      if (!dryRun) {
        await client.query(
          `UPDATE token_redemptions
           SET workflow_state = 'approved',
               approved_at = NOW(),
               approved_by = $2
           WHERE id = $1`,
          [row.id, actorUserId],
        );
        await client.query(
          `INSERT INTO token_redemption_audit (
             id, redemption_id, action, changed_by, previous_workflow_state, next_workflow_state, metadata
           ) VALUES ($1, $2, 'approve', $3, 'queued', 'approved', $4::jsonb)`,
          [
            randomUUID(),
            row.id,
            actorUserId,
            JSON.stringify({
              source: row.source,
              asset: row.asset,
              automated: true,
            }),
          ],
        );
      }
      currentState = "approved";
    }

    if (currentState === "approved") {
      summary.processing += 1;
      if (!dryRun) {
        await client.query(
          `UPDATE token_redemptions
           SET workflow_state = 'processing',
               processing_started_at = NOW(),
               processing_by = $2
           WHERE id = $1`,
          [row.id, actorUserId],
        );
        await client.query(
          `INSERT INTO token_redemption_audit (
             id, redemption_id, action, changed_by, previous_workflow_state, next_workflow_state, metadata
           ) VALUES ($1, $2, 'processing', $3, 'approved', 'processing', $4::jsonb)`,
          [
            randomUUID(),
            row.id,
            actorUserId,
            JSON.stringify({
              source: row.source,
              asset: row.asset,
              automated: true,
            }),
          ],
        );
      }
      currentState = "processing";
    }

    if (currentState === "processing") {
      const receiptReference =
        typeof metadata.automationReceiptReference === "string" && metadata.automationReceiptReference.trim()
          ? metadata.automationReceiptReference.trim()
          : null;

      if (!receiptReference) {
        summary.skipped += 1;
        continue;
      }

      summary.settled += 1;
      if (!dryRun) {
        const settlementNote =
          typeof metadata.automationSettlementNote === "string" && metadata.automationSettlementNote.trim()
            ? metadata.automationSettlementNote.trim()
            : "Automated settlement completed.";

        await client.query(
          `UPDATE token_redemptions
           SET status = 'settled',
               workflow_state = 'settled',
               settled_at = NOW(),
               settled_by = $2,
               receipt_reference = $3,
               settlement_note = $4
           WHERE id = $1`,
          [row.id, actorUserId, receiptReference, settlementNote],
        );
        await client.query(
          `INSERT INTO token_redemption_audit (
             id, redemption_id, action, changed_by, previous_workflow_state, next_workflow_state,
             receipt_reference, settlement_note, metadata
           ) VALUES ($1, $2, 'settle', $3, 'processing', 'settled', $4, $5, $6::jsonb)`,
          [
            randomUUID(),
            row.id,
            actorUserId,
            receiptReference,
            settlementNote,
            JSON.stringify({
              source: row.source,
              asset: row.asset,
              automated: true,
            }),
          ],
        );
      }
    }
  }

  console.log(
    `${dryRun ? "Dry run" : "Processed"} automated payouts: ${summary.approved} approved, ${summary.processing} moved to processing, ${summary.settled} settled, ${summary.skipped} waiting for an automation receipt reference.`,
  );
});
