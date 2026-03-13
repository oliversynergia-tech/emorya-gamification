import type {
  AdminOverviewData,
  ModerationAlertChannelConfig,
  QueueAlertThresholds,
} from "../../lib/types.ts";

export function buildModerationNotifications({
  alerts,
  thresholds,
  channels,
}: {
  alerts: AdminOverviewData["queueMetrics"]["alerts"];
  thresholds: QueueAlertThresholds;
  channels: ModerationAlertChannelConfig;
}) {
  const highestSeverity = alerts.some((alert) => alert.severity === "critical") ? "critical" : "warning";
  const hasAlerts = alerts.length > 0;
  const summary = hasAlerts
    ? `${alerts.length} moderation alert${alerts.length === 1 ? "" : "s"} active. Oldest warning ${thresholds.oldestWarningMinutes} min, stale threshold ${thresholds.staleMinutes} min.`
    : "Queue health is currently within configured moderation thresholds.";

  const notifications: AdminOverviewData["moderationNotifications"] = [
    {
      channel: "inbox",
      enabled: channels.inboxEnabled,
      status: channels.inboxEnabled && hasAlerts ? "armed" : "idle",
      destination: "Admin inbox",
      title: hasAlerts
        ? highestSeverity === "critical"
          ? "Inbox escalation ready"
          : "Inbox advisory ready"
        : "Inbox monitoring idle",
      detail: channels.inboxEnabled
        ? summary
        : "Inbox notifications are disabled by configuration.",
    },
  ];

  if (channels.webhookUrl) {
    notifications.push({
      channel: "webhook",
      enabled: true,
      status: hasAlerts ? "armed" : "idle",
      destination: channels.webhookUrl,
      title: hasAlerts ? "Webhook dispatch armed" : "Webhook monitoring idle",
      detail: hasAlerts
        ? `A moderation digest can be sent to the configured webhook with the current ${highestSeverity} queue summary.`
        : "Webhook routing is configured and waiting for a queue alert.",
    });
  }

  return notifications;
}
