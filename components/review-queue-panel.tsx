"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import type { ReviewQueueItem } from "@/lib/types";

export function ReviewQueuePanel({
  initialQueue,
  isAuthenticated,
}: {
  initialQueue: ReviewQueueItem[];
  isAuthenticated: boolean;
}) {
  const router = useRouter();
  const [queue, setQueue] = useState(initialQueue);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function reviewSubmission(completionId: string, action: "approved" | "rejected") {
    setPendingId(completionId);
    setMessage(null);
    setError(null);

    try {
      const response = await fetch(`/api/admin/reviews/${completionId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ action }),
      });

      const result = (await response.json()) as {
        ok: boolean;
        error?: string;
      };

      if (!response.ok || !result.ok) {
        setError(result.error ?? "Unable to review submission.");
        return;
      }

      setQueue((current) => current.filter((item) => item.id !== completionId));
      setMessage(action === "approved" ? "Submission approved." : "Submission rejected.");
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
                onClick={() => reviewSubmission(item.id, "approved")}
                disabled={!isAuthenticated || pendingId === item.id}
              >
                {pendingId === item.id ? "Working..." : "Approve"}
              </button>
              <button
                className="button button--secondary"
                type="button"
                onClick={() => reviewSubmission(item.id, "rejected")}
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
