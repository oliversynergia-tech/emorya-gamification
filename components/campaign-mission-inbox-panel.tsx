"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { usePathname } from "next/navigation";

import type { DashboardData } from "@/lib/types";
import { MissionLink } from "@/components/mission-link";

export function CampaignMissionInboxPanel({
  notifications,
  activePacks = [],
  missionView = "active",
  title = "Mission inbox",
  eyebrow = "Campaign inbox",
}: {
  notifications: DashboardData["campaignNotifications"];
  activePacks?: DashboardData["campaignPacks"];
  missionView?: "active" | "completed" | "all" | "reward";
  title?: string;
  eyebrow?: string;
}) {
  const storageKey = `campaign-mission-inbox:state:${missionView}`;
  const pathname = usePathname();
  const [isPending, startTransition] = useTransition();
  const [currentTime, setCurrentTime] = useState(() => Date.now());
  const [inboxState, setInboxState] = useState<Record<string, { status: "dismissed" | "handled" | "snoozed"; until?: string | null }>>(() => {
    const persistedFromServer = Object.fromEntries(
      notifications
        .filter((notification) => notification.persistedState)
        .map((notification) => [notification.id, notification.persistedState]),
    ) as Record<string, { status: "handled" | "snoozed"; until?: string | null }>;

    if (typeof window === "undefined") {
      return persistedFromServer;
    }

    try {
      const saved = window.localStorage.getItem(storageKey);
      if (!saved) {
        return persistedFromServer;
      }

      const parsed = JSON.parse(saved) as Record<string, { status: "dismissed" | "handled" | "snoozed"; until?: string | null }>;
      if (parsed && typeof parsed === "object") {
        return {
          ...persistedFromServer,
          ...parsed,
        };
      }
    } catch {
      // Ignore broken local storage state.
    }

    return persistedFromServer;
  });

  async function persistInboxState(notificationId: string, status: "handled" | "snoozed", until?: string | null) {
    const notification = notifications.find((entry) => entry.id === notificationId);
    try {
      await fetch("/api/campaign-events", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          packId: notification?.packId,
          eventType: "mission_inbox_state",
          ctaLabel: status === "handled" ? "Handled mission inbox item" : "Snoozed mission inbox item",
          ctaVariant: "mission_inbox_state",
          href: pathname ?? "/dashboard",
          notificationId,
          notificationStatus: status,
          notificationUntil: until ?? null,
          reminderVariant: notification?.reminderVariant ?? null,
          reminderSchedule: notification?.reminderSchedule ?? null,
        }),
        keepalive: true,
      });
    } catch {
      // Ignore persistence failures; local state still updates.
    }
  }

  useEffect(() => {
    function handleStorage(event: StorageEvent) {
      if (event.key !== storageKey || !event.newValue) {
        return;
      }

      try {
        const parsed = JSON.parse(event.newValue) as Record<string, { status: "dismissed" | "handled" | "snoozed"; until?: string | null }>;
        if (parsed && typeof parsed === "object") {
          setInboxState(parsed);
        }
      } catch {
        // Ignore malformed storage updates.
      }
    }

    function handleMissionInboxSync(event: Event) {
      const detail = (event as CustomEvent<Record<string, { status: "dismissed" | "handled" | "snoozed"; until?: string | null }>>).detail;
      if (detail && typeof detail === "object") {
        setInboxState(detail);
      }
    }

    window.addEventListener("storage", handleStorage);
    window.addEventListener("campaign-mission-inbox-sync", handleMissionInboxSync as EventListener);

    return () => {
      window.removeEventListener("storage", handleStorage);
      window.removeEventListener("campaign-mission-inbox-sync", handleMissionInboxSync as EventListener);
    };
  }, [storageKey]);

  useEffect(() => {
    const interval = window.setInterval(() => {
      setCurrentTime(Date.now());
    }, 60000);

    return () => {
      window.clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    try {
      window.localStorage.setItem(storageKey, JSON.stringify(inboxState));
      window.dispatchEvent(new CustomEvent("campaign-mission-inbox-sync", { detail: inboxState }));
    } catch {
      // Ignore storage failures.
    }
  }, [inboxState, storageKey]);

  const visibleNotifications = useMemo(
    () =>
      notifications.filter((notification) => {
        if (missionView === "reward") {
          const rewardPackIds = new Set(
            activePacks
              .filter((pack) => Boolean(pack.directRewardSummary || pack.directRewardState || pack.premiumNudge))
              .map((pack) => pack.packId),
          );
          if (!rewardPackIds.has(notification.packId)) {
            return false;
          }
        }
        const state = inboxState[notification.id];
        if (!state) {
          return true;
        }

        if (state.status === "snoozed" && state.until) {
          return new Date(state.until).getTime() <= currentTime;
        }

        return false;
      }),
    [activePacks, currentTime, inboxState, missionView, notifications],
  );

  if (visibleNotifications.length === 0) {
    return null;
  }

  const snoozeOptions = [
    { label: "Later today", hours: 6 },
    { label: "Tomorrow", hours: 24 },
    { label: "This week", hours: 72 },
  ] as const;

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
              {notification.reminderScheduleLabel ? <p className="form-note">{notification.reminderScheduleLabel}</p> : null}
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
              {snoozeOptions.map((option) => (
                <button
                  key={`${notification.id}-${option.label}`}
                  type="button"
                  className="button button--secondary"
                  disabled={isPending}
                  onClick={() => {
                    const until = new Date(Date.now() + option.hours * 60 * 60 * 1000).toISOString();
                    setInboxState((current) => ({
                      ...current,
                      [notification.id]: {
                        status: "snoozed",
                        until,
                      },
                    }));
                    startTransition(() => {
                      void persistInboxState(notification.id, "snoozed", until);
                    });
                  }}
                >
                  {option.label}
                </button>
              ))}
              <button
                type="button"
                className="button button--secondary"
                disabled={isPending}
                onClick={() => {
                  setInboxState((current) => ({
                    ...current,
                    [notification.id]: {
                      status: "handled",
                      until: null,
                    },
                  }));
                  startTransition(() => {
                    void persistInboxState(notification.id, "handled", null);
                  });
                }}
              >
                Mark handled
              </button>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
