import { createHash, randomUUID } from "crypto";

import type { QueryResultRow } from "pg";

import type { AdminOverviewData } from "@/lib/types";
import { runQuery } from "@/server/db/client";

type CampaignPackNotificationRow = QueryResultRow & {
  id: string;
  channel: "inbox" | "webhook" | "email" | "slack" | "discord";
  event_status: "armed" | "sent";
  destination: string;
  title: string;
  detail: string;
  created_at: string;
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
    `SELECT id, channel, event_status, destination, title, detail, created_at
     FROM campaign_pack_alert_deliveries
     ORDER BY created_at DESC
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
  }));
}

