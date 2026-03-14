import { createHash, randomUUID } from "crypto";

import type { QueryResultRow } from "pg";

import type { AdminOverviewData } from "@/lib/types";
import { runQuery } from "@/server/db/client";

type ModerationNotificationRow = QueryResultRow & {
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

function buildNotificationFingerprint(notification: AdminOverviewData["moderationNotifications"][number]) {
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

export async function syncModerationNotificationHistory(
  notifications: AdminOverviewData["moderationNotifications"],
) {
  const activeNotifications = notifications.filter((notification) => notification.enabled && notification.status === "armed");

  for (const notification of activeNotifications) {
    const eventStatus = notification.channel === "inbox" ? "armed" : "sent";
    const fingerprint = buildNotificationFingerprint(notification);
    const existing = await runQuery<{ id: string }>(
      `SELECT id
       FROM moderation_notification_deliveries
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
      `INSERT INTO moderation_notification_deliveries (
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

export async function listRecentModerationNotificationDeliveries(limit = 8) {
  const result = await runQuery<ModerationNotificationRow>(
    `SELECT delivery.id,
            delivery.channel,
            delivery.event_status,
            delivery.destination,
            delivery.title,
            delivery.detail,
            delivery.created_at,
            delivery.acknowledged_at,
            acknowledger.display_name AS acknowledged_by_display_name
     FROM moderation_notification_deliveries delivery
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

export async function acknowledgeModerationNotificationDelivery({
  deliveryId,
  acknowledgedBy,
}: {
  deliveryId: string;
  acknowledgedBy: string;
}) {
  await runQuery(
    `UPDATE moderation_notification_deliveries
     SET event_status = 'acknowledged',
         acknowledged_at = NOW(),
         acknowledged_by = $2
     WHERE id = $1
       AND event_status <> 'acknowledged'`,
    [deliveryId, acknowledgedBy],
  );

  return listRecentModerationNotificationDeliveries();
}
