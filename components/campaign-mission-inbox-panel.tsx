"use client";

import { useMemo, useState } from "react";

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
  const [dismissedIds, setDismissedIds] = useState<string[]>([]);

  const visibleNotifications = useMemo(
    () => notifications.filter((notification) => !dismissedIds.includes(notification.id)),
    [dismissedIds, notifications],
  );

  if (visibleNotifications.length === 0) {
    return null;
  }

  return (
    <div className="panel panel--glass">
      <div className="panel__header">
        <div>
          <p className="eyebrow">{eyebrow}</p>
          <h3>{title}</h3>
        </div>
        <span className="badge">{visibleNotifications.length} updates</span>
      </div>
      <div className="achievement-list">
        {visibleNotifications.map((notification) => (
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
              <button
                type="button"
                className="button button--secondary"
                onClick={() => setDismissedIds((current) => [...current, notification.id])}
              >
                Dismiss
              </button>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
