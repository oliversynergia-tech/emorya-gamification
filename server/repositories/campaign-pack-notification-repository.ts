import { createHash, randomUUID } from "crypto";

import type { QueryResultRow } from "pg";

import type { AdminOverviewData } from "@/lib/types";
import { runQuery } from "@/server/db/client";

type CampaignPackNotificationRow = QueryResultRow & {
  id: string;
  channel: "inbox" | "webhook" | "email" | "slack" | "discord";
  event_status: "armed" | "sent" | "acknowledged";
  destination: string;
  title: string;
  detail: string;
  created_at: string;
  acknowledged_at: string | null;
  acknowledged_by_display_name: string | null;
};

type CampaignPackAlertSuppressionRow = QueryResultRow & {
  id: string;
  pack_id: string;
  label: string;
  title: string;
  suppressed_until: string;
  reason: string | null;
  created_at: string;
  created_by_display_name: string | null;
  cleared_at: string | null;
  cleared_by_display_name: string | null;
};

function buildNotificationFingerprint(notification: AdminOverviewData["campaignOperations"]["notifications"][number]) {
  return createHash("sha256")
    .update([
      notification.channel,
      notification.destination,
      notification.title,
      notification.detail,
      notification.status,
    ].join("|"))
    .digest("hex");
}

export async function syncCampaignPackNotificationHistory(
  notifications: AdminOverviewData["campaignOperations"]["notifications"],
) {
  const activeNotifications = notifications.filter((notification) => notification.enabled && notification.status === "armed");

  for (const notification of activeNotifications) {
    const eventStatus = notification.channel === "inbox" ? "armed" : "sent";
    const fingerprint = buildNotificationFingerprint(notification);
    const existing = await runQuery<{ id: string }>(
      `SELECT id
       FROM campaign_pack_alert_deliveries
       WHERE channel = $1
         AND event_status = $2
         AND fingerprint = $3
         AND created_at >= NOW() - INTERVAL '6 hours'
       LIMIT 1`,
      [notification.channel, eventStatus, fingerprint],
    );

    if (existing.rows[0]) {
      continue;
    }

    await runQuery(
      `INSERT INTO campaign_pack_alert_deliveries (
         id,
         channel,
         event_status,
         destination,
         title,
         detail,
         fingerprint
       )
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [
        randomUUID(),
        notification.channel,
        eventStatus,
        notification.destination,
        notification.title,
        notification.detail,
        fingerprint,
      ],
    );
  }
}

export async function listRecentCampaignPackNotificationDeliveries(limit = 8) {
  const result = await runQuery<CampaignPackNotificationRow>(
    `SELECT delivery.id,
            delivery.channel,
            delivery.event_status,
            delivery.destination,
            delivery.title,
            delivery.detail,
            delivery.created_at,
            delivery.acknowledged_at,
            acknowledger.display_name AS acknowledged_by_display_name
     FROM campaign_pack_alert_deliveries delivery
     LEFT JOIN users acknowledger ON acknowledger.id = delivery.acknowledged_by
     ORDER BY COALESCE(delivery.acknowledged_at, delivery.created_at) DESC, delivery.created_at DESC
     LIMIT $1`,
    [limit],
  );

  return result.rows.map((row) => ({
    id: row.id,
    channel: row.channel,
    eventStatus: row.event_status,
    destination: row.destination,
    title: row.title,
    detail: row.detail,
    createdAt: row.created_at,
    acknowledgedAt: row.acknowledged_at,
    acknowledgedByDisplayName: row.acknowledged_by_display_name,
  }));
}

export async function acknowledgeCampaignPackNotificationDelivery({
  deliveryId,
  acknowledgedBy,
}: {
  deliveryId: string;
  acknowledgedBy: string;
}) {
  await runQuery(
    `UPDATE campaign_pack_alert_deliveries
     SET event_status = 'acknowledged',
         acknowledged_at = NOW(),
         acknowledged_by = $2
     WHERE id = $1
       AND event_status <> 'acknowledged'`,
    [deliveryId, acknowledgedBy],
  );

  return listRecentCampaignPackNotificationDeliveries();
}

export async function listActiveCampaignPackAlertSuppressions(limit = 20) {
  const result = await runQuery<CampaignPackAlertSuppressionRow>(
    `SELECT suppression.id,
            suppression.pack_id,
            suppression.label,
            suppression.title,
            suppression.suppressed_until,
            suppression.reason,
            suppression.created_at,
            creator.display_name AS created_by_display_name,
            suppression.cleared_at,
            clearer.display_name AS cleared_by_display_name
     FROM campaign_pack_alert_suppressions suppression
     LEFT JOIN users creator ON creator.id = suppression.created_by
     LEFT JOIN users clearer ON clearer.id = suppression.cleared_by
     WHERE suppression.cleared_at IS NULL
       AND suppression.suppressed_until > NOW()
     ORDER BY suppression.suppressed_until DESC, suppression.created_at DESC
     LIMIT $1`,
    [limit],
  );

  return result.rows.map((row) => ({
    id: row.id,
    packId: row.pack_id,
    label: row.label,
    title: row.title,
    suppressedUntil: row.suppressed_until,
    reason: row.reason,
    createdAt: row.created_at,
    createdByDisplayName: row.created_by_display_name,
    clearedAt: row.cleared_at,
    clearedByDisplayName: row.cleared_by_display_name,
  }));
}

export async function getCampaignPackAlertSuppressionAnalytics() {
  const byDurationResult = await runQuery<{ hours: number | string; count: number | string }>(
    `SELECT GREATEST(1, ROUND(EXTRACT(EPOCH FROM (suppressed_until - created_at)) / 3600.0))::int AS hours,
            COUNT(*)::int AS count
     FROM campaign_pack_alert_suppressions
     WHERE cleared_at IS NULL
       AND suppressed_until > NOW()
     GROUP BY 1
     ORDER BY 1 ASC`,
  );
  const byReasonResult = await runQuery<{ reason: string | null; count: number | string }>(
    `SELECT COALESCE(NULLIF(BTRIM(reason), ''), 'No reason given') AS reason,
            COUNT(*)::int AS count
     FROM campaign_pack_alert_suppressions
     WHERE cleared_at IS NULL
       AND suppressed_until > NOW()
     GROUP BY 1
     ORDER BY COUNT(*) DESC, 1 ASC`,
  );

  return {
    activeCount: byDurationResult.rows.reduce((sum, row) => sum + Number(row.count), 0),
    activeByDurationHours: byDurationResult.rows.map((row) => ({
      hours: Number(row.hours),
      count: Number(row.count),
    })),
    activeByReason: byReasonResult.rows.map((row) => ({
      reason: row.reason ?? "No reason given",
      count: Number(row.count),
    })),
  };
}

export async function createCampaignPackAlertSuppression({
  packId,
  label,
  title,
  reason,
  hours,
  createdBy,
}: {
  packId: string;
  label: string;
  title: string;
  reason?: string | null;
  hours: number;
  createdBy: string;
}) {
  await runQuery(
    `INSERT INTO campaign_pack_alert_suppressions (
       id,
       pack_id,
       label,
       title,
       suppressed_until,
       reason,
       created_by
     )
     VALUES ($1, $2, $3, $4, NOW() + ($5::text || ' hours')::interval, $6, $7)`,
    [randomUUID(), packId, label, title, hours, reason?.trim() || null, createdBy],
  );

  return listActiveCampaignPackAlertSuppressions();
}

export async function clearCampaignPackAlertSuppression({
  suppressionId,
  clearedBy,
}: {
  suppressionId: string;
  clearedBy: string;
}) {
  await runQuery(
    `UPDATE campaign_pack_alert_suppressions
     SET cleared_at = NOW(),
         cleared_by = $2
     WHERE id = $1
       AND cleared_at IS NULL`,
    [suppressionId, clearedBy],
  );

  return listActiveCampaignPackAlertSuppressions();
}
