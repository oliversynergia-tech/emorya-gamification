"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import type { QuestProgressUpdate, ReviewHistoryItem, ReviewQueueItem } from "@/lib/types";

type ReviewOutcome = {
  completionId: string;
  action: "approved" | "rejected";
  questTitle: string;
  userDisplayName: string;
  progressUpdate: QuestProgressUpdate | null;
  moderationNote?: string | null;
};

export function ReviewQueuePanel({
  initialQueue,
  initialHistory,
  isAuthenticated,
  currentReviewerName,
}: {
  initialQueue: ReviewQueueItem[];
  initialHistory: ReviewHistoryItem[];
  isAuthenticated: boolean;
  currentReviewerName?: string | null;
}) {
  const router = useRouter();
  const [queue, setQueue] = useState(initialQueue);
  const [history] = useState(initialHistory);
  const [recentOutcomes, setRecentOutcomes] = useState<ReviewOutcome[]>([]);
  const [historyStatusFilter, setHistoryStatusFilter] = useState<"all" | "approved" | "rejected">("all");
  const [historyTypeFilter, setHistoryTypeFilter] = useState<string>("all");
  const [historyReviewerFilter, setHistoryReviewerFilter] = useState<"all" | "mine" | "unknown" | string>("all");
  const [historyQuery, setHistoryQuery] = useState("");
  const [expandedHistoryId, setExpandedHistoryId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [moderationNotes, setModerationNotes] = useState<Record<string, string>>({});
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const historyReviewers = Array.from(
    new Set(
      history
        .map((item) => item.reviewerDisplayName)
        .filter((reviewer): reviewer is string => Boolean(reviewer)),
    ),
  );
  const historyTypes = Array.from(new Set(history.map((item) => item.verificationType)));

  const filteredHistory = history.filter((item) => {
    if (historyStatusFilter !== "all" && item.status !== historyStatusFilter) {
      return false;
    }

    if (historyTypeFilter !== "all" && item.verificationType !== historyTypeFilter) {
      return false;
    }

    if (historyReviewerFilter === "mine" && item.reviewerDisplayName !== currentReviewerName) {
      return false;
    }

    if (historyReviewerFilter === "unknown" && item.reviewerDisplayName !== null) {
      return false;
    }

    if (
      historyReviewerFilter !== "all" &&
      historyReviewerFilter !== "mine" &&
      historyReviewerFilter !== "unknown" &&
      item.reviewerDisplayName !== historyReviewerFilter
    ) {
      return false;
    }

    const query = historyQuery.trim().toLowerCase();

    if (!query) {
      return true;
    }

    return [
      item.questTitle,
      item.userDisplayName,
      item.userEmail ?? "",
      item.reviewerDisplayName ?? "",
      String(item.submissionData.contentUrl ?? ""),
      String(item.submissionData.platform ?? ""),
      String(item.submissionData.moderationNote ?? ""),
    ].some((value) => value.toLowerCase().includes(query));
  });

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
        body: JSON.stringify({
          action,
          moderationNote: moderationNotes[item.id] ?? "",
        }),
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
          moderationNote: moderationNotes[item.id] ?? null,
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

  async function bulkReview(action: "approved" | "rejected") {
    if (selectedIds.length === 0) {
      setError("Select at least one submission first.");
      return;
    }

    setPendingId("bulk");
    setMessage(null);
    setError(null);

    try {
      const response = await fetch("/api/admin/reviews", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          completionIds: selectedIds,
          action,
        }),
      });

      const result = (await response.json()) as { ok: boolean; error?: string; reviewedCount?: number };

      if (!response.ok || !result.ok) {
        setError(result.error ?? "Unable to process bulk review.");
        return;
      }

      setQueue((current) => current.filter((entry) => !selectedIds.includes(entry.id)));
      setSelectedIds([]);
      setMessage(`${result.reviewedCount ?? selectedIds.length} submissions ${action === "approved" ? "approved" : "rejected"}.`);
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
              {outcome.moderationNote ? (
                <p className="form-note">Note: {outcome.moderationNote}</p>
              ) : null}
            </article>
          ))}
        </div>
      ) : null}
      {history.length > 0 ? (
        <div className="review-history">
          <div className="panel__header">
            <div>
              <p className="eyebrow">Recent audit trail</p>
              <h3>Reviewed submissions</h3>
            </div>
            <span className="badge">{filteredHistory.length} shown</span>
          </div>
          <div className="review-history__filters">
            <label className="field">
              <span>Status</span>
              <select
                value={historyStatusFilter}
                onChange={(event) => setHistoryStatusFilter(event.target.value as "all" | "approved" | "rejected")}
              >
                <option value="all">All</option>
                <option value="approved">Approved</option>
                <option value="rejected">Rejected</option>
              </select>
            </label>
            <label className="field">
              <span>Type</span>
              <select value={historyTypeFilter} onChange={(event) => setHistoryTypeFilter(event.target.value)}>
                <option value="all">All</option>
                {historyTypes.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              <span>Reviewer</span>
              <select value={historyReviewerFilter} onChange={(event) => setHistoryReviewerFilter(event.target.value)}>
                <option value="all">All</option>
                {currentReviewerName ? <option value="mine">Reviewed by me</option> : null}
                <option value="unknown">Unknown reviewer</option>
                {historyReviewers.map((reviewer) => (
                  <option key={reviewer} value={reviewer}>
                    {reviewer}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              <span>Search</span>
              <input
                value={historyQuery}
                onChange={(event) => setHistoryQuery(event.target.value)}
                placeholder="Quest, user, reviewer, URL, note"
              />
            </label>
          </div>
          <div className="review-history__list">
            {filteredHistory.map((item) => (
              <article key={item.id} className="review-history__item">
                <div className="quest-card__meta">
                  <span>{item.status === "approved" ? "Approved" : "Rejected"}</span>
                  <span>{new Date(item.reviewedAt).toLocaleString()}</span>
                </div>
                <h4>{item.questTitle}</h4>
                <p>
                  {item.userDisplayName}
                  {item.userEmail ? ` · ${item.userEmail}` : ""}
                </p>
                <div className="review-history__meta">
                  <span>Reviewer: {item.reviewerDisplayName ?? "Unknown"}</span>
                  <span>XP: {item.awardedXp}</span>
                </div>
                {item.submissionData.moderationNote ? (
                  <p className="form-note">Note: {String(item.submissionData.moderationNote)}</p>
                ) : null}
                <button
                  className="button button--secondary button--small"
                  type="button"
                  onClick={() => setExpandedHistoryId((current) => (current === item.id ? null : item.id))}
                >
                  {expandedHistoryId === item.id ? "Hide details" : "View details"}
                </button>
                {expandedHistoryId === item.id ? (
                  <div className="review-history__detail">
                    <div className="info-grid">
                      <div className="info-card">
                        <span>User</span>
                        <strong>{item.userDisplayName}</strong>
                      </div>
                      <div className="info-card">
                        <span>Verification</span>
                        <strong>{item.verificationType}</strong>
                      </div>
                      <div className="info-card">
                        <span>Reviewed at</span>
                        <strong>{new Date(item.reviewedAt).toLocaleDateString()}</strong>
                      </div>
                      <div className="info-card">
                        <span>Reviewer</span>
                        <strong>{item.reviewerDisplayName ?? "Unknown"}</strong>
                      </div>
                    </div>
                    <pre className="review-payload">{JSON.stringify(item.submissionData, null, 2)}</pre>
                  </div>
                ) : null}
              </article>
            ))}
          </div>
          {filteredHistory.length === 0 ? <p className="form-note">No review history matches the current filters.</p> : null}
        </div>
      ) : null}
      {queue.length === 0 ? <p className="form-note">No pending submissions right now.</p> : null}
      {queue.length > 0 ? (
        <div className="review-bulk-actions">
          <button
            className="button button--secondary button--small"
            type="button"
            disabled={!isAuthenticated || pendingId === "bulk"}
            onClick={() => bulkReview("approved")}
          >
            {pendingId === "bulk" ? "Working..." : `Approve selected (${selectedIds.length})`}
          </button>
          <button
            className="button button--secondary button--small"
            type="button"
            disabled={!isAuthenticated || pendingId === "bulk"}
            onClick={() => bulkReview("rejected")}
          >
            Reject selected
          </button>
        </div>
      ) : null}
      <div className="review-queue">
        {queue.map((item) => (
          <article key={item.id} className="review-item">
            <label className="toggle-switch">
              <input
                type="checkbox"
                checked={selectedIds.includes(item.id)}
                onChange={(event) =>
                  setSelectedIds((current) =>
                    event.target.checked
                      ? [...current, item.id]
                      : current.filter((id) => id !== item.id),
                  )
                }
                disabled={!isAuthenticated || pendingId === item.id || pendingId === "bulk"}
              />
              <span>Select for bulk review</span>
            </label>
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
            <label className="field">
              <span>Moderation note</span>
              <input
                value={moderationNotes[item.id] ?? ""}
                onChange={(event) =>
                  setModerationNotes((current) => ({ ...current, [item.id]: event.target.value }))
                }
                placeholder="Optional internal or user-facing note"
                disabled={!isAuthenticated || pendingId === item.id}
              />
            </label>
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
