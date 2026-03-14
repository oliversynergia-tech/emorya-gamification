"use client";

import { useState } from "react";

import type { AdminOverviewData } from "@/lib/types";

export function ModerationNotificationHistoryPanel({
  initialHistory,
}: {
  initialHistory: AdminOverviewData["moderationNotificationHistory"];
}) {
  const [history, setHistory] = useState(initialHistory);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function acknowledge(deliveryId: string) {
    setPendingId(deliveryId);
    setError(null);

    try {
      const response = await fetch(`/api/admin/moderation-notifications/${deliveryId}`, {
        method: "PATCH",
      });
      const payload = (await response.json()) as {
        ok: boolean;
        error?: string;
        history?: AdminOverviewData["moderationNotificationHistory"];
      };

      if (!response.ok || !payload.ok || !payload.history) {
        throw new Error(payload.error ?? "Unable to acknowledge moderation notification.");
      }

      setHistory(payload.history);
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Unable to acknowledge moderation notification.");
    } finally {
      setPendingId(null);
    }
  }

  return (
    <section className="panel panel--glass admin-analytics">
      <div className="panel__header">
        <div>
          <p className="eyebrow">Notification history</p>
          <h3>Recent moderation alert audit trail</h3>
        </div>
      </div>
      {error ? <p className="form-note form-note--error">{error}</p> : null}
      <div className="achievement-list">
        {history.map((entry) => (
          <article key={entry.id} className="achievement-card">
            <div>
              <strong>{entry.title}</strong>
              <p>{entry.detail}</p>
              <small>
                {entry.channel} {"->"} {entry.destination}
              </small>
            </div>
            <div className="achievement-card__side">
              <span>{entry.eventStatus}</span>
              <span>{new Date(entry.createdAt).toLocaleString()}</span>
              {entry.eventStatus === "acknowledged" ? (
                <small>
                  {entry.acknowledgedByDisplayName
                    ? `Ack by ${entry.acknowledgedByDisplayName}`
                    : "Acknowledged"}
                </small>
              ) : (
                <button
                  className="button button--secondary button--small"
                  disabled={pendingId === entry.id}
                  onClick={() => acknowledge(entry.id)}
                  type="button"
                >
                  {pendingId === entry.id ? "Saving..." : "Acknowledge"}
                </button>
              )}
            </div>
          </article>
        ))}
        {history.length === 0 ? <p className="form-note">No moderation notification history has been recorded yet.</p> : null}
      </div>
    </section>
  );
}
