import type { AdminOverviewData, CampaignAlertChannelConfig } from "../../lib/types.ts";

export function buildCampaignPackNotifications({
  alerts,
  channels,
}: {
  alerts: AdminOverviewData["campaignOperations"]["alerts"];
  channels: CampaignAlertChannelConfig;
}) {
  const highestSeverity = alerts.some((alert) => alert.severity === "critical") ? "critical" : "warning";
  const hasAlerts = alerts.length > 0;
  const summary = hasAlerts
    ? `${alerts.length} campaign pack alert${alerts.length === 1 ? "" : "s"} active across live packs.`
    : "Campaign pack performance is currently within the configured benchmark thresholds.";

  const notifications: AdminOverviewData["campaignOperations"]["notifications"] = [
    {
      channel: "inbox",
      enabled: channels.inboxEnabled,
      status: channels.inboxEnabled && hasAlerts ? "armed" : "idle",
      destination: "Admin inbox",
      title: hasAlerts
        ? highestSeverity === "critical"
          ? "Campaign pack escalation ready"
          : "Campaign pack advisory ready"
        : "Campaign pack monitoring idle",
      detail: channels.inboxEnabled ? summary : "Inbox notifications are disabled by configuration.",
    },
  ];

  if (channels.webhookUrl) {
    notifications.push({
      channel: "webhook",
      enabled: true,
      status: hasAlerts ? "armed" : "idle",
      destination: channels.webhookUrl,
      title: hasAlerts ? "Campaign webhook dispatch armed" : "Campaign webhook monitoring idle",
      detail: hasAlerts
        ? "Webhook routing is ready to deliver live pack benchmark breaches."
        : "Webhook routing is configured and waiting for a campaign pack alert.",
    });
  }

  if (channels.emailRecipient) {
    notifications.push({
      channel: "email",
      enabled: true,
      status: hasAlerts ? "armed" : "idle",
      destination: channels.emailRecipient,
      title: hasAlerts ? "Campaign email digest armed" : "Campaign email digest idle",
      detail: hasAlerts
        ? `Campaign pack benchmark alerts can be delivered to ${channels.emailRecipient}.`
        : "Email routing is configured and waiting for a campaign pack alert.",
    });
  }

  if (channels.slackWebhookUrl) {
    notifications.push({
      channel: "slack",
      enabled: true,
      status: hasAlerts ? "armed" : "idle",
      destination: channels.slackWebhookUrl,
      title: hasAlerts ? "Campaign Slack alert armed" : "Campaign Slack alert idle",
      detail: hasAlerts
        ? "Slack delivery is configured for live campaign pack benchmark breaches."
        : "Slack delivery is configured and waiting for a campaign pack alert.",
    });
  }

  if (channels.discordWebhookUrl) {
    notifications.push({
      channel: "discord",
      enabled: true,
      status: hasAlerts ? "armed" : "idle",
      destination: channels.discordWebhookUrl,
      title: hasAlerts ? "Campaign Discord alert armed" : "Campaign Discord alert idle",
      detail: hasAlerts
        ? "Discord delivery is configured for live campaign pack benchmark breaches."
        : "Discord delivery is configured and waiting for a campaign pack alert.",
    });
  }

  return notifications;
}
