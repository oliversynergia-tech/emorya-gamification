import { randomUUID } from "crypto";

import type { QueryResultRow } from "pg";

import type { AdminOverviewData } from "@/lib/types";
import { runQuery } from "@/server/db/client";

type CampaignPackAuditRow = QueryResultRow & {
  id: string;
  pack_id: string;
  label: string;
  action: AdminOverviewData["campaignOperations"]["audit"][number]["action"];
  detail: string;
  changed_by_display_name: string | null;
  created_at: string;
};

export async function createCampaignPackAuditEntry({
  packId,
  label,
  action,
  detail,
  changedBy,
  metadata,
}: {
  packId: string;
  label: string;
  action: AdminOverviewData["campaignOperations"]["audit"][number]["action"];
  detail: string;
  changedBy: string | null;
  metadata?: Record<string, unknown>;
}) {
  await runQuery(
    `INSERT INTO campaign_pack_audit (
       id, pack_id, label, action, detail, changed_by, metadata
     ) VALUES (
       $1, $2, $3, $4, $5, $6, $7::jsonb
     )`,
    [randomUUID(), packId, label, action, detail, changedBy, JSON.stringify(metadata ?? {})],
  );
}

export async function listRecentCampaignPackAudit(limit = 20): Promise<AdminOverviewData["campaignOperations"]["audit"]> {
  const result = await runQuery<CampaignPackAuditRow>(
    `SELECT audit.id,
            audit.pack_id,
            audit.label,
            audit.action,
            audit.detail,
            users.display_name AS changed_by_display_name,
            audit.created_at
     FROM campaign_pack_audit audit
     LEFT JOIN users ON users.id = audit.changed_by
     ORDER BY audit.created_at DESC
     LIMIT $1`,
    [limit],
  );

  return result.rows.map((row) => ({
    id: row.id,
    packId: row.pack_id,
    label: row.label,
    action: row.action,
    detail: row.detail,
    changedByDisplayName: row.changed_by_display_name,
    createdAt: row.created_at,
  }));
}
