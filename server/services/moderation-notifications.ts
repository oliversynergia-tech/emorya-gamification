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

  if (channels.emailRecipient) {
    notifications.push({
      channel: "email",
      enabled: true,
      status: hasAlerts ? "armed" : "idle",
      destination: channels.emailRecipient,
      title: hasAlerts ? "Email digest armed" : "Email digest idle",
      detail: hasAlerts
        ? `A moderation summary can be delivered to ${channels.emailRecipient} for the current ${highestSeverity} queue state.`
        : "Email routing is configured and waiting for a queue alert.",
    });
  }

  if (channels.slackWebhookUrl) {
    notifications.push({
      channel: "slack",
      enabled: true,
      status: hasAlerts ? "armed" : "idle",
      destination: channels.slackWebhookUrl,
      title: hasAlerts ? "Slack alert armed" : "Slack alert idle",
      detail: hasAlerts
        ? "Slack delivery is configured for moderation SLA and backlog digests."
        : "Slack delivery is configured and waiting for a queue alert.",
    });
  }

  if (channels.discordWebhookUrl) {
    notifications.push({
      channel: "discord",
      enabled: true,
      status: hasAlerts ? "armed" : "idle",
      destination: channels.discordWebhookUrl,
      title: hasAlerts ? "Discord alert armed" : "Discord alert idle",
      detail: hasAlerts
        ? "Discord delivery is configured for moderation SLA and backlog digests."
        : "Discord delivery is configured and waiting for a queue alert.",
    });
  }

  return notifications;
}
