"use client";

import type { DashboardData } from "@/lib/types";

export function CampaignMissionInboxPanel({
  notifications,
  title = "Mission inbox",
  eyebrow = "Campaign inbox",
}: {
  notifications: DashboardData["campaignNotifications"];
  title?: string;
  eyebrow?: string;
}) {
  if (notifications.length === 0) {
    return null;
  }

  return (
    <div className="panel panel--glass">
      <div className="panel__header">
        <div>
          <p className="eyebrow">{eyebrow}</p>
          <h3>{title}</h3>
        </div>
        <span className="badge">{notifications.length} updates</span>
      </div>
      <div className="achievement-list">
        {notifications.map((notification) => (
          <article key={notification.id} className="achievement-card">
            <div>
              <strong>{notification.title}</strong>
              <p>{notification.detail}</p>
              {notification.ctaLabel ? (
                <div className="hero__actions">
                  <a
                    className="button button--secondary"
                    href={notification.ctaHref ?? (notification.ctaQuestId ? `#quest-action-${notification.ctaQuestId}` : "#quest-board")}
                  >
                    {notification.ctaLabel}
                  </a>
                </div>
              ) : null}
            </div>
            <div className="achievement-card__side">
              <span className={`badge ${notification.tone === "success" ? "badge--pink" : ""}`}>
                {notification.tone}
              </span>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
