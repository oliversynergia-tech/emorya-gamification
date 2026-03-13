"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import type { QuestProgressUpdate, ReviewQueueItem } from "@/lib/types";

type ReviewOutcome = {
  completionId: string;
  action: "approved" | "rejected";
  questTitle: string;
  userDisplayName: string;
  progressUpdate: QuestProgressUpdate | null;
};

export function ReviewQueuePanel({
  initialQueue,
  isAuthenticated,
}: {
  initialQueue: ReviewQueueItem[];
  isAuthenticated: boolean;
}) {
  const router = useRouter();
  const [queue, setQueue] = useState(initialQueue);
  const [recentOutcomes, setRecentOutcomes] = useState<ReviewOutcome[]>([]);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function reviewSubmission(item: ReviewQueueItem, action: "approved" | "rejected") {
    setPendingId(item.id);
    setMessage(null);
    setError(null);

    try {
      const response = await fetch(`/api/admin/reviews/${item.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ action }),
      });

      const result = (await response.json()) as {
        ok: boolean;
        error?: string;
        progressUpdate?: QuestProgressUpdate | null;
      };

      if (!response.ok || !result.ok) {
        setError(result.error ?? "Unable to review submission.");
        return;
      }

      setQueue((current) => current.filter((entry) => entry.id !== item.id));
      setRecentOutcomes((current) => [
        {
          completionId: item.id,
          action,
          questTitle: item.questTitle,
          userDisplayName: item.userDisplayName,
          progressUpdate: result.progressUpdate ?? null,
        },
        ...current,
      ].slice(0, 4));
      setMessage(
        action === "approved"
          ? `Submission approved for ${item.userDisplayName}.`
          : `Submission rejected for ${item.userDisplayName}.`,
      );
      router.refresh();
    } catch {
      setError("Unable to reach the review service.");
    } finally {
      setPendingId(null);
    }
  }

  return (
    <section className="panel">
      <div className="panel__header">
        <div>
          <p className="eyebrow">Review queue</p>
          <h3>Pending quest submissions</h3>
        </div>
      </div>
      {!isAuthenticated ? <p className="form-note">Sign in to review pending submissions.</p> : null}
      {recentOutcomes.length > 0 ? (
        <div className="review-outcome-list">
          {recentOutcomes.map((outcome) => (
            <article key={`${outcome.completionId}-${outcome.action}`} className="review-outcome-card">
              <div className="quest-card__meta">
                <span>{outcome.action === "approved" ? "Approved" : "Rejected"}</span>
                <span>{outcome.userDisplayName}</span>
              </div>
              <h4>{outcome.questTitle}</h4>
              {outcome.progressUpdate ? (
                <div className="profile-meta">
                  <div className="info-card">
                    <span>XP effect</span>
                    <strong>{outcome.progressUpdate.deltaXp >= 0 ? "+" : ""}{outcome.progressUpdate.deltaXp}</strong>
                  </div>
                  <div className="info-card">
                    <span>Level</span>
                    <strong>{outcome.progressUpdate.level}</strong>
                  </div>
                  <div className="info-card">
                    <span>Streak</span>
                    <strong>{outcome.progressUpdate.currentStreak} days</strong>
                  </div>
                </div>
              ) : (
                <p className="form-note">No XP or progression change was applied.</p>
              )}
              {outcome.progressUpdate?.unlockedAchievements?.length ? (
                <p className="form-note">
                  Unlocked: {outcome.progressUpdate.unlockedAchievements.join(", ")}
                </p>
              ) : (
                null
              )}
            </article>
          ))}
        </div>
      ) : null}
      {queue.length === 0 ? <p className="form-note">No pending submissions right now.</p> : null}
      <div className="review-queue">
        {queue.map((item) => (
          <article key={item.id} className="review-item">
            <div className="quest-card__meta">
              <span>{item.verificationType}</span>
              <span>{new Date(item.createdAt).toLocaleString()}</span>
            </div>
            <h4>{item.questTitle}</h4>
            <p>
              {item.userDisplayName}
              {item.userEmail ? ` · ${item.userEmail}` : ""}
            </p>
            <pre className="review-payload">{JSON.stringify(item.submissionData, null, 2)}</pre>
            <div className="review-actions">
              <button
                className="button button--primary"
                type="button"
                onClick={() => reviewSubmission(item, "approved")}
                disabled={!isAuthenticated || pendingId === item.id}
              >
                {pendingId === item.id ? "Working..." : "Approve"}
              </button>
              <button
                className="button button--secondary"
                type="button"
                onClick={() => reviewSubmission(item, "rejected")}
                disabled={!isAuthenticated || pendingId === item.id}
              >
                Reject
              </button>
            </div>
          </article>
        ))}
      </div>
      {message ? <p className="status status--success">{message}</p> : null}
      {error ? <p className="status status--error">{error}</p> : null}
    </section>
  );
}
