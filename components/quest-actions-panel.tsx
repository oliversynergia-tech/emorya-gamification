"use client";

import { FormEvent, useMemo, useState } from "react";

import type { Quest, QuestProgressUpdate } from "@/lib/types";

type SubmissionState = Record<string, string>;

export function QuestActionsPanel({
  quests,
  isAuthenticated,
  onQuestResult,
}: {
  quests: Quest[];
  isAuthenticated: boolean;
  onQuestResult?: (result: {
    questId: string;
    outcome: "approved" | "pending" | "rejected";
    progressUpdate: QuestProgressUpdate | null;
  }) => void;
}) {
  const actionableQuests = useMemo(
    () =>
      quests.filter((quest) =>
        ["quiz", "manual-review", "link-visit"].includes(quest.verificationType),
      ),
    [quests],
  );
  const [answersCorrect, setAnswersCorrect] = useState<SubmissionState>({});
  const [contentUrls, setContentUrls] = useState<SubmissionState>({});
  const [notes, setNotes] = useState<SubmissionState>({});
  const [pendingQuestId, setPendingQuestId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [progressUpdate, setProgressUpdate] = useState<QuestProgressUpdate | null>(null);
  const [progressQuestTitle, setProgressQuestTitle] = useState<string | null>(null);

  async function submitQuest(
    quest: Quest,
    payload: Record<string, unknown>,
    successMessage: string,
  ) {
    setPendingQuestId(quest.id);
    setMessage(null);
    setError(null);
    setProgressUpdate(null);
    setProgressQuestTitle(null);

    try {
      const response = await fetch(`/api/quests/${quest.id}/submit`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const result = (await response.json()) as {
        ok: boolean;
        error?: string;
        message?: string;
        outcome?: "approved" | "pending" | "rejected";
        progressUpdate?: QuestProgressUpdate | null;
      };

      if (!response.ok || !result.ok) {
        setError(result.error ?? "Unable to submit the quest.");
        return;
      }

      setMessage(result.message ?? successMessage);
      setProgressUpdate(result.progressUpdate ?? null);
      setProgressQuestTitle(result.progressUpdate ? quest.title : null);
      if (result.outcome) {
        onQuestResult?.({
          questId: quest.id,
          outcome: result.outcome,
          progressUpdate: result.progressUpdate ?? null,
        });
      }
    } catch {
      setError("Unable to reach the quest service.");
    } finally {
      setPendingQuestId(null);
    }
  }

  function handleQuizSubmit(event: FormEvent<HTMLFormElement>, quest: Quest) {
    event.preventDefault();

    void submitQuest(
      quest,
      {
        answersCorrect: answersCorrect[quest.id] ?? "",
      },
      "Quiz submitted.",
    );
  }

  function handleManualSubmit(event: FormEvent<HTMLFormElement>, quest: Quest) {
    event.preventDefault();

    void submitQuest(
      quest,
      {
        contentUrl: contentUrls[quest.id] ?? "",
        note: notes[quest.id] ?? "",
      },
      "Manual review submitted.",
    );
  }

  function handleLinkVisit(quest: Quest) {
    void submitQuest(
      quest,
      {
        targetUrl: quest.targetUrl ?? "",
      },
      "Visit recorded.",
    );
  }

  return (
    <section className="panel">
      <div className="panel__header">
        <div>
          <p className="eyebrow">Quest actions</p>
          <h3>Submit work from the dashboard</h3>
        </div>
      </div>
      {!isAuthenticated ? (
        <p className="form-note">Sign in to submit quests and send manual-review items into the queue.</p>
      ) : null}
      <div className="quest-action-grid">
        {actionableQuests.map((quest) => {
          const disabled = !isAuthenticated || quest.status === "locked" || quest.status === "completed";
          const pending = pendingQuestId === quest.id;

          return (
            <article key={quest.id} className="quest-action-card">
              <div className="quest-card__meta">
                <span>{quest.verificationType}</span>
                <span>{quest.status}</span>
              </div>
              <h4>{quest.title}</h4>
              <p>{quest.description}</p>
              {quest.verificationType === "quiz" ? (
                <form className="form-stack" onSubmit={(event) => handleQuizSubmit(event, quest)}>
                  <label className="field">
                    <span>Correct answers</span>
                    <input
                      type="number"
                      min="0"
                      max="5"
                      value={answersCorrect[quest.id] ?? ""}
                      onChange={(event) =>
                        setAnswersCorrect((current) => ({ ...current, [quest.id]: event.target.value }))
                      }
                      disabled={disabled || pending}
                    />
                  </label>
                  <button className="button button--primary" type="submit" disabled={disabled || pending}>
                    {pending ? "Submitting..." : "Submit quiz"}
                  </button>
                </form>
              ) : null}
              {quest.verificationType === "manual-review" ? (
                <form className="form-stack" onSubmit={(event) => handleManualSubmit(event, quest)}>
                  <label className="field">
                    <span>Content URL</span>
                    <input
                      value={contentUrls[quest.id] ?? ""}
                      onChange={(event) =>
                        setContentUrls((current) => ({ ...current, [quest.id]: event.target.value }))
                      }
                      placeholder="https://..."
                      disabled={disabled || pending}
                    />
                  </label>
                  <label className="field">
                    <span>Reviewer note</span>
                    <input
                      value={notes[quest.id] ?? ""}
                      onChange={(event) => setNotes((current) => ({ ...current, [quest.id]: event.target.value }))}
                      placeholder="Optional context"
                      disabled={disabled || pending}
                    />
                  </label>
                  <button className="button button--primary" type="submit" disabled={disabled || pending}>
                    {pending ? "Submitting..." : "Send for review"}
                  </button>
                </form>
              ) : null}
              {quest.verificationType === "link-visit" ? (
                <div className="form-stack">
                  {quest.targetUrl ? (
                    <a className="button button--secondary" href={quest.targetUrl} target="_blank" rel="noreferrer">
                      Open link
                    </a>
                  ) : null}
                  <button
                    className="button button--primary"
                    type="button"
                    onClick={() => handleLinkVisit(quest)}
                    disabled={disabled || pending}
                  >
                    {pending ? "Submitting..." : "Record visit"}
                  </button>
                </div>
              ) : null}
              {disabled ? (
                <small className="form-note">
                  {quest.status === "locked"
                    ? "Unlock this quest by reaching the required level or tier."
                    : quest.status === "completed"
                      ? "This quest is already completed."
                      : "Sign in to submit."}
                </small>
              ) : null}
            </article>
          );
        })}
      </div>
      {message ? <p className="status status--success">{message}</p> : null}
      {progressUpdate ? (
        <div className="progress-feedback">
          <div className="panel__header">
            <div>
              <p className="eyebrow">Progress updated</p>
              <h3>{progressQuestTitle}</h3>
            </div>
          </div>
          <div className="profile-meta">
            <div className="info-card">
              <span>XP awarded</span>
              <strong>+{progressUpdate.deltaXp}</strong>
            </div>
            <div className="info-card">
              <span>Current level</span>
              <strong>{progressUpdate.level}</strong>
            </div>
            <div className="info-card">
              <span>Streak</span>
              <strong>{progressUpdate.currentStreak} days</strong>
            </div>
          </div>
          <small className="form-note">
            Total credited for this quest: {progressUpdate.xpAwarded} XP.
          </small>
        </div>
      ) : null}
      {error ? <p className="status status--error">{error}</p> : null}
    </section>
  );
}
