"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import type { AdminOverviewData } from "@/lib/types";

type TokenSettlementResponse = {
  ok: boolean;
  error?: string;
  queue?: AdminOverviewData["tokenSettlementQueue"];
};

type SettlementAnalyticsResponse = {
  ok: boolean;
  error?: string;
  analytics?: AdminOverviewData["settlementAnalytics"];
};

export function TokenSettlementPanel({
  initialQueue,
  analytics,
  payoutControls,
}: {
  initialQueue: AdminOverviewData["tokenSettlementQueue"];
  analytics: AdminOverviewData["settlementAnalytics"];
  payoutControls: AdminOverviewData["economySettings"];
}) {
  const router = useRouter();
  const [queue, setQueue] = useState(initialQueue);
  const [analyticsState, setAnalyticsState] = useState(analytics);
  const [selectedWindow, setSelectedWindow] = useState(String(analytics.periodDays));
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [analyticsPending, setAnalyticsPending] = useState(false);
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

    if (!payoutControls.settlementProcessingEnabled) {
      setError("Settlement processing is currently disabled in payout controls.");
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

  async function updateWindow(nextWindow: string) {
    setSelectedWindow(nextWindow);
    setAnalyticsPending(true);
    setError(null);

    try {
      const response = await fetch(`/api/admin/settlement-analytics?days=${nextWindow}`, { cache: "no-store" });
      const result = (await response.json()) as SettlementAnalyticsResponse;

      if (!response.ok || !result.ok || !result.analytics) {
        setError(result.error ?? "Unable to refresh settlement analytics.");
        return;
      }

      setAnalyticsState(result.analytics);
    } catch {
      setError("Unable to refresh settlement analytics.");
    } finally {
      setAnalyticsPending(false);
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
      <p className="form-note">
        Payout mode <strong>{payoutControls.payoutMode}</strong> · settlement processing{" "}
        <strong>{payoutControls.settlementProcessingEnabled ? "enabled" : "disabled"}</strong> · direct reward queue{" "}
        <strong>{payoutControls.directRewardQueueEnabled ? "enabled" : "disabled"}</strong>
      </p>
      <div className="review-bulk-actions">
        <label className="field">
          <span>Analytics window</span>
          <select value={selectedWindow} onChange={(event) => void updateWindow(event.target.value)}>
            <option value="7">7 days</option>
            <option value="30">30 days</option>
            <option value="90">90 days</option>
          </select>
        </label>
      </div>
      <div className="achievement-list">
        <article className="achievement-card">
          <div>
            <strong>{analyticsState.periodDays}-day throughput</strong>
            <p>Settlement flow across the selected analytics window.</p>
          </div>
          <div className="achievement-card__side">
            <span>{analyticsState.settledLast7DaysCount} payouts</span>
            <span>{analyticsState.settledLast7DaysTokenAmount.toFixed(2)} tokens</span>
          </div>
        </article>
        {analyticsState.byAsset.slice(0, 3).map((asset) => (
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
      {analyticsPending ? <p className="form-note">Refreshing analytics…</p> : null}
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
                  disabled={pendingId !== null || !payoutControls.settlementProcessingEnabled}
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
