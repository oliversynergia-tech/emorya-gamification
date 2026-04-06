"use client";

import type { DashboardData } from "@/lib/types";

export function PayoutNotificationsPanel({
  notifications,
  scheduledDirectRewards,
  title = "Payout notifications",
  eyebrow = "Payout notifications",
}: {
  notifications: DashboardData["user"]["tokenProgram"]["notifications"];
  scheduledDirectRewards: DashboardData["user"]["tokenProgram"]["scheduledDirectRewards"];
  title?: string;
  eyebrow?: string;
}) {
  if (notifications.length === 0 && scheduledDirectRewards.length === 0) {
    return null;
  }

  const queuedCount = notifications.filter((notification) =>
    /claimed|awaiting/i.test(notification.title) || /claimed|awaiting/i.test(notification.detail),
  ).length;
  const settledCount = notifications.filter((notification) =>
    /settled/i.test(notification.title) || /settled/i.test(notification.detail),
  ).length;

  return (
    <div className="panel panel--glass">
      <div className="panel__header">
        <div>
          <p className="eyebrow">{eyebrow}</p>
          <h3>{title}</h3>
        </div>
        <span className="badge">{notifications.length + scheduledDirectRewards.length} live</span>
      </div>
      <div className="reward-summary-grid">
        <div className="info-card reward-summary-card">
          <span>Claimed / queued</span>
          <strong>{queuedCount}</strong>
        </div>
        <div className="info-card reward-summary-card">
          <span>Settled / complete</span>
          <strong>{settledCount}</strong>
        </div>
        <div className="info-card reward-summary-card">
          <span>Direct rewards</span>
          <strong>{scheduledDirectRewards.length}</strong>
        </div>
      </div>
      <div className="achievement-list">
        {notifications.map((notification) => (
          <article
            key={notification.id}
            className={`achievement-card achievement-card--notification achievement-card--notification-${notification.tone} reward-notification-card`}
          >
            <div>
              <div className="reward-receipt-card__meta">
                <span className="badge">{notification.tone}</span>
              </div>
              <strong>{notification.title}</strong>
              <p>{notification.detail}</p>
            </div>
            <div className="achievement-card__side">
              <span>{notification.tone}</span>
            </div>
          </article>
        ))}
        {scheduledDirectRewards.map((reward) => (
          <article
            key={`${reward.asset}-${reward.amount}-${reward.rewardProgramName ?? "direct"}`}
            className="achievement-card achievement-card--notification achievement-card--notification-warning reward-notification-card"
          >
            <div>
              <div className="reward-receipt-card__meta">
                <span className="badge badge--pink">scheduled</span>
                <span className="badge">{reward.asset}</span>
                {reward.rewardProgramName ? <span className="badge">{reward.rewardProgramName}</span> : null}
              </div>
              <strong>Direct reward scheduled</strong>
              <p>
                {reward.amount} {reward.asset} is queued as a direct reward payout.
                {reward.rewardProgramName ? ` ${reward.rewardProgramName} is funding this payout.` : ""}
              </p>
            </div>
            <div className="achievement-card__side">
              <span>scheduled</span>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
