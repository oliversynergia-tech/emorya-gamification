"use client";

import { useMemo, useState } from "react";

import type { AdminOverviewData } from "@/lib/types";

type CampaignPackNotificationEntry = AdminOverviewData["campaignOperations"]["notificationHistory"][number];

export function CampaignPackNotificationHistoryPanel({
  initialEntries,
  canManage = false,
}: {
  initialEntries: AdminOverviewData["campaignOperations"]["notificationHistory"];
  canManage?: boolean;
}) {
  const [entries, setEntries] = useState(initialEntries);
  const [channelFilter, setChannelFilter] = useState<"all" | CampaignPackNotificationEntry["channel"]>("all");
  const [statusFilter, setStatusFilter] = useState<"all" | CampaignPackNotificationEntry["eventStatus"]>("all");
  const [destinationFilter, setDestinationFilter] = useState("");
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const filteredEntries = useMemo(
    () =>
      entries.filter((entry) => {
        if (channelFilter !== "all" && entry.channel !== channelFilter) {
          return false;
        }

        if (statusFilter !== "all" && entry.eventStatus !== statusFilter) {
          return false;
        }

        if (
          destinationFilter.trim() &&
          !entry.destination.toLowerCase().includes(destinationFilter.trim().toLowerCase())
        ) {
          return false;
        }

        return true;
      }),
    [channelFilter, statusFilter, destinationFilter, entries],
  );

  async function acknowledge(deliveryId: string) {
    setPendingId(deliveryId);
    setError(null);

    try {
      const response = await fetch(`/api/admin/campaign-pack-notifications/${deliveryId}`, {
        method: "PATCH",
      });
      const payload = (await response.json()) as {
        ok: boolean;
        error?: string;
        history?: AdminOverviewData["campaignOperations"]["notificationHistory"];
      };

      if (!response.ok || !payload.ok || !payload.history) {
        throw new Error(payload.error ?? "Unable to acknowledge campaign alert notification.");
      }

      setEntries(payload.history);
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Unable to acknowledge campaign alert notification.");
    } finally {
      setPendingId(null);
    }
  }

  return (
    <div className="panel panel--glass admin-analytics">
      <div className="panel__header">
        <div>
          <p className="eyebrow">Campaign alert history</p>
          <h3>Filter routed campaign-pack deliveries</h3>
        </div>
      </div>
      {error ? <p className="form-note form-note--error">{error}</p> : null}
      <div className="review-bulk-actions">
        <label className="field">
          <span>Channel</span>
          <select value={channelFilter} onChange={(event) => setChannelFilter(event.target.value as typeof channelFilter)}>
            <option value="all">All channels</option>
            <option value="inbox">Inbox</option>
            <option value="webhook">Webhook</option>
            <option value="email">Email</option>
            <option value="slack">Slack</option>
            <option value="discord">Discord</option>
          </select>
        </label>
        <label className="field">
          <span>Event status</span>
          <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as typeof statusFilter)}>
            <option value="all">All statuses</option>
            <option value="armed">Armed</option>
            <option value="sent">Sent</option>
            <option value="acknowledged">Acknowledged</option>
          </select>
        </label>
        <label className="field">
          <span>Destination</span>
          <input
            value={destinationFilter}
            onChange={(event) => setDestinationFilter(event.target.value)}
            placeholder="Filter by destination"
          />
        </label>
      </div>
      <div className="achievement-list">
        {filteredEntries.map((entry) => (
          <article key={entry.id} className="achievement-card">
            <div>
              <strong>{entry.title}</strong>
              <p>{entry.detail}</p>
              <p>{entry.destination}</p>
              {entry.acknowledgedAt ? (
                <small>
                  {entry.acknowledgedByDisplayName
                    ? `Ack by ${entry.acknowledgedByDisplayName}`
                    : "Acknowledged"}
                </small>
              ) : null}
            </div>
            <div className="achievement-card__side">
              <span>{entry.channel}</span>
              <span>{entry.eventStatus}</span>
              <span>{new Date(entry.acknowledgedAt ?? entry.createdAt).toLocaleString()}</span>
              {entry.acknowledgedAt || !canManage ? null : (
                <button
                  className="button button--secondary button--small"
                  disabled={pendingId === entry.id}
                  onClick={() => acknowledge(entry.id)}
                  type="button"
                >
                  {pendingId === entry.id ? "Saving..." : "Acknowledge"}
                </button>
              )}
            </div>
          </article>
        ))}
        {entries.length === 0 ? (
          <p className="form-note">No campaign-pack alert deliveries have been recorded yet.</p>
        ) : filteredEntries.length === 0 ? (
          <p className="form-note">No campaign-pack alert deliveries match the current filters.</p>
        ) : null}
      </div>
    </div>
  );
}
