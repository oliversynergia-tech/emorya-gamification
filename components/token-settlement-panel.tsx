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
  permissions,
}: {
  initialQueue: AdminOverviewData["tokenSettlementQueue"];
  analytics: AdminOverviewData["settlementAnalytics"];
  payoutControls: AdminOverviewData["economySettings"];
  permissions: {
    canApprove: boolean;
    canHold: boolean;
    canRequeue: boolean;
    canFail: boolean;
    canCancel: boolean;
    canProcess: boolean;
    canSettle: boolean;
    canManageAutomationMetadata: boolean;
  };
}) {
  const router = useRouter();
  const [queue, setQueue] = useState(initialQueue);
  const [analyticsState, setAnalyticsState] = useState(analytics);
  const [selectedWindow, setSelectedWindow] = useState(String(analytics.periodDays));
  const [compareWindow, setCompareWindow] = useState(String(analytics.comparePeriodDays));
  const [rangeMode, setRangeMode] = useState<"preset" | "custom">("preset");
  const [customStartDate, setCustomStartDate] = useState("");
  const [customEndDate, setCustomEndDate] = useState("");
  const [customCompareStartDate, setCustomCompareStartDate] = useState("");
  const [customCompareEndDate, setCustomCompareEndDate] = useState("");
  const [workflowFilter, setWorkflowFilter] = useState<"all" | "queued" | "approved" | "processing" | "held" | "failed" | "cancelled">("all");
  const [sourceFilter, setSourceFilter] = useState<"all" | string>("all");
  const [assetFilter, setAssetFilter] = useState<"all" | string>("all");
  const [programFilter, setProgramFilter] = useState<"all" | string>("all");
  const [updatedSinceDays, setUpdatedSinceDays] = useState<"all" | "1" | "7" | "30" | "90">("all");
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [analyticsPending, setAnalyticsPending] = useState(false);
  const [receiptDrafts, setReceiptDrafts] = useState<Record<string, string>>({});
  const [noteDrafts, setNoteDrafts] = useState<Record<string, string>>({});
  const [automationReceiptDrafts, setAutomationReceiptDrafts] = useState<Record<string, string>>({});
  const [automationNoteDrafts, setAutomationNoteDrafts] = useState<Record<string, string>>({});
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const annualReferralQueue = queue.filter((entry) => entry.source === "annual-referral-direct");
  const standardQueue = queue.filter((entry) => entry.source !== "annual-referral-direct");
  const queueSources = Array.from(new Set(queue.map((entry) => entry.source))).sort();
  const queueAssets = Array.from(new Set(queue.map((entry) => entry.asset))).sort();
  const queuePrograms = Array.from(new Set(queue.map((entry) => entry.rewardProgramName).filter(Boolean) as string[])).sort();
  const filteredQueue = [...annualReferralQueue, ...standardQueue].filter((entry) => {
    if (workflowFilter !== "all" && entry.workflowState !== workflowFilter) {
      return false;
    }

    if (sourceFilter !== "all" && entry.source !== sourceFilter) {
      return false;
    }

    if (assetFilter !== "all" && entry.asset !== assetFilter) {
      return false;
    }

    if (programFilter !== "all" && (entry.rewardProgramName ?? "unassigned") !== programFilter) {
      return false;
    }

    if (updatedSinceDays !== "all") {
      const cutoff = Date.now() - Number(updatedSinceDays) * 86400000;
      if (new Date(entry.updatedAt).getTime() < cutoff) {
        return false;
      }
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

    const exceptionalState =
      entry.workflowState === "held"
        ? {
            label: "On hold",
            detail: entry.heldAt
              ? `${new Date(entry.heldAt).toLocaleString()}${entry.heldByDisplayName ? ` · ${entry.heldByDisplayName}` : ""}${entry.holdReason ? ` · ${entry.holdReason}` : ""}`
              : "Temporarily paused",
          }
        : entry.workflowState === "failed"
          ? {
              label: "Failed",
              detail: entry.failedAt
                ? `${new Date(entry.failedAt).toLocaleString()}${entry.failedByDisplayName ? ` · ${entry.failedByDisplayName}` : ""}${entry.lastError ? ` · ${entry.lastError}` : ""}`
                : "Automation or processing failed",
            }
          : entry.workflowState === "cancelled"
            ? {
                label: "Cancelled",
                detail: entry.cancelledAt
                  ? `${new Date(entry.cancelledAt).toLocaleString()}${entry.cancelledByDisplayName ? ` · ${entry.cancelledByDisplayName}` : ""}${entry.cancellationReason ? ` · ${entry.cancellationReason}` : ""}`
                  : "Payout removed from the active flow",
              }
            : null;

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
        {exceptionalState ? (
          <article className="achievement-card">
            <div>
              <strong>{exceptionalState.label}</strong>
              <p>{exceptionalState.detail}</p>
            </div>
            <span className="badge">{entry.workflowState}</span>
          </article>
        ) : null}
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

  async function transitionSettlement(
    action: "approve" | "processing" | "settle" | "hold" | "fail" | "requeue" | "cancel",
    redemptionId: string,
  ) {
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

    const actionAllowed =
      (action === "approve" && permissions.canApprove) ||
      (action === "hold" && permissions.canHold) ||
      (action === "requeue" && permissions.canRequeue) ||
      (action === "fail" && permissions.canFail) ||
      (action === "cancel" && permissions.canCancel) ||
      (action === "processing" && permissions.canProcess) ||
      (action === "settle" && permissions.canSettle);

    if (!actionAllowed) {
      setError("Your current admin role does not allow that payout transition.");
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

  async function saveAutomationMetadata(redemptionId: string) {
    if (!permissions.canManageAutomationMetadata) {
      setError("Only super admins can manage automation receipt metadata.");
      return;
    }

    const automationReceiptReference = automationReceiptDrafts[redemptionId]?.trim() ?? "";
    const automationSettlementNote = automationNoteDrafts[redemptionId]?.trim() ?? "";

    if (!automationReceiptReference) {
      setError("Automation receipt reference is required before auto-settlement can complete.");
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
          automationReceiptReference,
          automationSettlementNote,
        }),
      });
      const result = (await response.json()) as TokenSettlementResponse;

      if (!response.ok || !result.ok || !result.queue) {
        setError(result.error ?? "Unable to save automation settlement metadata.");
        return;
      }

      setQueue(result.queue);
      setMessage("Automation receipt metadata saved.");
      router.refresh();
    } catch {
      setError("Unable to reach the token settlement service.");
    } finally {
      setPendingId(null);
    }
  }

  async function generateAutomationReceipt(redemptionId: string) {
    if (!permissions.canManageAutomationMetadata) {
      setError("Only super admins can generate automation receipt metadata.");
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
          generateAutomationReceiptReference: true,
          automationSettlementNote: automationNoteDrafts[redemptionId]?.trim() ?? undefined,
        }),
      });
      const result = (await response.json()) as TokenSettlementResponse;

      if (!response.ok || !result.ok || !result.queue) {
        setError(result.error ?? "Unable to generate automation receipt metadata.");
        return;
      }

      setQueue(result.queue);
      setMessage("Automation receipt reference generated.");
      router.refresh();
    } catch {
      setError("Unable to reach the token settlement service.");
    } finally {
      setPendingId(null);
    }
  }

  function exportFilteredQueue() {
    const lines = [
      [
        "id",
        "user",
        "email",
        "asset",
        "program",
        "source",
        "workflow_state",
        "token_amount",
        "eligibility_points_spent",
        "retry_count",
        "created_at",
        "updated_at",
        "receipt_reference",
        "settlement_note",
        "last_error",
      ].join(","),
      ...filteredQueue.map((entry) =>
        [
          entry.id,
          JSON.stringify(entry.userDisplayName),
          JSON.stringify(entry.userEmail ?? ""),
          entry.asset,
          JSON.stringify(entry.rewardProgramName ?? "unassigned"),
          entry.source,
          entry.workflowState,
          entry.tokenAmount,
          entry.eligibilityPointsSpent,
          entry.retryCount,
          entry.createdAt,
          entry.updatedAt,
          JSON.stringify(entry.receiptReference ?? ""),
          JSON.stringify(entry.settlementNote ?? ""),
          JSON.stringify(entry.lastError ?? ""),
        ].join(","),
      ),
    ].join("\n");

    const blob = new Blob([lines], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "emorya-payout-exceptions.csv";
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }

  function getPrimaryAction(entry: AdminOverviewData["tokenSettlementQueue"][number]) {
    if (entry.workflowState === "queued" && payoutControls.payoutMode !== "manual") {
      return "approve" as const;
    }

    if (entry.workflowState === "approved" && payoutControls.payoutMode !== "manual") {
      return "processing" as const;
    }

    return "settle" as const;
  }

  function canRunPrimaryAction(action: ReturnType<typeof getPrimaryAction>) {
    if (action === "approve") {
      return permissions.canApprove;
    }
    if (action === "processing") {
      return permissions.canProcess;
    }

    return permissions.canSettle;
  }

  async function updateWindow(nextWindow: string, nextCompareWindow = compareWindow) {
    setRangeMode("preset");
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

  async function updateCustomRange() {
    if (!customStartDate || !customEndDate) {
      setError("Choose both a custom start and end date.");
      return;
    }

    setRangeMode("custom");
    setAnalyticsPending(true);
    setError(null);

    try {
      const params = new URLSearchParams({
        startDate: customStartDate,
        endDate: customEndDate,
      });
      if (customCompareStartDate && customCompareEndDate) {
        params.set("compareStartDate", customCompareStartDate);
        params.set("compareEndDate", customCompareEndDate);
      }
      const response = await fetch(`/api/admin/settlement-analytics?${params.toString()}`, {
        cache: "no-store",
      });
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
        Approval, holds, and requeues can be handled by admins. Fails, cancels, processing, settlement, and automation metadata require <strong>super admin</strong> access.
      </p>
      <p className="form-note">
        In <strong>automation_ready</strong> mode, auto-settlement only completes after each payout stores
        <code> metadata.automationReceiptReference </code>
        and, optionally, <code>metadata.automationSettlementNote</code>. You can attach those values from this queue.
      </p>
      <div className="review-bulk-actions">
        <label className="field">
          <span>Analytics window</span>
          <select
            value={rangeMode === "custom" ? "custom" : selectedWindow}
            onChange={(event) => {
              if (event.target.value === "custom") {
                setRangeMode("custom");
                return;
              }
              void updateWindow(event.target.value, compareWindow);
            }}
          >
            <option value="7">7 days</option>
            <option value="30">30 days</option>
            <option value="90">90 days</option>
            <option value="180">180 days</option>
            <option value="365">365 days</option>
            <option value="custom">Custom range</option>
          </select>
        </label>
        <label className="field">
          <span>Compare against</span>
          <select value={compareWindow} onChange={(event) => void updateWindow(selectedWindow, event.target.value)}>
            <option value="7">7 days</option>
            <option value="30">30 days</option>
            <option value="90">90 days</option>
            <option value="180">180 days</option>
            <option value="365">365 days</option>
          </select>
        </label>
        <label className="field">
          <span>Workflow slice</span>
          <select value={workflowFilter} onChange={(event) => setWorkflowFilter(event.target.value as typeof workflowFilter)}>
            <option value="all">All pending states</option>
            <option value="queued">Queued only</option>
            <option value="approved">Approved only</option>
            <option value="processing">Processing only</option>
            <option value="held">Held only</option>
            <option value="failed">Failed only</option>
            <option value="cancelled">Cancelled only</option>
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
        <label className="field">
          <span>Asset</span>
          <select value={assetFilter} onChange={(event) => setAssetFilter(event.target.value)}>
            <option value="all">All assets</option>
            {queueAssets.map((asset) => (
              <option key={asset} value={asset}>
                {asset}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          <span>Program</span>
          <select value={programFilter} onChange={(event) => setProgramFilter(event.target.value)}>
            <option value="all">All programs</option>
            <option value="unassigned">Unassigned</option>
            {queuePrograms.map((program) => (
              <option key={program} value={program}>
                {program}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          <span>Updated within</span>
          <select value={updatedSinceDays} onChange={(event) => setUpdatedSinceDays(event.target.value as typeof updatedSinceDays)}>
            <option value="all">Any time</option>
            <option value="1">1 day</option>
            <option value="7">7 days</option>
            <option value="30">30 days</option>
            <option value="90">90 days</option>
          </select>
        </label>
        <button className="button button--secondary" type="button" onClick={exportFilteredQueue}>
          Export filtered queue
        </button>
      </div>
      {rangeMode === "custom" ? (
        <div className="profile-grid">
          <label className="field">
            <span>Start date</span>
            <input type="date" value={customStartDate} onChange={(event) => setCustomStartDate(event.target.value)} />
          </label>
          <label className="field">
            <span>End date</span>
            <input type="date" value={customEndDate} onChange={(event) => setCustomEndDate(event.target.value)} />
          </label>
          <label className="field">
            <span>Compare start</span>
            <input type="date" value={customCompareStartDate} onChange={(event) => setCustomCompareStartDate(event.target.value)} />
          </label>
          <label className="field">
            <span>Compare end</span>
            <input type="date" value={customCompareEndDate} onChange={(event) => setCustomCompareEndDate(event.target.value)} />
          </label>
          <button className="button button--secondary" type="button" disabled={analyticsPending} onClick={() => void updateCustomRange()}>
            {analyticsPending ? "Refreshing..." : "Apply custom range"}
          </button>
        </div>
      ) : null}
      <p className="form-note">
        Current period: {analyticsState.periodLabel}. Compared against {analyticsState.comparePeriodLabel}.
      </p>
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
      {message ? <p className="status status--success" role="status" aria-live="polite">{message}</p> : null}
      {error ? <p className="status status--error" role="alert">{error}</p> : null}
      {queue.length > 0 ? (
        <div className="achievement-list">
          <article className="achievement-card">
            <div>
              <strong>Payout workflow permissions</strong>
              <p>Permissions are now split more deliberately so review actions stay with admins while irreversible payout actions stay with super admins.</p>
            </div>
            <div className="achievement-card__side">
              <span>Approve: admin</span>
              <span>Hold / requeue: admin</span>
              <span>Fail / cancel / process / settle: super_admin</span>
            </div>
          </article>
        </div>
      ) : null}
      <div className="review-history__list">
        {queue.length === 0 ? (
          <p className="form-note">No claimed redemptions are waiting for settlement.</p>
        ) : filteredQueue.length === 0 ? (
          <p className="form-note">No payouts match the current workflow, source, asset, program, and date filters.</p>
        ) : (
          filteredQueue.map((entry) => (
            (() => {
              const primaryAction = getPrimaryAction(entry);
              const canRunAction = canRunPrimaryAction(primaryAction);

              return (
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
                {entry.retryCount > 0 ? <span>{entry.retryCount} retries</span> : null}
                <span>{new Date(entry.createdAt).toLocaleDateString()}</span>
              </div>
              <p className="form-note">
                {entry.userEmail ?? "No email"}
                {typeof entry.metadata.referee === "string" ? ` · referee ${entry.metadata.referee}` : ""}
                {typeof entry.metadata.campaignSource === "string" ? ` · ${entry.metadata.campaignSource}` : ""}
                {entry.rewardAssetId ? ` · asset registry linked` : ""}
                {entry.assetName ? ` · ${entry.assetName}` : ""}
                {entry.holdReason ? ` · hold ${entry.holdReason}` : ""}
                {entry.lastError ? ` · error ${entry.lastError}` : ""}
                {entry.cancellationReason ? ` · cancelled ${entry.cancellationReason}` : ""}
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
                <label className="field">
                  <span>Automation receipt</span>
                  <input
                    value={
                      automationReceiptDrafts[entry.id] ??
                      (typeof entry.metadata.automationReceiptReference === "string"
                        ? entry.metadata.automationReceiptReference
                        : "")
                    }
                    onChange={(event) =>
                      setAutomationReceiptDrafts((current) => ({ ...current, [entry.id]: event.target.value }))
                    }
                  />
                </label>
                <label className="field">
                  <span>Automation note</span>
                  <input
                    value={
                      automationNoteDrafts[entry.id] ??
                      (typeof entry.metadata.automationSettlementNote === "string"
                        ? entry.metadata.automationSettlementNote
                        : "")
                    }
                    onChange={(event) =>
                      setAutomationNoteDrafts((current) => ({ ...current, [entry.id]: event.target.value }))
                    }
                  />
                </label>
              </div>
              {payoutControls.payoutMode === "automation_ready" ? (
                <p className="form-note">
                  Auto-settlement can use a saved automation receipt reference from this queue, or generate one automatically before settlement.
                </p>
              ) : null}
              {renderWorkflowTimeline(entry)}
              <div className="review-bulk-actions">
                <button
                  className="button button--secondary button--small"
                  type="button"
                  disabled={pendingId !== null || !permissions.canManageAutomationMetadata}
                  onClick={() => void saveAutomationMetadata(entry.id)}
                >
                  Save automation metadata
                </button>
                <button
                  className="button button--secondary button--small"
                  type="button"
                  disabled={pendingId !== null || !permissions.canManageAutomationMetadata}
                  onClick={() => void generateAutomationReceipt(entry.id)}
                >
                  Generate auto receipt
                </button>
                <button
                  className="button button--primary button--small"
                  type="button"
                  disabled={
                    pendingId !== null ||
                    !payoutControls.settlementProcessingEnabled ||
                    !["queued", "approved", "processing"].includes(entry.workflowState) ||
                    !canRunAction
                  }
                  onClick={() => transitionSettlement(primaryAction, entry.id)}
                >
                  {pendingId === entry.id
                    ? "Updating..."
                    : primaryAction === "approve"
                      ? "Approve payout"
                      : primaryAction === "processing"
                        ? "Mark processing"
                        : "Mark settled"}
                </button>
                {entry.workflowState !== "queued" && entry.workflowState !== "settled" ? (
                  <button
                    className="button button--secondary button--small"
                    type="button"
                    disabled={pendingId !== null || !payoutControls.settlementProcessingEnabled || !permissions.canSettle}
                    onClick={() => transitionSettlement("settle", entry.id)}
                  >
                    Force settle
                  </button>
                ) : null}
                {entry.workflowState !== "settled" && entry.workflowState !== "cancelled" ? (
                  <button
                    className="button button--secondary button--small"
                    type="button"
                    disabled={pendingId !== null || !permissions.canHold}
                    onClick={() => transitionSettlement("hold", entry.id)}
                  >
                    Hold
                  </button>
                ) : null}
                {["approved", "processing", "held"].includes(entry.workflowState) ? (
                  <button
                    className="button button--secondary button--small"
                    type="button"
                    disabled={pendingId !== null || !permissions.canFail}
                    onClick={() => transitionSettlement("fail", entry.id)}
                  >
                    Mark failed
                  </button>
                ) : null}
                {["held", "failed", "cancelled"].includes(entry.workflowState) ? (
                  <button
                    className="button button--secondary button--small"
                    type="button"
                    disabled={pendingId !== null || !permissions.canRequeue}
                    onClick={() => transitionSettlement("requeue", entry.id)}
                  >
                    Requeue
                  </button>
                ) : null}
                {entry.workflowState !== "settled" && entry.workflowState !== "cancelled" ? (
                  <button
                    className="button button--secondary button--small"
                    type="button"
                    disabled={pendingId !== null || !permissions.canCancel}
                    onClick={() => transitionSettlement("cancel", entry.id)}
                  >
                    Cancel
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
              );
            })()
          ))
        )}
      </div>
    </section>
  );
}
