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

  return (
    <div className="panel panel--glass">
      <div className="panel__header">
        <div>
          <p className="eyebrow">{eyebrow}</p>
          <h3>{title}</h3>
        </div>
        <span className="badge">{notifications.length + scheduledDirectRewards.length} live</span>
      </div>
      <div className="achievement-list">
        {notifications.map((notification) => (
          <article
            key={notification.id}
            className={`achievement-card achievement-card--notification achievement-card--notification-${notification.tone}`}
          >
            <div>
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
            className="achievement-card achievement-card--notification achievement-card--notification-warning"
          >
            <div>
              <strong>Direct reward scheduled</strong>
              <p>
                {reward.amount} {reward.asset} is queued on the direct reward rail.
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
