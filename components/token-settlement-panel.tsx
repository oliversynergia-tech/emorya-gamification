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
  canProcessAndSettle,
}: {
  initialQueue: AdminOverviewData["tokenSettlementQueue"];
  analytics: AdminOverviewData["settlementAnalytics"];
  payoutControls: AdminOverviewData["economySettings"];
  canProcessAndSettle: boolean;
}) {
  const router = useRouter();
  const [queue, setQueue] = useState(initialQueue);
  const [analyticsState, setAnalyticsState] = useState(analytics);
  const [selectedWindow, setSelectedWindow] = useState(String(analytics.periodDays));
  const [compareWindow, setCompareWindow] = useState(String(analytics.comparePeriodDays));
  const [workflowFilter, setWorkflowFilter] = useState<"all" | "queued" | "approved" | "processing">("all");
  const [sourceFilter, setSourceFilter] = useState<"all" | string>("all");
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [analyticsPending, setAnalyticsPending] = useState(false);
  const [receiptDrafts, setReceiptDrafts] = useState<Record<string, string>>({});
  const [noteDrafts, setNoteDrafts] = useState<Record<string, string>>({});
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const annualReferralQueue = queue.filter((entry) => entry.source === "annual-referral-direct");
  const standardQueue = queue.filter((entry) => entry.source !== "annual-referral-direct");
  const queueSources = Array.from(new Set(queue.map((entry) => entry.source))).sort();
  const filteredQueue = [...annualReferralQueue, ...standardQueue].filter((entry) => {
    if (workflowFilter !== "all" && entry.workflowState !== workflowFilter) {
      return false;
    }

    if (sourceFilter !== "all" && entry.source !== sourceFilter) {
      return false;
    }

    return true;
  });

  function renderWorkflowTimeline(entry: AdminOverviewData["tokenSettlementQueue"][number]) {
    const steps = [
      { label: "Queued", detail: new Date(entry.createdAt).toLocaleString(), complete: true },
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

  async function transitionSettlement(action: "approve" | "processing" | "settle", redemptionId: string) {
    const receiptReference = receiptDrafts[redemptionId]?.trim() ?? "";
    const settlementNote = noteDrafts[redemptionId]?.trim() ?? "";

    if (action === "settle" && !receiptReference) {
      setError("Every settlement needs a receipt reference.");
      return;
    }

    if (!payoutControls.settlementProcessingEnabled) {
      setError("Settlement processing is currently disabled in payout controls.");
      return;
    }

    if ((action === "processing" || action === "settle") && !canProcessAndSettle) {
      setError("Only super admins can move payouts into processing or settle them.");
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
          action,
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
      setMessage(
        action === "approve"
          ? "Token redemption approved for payout."
          : action === "processing"
            ? "Token redemption moved into processing."
            : "Token redemption settled.",
      );
      router.refresh();
    } catch {
      setError("Unable to reach the token settlement service.");
    } finally {
      setPendingId(null);
    }
  }

  async function updateWindow(nextWindow: string, nextCompareWindow = compareWindow) {
    setSelectedWindow(nextWindow);
    setCompareWindow(nextCompareWindow);
    setAnalyticsPending(true);
    setError(null);

    try {
      const response = await fetch(
        `/api/admin/settlement-analytics?days=${nextWindow}&compareDays=${nextCompareWindow}`,
        { cache: "no-store" },
      );
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
      <p className="form-note">
        Approval can be handled by admins. Processing and settlement require <strong>super admin</strong> access.
      </p>
      <div className="review-bulk-actions">
        <label className="field">
          <span>Analytics window</span>
          <select value={selectedWindow} onChange={(event) => void updateWindow(event.target.value, compareWindow)}>
            <option value="7">7 days</option>
            <option value="30">30 days</option>
            <option value="90">90 days</option>
            <option value="180">180 days</option>
          </select>
        </label>
        <label className="field">
          <span>Compare against</span>
          <select value={compareWindow} onChange={(event) => void updateWindow(selectedWindow, event.target.value)}>
            <option value="7">7 days</option>
            <option value="30">30 days</option>
            <option value="90">90 days</option>
            <option value="180">180 days</option>
          </select>
        </label>
        <label className="field">
          <span>Workflow slice</span>
          <select value={workflowFilter} onChange={(event) => setWorkflowFilter(event.target.value as typeof workflowFilter)}>
            <option value="all">All pending states</option>
            <option value="queued">Queued only</option>
            <option value="approved">Approved only</option>
            <option value="processing">Processing only</option>
          </select>
        </label>
        <label className="field">
          <span>Queue source</span>
          <select value={sourceFilter} onChange={(event) => setSourceFilter(event.target.value)}>
            <option value="all">All sources</option>
            {queueSources.map((source) => (
              <option key={source} value={source}>
                {source}
              </option>
            ))}
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
        <article className="achievement-card">
          <div>
            <strong>Comparison window</strong>
            <p>
              Compared against the previous {analyticsState.comparePeriodDays}-day period, throughput moved by{" "}
              {analyticsState.settledCountDelta >= 0 ? "+" : ""}
              {analyticsState.settledCountDelta} payouts and {analyticsState.velocityDelta >= 0 ? "+" : ""}
              {analyticsState.velocityDelta.toFixed(2)} payouts/day.
            </p>
          </div>
          <div className="achievement-card__side">
            <span>{analyticsState.previousSettledCount} previous payouts</span>
            <span>{analyticsState.previousSettledTokenAmount.toFixed(2)} tokens</span>
          </div>
        </article>
        {analyticsState.workflowBreakdown.map((entry) => (
          <article key={entry.state} className="achievement-card">
            <div>
              <strong>{entry.state}</strong>
              <p>Current workflow-state count across the payout pipeline.</p>
            </div>
            <div className="achievement-card__side">
              <span>{entry.count} items</span>
            </div>
          </article>
        ))}
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
      {queue.length > 0 ? (
        <div className="achievement-list">
          <article className="achievement-card">
            <div>
              <strong>Payout workflow permissions</strong>
              <p>Queued payouts can be approved by admins, but only super admins can move them into processing or settle with receipts.</p>
            </div>
            <div className="achievement-card__side">
              <span>Approve: admin</span>
              <span>Process / settle: super_admin</span>
            </div>
          </article>
        </div>
      ) : null}
      <div className="review-history__list">
        {queue.length === 0 ? (
          <p className="form-note">No claimed redemptions are waiting for settlement.</p>
        ) : filteredQueue.length === 0 ? (
          <p className="form-note">No payouts match the current workflow and source filters.</p>
        ) : (
          filteredQueue.map((entry) => (
            <article key={entry.id} className="review-history__item">
              <div className="quest-card__meta">
                <span>{entry.userDisplayName}</span>
                <span>
                  {entry.source === "annual-referral-direct" ? "Annual referral payout" : entry.asset} · {entry.workflowState}
                </span>
              </div>
              <h4>
                {entry.tokenAmount} {entry.asset} pending
              </h4>
              <div className="review-history__meta">
                <span>{entry.eligibilityPointsSpent} points</span>
                <span>{entry.source}</span>
                {entry.rewardProgramName ? <span>{entry.rewardProgramName}</span> : null}
                {entry.approvedByDisplayName ? <span>approved by {entry.approvedByDisplayName}</span> : null}
                {entry.processingByDisplayName ? <span>processing by {entry.processingByDisplayName}</span> : null}
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
              {renderWorkflowTimeline(entry)}
              <div className="review-bulk-actions">
                <button
                  className="button button--primary button--small"
                  type="button"
                  disabled={
                    pendingId !== null ||
                    !payoutControls.settlementProcessingEnabled ||
                    (((entry.workflowState === "approved" && payoutControls.payoutMode === "automation_ready") ||
                      (entry.workflowState !== "queued" && entry.workflowState !== "settled") ||
                      (entry.workflowState === "queued" && payoutControls.payoutMode === "manual")) &&
                      !canProcessAndSettle)
                  }
                  onClick={() =>
                    transitionSettlement(
                      entry.workflowState === "queued" && payoutControls.payoutMode !== "manual"
                        ? "approve"
                        : entry.workflowState === "approved" && payoutControls.payoutMode === "automation_ready"
                          ? "processing"
                          : "settle",
                      entry.id,
                    )
                  }
                >
                  {pendingId === entry.id
                    ? "Updating..."
                    : entry.workflowState === "queued" && payoutControls.payoutMode !== "manual"
                      ? "Approve payout"
                      : entry.workflowState === "approved" && payoutControls.payoutMode === "automation_ready"
                        ? "Mark processing"
                        : "Mark settled"}
                </button>
                {entry.workflowState !== "queued" && entry.workflowState !== "settled" ? (
                  <button
                    className="button button--secondary button--small"
                    type="button"
                    disabled={pendingId !== null || !payoutControls.settlementProcessingEnabled || !canProcessAndSettle}
                    onClick={() => transitionSettlement("settle", entry.id)}
                  >
                    Force settle
                  </button>
                ) : null}
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
