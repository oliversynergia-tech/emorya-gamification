"use client";

import { FormEvent, useMemo, useState } from "react";

import { getQuestStatusLabel, getQuestStatusNote } from "@/lib/quest-state";
import type { DashboardData, Quest, QuestProgressUpdate } from "@/lib/types";

type SubmissionState = Record<string, string>;

export function QuestActionsPanel({
  quests,
  isAuthenticated,
  walletAddresses = [],
  highlightedQuestId = null,
  activeCampaignPack = null,
  onQuestResult,
}: {
  quests: Quest[];
  isAuthenticated: boolean;
  walletAddresses?: string[];
  highlightedQuestId?: string | null;
  activeCampaignPack?: DashboardData["campaignPacks"][number] | null;
  onQuestResult?: (result: {
    questId: string;
    outcome: "approved" | "pending" | "rejected";
    progressUpdate: QuestProgressUpdate | null;
  }) => void;
}) {
  const actionableQuests = useMemo(
    () =>
      quests.filter((quest) =>
        ["quiz", "manual-review", "link-visit", "wallet-check"].includes(quest.verificationType),
      ).sort((left, right) => {
        if (highlightedQuestId && left.id === highlightedQuestId) {
          return -1;
        }

        if (highlightedQuestId && right.id === highlightedQuestId) {
          return 1;
        }

        return Number(Boolean(right.recommended)) - Number(Boolean(left.recommended));
      }),
    [highlightedQuestId, quests],
  );
  const [answersCorrect, setAnswersCorrect] = useState<SubmissionState>({});
  const [contentUrls, setContentUrls] = useState<SubmissionState>({});
  const [screenshotUrls, setScreenshotUrls] = useState<SubmissionState>({});
  const [platforms, setPlatforms] = useState<SubmissionState>({});
  const [notes, setNotes] = useState<SubmissionState>({});
  const [walletSelections, setWalletSelections] = useState<SubmissionState>({});
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
        screenshotUrl: screenshotUrls[quest.id] ?? "",
        platform: platforms[quest.id] ?? "",
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

  function handleWalletCheck(quest: Quest) {
    void submitQuest(
      quest,
      {
        walletAddress: walletSelections[quest.id] ?? "",
      },
      "Wallet quest submitted.",
    );
  }

  return (
    <section className="panel" id="quest-actions">
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
            <article
              key={quest.id}
              id={`quest-action-${quest.id}`}
              className={`quest-action-card quest-card--state-${quest.status} ${highlightedQuestId === quest.id ? "quest-action-card--highlighted" : ""}`}
            >
              <div className="quest-card__meta">
                <span>{quest.verificationType}</span>
                <span>{getQuestStatusLabel(quest.status)}</span>
              </div>
              <h4>{quest.title}</h4>
              <p>{quest.description}</p>
              <small className="quest-card__note">{getQuestStatusNote(quest.status)}</small>
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
                    <span>Platform</span>
                    <input
                      value={platforms[quest.id] ?? ""}
                      onChange={(event) =>
                        setPlatforms((current) => ({ ...current, [quest.id]: event.target.value }))
                      }
                      placeholder="X, TikTok, Instagram..."
                      disabled={disabled || pending}
                    />
                  </label>
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
                    <span>Screenshot URL</span>
                    <input
                      value={screenshotUrls[quest.id] ?? ""}
                      onChange={(event) =>
                        setScreenshotUrls((current) => ({ ...current, [quest.id]: event.target.value }))
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
              {quest.verificationType === "wallet-check" ? (
                <div className="form-stack">
                  <label className="field">
                    <span>Linked wallet</span>
                    <select
                      value={walletSelections[quest.id] ?? (walletAddresses.length === 1 ? walletAddresses[0] : "")}
                      onChange={(event) =>
                        setWalletSelections((current) => ({ ...current, [quest.id]: event.target.value }))
                      }
                      disabled={disabled || pending || walletAddresses.length === 0}
                    >
                      <option value="">Select linked wallet</option>
                      {walletAddresses.map((walletAddress) => (
                        <option key={walletAddress} value={walletAddress}>
                          {walletAddress}
                        </option>
                      ))}
                    </select>
                  </label>
                  <button
                    className="button button--primary"
                    type="button"
                    onClick={() => handleWalletCheck(quest)}
                    disabled={disabled || pending || walletAddresses.length === 0}
                  >
                    {pending ? "Submitting..." : "Verify linked wallet"}
                  </button>
                  {walletAddresses.length === 0 ? (
                    <small className="form-note">Link a MultiversX wallet in Profile or Auth before submitting this quest.</small>
                  ) : null}
                </div>
              ) : null}
              {disabled ? (
                <small className="form-note">
                  {quest.status === "locked"
                    ? quest.unlockHint ?? "Unlock this quest by reaching the required level or tier."
                    : quest.status === "completed"
                      ? "This quest is already approved and cannot be resubmitted."
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
          {activeCampaignPack ? (
            <>
              <small className="form-note">
                {activeCampaignPack.label}: {activeCampaignPack.milestone.label}. {activeCampaignPack.sequenceReason}
              </small>
              {activeCampaignPack.premiumNudge ? (
                <small className="form-note">{activeCampaignPack.premiumNudge}</small>
              ) : null}
            </>
          ) : null}
          {progressUpdate.unlockedAchievements?.length ? (
            <small className="form-note">
              Unlocked: {progressUpdate.unlockedAchievements.join(", ")}
            </small>
          ) : null}
        </div>
      ) : null}
      {error ? <p className="status status--error">{error}</p> : null}
    </section>
  );
}
