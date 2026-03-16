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
            </div>
            <div className="achievement-card__side">
              <span>{new Date(latestEntry.createdAt).toLocaleDateString()}</span>
              <span>{latestEntry.status}</span>
              <button className="button button--secondary button--small" type="button" onClick={() => downloadReceipt(latestEntry)}>
                Download receipt
              </button>
            </div>
          </article>
          <div className="achievement-list">
            {history.map((entry) => (
              <article key={entry.id} className="achievement-card">
                <div>
                  <strong>
                    {entry.tokenAmount} {entry.asset}
                  </strong>
                  <p>
                    {entry.status === "settled" && entry.settledAt
                      ? `Settled ${new Date(entry.settledAt).toLocaleDateString()}`
                      : "Claimed and awaiting settlement"}
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
