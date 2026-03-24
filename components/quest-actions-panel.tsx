"use client";

import { FormEvent, useMemo, useState } from "react";

import { getQuestStatusLabel, getQuestStatusNote } from "@/lib/quest-state";
import type { DashboardData, Quest, QuestProgressUpdate } from "@/lib/types";

type SubmissionState = Record<string, string>;
type ProofFileState = Record<string, File | null>;

function getTaskProofKey(questId: string, taskId: string) {
  return `${questId}::${taskId}`;
}

async function trackMissionSubmitAttempt(payload: {
  packId: string;
  eventType: string;
  ctaLabel: string;
  ctaVariant?: string;
  href: string;
}) {
  try {
    await fetch("/api/campaign-events", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
      keepalive: true,
    });
  } catch {
    // Ignore tracking failures and continue with submission.
  }
}

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
        ["quiz", "manual-review", "link-visit", "wallet-check", "api-check"].includes(quest.verificationType),
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
  const [proofFiles, setProofFiles] = useState<ProofFileState>({});
  const [taskContentUrls, setTaskContentUrls] = useState<SubmissionState>({});
  const [taskNotes, setTaskNotes] = useState<SubmissionState>({});
  const [taskProofFiles, setTaskProofFiles] = useState<ProofFileState>({});
  const [platforms, setPlatforms] = useState<SubmissionState>({});
  const [notes, setNotes] = useState<SubmissionState>({});
  const [walletSelections, setWalletSelections] = useState<SubmissionState>({});
  const [pendingQuestId, setPendingQuestId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [progressUpdate, setProgressUpdate] = useState<QuestProgressUpdate | null>(null);
  const [progressQuestTitle, setProgressQuestTitle] = useState<string | null>(null);

  const missionCelebration = useMemo(() => {
    if (!activeCampaignPack || !progressUpdate) {
      return null;
    }

    if (activeCampaignPack.milestone.label === "Pack complete") {
      return {
        title: `${activeCampaignPack.label} is complete`,
        detail: "That mission path is now closed out cleanly. This is the strongest moment to convert the momentum into referrals, premium lift, or another live pack.",
      };
    }

    if (activeCampaignPack.milestone.label === "Halfway complete") {
      return {
        title: `${activeCampaignPack.label} just hit halfway`,
        detail: "You now have enough mission momentum for the pack to start paying off more clearly in weekly pace, referrals, and premium pressure.",
      };
    }

    if (activeCampaignPack.milestone.label === "First mission cleared") {
      return {
        title: `${activeCampaignPack.label} is underway`,
        detail: "The first clean mission is in. That shifts this pack from intent into real progression.",
      };
    }

    return null;
  }, [activeCampaignPack, progressUpdate]);
  const missionCue = useMemo(() => {
    if (!activeCampaignPack) {
      return null;
    }
    if (activeCampaignPack.nextQuestActionable && activeCampaignPack.nextQuestTitle) {
      return {
        tone: "ready",
        badge: "Exact quest ready",
        note: `Next up: ${activeCampaignPack.nextQuestTitle} is ready now.`,
      } as const;
    }
    return {
      tone: "planning",
      badge: "Review mission path",
      note: "Review the mission path to see what opens next after this submission clears.",
    } as const;
  }, [activeCampaignPack]);

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

    if (
      activeCampaignPack &&
      activeCampaignPack.questStatuses.some((packQuest) => packQuest.questId === quest.id)
    ) {
      void trackMissionSubmitAttempt({
        packId: activeCampaignPack.packId,
        eventType: "quest_submit_attempt",
        ctaLabel: `Submit ${quest.title}`,
        ctaVariant: activeCampaignPack.ctaVariant,
        href: `#quest-action-${quest.id}`,
      });
    }

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
    void (async () => {
      let uploadedProof:
        | {
            url: string;
            name: string;
            type: string;
          }
        | null = null;

      const selectedProofFile = proofFiles[quest.id];
      const uploadedTaskProofs: Array<{
        taskId: string;
        url: string;
        name: string;
        type: string;
      }> = [];
      if (selectedProofFile) {
        setPendingQuestId(quest.id);
        setMessage(null);
        setError(null);
        const uploadForm = new FormData();
        uploadForm.append("file", selectedProofFile);

        try {
          const uploadResponse = await fetch("/api/uploads/quest-proof", {
            method: "POST",
            body: uploadForm,
          });
          const uploadResult = (await uploadResponse.json()) as {
            ok: boolean;
            error?: string;
            file?: {
              url: string;
              name: string;
              type: string;
            };
          };

          if (!uploadResponse.ok || !uploadResult.ok || !uploadResult.file) {
            setError(uploadResult.error ?? "Unable to upload proof file.");
            setPendingQuestId(null);
            return;
          }

          uploadedProof = uploadResult.file;
          setProofFiles((current) => ({ ...current, [quest.id]: null }));
        } catch {
          setError("Unable to upload the proof file.");
          setPendingQuestId(null);
          return;
        }
      }

      if (quest.taskBlocks?.length) {
        for (const task of quest.taskBlocks) {
          const proofKey = getTaskProofKey(quest.id, task.id);
          const selectedTaskProofFile = taskProofFiles[proofKey];
          if (!selectedTaskProofFile) {
            continue;
          }

          setPendingQuestId(quest.id);
          setMessage(null);
          setError(null);
          const uploadForm = new FormData();
          uploadForm.append("file", selectedTaskProofFile);

          try {
            const uploadResponse = await fetch("/api/uploads/quest-proof", {
              method: "POST",
              body: uploadForm,
            });
            const uploadResult = (await uploadResponse.json()) as {
              ok: boolean;
              error?: string;
              file?: {
                url: string;
                name: string;
                type: string;
              };
            };

            if (!uploadResponse.ok || !uploadResult.ok || !uploadResult.file) {
              setError(uploadResult.error ?? `Unable to upload proof for ${task.label}.`);
              setPendingQuestId(null);
              return;
            }

            uploadedTaskProofs.push({
              taskId: task.id,
              url: uploadResult.file.url,
              name: uploadResult.file.name,
              type: uploadResult.file.type,
            });
            setTaskProofFiles((current) => ({ ...current, [proofKey]: null }));
          } catch {
            setError(`Unable to upload proof for ${task.label}.`);
            setPendingQuestId(null);
            return;
          }
        }
      }

      const taskSubmissions =
        quest.taskBlocks?.map((task) => {
          const proofKey = getTaskProofKey(quest.id, task.id);
          const uploadedTaskProof = uploadedTaskProofs.find((proof) => proof.taskId === task.id);

          return {
            taskId: task.id,
            contentUrl: taskContentUrls[proofKey] ?? "",
            note: taskNotes[proofKey] ?? "",
            proofFileUrl: uploadedTaskProof?.url ?? "",
            proofFileName: uploadedTaskProof?.name ?? "",
            proofFileType: uploadedTaskProof?.type ?? "",
          };
        }) ?? [];

      await submitQuest(
        quest,
        {
          contentUrl: contentUrls[quest.id] ?? "",
          screenshotUrl: screenshotUrls[quest.id] ?? "",
          proofFileUrl: uploadedProof?.url ?? "",
          proofFileName: uploadedProof?.name ?? "",
          proofFileType: uploadedProof?.type ?? "",
          platform: platforms[quest.id] ?? "",
          note: notes[quest.id] ?? "",
          taskSubmissions,
        },
        "Manual review submitted.",
      );
    })();
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

  function handleApiCheckSubmit(event: FormEvent<HTMLFormElement>, quest: Quest) {
    event.preventDefault();
    void submitQuest(
      quest,
      {
        contentUrl: contentUrls[quest.id] ?? "",
        platform: platforms[quest.id] ?? "",
        note: notes[quest.id] ?? "",
      },
      "Verification submitted.",
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
        <p className="form-note">Sign in to submit quests and send manual-review or API-check items into the queue.</p>
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
              {quest.platformLabel || quest.proofType ? (
                <p className="form-note">
                  {quest.platformLabel ? `${quest.platformLabel}` : "Custom quest"}
                  {quest.platformLabel && quest.proofType ? " · " : ""}
                  {quest.proofType ? `Proof: ${quest.proofType}` : ""}
                </p>
              ) : null}
              {quest.proofInstructions ? <p className="form-note">{quest.proofInstructions}</p> : null}
              <small className="quest-card__note">{getQuestStatusNote(quest.status)}</small>
              {quest.targetUrl || quest.helpUrl || quest.verificationReferenceUrl ? (
                <div className="form-stack">
                  {quest.targetUrl ? (
                    <a className="button button--secondary" href={quest.targetUrl} target="_blank" rel="noreferrer">
                      {quest.ctaLabel ?? "Open quest"}
                    </a>
                  ) : null}
                  <div className="button-row">
                    {quest.helpUrl ? (
                      <a className="button button--secondary button--small" href={quest.helpUrl} target="_blank" rel="noreferrer">
                        Open help
                      </a>
                    ) : null}
                    {quest.verificationReferenceUrl ? (
                      <a
                        className="button button--secondary button--small"
                        href={quest.verificationReferenceUrl}
                        target="_blank"
                        rel="noreferrer"
                      >
                        Verification guide
                      </a>
                    ) : null}
                  </div>
                </div>
              ) : null}
              {quest.taskBlocks?.length ? (
                <div className="form-stack">
                  <p className="form-note">
                    {quest.taskBlocks.length} task step{quest.taskBlocks.length === 1 ? "" : "s"} in this quest.
                  </p>
                  {quest.taskBlocks.map((task, index) => (
                    <article key={task.id} className="info-card">
                      <div className="quest-card__meta">
                        <span>Step {index + 1}</span>
                        <span>{task.required === false ? "optional" : "required"}</span>
                      </div>
                      <strong>{task.label}</strong>
                      {task.description ? <p>{task.description}</p> : null}
                      {task.platformLabel || task.proofType ? (
                        <p className="form-note">
                          {task.platformLabel ? task.platformLabel : "Custom task"}
                          {task.platformLabel && task.proofType ? " · " : ""}
                          {task.proofType ? `Proof: ${task.proofType}` : ""}
                        </p>
                      ) : null}
                      {task.proofInstructions ? <p className="form-note">{task.proofInstructions}</p> : null}
                      {task.targetUrl || task.helpUrl || task.verificationReferenceUrl ? (
                        <div className="button-row">
                          {task.targetUrl ? (
                            <a className="button button--secondary button--small" href={task.targetUrl} target="_blank" rel="noreferrer">
                              {task.ctaLabel ?? "Open step"}
                            </a>
                          ) : null}
                          {task.helpUrl ? (
                            <a className="button button--secondary button--small" href={task.helpUrl} target="_blank" rel="noreferrer">
                              Open help
                            </a>
                          ) : null}
                          {task.verificationReferenceUrl ? (
                            <a className="button button--secondary button--small" href={task.verificationReferenceUrl} target="_blank" rel="noreferrer">
                              Verification guide
                            </a>
                          ) : null}
                        </div>
                      ) : null}
                    </article>
                  ))}
                </div>
              ) : null}
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
                  {quest.taskBlocks?.length ? (
                    <div className="form-stack">
                      <p className="form-note">
                        Add proof per task step. The main content URL can stay empty if the task submissions contain the evidence.
                      </p>
                      {quest.taskBlocks.map((task) => {
                        const proofKey = getTaskProofKey(quest.id, task.id);

                        return (
                          <article key={task.id} className="info-card">
                            <strong>{task.label}</strong>
                            <label className="field">
                              <span>Task URL or proof link</span>
                              <input
                                value={taskContentUrls[proofKey] ?? ""}
                                onChange={(event) =>
                                  setTaskContentUrls((current) => ({ ...current, [proofKey]: event.target.value }))
                                }
                                placeholder="https://..."
                                disabled={disabled || pending}
                              />
                            </label>
                            <label className="field">
                              <span>Task note</span>
                              <input
                                value={taskNotes[proofKey] ?? ""}
                                onChange={(event) =>
                                  setTaskNotes((current) => ({ ...current, [proofKey]: event.target.value }))
                                }
                                placeholder="Optional context for this step"
                                disabled={disabled || pending}
                              />
                            </label>
                            <label className="field">
                              <span>Task proof file</span>
                              <input
                                type="file"
                                accept="image/*,application/pdf,text/plain,video/mp4,video/quicktime"
                                onChange={(event) =>
                                  setTaskProofFiles((current) => ({
                                    ...current,
                                    [proofKey]: event.target.files?.[0] ?? null,
                                  }))
                                }
                                disabled={disabled || pending}
                              />
                            </label>
                            {taskProofFiles[proofKey] ? (
                              <p className="form-note">Selected proof: {taskProofFiles[proofKey]?.name}</p>
                            ) : null}
                          </article>
                        );
                      })}
                    </div>
                  ) : null}
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
                    <span>Proof file</span>
                    <input
                      type="file"
                      accept="image/*,application/pdf,text/plain,video/mp4,video/quicktime"
                      onChange={(event) =>
                        setProofFiles((current) => ({
                          ...current,
                          [quest.id]: event.target.files?.[0] ?? null,
                        }))
                      }
                      disabled={disabled || pending}
                    />
                  </label>
                  {proofFiles[quest.id] ? (
                    <p className="form-note">Selected proof: {proofFiles[quest.id]?.name}</p>
                  ) : null}
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
                  <button
                    className="button button--primary"
                    type="button"
                    onClick={() => handleLinkVisit(quest)}
                    disabled={disabled || pending}
                  >
                    {pending ? "Submitting..." : `Record ${quest.ctaLabel?.toLowerCase() ?? "visit"}`}
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
              {quest.verificationType === "api-check" ? (
                <form className="form-stack" onSubmit={(event) => handleApiCheckSubmit(event, quest)}>
                  <label className="field">
                    <span>Platform</span>
                    <input
                      value={platforms[quest.id] ?? ""}
                      onChange={(event) =>
                        setPlatforms((current) => ({ ...current, [quest.id]: event.target.value }))
                      }
                      placeholder="X, Discord, App Store..."
                      disabled={disabled || pending}
                    />
                  </label>
                  <label className="field">
                    <span>Reference URL or identifier</span>
                    <input
                      value={contentUrls[quest.id] ?? ""}
                      onChange={(event) =>
                        setContentUrls((current) => ({ ...current, [quest.id]: event.target.value }))
                      }
                      placeholder="https://... or external submission id"
                      disabled={disabled || pending}
                    />
                  </label>
                  <label className="field">
                    <span>Verification note</span>
                    <input
                      value={notes[quest.id] ?? ""}
                      onChange={(event) => setNotes((current) => ({ ...current, [quest.id]: event.target.value }))}
                      placeholder="Optional context for the verifier"
                      disabled={disabled || pending}
                    />
                  </label>
                  <button className="button button--primary" type="submit" disabled={disabled || pending}>
                    {pending ? "Verifying..." : "Run external verification"}
                  </button>
                </form>
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
      {message && !progressUpdate && activeCampaignPack && missionCue ? (
        <p className={`mission-cue mission-cue--${missionCue.tone}`}>
          <strong>{missionCue.badge}</strong> {missionCue.note}
        </p>
      ) : null}
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
              {missionCue ? (
                <p className={`mission-cue mission-cue--${missionCue.tone}`}>
                  <strong>{missionCue.badge}</strong> {missionCue.note}
                </p>
              ) : null}
              <small className="form-note">{activeCampaignPack.priorityReason}</small>
              <small className="form-note">{activeCampaignPack.unlockPreview}</small>
              {missionCelebration ? (
                <div className="achievement-card achievement-card--progress">
                  <div>
                    <strong>{missionCelebration.title}</strong>
                    <p>{missionCelebration.detail}</p>
                  </div>
                  <div className="achievement-card__side">
                    <span>{activeCampaignPack.badgeLabel}</span>
                    <span>{activeCampaignPack.completedQuestCount}/{activeCampaignPack.totalQuestCount}</span>
                  </div>
                </div>
              ) : null}
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
