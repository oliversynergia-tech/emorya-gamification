"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";

import { useShare } from "@/components/share-provider";
import { Tooltip } from "@/components/tooltip";
import {
  getPostSubmissionMessage,
  getQuestDisplayStatusMessage,
  getQuestHowToComplete,
  getSubmissionGuidance,
} from "@/lib/quest-help-content";
import { getTokenEffectLabel } from "@/lib/progression-rules";
import { getQuestStatusLabel } from "@/lib/quest-state";
import { getSharePreset } from "@/lib/share-presets";
import { tooltips, type TooltipKey } from "@/lib/tooltip-content";
import type { DashboardData, Quest, QuestCadence, QuestProgressUpdate, QuestStatus, VerificationType } from "@/lib/types";

type SubmissionState = Record<string, string>;
type ProofFileState = Record<string, File | null>;

function getTaskProofKey(questId: string, taskId: string) {
  return `${questId}::${taskId}`;
}

type MilestoneQuestSummary = {
  slug?: string;
  title: string;
};

type QuizSelectionState = Record<string, number[]>;
type QuizAttemptState = Record<
  string,
  {
    answersCorrect: number;
    totalQuestions: number;
    passScore: number;
  }
>;

function getQuestStatusTooltipKey(status: QuestStatus, cadence?: QuestCadence): TooltipKey {
  switch (status) {
    case "available":
      return "questStatusAvailable";
    case "locked":
      return "questStatusLocked";
    case "in-progress":
      return "questStatusPendingReview";
    case "rejected":
      return "questStatusRejected";
    case "completed":
      if (cadence === "daily") {
        return "questStatusResetsDaily";
      }
      if (cadence === "weekly") {
        return "questStatusResetsWeekly";
      }
      if (cadence === "monthly") {
        return "questStatusResetsMonthly";
      }
      return "questStatusCompletedOneTime";
    default:
      return "questStatusAvailable";
  }
}

function getVerificationTooltipKey(verificationType: VerificationType): TooltipKey {
  switch (verificationType) {
    case "link-visit":
      return "verificationLinkVisit";
    case "manual-review":
      return "verificationManualReview";
    case "completion-check":
      return "verificationLinkVisit";
    case "quiz":
      return "verificationQuiz";
    case "wallet-check":
      return "verificationWalletCheck";
    case "text-submission":
      return "verificationTextSubmission";
    case "api-check":
      return "verificationApiCheck";
    default:
      return "verificationLinkVisit";
  }
}

function getDifficultyTooltipKey(difficulty: Quest["difficulty"]): TooltipKey {
  switch (difficulty) {
    case "easy":
      return "difficultyEasy";
    case "medium":
      return "difficultyMedium";
    case "hard":
      return "difficultyHard";
    default:
      return "difficultyEasy";
  }
}

function getRecurrenceTooltipKey(cadence?: QuestCadence): TooltipKey | null {
  switch (cadence) {
    case "daily":
      return "questStatusResetsDaily";
    case "weekly":
      return "questStatusResetsWeekly";
    case "monthly":
      return "questStatusResetsMonthly";
    default:
      return null;
  }
}

