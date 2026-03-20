"use client";

import type { AdminOverviewData } from "@/lib/types";

function formatCompactHours(hours: number) {
  if (hours >= 24) {
    return `${(hours / 24).toFixed(1)}d`;
  }

  return `${hours.toFixed(1)}h`;
}

export function PayoutOperationsDashboard({
  queue,
  analytics,
}: {
  queue: AdminOverviewData["tokenSettlementQueue"];
  analytics: AdminOverviewData["settlementAnalytics"];
}) {
  const retryBacklog = queue.filter((entry) => entry.retryCount > 0 && entry.workflowState !== "settled").length;
  const exceptionCount = analytics.exceptionBreakdown.reduce((sum, entry) => sum + entry.count, 0);
  const exceptionRate = analytics.pendingCount > 0 ? (exceptionCount / analytics.pendingCount) * 100 : 0;
  const processingCount =
    analytics.workflowBreakdown.find((entry) => entry.state === "processing")?.count ?? 0;
  const approvedCount =
    analytics.workflowBreakdown.find((entry) => entry.state === "approved")?.count ?? 0;

  return (
    <div className="panel panel--glass admin-analytics">
      <div className="panel__header">
        <div>
          <p className="eyebrow">Payout operations dashboard</p>
          <h3>Queue health, exceptions, retries, and payout mix in one view</h3>
        </div>
        <span className="badge badge--pink">{analytics.pendingCount} open</span>
      </div>
      <p className="form-note">
        Focuses only on active payout operations so exception pressure and settlement movement are easier to read at a glance.
      </p>
      <div className="info-grid">
        <div className="info-card">
          <span>Queued + approved</span>
          <strong>{analytics.pendingCount + approvedCount}</strong>
          <small>{approvedCount} approved and waiting to move.</small>
        </div>
        <div className="info-card">
          <span>In processing</span>
          <strong>{processingCount}</strong>
          <small>Currently moving through the active payout rail.</small>
        </div>
        <div className="info-card">
          <span>Retry backlog</span>
          <strong>{retryBacklog}</strong>
          <small>Claimed payouts with one or more retries still unresolved.</small>
        </div>
        <div className="info-card">
          <span>Exception rate</span>
          <strong>{exceptionRate.toFixed(1)}%</strong>
          <small>{exceptionCount} held, failed, or cancelled against the current queue.</small>
        </div>
        <div className="info-card">
          <span>Oldest pending</span>
          <strong>{formatCompactHours(analytics.oldestPendingHours)}</strong>
          <small>Watch this when queue pressure is climbing.</small>
        </div>
        <div className="info-card">
          <span>Settlement velocity</span>
          <strong>{analytics.redemptionVelocityPerDay.toFixed(2)}/day</strong>
          <small>{analytics.periodLabel}</small>
        </div>
      </div>
      <div className="achievement-list">
        {analytics.byAsset.slice(0, 4).map((asset) => (
          <article key={`ops-asset-${asset.asset}`} className="achievement-card">
            <div>
              <strong>{asset.asset}</strong>
              <p>Pending vs settled load across this asset.</p>
            </div>
            <div className="achievement-card__side">
              <span>{asset.pendingCount} pending</span>
              <span>{asset.settledCount} settled</span>
              <span>{asset.totalTokenAmount.toFixed(2)} tokens</span>
            </div>
          </article>
        ))}
        {analytics.byProgram.slice(0, 4).map((program) => (
          <article key={`ops-program-${program.rewardProgramName}-${program.asset}`} className="achievement-card">
            <div>
              <strong>{program.rewardProgramName}</strong>
              <p>{program.asset} program load across active and completed payouts.</p>
            </div>
            <div className="achievement-card__side">
              <span>{program.pendingCount} pending</span>
              <span>{program.settledCount} settled</span>
              <span>{program.totalTokenAmount.toFixed(2)} tokens</span>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
