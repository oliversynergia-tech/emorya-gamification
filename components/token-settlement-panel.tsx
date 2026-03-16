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
}: {
  initialQueue: AdminOverviewData["tokenSettlementQueue"];
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
              </div>
            </article>
          ))
        )}
      </div>
    </section>
  );
}
