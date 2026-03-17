"use client";

import type { DashboardData } from "@/lib/types";

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
  const latestEntry = history[0] ?? null;

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
      <div className="achievement-list">
        {steps.map((step) => (
          <article key={`${entry.id}-${step.label}`} className="achievement-card">
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
      {latestEntry ? (
        <div className="receipt-detail">
          <article className="achievement-card achievement-card--unlocked">
            <div>
              <strong>{latestEntry.status === "settled" ? "Latest settled payout" : "Latest claimed payout"}</strong>
              <p>
                {latestEntry.tokenAmount} {latestEntry.asset} from {latestEntry.source}.
                {latestEntry.rewardProgramName ? ` ${latestEntry.rewardProgramName}.` : ""}
                {latestEntry.receiptReference ? ` Receipt ${latestEntry.receiptReference}.` : ""}
              </p>
              {latestEntry.settlementNote ? <p>{latestEntry.settlementNote}</p> : null}
              <p>Workflow state: {latestEntry.workflowState}</p>
            </div>
            <div className="achievement-card__side">
              <span>{new Date(latestEntry.createdAt).toLocaleDateString()}</span>
              <span>{latestEntry.status}</span>
              <button className="button button--secondary button--small" type="button" onClick={() => downloadReceipt(latestEntry)}>
                Download receipt
              </button>
            </div>
          </article>
          {renderTimeline(latestEntry)}
          <div className="achievement-list">
            {history.map((entry) => (
              <article key={entry.id} className="achievement-card">
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
                  <span>{entry.receiptReference ?? "No receipt yet"}</span>
                  <span>{entry.eligibilityPointsSpent} pts</span>
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
        <p className="form-note">
          No payout receipts yet. Claimed and settled token history will appear here as the token layer activates.
        </p>
      )}
    </div>
  );
}
