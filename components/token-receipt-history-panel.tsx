"use client";

import { useMemo, useState } from "react";

import { EmptyState } from "@/components/empty-state";
import { emptyStates } from "@/lib/empty-state-content";
import type { DashboardData } from "@/lib/types";

function getWorkflowTone(
  state: DashboardData["user"]["tokenProgram"]["redemptionHistory"][number]["workflowState"],
) {
  switch (state) {
    case "settled":
      return "success";
    case "processing":
      return "warning";
    case "approved":
      return "info";
    default:
      return "default";
  }
}

function downloadReceipt(entry: DashboardData["user"]["tokenProgram"]["redemptionHistory"][number]) {
  const lines = [
    "Emorya Reward Receipt",
    `Receipt ID: ${entry.id}`,
    `Status: ${entry.status}`,
    `Asset: ${entry.asset}`,
    `Amount: ${entry.tokenAmount}`,
    `Source: ${entry.source}`,
    `Reward program: ${entry.rewardProgramName ?? "Unassigned program"}`,
    `Eligibility points spent: ${entry.eligibilityPointsSpent}`,
    `Created at: ${entry.createdAt}`,
    `Settled at: ${entry.settledAt ?? "Pending"}`,
    `Receipt reference: ${entry.receiptReference ?? "Not issued yet"}`,
    `Settlement note: ${entry.settlementNote ?? "None"}`,
    `Settled by: ${entry.settledByDisplayName ?? "Not settled yet"}`,
  ].join("\n");

  const blob = new Blob([lines], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `emorya-receipt-${entry.id}.txt`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

export function TokenReceiptHistoryPanel({
  history,
  title,
  eyebrow,
}: {
  history: DashboardData["user"]["tokenProgram"]["redemptionHistory"];
  title: string;
  eyebrow: string;
}) {
  const [selectedReceiptId, setSelectedReceiptId] = useState<string | null>(history[0]?.id ?? null);
  const selectedEntry = useMemo(
    () => history.find((entry) => entry.id === selectedReceiptId) ?? history[0] ?? null,
    [history, selectedReceiptId],
  );

  function renderTimeline(
    entry: DashboardData["user"]["tokenProgram"]["redemptionHistory"][number],
  ) {
    const steps = [
      { label: "Claimed", detail: new Date(entry.createdAt).toLocaleString(), complete: true },
      {
        label: "Approved",
        detail: entry.approvedAt
          ? `${new Date(entry.approvedAt).toLocaleString()}${entry.approvedByDisplayName ? ` · ${entry.approvedByDisplayName}` : ""}`
          : "Waiting for approval",
        complete: entry.workflowState === "approved" || entry.workflowState === "processing" || entry.workflowState === "settled",
      },
      {
        label: "Processing",
        detail: entry.processingStartedAt
          ? `${new Date(entry.processingStartedAt).toLocaleString()}${entry.processingByDisplayName ? ` · ${entry.processingByDisplayName}` : ""}`
          : "Waiting for processing",
        complete: entry.workflowState === "processing" || entry.workflowState === "settled",
      },
      {
        label: "Settled",
        detail: entry.settledAt
          ? `${new Date(entry.settledAt).toLocaleString()}${entry.receiptReference ? ` · receipt ${entry.receiptReference}` : ""}`
          : "Waiting for settlement",
        complete: entry.workflowState === "settled",
      },
    ];

    return (
      <div className="reward-timeline">
        {steps.map((step) => (
          <article
            key={`${entry.id}-${step.label}`}
            className={`reward-timeline__step ${step.complete ? "reward-timeline__step--complete" : ""} ${
              step.label === "Settled" && entry.workflowState === "settled"
                ? "reward-timeline__step--active"
                : step.label === "Processing" && entry.workflowState === "processing"
                  ? "reward-timeline__step--active"
                  : step.label === "Approved" && entry.workflowState === "approved"
                    ? "reward-timeline__step--active"
                    : step.label === "Claimed" && entry.workflowState === "queued"
                      ? "reward-timeline__step--active"
                      : ""
            }`}
          >
            <div>
              <strong>{step.label}</strong>
              <p>{step.detail}</p>
            </div>
            <span className={step.complete ? "badge badge--pink" : "badge"}>{step.complete ? "Done" : "Pending"}</span>
          </article>
        ))}
      </div>
    );
  }

  return (
    <div className="panel panel--glass">
      <div className="panel__header">
        <div>
          <p className="eyebrow">{eyebrow}</p>
          <h3>{title}</h3>
        </div>
        <span className="badge">{history.length} receipts</span>
      </div>
      {selectedEntry ? (
        <div className="receipt-detail">
          <article className="achievement-card achievement-card--unlocked reward-receipt-card">
            <div>
              <div className="reward-receipt-card__meta">
                <span className={`badge ${getWorkflowTone(selectedEntry.workflowState) === "success" ? "badge--pink" : ""}`}>
                  {selectedEntry.workflowState}
                </span>
                <span className="badge">{selectedEntry.asset}</span>
                {selectedEntry.rewardProgramName ? <span className="badge">{selectedEntry.rewardProgramName}</span> : null}
                <span className="badge">{selectedEntry.source}</span>
              </div>
              <strong>{selectedEntry.status === "settled" ? "Selected settled payout" : "Selected claimed payout"}</strong>
              <p>
                {selectedEntry.tokenAmount} {selectedEntry.asset} from {selectedEntry.source}.
                {selectedEntry.rewardProgramName ? ` ${selectedEntry.rewardProgramName}.` : ""}
                {selectedEntry.receiptReference ? ` Receipt ${selectedEntry.receiptReference}.` : ""}
              </p>
              {selectedEntry.settlementNote ? <p>{selectedEntry.settlementNote}</p> : null}
              <p>Workflow state: {selectedEntry.workflowState.replaceAll("_", " ")}.</p>
            </div>
            <div className="achievement-card__side">
              <span>{new Date(selectedEntry.createdAt).toLocaleDateString()}</span>
              <span>{selectedEntry.status}</span>
              <button className="button button--secondary button--small" type="button" onClick={() => downloadReceipt(selectedEntry)}>
                Download receipt
              </button>
            </div>
          </article>
          <div className="reward-summary-grid">
            <div className="info-card reward-summary-card">
              <span>Payout amount</span>
              <strong>
                {selectedEntry.tokenAmount} {selectedEntry.asset}
              </strong>
            </div>
            <div className="info-card reward-summary-card">
              <span>Eligibility spent</span>
              <strong>{selectedEntry.eligibilityPointsSpent} pts</strong>
            </div>
            <div className="info-card reward-summary-card">
              <span>Payout state</span>
              <strong>{selectedEntry.workflowState.replaceAll("_", " ")}</strong>
            </div>
            <div className="info-card reward-summary-card">
              <span>Reward program</span>
              <strong>{selectedEntry.rewardProgramName ?? "Unassigned"}</strong>
            </div>
            <div className="info-card reward-summary-card">
              <span>Source</span>
              <strong>{selectedEntry.source}</strong>
            </div>
            <div className="info-card reward-summary-card">
              <span>Approved by</span>
              <strong>{selectedEntry.approvedByDisplayName ?? "Pending"}</strong>
            </div>
            <div className="info-card reward-summary-card">
              <span>Processing by</span>
              <strong>{selectedEntry.processingByDisplayName ?? "Pending"}</strong>
            </div>
            <div className="info-card reward-summary-card">
              <span>Settled by</span>
              <strong>{selectedEntry.settledByDisplayName ?? "Pending"}</strong>
            </div>
            <div className="info-card reward-summary-card">
              <span>Receipt reference</span>
              <strong>{selectedEntry.receiptReference ?? "Not issued"}</strong>
            </div>
          </div>
          {renderTimeline(selectedEntry)}
          <div className="achievement-list">
            {history.map((entry) => (
              <article
                key={entry.id}
                className={`achievement-card reward-history-card ${selectedEntry.id === entry.id ? "achievement-card--unlocked" : ""}`}
              >
                <div>
                  <strong>
                    {entry.tokenAmount} {entry.asset}
                  </strong>
                  <p>
                    {entry.workflowState === "settled" && entry.settledAt
                      ? `Settled ${new Date(entry.settledAt).toLocaleDateString()}`
                      : entry.workflowState === "processing"
                        ? "Processing payout"
                        : entry.workflowState === "approved"
                          ? "Approved and waiting for processing"
                          : "Claimed and awaiting approval"}
                    {entry.rewardProgramName ? ` · ${entry.rewardProgramName}` : ""}
                    {entry.settledByDisplayName ? ` · ${entry.settledByDisplayName}` : ""}
                  </p>
                </div>
                <div className="achievement-card__side">
                  <span className="badge">{entry.workflowState}</span>
                  <span>{entry.receiptReference ?? "No receipt yet"}</span>
                  <span>{entry.eligibilityPointsSpent} pts</span>
                  <button
                    className="button button--secondary button--small"
                    type="button"
                    onClick={() => setSelectedReceiptId(entry.id)}
                  >
                    View detail
                  </button>
                  <button
                    className="button button--secondary button--small"
                    type="button"
                    onClick={() => downloadReceipt(entry)}
                  >
                    Export
                  </button>
                </div>
              </article>
            ))}
          </div>
        </div>
      ) : (
        <EmptyState {...emptyStates.tokenRedemptionsNone} />
      )}
    </div>
  );
}
