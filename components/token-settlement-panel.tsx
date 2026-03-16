"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import type { AdminOverviewData } from "@/lib/types";

type TokenSettlementResponse = {
  ok: boolean;
  error?: string;
  queue?: AdminOverviewData["tokenSettlementQueue"];
};

export function TokenSettlementPanel({
  initialQueue,
  analytics,
}: {
  initialQueue: AdminOverviewData["tokenSettlementQueue"];
  analytics: AdminOverviewData["settlementAnalytics"];
}) {
  const router = useRouter();
  const [queue, setQueue] = useState(initialQueue);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [receiptDrafts, setReceiptDrafts] = useState<Record<string, string>>({});
  const [noteDrafts, setNoteDrafts] = useState<Record<string, string>>({});
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const annualReferralQueue = queue.filter((entry) => entry.source === "annual-referral-direct");
  const standardQueue = queue.filter((entry) => entry.source !== "annual-referral-direct");

  function exportSettlement(entry: AdminOverviewData["tokenSettlementQueue"][number]) {
    const lines = [
      "Emorya Settlement Receipt",
      `Payout ID: ${entry.id}`,
      `Recipient: ${entry.userDisplayName}`,
      `Email: ${entry.userEmail ?? "Not provided"}`,
      `Asset: ${entry.asset}`,
      `Asset name: ${entry.assetName ?? "Unknown asset"}`,
      `Program: ${entry.rewardProgramName ?? "Unassigned program"}`,
      `Token amount: ${entry.tokenAmount}`,
      `Eligibility points spent: ${entry.eligibilityPointsSpent}`,
      `Source: ${entry.source}`,
      `Created at: ${entry.createdAt}`,
      `Receipt reference: ${entry.receiptReference ?? "Not issued yet"}`,
      `Settlement note: ${entry.settlementNote ?? "None"}`,
    ].join("\n");
    const blob = new Blob([lines], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `emorya-settlement-${entry.id}.txt`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }

  async function settle(redemptionId: string) {
    const receiptReference = receiptDrafts[redemptionId]?.trim() ?? "";
    const settlementNote = noteDrafts[redemptionId]?.trim() ?? "";

    if (!receiptReference) {
      setError("Every settlement needs a receipt reference.");
      return;
    }

    setPendingId(redemptionId);
    setMessage(null);
    setError(null);

    try {
      const response = await fetch(`/api/admin/token-redemptions/${redemptionId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          receiptReference,
          settlementNote,
        }),
      });
      const result = (await response.json()) as TokenSettlementResponse;

      if (!response.ok || !result.ok || !result.queue) {
        setError(result.error ?? "Unable to settle token redemption.");
        return;
      }

      setQueue(result.queue);
      setMessage("Token redemption settled.");
      router.refresh();
    } catch {
      setError("Unable to reach the token settlement service.");
    } finally {
      setPendingId(null);
    }
  }

  return (
    <section className="panel panel--glass">
      <div className="panel__header">
        <div>
          <p className="eyebrow">Token settlement queue</p>
          <h3>Manually settle claimed redemptions with receipts</h3>
        </div>
        <span className="badge badge--pink">{queue.length} pending</span>
      </div>
      <p className="form-note">
        XP remains the main progression currency. This queue only handles the token layer once a redemption has been claimed.
      </p>
      {queue.length > 0 ? (
        <p className="form-note">
          {annualReferralQueue.length} direct annual-referral payouts and {standardQueue.length} standard redemptions are waiting for receipts.
        </p>
      ) : null}
      <div className="achievement-list">
        <article className="achievement-card">
          <div>
            <strong>7-day throughput</strong>
            <p>Settlement flow across the last seven days.</p>
          </div>
          <div className="achievement-card__side">
            <span>{analytics.settledLast7DaysCount} payouts</span>
            <span>{analytics.settledLast7DaysTokenAmount.toFixed(2)} tokens</span>
          </div>
        </article>
        {analytics.byAsset.slice(0, 3).map((asset) => (
          <article key={asset.asset} className="achievement-card">
            <div>
              <strong>{asset.asset}</strong>
              <p>Current payout mix for this token.</p>
            </div>
            <div className="achievement-card__side">
              <span>{asset.pendingCount} pending</span>
              <span>{asset.settledCount} settled</span>
            </div>
          </article>
        ))}
      </div>
      {message ? <p className="status status--success">{message}</p> : null}
      {error ? <p className="status status--error">{error}</p> : null}
      <div className="review-history__list">
        {queue.length === 0 ? (
          <p className="form-note">No claimed redemptions are waiting for settlement.</p>
        ) : (
          [...annualReferralQueue, ...standardQueue].map((entry) => (
            <article key={entry.id} className="review-history__item">
              <div className="quest-card__meta">
                <span>{entry.userDisplayName}</span>
                <span>{entry.source === "annual-referral-direct" ? "Annual referral payout" : entry.asset}</span>
              </div>
              <h4>
                {entry.tokenAmount} {entry.asset} pending
              </h4>
              <div className="review-history__meta">
                <span>{entry.eligibilityPointsSpent} points</span>
                <span>{entry.source}</span>
                {entry.rewardProgramName ? <span>{entry.rewardProgramName}</span> : null}
                <span>{new Date(entry.createdAt).toLocaleDateString()}</span>
              </div>
              <p className="form-note">
                {entry.userEmail ?? "No email"}
                {typeof entry.metadata.referee === "string" ? ` · referee ${entry.metadata.referee}` : ""}
                {typeof entry.metadata.campaignSource === "string" ? ` · ${entry.metadata.campaignSource}` : ""}
                {entry.rewardAssetId ? ` · asset registry linked` : ""}
                {entry.assetName ? ` · ${entry.assetName}` : ""}
                {entry.settlementNote ? ` · ${entry.settlementNote}` : ""}
              </p>
              <div className="profile-grid">
                <label className="field">
                  <span>Receipt reference</span>
                  <input
                    value={receiptDrafts[entry.id] ?? entry.receiptReference ?? ""}
                    onChange={(event) =>
                      setReceiptDrafts((current) => ({ ...current, [entry.id]: event.target.value }))
                    }
                  />
                </label>
                <label className="field">
                  <span>Settlement note</span>
                  <input
                    value={noteDrafts[entry.id] ?? entry.settlementNote ?? ""}
                    onChange={(event) =>
                      setNoteDrafts((current) => ({ ...current, [entry.id]: event.target.value }))
                    }
                  />
                </label>
              </div>
              <div className="review-bulk-actions">
                <button
                  className="button button--primary button--small"
                  type="button"
                  disabled={pendingId !== null}
                  onClick={() => settle(entry.id)}
                >
                  {pendingId === entry.id ? "Settling..." : "Mark settled"}
                </button>
                <button
                  className="button button--secondary button--small"
                  type="button"
                  disabled={pendingId !== null}
                  onClick={() => exportSettlement(entry)}
                >
                  Export
                </button>
              </div>
            </article>
          ))
        )}
      </div>
    </section>
  );
}
