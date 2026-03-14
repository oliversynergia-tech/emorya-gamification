import type { QueryResultRow } from "pg";

import type { TokenSettlementItem } from "@/lib/types";
import { runQuery } from "@/server/db/client";

type TokenSettlementRow = QueryResultRow & {
  id: string;
  asset: TokenSettlementItem["asset"];
  token_amount: number | string;
  eligibility_points_spent: number | string;
  status: "claimed" | "settled";
  source: string;
  created_at: string;
  settled_at: string | null;
  receipt_reference: string | null;
  settlement_note: string | null;
  user_display_name: string;
  user_email: string | null;
  settled_by_display_name: string | null;
};

function mapTokenSettlement(row: TokenSettlementRow): TokenSettlementItem {
  return {
    id: row.id,
    userDisplayName: row.user_display_name,
    userEmail: row.user_email,
    asset: row.asset,
    tokenAmount: Number(row.token_amount),
    eligibilityPointsSpent: Number(row.eligibility_points_spent),
    source: row.source,
    createdAt: row.created_at,
    settledAt: row.settled_at,
    receiptReference: row.receipt_reference,
    settlementNote: row.settlement_note,
    settledByDisplayName: row.settled_by_display_name,
  };
}

export async function listPendingTokenSettlements(limit = 20): Promise<TokenSettlementItem[]> {
  const result = await runQuery<TokenSettlementRow>(
    `SELECT redemptions.id, redemptions.asset, redemptions.token_amount, redemptions.eligibility_points_spent,
            redemptions.status, redemptions.source, redemptions.created_at, redemptions.settled_at,
            redemptions.receipt_reference, redemptions.settlement_note,
            users.display_name AS user_display_name, users.email AS user_email,
            settled_by_users.display_name AS settled_by_display_name
     FROM token_redemptions redemptions
     INNER JOIN users ON users.id = redemptions.user_id
     LEFT JOIN users settled_by_users ON settled_by_users.id = redemptions.settled_by
     WHERE redemptions.status = 'claimed'
     ORDER BY redemptions.created_at ASC
     LIMIT $1`,
    [limit],
  );

  return result.rows.map(mapTokenSettlement);
}

export async function settleTokenRedemption({
  redemptionId,
  settledBy,
  receiptReference,
  settlementNote,
}: {
  redemptionId: string;
  settledBy: string;
  receiptReference: string;
  settlementNote: string | null;
}) {
  const result = await runQuery<TokenSettlementRow>(
    `UPDATE token_redemptions
     SET status = 'settled',
         settled_at = NOW(),
         settled_by = $2,
         receipt_reference = $3,
         settlement_note = $4
     WHERE id = $1
       AND status = 'claimed'
     RETURNING id, asset, token_amount, eligibility_points_spent, status, source, created_at, settled_at,
               receipt_reference, settlement_note,
               ''::text AS user_display_name, NULL::text AS user_email, NULL::text AS settled_by_display_name`,
    [redemptionId, settledBy, receiptReference, settlementNote],
  );

  return Boolean(result.rows[0]);
}