function getQuestMilestoneCelebration(quest: MilestoneQuestSummary | null, progressUpdate: QuestProgressUpdate | null) {
  if (!quest || !progressUpdate || !quest.slug) {
    return null;
  }

  switch (quest.slug) {
    case "complete-the-full-activation-ladder":
      return {
        tone: "success" as const,
        badge: "Activation complete",
        title: "The account is now fully activated",
        detail:
          "Setup is complete and the strongest parts of the experience are now open.",
      };
    case "connect-your-xportal-wallet":
      return {
        tone: "success" as const,
        badge: "Wallet linked",
        title: "xPortal is now connected",
        detail:
          "That unlocks a smoother path into optional wallet-based quests and the next parts of the platform.",
      };
    case "convert-your-first-calories":
      return {
        tone: "success" as const,
        badge: "First conversion",
        title: "First calorie conversion completed",
        detail:
          "Setup is complete and real product progress is now underway.",
      };
    case "upgrade-to-premium-monthly":
      return {
        tone: "success" as const,
        badge: "Premium live",
        title: "Monthly premium is now live",
        detail:
          "Your weekly XP progress and member benefits should feel stronger from here.",
      };
    case "upgrade-to-annual":
      return {
        tone: "success" as const,
        badge: "Annual unlocked",
        title: "Annual commitment reached",
        detail:
          "You have unlocked the strongest long-term version of the experience.",
      };
    case "stake-your-first-emr":
      return {
        tone: "success" as const,
        badge: "First stake",
        title: "The staking lane has started",
        detail:
          "You have started the staking path and opened the door to the milestones that come with it.",
      };
    case "reach-staking-threshold-a":
      return {
        tone: "success" as const,
        badge: "Threshold A",
        title: "First meaningful staking threshold reached",
        detail:
          "That is the first meaningful staking milestone and a clear sign of deeper commitment.",
      };
    case "reach-staking-threshold-b":
      return {
        tone: "success" as const,
        badge: "Threshold B",
        title: "Second staking threshold reached",
        detail:
          "That moves you into a stronger staking tier with bigger long-term significance.",
      };
    case "unlock-apy-boost-status":
      return {
        tone: "success" as const,
        badge: "APY boost",
        title: "APY boost status unlocked",
        detail:
          "Your staking status now unlocks stronger future reward readiness.",
      };
    case "weekly-warrior":
      return {
        tone: "success" as const,
        badge: "7-day streak",
        title: "Weekly Warrior completed",
        detail:
          "A full week of consistency is complete and the streak is holding strong.",
      };
    case "emorya-marathon":
      return {
        tone: "success" as const,
        badge: "Marathon clear",
        title: "Emorya Marathon completed",
        detail:
          "That is a big consistency milestone and one of the clearest signs of real long-term progress.",
      };
    default:
      return null;
  }
}

