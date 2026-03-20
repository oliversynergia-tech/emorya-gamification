"use client";

import { useEffect, useMemo, useState } from "react";

import type { DashboardData } from "@/lib/types";
import { MissionLink } from "@/components/mission-link";

export function CampaignMissionInboxPanel({
  notifications,
  title = "Mission inbox",
  eyebrow = "Campaign inbox",
}: {
  notifications: DashboardData["campaignNotifications"];
  title?: string;
  eyebrow?: string;
}) {
  const storageKey = "campaign-mission-inbox:dismissed";
  const [dismissedIds, setDismissedIds] = useState<string[]>(() => {
    if (typeof window === "undefined") {
      return [];
    }

    try {
      const saved = window.localStorage.getItem(storageKey);
      if (!saved) {
        return [];
      }

      const parsed = JSON.parse(saved) as string[];
      if (Array.isArray(parsed)) {
        return parsed;
      }
    } catch {
      // Ignore broken local storage state.
    }

    return [];
  });

  useEffect(() => {
    function handleStorage(event: StorageEvent) {
      if (event.key !== storageKey || !event.newValue) {
        return;
      }

      try {
        const parsed = JSON.parse(event.newValue) as string[];
        if (Array.isArray(parsed)) {
          setDismissedIds(parsed);
        }
      } catch {
        // Ignore malformed storage updates.
      }
    }

    function handleMissionInboxSync(event: Event) {
      const detail = (event as CustomEvent<string[]>).detail;
      if (Array.isArray(detail)) {
        setDismissedIds(detail);
      }
    }

    window.addEventListener("storage", handleStorage);
    window.addEventListener("campaign-mission-inbox-sync", handleMissionInboxSync as EventListener);

    return () => {
      window.removeEventListener("storage", handleStorage);
      window.removeEventListener("campaign-mission-inbox-sync", handleMissionInboxSync as EventListener);
    };
  }, []);

  useEffect(() => {
    try {
      window.localStorage.setItem(storageKey, JSON.stringify(dismissedIds));
      window.dispatchEvent(new CustomEvent("campaign-mission-inbox-sync", { detail: dismissedIds }));
    } catch {
      // Ignore storage failures.
    }
  }, [dismissedIds, storageKey]);

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
                  <MissionLink
                    className="button button--secondary"
                    href={notification.ctaHref ?? (notification.ctaQuestId ? `#quest-action-${notification.ctaQuestId}` : "#quest-board")}
                    packId={notification.packId}
                    eventType="mission_inbox_cta"
                    ctaLabel={notification.ctaLabel}
                    ctaVariant="mission_inbox"
                  >
                    {notification.ctaLabel}
                  </MissionLink>
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
