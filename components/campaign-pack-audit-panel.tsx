"use client";

import { useMemo, useState } from "react";

import type { AdminOverviewData } from "@/lib/types";

type CampaignPackAuditEntry = AdminOverviewData["campaignOperations"]["audit"][number];

export function CampaignPackAuditPanel({
  entries,
}: {
  entries: AdminOverviewData["campaignOperations"]["audit"];
}) {
  const [actionFilter, setActionFilter] = useState<"all" | CampaignPackAuditEntry["action"]>("all");
  const [actorFilter, setActorFilter] = useState("");

  const filteredEntries = useMemo(
    () =>
      entries.filter((entry) => {
        if (actionFilter !== "all" && entry.action !== actionFilter) {
          return false;
        }

        if (
          actorFilter.trim() &&
          !(entry.changedByDisplayName ?? "Unknown actor").toLowerCase().includes(actorFilter.trim().toLowerCase())
        ) {
          return false;
        }

        return true;
      }),
    [actionFilter, actorFilter, entries],
  );

  return (
    <div className="panel panel--glass admin-analytics">
      <div className="panel__header">
        <div>
          <p className="eyebrow">Campaign pack audit trail</p>
          <h3>Who changed pack state, overrides, and alert controls</h3>
        </div>
      </div>
      <div className="review-bulk-actions">
        <label className="field">
          <span>Action</span>
          <select value={actionFilter} onChange={(event) => setActionFilter(event.target.value as typeof actionFilter)}>
            <option value="all">All actions</option>
            <option value="create_pack">Create pack</option>
            <option value="update_lifecycle">Update lifecycle</option>
            <option value="save_benchmark_override">Save override</option>
            <option value="clear_benchmark_override">Clear override</option>
            <option value="suppress_alert">Suppress alert</option>
            <option value="clear_alert_suppression">Clear alert suppression</option>
          </select>
        </label>
        <label className="field">
          <span>Changed by</span>
          <input
            value={actorFilter}
            onChange={(event) => setActorFilter(event.target.value)}
            placeholder="Filter by admin name"
          />
        </label>
      </div>
      <div className="achievement-list">
        {filteredEntries.map((entry) => (
          <article key={entry.id} className="achievement-card">
            <div>
              <strong>
                {entry.label} · {entry.action}
              </strong>
              <p>{entry.detail}</p>
              <p className="form-note">
                {entry.packId}
                {entry.changedByDisplayName ? ` · ${entry.changedByDisplayName}` : ""}
              </p>
            </div>
            <div className="achievement-card__side">
              <span>{new Date(entry.createdAt).toLocaleString()}</span>
            </div>
          </article>
        ))}
        {entries.length === 0 ? (
          <p className="form-note">No campaign pack actions have been recorded yet.</p>
        ) : filteredEntries.length === 0 ? (
          <p className="form-note">No campaign pack audit entries match the current filters.</p>
        ) : null}
      </div>
    </div>
  );
}
