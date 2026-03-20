"use client";

import { useMemo, useState } from "react";

import type { AdminOverviewData } from "@/lib/types";

type CampaignPackNotificationEntry = AdminOverviewData["campaignOperations"]["notificationHistory"][number];

export function CampaignPackNotificationHistoryPanel({
  entries,
}: {
  entries: AdminOverviewData["campaignOperations"]["notificationHistory"];
}) {
  const [channelFilter, setChannelFilter] = useState<"all" | CampaignPackNotificationEntry["channel"]>("all");
  const [statusFilter, setStatusFilter] = useState<"all" | CampaignPackNotificationEntry["eventStatus"]>("all");
  const [destinationFilter, setDestinationFilter] = useState("");

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

  return (
    <div className="panel panel--glass admin-analytics">
      <div className="panel__header">
        <div>
          <p className="eyebrow">Campaign alert history</p>
          <h3>Filter routed campaign-pack deliveries</h3>
        </div>
      </div>
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
            </div>
            <div className="achievement-card__side">
              <span>{entry.channel}</span>
              <span>{entry.eventStatus}</span>
              <span>{new Date(entry.createdAt).toLocaleString()}</span>
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