const milestoneTriggers: Record<string, string> = {
  "convert-your-first-calories": "first_calorie_conversion",
  "weekly-warrior": "weekly_warrior_complete",
  "upgrade-to-premium-monthly": "premium_unlock",
  "emorya-marathon": "marathon_complete",
  "accountability-duo": "duo_completion",
};

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
        ["quiz", "manual-review", "link-visit", "completion-check", "wallet-check", "api-check", "text-submission"].includes(quest.verificationType),
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
  const [quizSelections, setQuizSelections] = useState<QuizSelectionState>({});
  const [quizAttemptResults, setQuizAttemptResults] = useState<QuizAttemptState>({});
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
  const [expandedHelp, setExpandedHelp] = useState<Record<string, boolean>>({});
  const [progressUpdate, setProgressUpdate] = useState<QuestProgressUpdate | null>(null);
  const [progressQuest, setProgressQuest] = useState<Pick<Quest, "slug" | "title"> | null>(null);
  const [progressQuestTitle, setProgressQuestTitle] = useState<string | null>(null);
  const [progressQuestXp, setProgressQuestXp] = useState<number | null>(null);
  const { openShareModal, shareProfile } = useShare();
  const lastAutoShareSignatureRef = useRef<string | null>(null);

  const missionCelebration = useMemo(() => {
    if (!activeCampaignPack || !progressUpdate) {
      return null;
    }

    if (activeCampaignPack.milestone.label === "Pack complete") {
      return {
        title: `${activeCampaignPack.label} is complete`,
        detail: "That quest path is now closed out cleanly. This is the strongest moment to convert the momentum into referrals, premium lift, or another live pack.",
      };
    }

    if (activeCampaignPack.milestone.label === "Halfway complete") {
      return {
        title: `${activeCampaignPack.label} just hit halfway`,
        detail: "You now have enough quest momentum for the pack to show more clearly in weekly pace, referrals, and premium pressure.",
      };
    }

    if (activeCampaignPack.milestone.label === "First quest cleared") {
      return {
        title: `${activeCampaignPack.label} is underway`,
        detail: "The first clean quest is in. That shifts this pack from intent into real progression.",
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
        badge: "Next quest ready",
        note: `Next up: ${activeCampaignPack.nextQuestTitle} is ready now.`,
      } as const;
    }
    return {
      tone: "planning",
      badge: "Next step pending",
      note: "Your next quest step will open once this submission clears review.",
    } as const;
  }, [activeCampaignPack]);
  const questMilestoneCelebration = useMemo(
    () => getQuestMilestoneCelebration(progressQuest, progressUpdate),
    [progressQuest, progressUpdate],
  );

  useEffect(() => {
    if (!progressQuest?.slug || !progressUpdate || !shareProfile) {
      return;
    }

    const milestoneKey = milestoneTriggers[progressQuest.slug];

    if (!milestoneKey) {
      return;
    }

    const signature = [
      progressQuest.slug,
      progressUpdate.level,
      progressUpdate.currentStreak,
      progressUpdate.deltaXp,
      progressUpdate.xpAwarded,
    ].join(":");

    if (lastAutoShareSignatureRef.current === signature) {
      return;
    }

    lastAutoShareSignatureRef.current = signature;
    openShareModal(getSharePreset(milestoneKey, shareProfile.displayName, shareProfile.profileUrl));
  }, [openShareModal, progressQuest?.slug, progressUpdate, shareProfile]);

  async function submitQuest(
    quest: Quest,
    payload: Record<string, unknown>,
    resolveMessage?: (result: {
      outcome?: "approved" | "pending" | "rejected";
      progressUpdate?: QuestProgressUpdate | null;
    }) => string,
  ) {
    setPendingQuestId(quest.id);
    setMessage(null);
    setError(null);
    setProgressUpdate(null);
    setProgressQuest(null);
    setProgressQuestTitle(null);
    setProgressQuestXp(null);

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

      setMessage(resolveMessage ? resolveMessage(result) : result.message ?? getPostSubmissionMessage(quest, {}));
      setProgressUpdate(result.progressUpdate ?? null);
      setProgressQuest(result.progressUpdate ? { slug: quest.slug, title: quest.title } : null);
      setProgressQuestTitle(result.progressUpdate ? quest.title : null);
      setProgressQuestXp(result.progressUpdate ? quest.xpReward : null);
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

  function setQuizSelection(questId: string, questionIndex: number, optionIndex: number) {
    setQuizSelections((current) => {
      const nextSelections = [...(current[questId] ?? [])];
      nextSelections[questionIndex] = optionIndex;
      return {
        ...current,
        [questId]: nextSelections,
      };
    });
    setQuizAttemptResults((current) => {
      if (!current[questId]) {
        return current;
      }

      const nextResults = { ...current };
      delete nextResults[questId];
      return nextResults;
    });
    setError(null);
    setMessage(null);
  }

  function resetQuizAttempt(questId: string) {
    setQuizSelections((current) => {
      if (!current[questId]) {
        return current;
      }

      const nextSelections = { ...current };
      delete nextSelections[questId];
      return nextSelections;
    });
    setQuizAttemptResults((current) => {
      if (!current[questId]) {
        return current;
      }

      const nextResults = { ...current };
      delete nextResults[questId];
      return nextResults;
    });
    setError(null);
    setMessage(null);
  }

  function handleQuizSubmit(event: FormEvent<HTMLFormElement>, quest: Quest) {
    event.preventDefault();

    if (quest.questions?.length) {
      const selections = quizSelections[quest.id] ?? [];
      const totalQuestions = quest.questions.length;
      const passScore = Math.min(Math.max(quest.quizPassScore ?? totalQuestions, 1), totalQuestions);

      if (selections.length < totalQuestions || selections.some((selection) => !Number.isInteger(selection))) {
        setError("Answer every question before submitting the quiz.");
        setMessage(null);
        return;
      }

      const answersCorrect = quest.questions.reduce((score, question, index) => {
        return score + (selections[index] === question.correctIndex ? 1 : 0);
      }, 0);

      if (answersCorrect < passScore) {
        setQuizAttemptResults((current) => ({
          ...current,
          [quest.id]: {
            answersCorrect,
            totalQuestions,
            passScore,
          },
        }));
        setMessage(null);
        setProgressUpdate(null);
        setProgressQuest(null);
        setProgressQuestTitle(null);
        setProgressQuestXp(null);
        setError(null);
        return;
      }

      setQuizAttemptResults((current) => {
        if (!current[quest.id]) {
          return current;
        }

        const nextResults = { ...current };
        delete nextResults[quest.id];
        return nextResults;
      });

      void submitQuest(
        quest,
        {
          answersCorrect,
        },
        () =>
          getPostSubmissionMessage(quest, {
            passed: true,
            score: answersCorrect,
            total: totalQuestions,
          }),
      );
      return;
    }

    void submitQuest(
      quest,
      {
        answersCorrect: answersCorrect[quest.id] ?? "",
      },
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
      );
    })();
  }

  function handleLinkVisit(quest: Quest) {
    void submitQuest(
      quest,
      {
        targetUrl: quest.targetUrl ?? "",
      },
      () => getPostSubmissionMessage(quest, { success: true }),
    );
  }

  function handleCompletionCheck(quest: Quest) {
    void submitQuest(
      quest,
      {},
      () => getPostSubmissionMessage(quest, { success: true }),
    );
  }

  function handleWalletCheck(quest: Quest) {
    void submitQuest(
      quest,
      {
        walletAddress: walletSelections[quest.id] ?? "",
      },
      () => getPostSubmissionMessage(quest, { success: true }),
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
      (result) =>
        getPostSubmissionMessage(quest, {
          verified: result.outcome === "approved",
        }),
    );
  }

  function handleTextSubmit(event: FormEvent<HTMLFormElement>, quest: Quest) {
    event.preventDefault();
    void submitQuest(
      quest,
      {
        response: notes[quest.id] ?? "",
        referenceUrl: contentUrls[quest.id] ?? "",
        platform: platforms[quest.id] ?? "",
      },
    );
  }

  return (
    <section className="panel" id="quest-actions" role="region" aria-labelledby="quest-actions-title" aria-busy={Boolean(pendingQuestId)}>
      <div className="panel__header">
        <div>
          <p className="eyebrow">Quest actions</p>
          <h2 id="quest-actions-title">Submit quests and keep your progress moving</h2>
        </div>
      </div>
      {!isAuthenticated ? (
        <p className="form-note">Sign in to submit quests, upload proof when needed, and track what happens next.</p>
      ) : null}
      <div className="quest-action-grid">
        {actionableQuests.map((quest) => {
          const disabled = !isAuthenticated || quest.status === "locked" || quest.status === "completed";
          const pending = pendingQuestId === quest.id;
          const recurrenceTooltipKey = getRecurrenceTooltipKey(quest.cadence);
          const submissionGuidance = getSubmissionGuidance(quest);
          const howToText = getQuestHowToComplete(quest);
          const isHelpExpanded = expandedHelp[quest.id] ?? false;

          return (
            <article
              key={quest.id}
              id={`quest-action-${quest.id}`}
              className={`quest-action-card quest-card--state-${quest.status} ${highlightedQuestId === quest.id ? "quest-action-card--highlighted" : ""}`}
            >
              <div className="quest-card__meta">
                <span className="label-with-tooltip">
                  <span>{quest.verificationType}</span>
                  <Tooltip text={tooltips[getVerificationTooltipKey(quest.verificationType)]} />
                </span>
                <span className="label-with-tooltip">
                  <span>{getQuestStatusLabel(quest.status)}</span>
                  <Tooltip text={tooltips[getQuestStatusTooltipKey(quest.status, quest.cadence)]} />
                </span>
                <span className="label-with-tooltip">
                  <span>{quest.difficulty}</span>
                  <Tooltip text={tooltips[getDifficultyTooltipKey(quest.difficulty)]} />
                </span>
              </div>
              <h4>{quest.title}</h4>
              <p>{quest.description}</p>
              <div className="quest-help-disclosure">
                <button
                  className="quest-help-disclosure__toggle"
                  type="button"
                  aria-expanded={isHelpExpanded}
                  aria-controls={`quest-help-${quest.id}`}
                  onClick={() =>
                    setExpandedHelp((current) => ({
                      ...current,
                      [quest.id]: !isHelpExpanded,
                    }))
                  }
                >
                  <span>How to complete</span>
                  <span aria-hidden="true">{isHelpExpanded ? "▾" : "▸"}</span>
                </button>
                {isHelpExpanded ? (
                  <p id={`quest-help-${quest.id}`} className="quest-help-disclosure__body">
                    {howToText}
                  </p>
                ) : null}
              </div>
              <p className="form-note">
                <span className="label-with-tooltip">
                  <span>{quest.xpReward} XP</span>
                  <Tooltip text={tooltips.xp} />
                </span>
                {quest.tokenEffect && quest.tokenEffect !== "none" ? (
                  <>
                    {" · "}
                    <span className="label-with-tooltip">
                      <span>{getTokenEffectLabel(quest)}</span>
                      <Tooltip text={tooltips.eligibilityPoints} />
                    </span>
                  </>
                ) : null}
                {quest.premiumPreview ? (
                  <>
                    {" · "}
                    <span className="label-with-tooltip">
                      <span>Premium preview</span>
                      <Tooltip text={tooltips.premiumPreview} />
                    </span>
                  </>
                ) : null}
                {recurrenceTooltipKey ? (
                  <>
                    {" · "}
                    <span className="label-with-tooltip">
                      <span>{quest.cadence}</span>
                      <Tooltip text={tooltips[recurrenceTooltipKey]} />
                    </span>
                  </>
                ) : null}
              </p>
              {quest.platformLabel || quest.proofType ? (
                <p className="form-note">
                  {quest.platformLabel ? `${quest.platformLabel}` : "Custom quest"}
                  {quest.platformLabel && quest.proofType ? " · " : ""}
                  {quest.proofType ? `Proof: ${quest.proofType}` : ""}
                </p>
              ) : null}
              {quest.proofInstructions ? <p className="form-note">{quest.proofInstructions}</p> : null}
              {quest.submissionEvidence?.length ? (
                <div className="form-stack">
                  <p className="form-note">Evidence to submit:</p>
                  <ul className="form-note" aria-label={`Submission guidance for ${quest.title}`}>
                    {quest.submissionEvidence.map((evidence) => (
                      <li key={evidence}>{evidence}</li>
                    ))}
                  </ul>
                </div>
              ) : null}
              <div className="form-stack">
                <small className="quest-card__note">{getQuestDisplayStatusMessage(quest)}</small>
                {quest.status === "rejected" ? (
                  <p className="form-note">
                    Need help? <Link href="/faq">See our FAQ</Link>.
                  </p>
                ) : null}
              </div>
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
                    {quest.taskBlocks.length} proof step{quest.taskBlocks.length === 1 ? "" : "s"} in this quest.
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
                          {task.platformLabel ? task.platformLabel : "Custom step"}
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
                  <p className="form-note">{howToText}</p>
                  {quest.questions?.length ? (
                    <>
                      <div className="quiz-stack" role="group" aria-label={`${quest.title} quiz questions`}>
                        {quest.questions.map((question, questionIndex) => {
                          const selectedOption = quizSelections[quest.id]?.[questionIndex];

                          return (
                            <fieldset key={question.id} className="quiz-question" disabled={disabled || pending}>
                              <legend>
                                <span className="eyebrow">Question {questionIndex + 1}</span>
                                <strong>{question.text}</strong>
                              </legend>
                              <div className="quiz-options">
                                {question.options.map((option, optionIndex) => {
                                  const checked = selectedOption === optionIndex;
                                  const inputId = `${quest.id}-${question.id}-${optionIndex}`;

                                  return (
                                    <label
                                      key={inputId}
                                      className={`quiz-option${checked ? " quiz-option--selected" : ""}`}
                                      htmlFor={inputId}
                                    >
                                      <input
                                        id={inputId}
                                        type="radio"
                                        name={`${quest.id}-${question.id}`}
                                        checked={checked}
                                        onChange={() => setQuizSelection(quest.id, questionIndex, optionIndex)}
                                        disabled={disabled || pending}
                                      />
                                      <span>{option}</span>
                                    </label>
                                  );
                                })}
                              </div>
                            </fieldset>
                          );
                        })}
                      </div>
                      {quizAttemptResults[quest.id] ? (
                        <div className="status status--warning" role="status" aria-live="polite">
                          <p>
                            {getPostSubmissionMessage(quest, {
                              passed: false,
                              score: quizAttemptResults[quest.id].answersCorrect,
                              total: quizAttemptResults[quest.id].totalQuestions,
                            })}
                          </p>
                          <button
                            className="button button--secondary button--small"
                            type="button"
                            onClick={() => resetQuizAttempt(quest.id)}
                          >
                            Retry quiz
                          </button>
                        </div>
                      ) : null}
                      <button
                        className="button button--primary"
                        type="submit"
                        disabled={
                          disabled ||
                          pending ||
                          (quizSelections[quest.id]?.length ?? 0) < quest.questions.length ||
                          quest.questions.some((_, index) => !Number.isInteger(quizSelections[quest.id]?.[index]))
                        }
                      >
                        {pending ? "Submitting..." : "Submit quiz"}
                      </button>
                    </>
                  ) : (
                    <>
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
                    </>
                  )}
                </form>
              ) : null}
              {quest.verificationType === "manual-review" ? (
                <form className="form-stack" onSubmit={(event) => handleManualSubmit(event, quest)}>
                  {submissionGuidance ? <p className="form-note">{submissionGuidance}</p> : null}
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
                        Add proof per step. The main content URL can stay empty if the step submissions contain the evidence.
                      </p>
                      {quest.taskBlocks.map((task) => {
                        const proofKey = getTaskProofKey(quest.id, task.id);

                        return (
                          <article key={task.id} className="info-card">
                            <strong>{task.label}</strong>
                            <label className="field">
                              <span>Step URL or proof link</span>
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
                              <span>Step note</span>
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
                              <span>Step proof file</span>
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
                  <p className="form-note">{howToText}</p>
                  <button
                    className="button button--primary"
                    type="button"
                    onClick={() => handleLinkVisit(quest)}
                    disabled={disabled || pending}
                    aria-label={`Record ${quest.ctaLabel?.toLowerCase() ?? "visit"} for ${quest.title}`}
                  >
                    {pending ? "Submitting..." : `Record ${quest.ctaLabel?.toLowerCase() ?? "visit"}`}
                  </button>
                </div>
              ) : null}
              {quest.verificationType === "completion-check" ? (
                <div className="form-stack">
                  <p className="form-note">{howToText}</p>
                  <button
                    className="button button--primary"
                    type="button"
                    onClick={() => handleCompletionCheck(quest)}
                    disabled={disabled || pending}
                    aria-label={`Confirm activation progress for ${quest.title}`}
                  >
                    {pending ? "Checking..." : quest.ctaLabel ?? "Confirm Activation"}
                  </button>
                </div>
              ) : null}
              {quest.verificationType === "wallet-check" ? (
                <div className="form-stack">
                  <p className="form-note">{howToText}</p>
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
                    aria-label={`Verify linked wallet for ${quest.title}`}
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
                  <p className="form-note">{howToText}</p>
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
                  <button className="button button--primary" type="submit" disabled={disabled || pending} aria-label={`Run external verification for ${quest.title}`}>
                    {pending ? "Verifying..." : "Run external verification"}
                  </button>
                </form>
              ) : null}
              {quest.verificationType === "text-submission" ? (
                <form className="form-stack" onSubmit={(event) => handleTextSubmit(event, quest)}>
                  {submissionGuidance ? <p className="form-note">{submissionGuidance}</p> : null}
                  <label className="field">
                    <span>Platform</span>
                    <input
                      value={platforms[quest.id] ?? ""}
                      onChange={(event) =>
                        setPlatforms((current) => ({ ...current, [quest.id]: event.target.value }))
                      }
                      placeholder="Referral, X, Discord, App Store..."
                      disabled={disabled || pending}
                    />
                  </label>
                  <label className="field">
                    <span>Reference URL</span>
                    <input
                      value={contentUrls[quest.id] ?? ""}
                      onChange={(event) =>
                        setContentUrls((current) => ({ ...current, [quest.id]: event.target.value }))
                      }
                      placeholder="Optional https://..."
                      disabled={disabled || pending}
                    />
                  </label>
                  <label className="field">
                    <span>Your response</span>
                    <textarea
                      rows={4}
                      value={notes[quest.id] ?? ""}
                      onChange={(event) => setNotes((current) => ({ ...current, [quest.id]: event.target.value }))}
                      placeholder="Write your answer, summary, proof explanation, or referral details..."
                      disabled={disabled || pending}
                    />
                  </label>
                  <button className="button button--primary" type="submit" disabled={disabled || pending} aria-label={`Send text submission for ${quest.title}`}>
                    {pending ? "Submitting..." : "Send text submission"}
                  </button>
                </form>
              ) : null}
              {disabled ? (
                <small className="form-note">
                  {quest.status === "locked"
                    ? getQuestDisplayStatusMessage(quest)
                    : quest.status === "completed"
                      ? getQuestDisplayStatusMessage(quest)
                      : "Sign in to submit."}
                </small>
              ) : null}
            </article>
          );
        })}
      </div>
      {message ? <p className="status status--success" role="status" aria-live="polite">{message}</p> : null}
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
          {shareProfile && progressQuestTitle && progressQuestXp !== null ? (
            <div className="share-inline-actions">
              <button
                type="button"
                className="button button--secondary"
                onClick={() =>
                  openShareModal({
                    title: `Quest Complete: ${progressQuestTitle}`,
                    message: `Just completed "${progressQuestTitle}" on Emorya for ${progressQuestXp} XP.`,
                    hashtags: ["Emorya"],
                    profileUrl: shareProfile.profileUrl,
                    milestone: "quest_complete",
                  })
                }
              >
                Share this
              </button>
            </div>
          ) : null}
          {questMilestoneCelebration ? (
            <article className={`milestone-celebration milestone-celebration--${questMilestoneCelebration.tone}`}>
              <div>
                <p className="eyebrow">{questMilestoneCelebration.badge}</p>
                <h4>{questMilestoneCelebration.title}</h4>
                <p>{questMilestoneCelebration.detail}</p>
              </div>
            </article>
          ) : null}
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
      {error ? <p className="status status--error" role="alert">{error}</p> : null}
    </section>
  );
}
