"use client";

import { useMemo, useState } from "react";

import type { AdminOverviewData } from "@/lib/types";

type PayoutAuditEntry = AdminOverviewData["tokenSettlementAudit"][number];

export function PayoutAuditTrailPanel({
  entries,
}: {
  entries: AdminOverviewData["tokenSettlementAudit"];
}) {
  const [actionFilter, setActionFilter] = useState<"all" | PayoutAuditEntry["action"]>("all");
  const [stateFilter, setStateFilter] = useState<"all" | PayoutAuditEntry["nextWorkflowState"]>("all");
  const [actorFilter, setActorFilter] = useState("");

  const filteredEntries = useMemo(
    () =>
      entries.filter((entry) => {
        if (actionFilter !== "all" && entry.action !== actionFilter) {
          return false;
        }

        if (stateFilter !== "all" && entry.nextWorkflowState !== stateFilter) {
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
    [actionFilter, stateFilter, actorFilter, entries],
  );

  return (
    <div className="panel panel--glass admin-analytics">
      <div className="panel__header">
        <div>
          <p className="eyebrow">Payout audit trail</p>
          <h3>Who changed payout workflow state and when</h3>
        </div>
      </div>
      <div className="review-bulk-actions">
        <label className="field">
          <span>Action</span>
          <select value={actionFilter} onChange={(event) => setActionFilter(event.target.value as typeof actionFilter)}>
            <option value="all">All actions</option>
            <option value="approve">Approve</option>
            <option value="processing">Processing</option>
            <option value="settle">Settle</option>
          </select>
        </label>
        <label className="field">
          <span>Workflow state</span>
          <select value={stateFilter} onChange={(event) => setStateFilter(event.target.value as typeof stateFilter)}>
            <option value="all">All states</option>
            <option value="approved">Approved</option>
            <option value="processing">Processing</option>
            <option value="settled">Settled</option>
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
                {entry.action} · {entry.previousWorkflowState} {"->"} {entry.nextWorkflowState}
              </strong>
              <p>
                Redemption {entry.redemptionId}
                {entry.changedByDisplayName ? ` · ${entry.changedByDisplayName}` : ""}
                {entry.receiptReference ? ` · receipt ${entry.receiptReference}` : ""}
              </p>
              {entry.settlementNote ? <p>{entry.settlementNote}</p> : null}
            </div>
            <div className="achievement-card__side">
              <span>{new Date(entry.createdAt).toLocaleString()}</span>
            </div>
          </article>
        ))}
        {entries.length === 0 ? (
          <p className="form-note">No payout workflow actions have been recorded yet.</p>
        ) : filteredEntries.length === 0 ? (
          <p className="form-note">No payout audit entries match the current filters.</p>
        ) : null}
      </div>
    </div>
  );
}
