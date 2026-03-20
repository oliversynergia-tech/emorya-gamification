"use client";

import { useMemo, useState } from "react";

import { MissionLink } from "@/components/mission-link";
import type { DashboardData } from "@/lib/types";

export function MissionPackDetailPanel({
  activePacks,
  packHistory,
  title = "Mission detail",
  eyebrow = "Mission drill-in",
}: {
  activePacks: DashboardData["campaignPacks"];
  packHistory: DashboardData["campaignPackHistory"];
  title?: string;
  eyebrow?: string;
}) {
  const initialPackId = activePacks[0]?.packId ?? packHistory[0]?.packId ?? "none";
  const [selectedPackId, setSelectedPackId] = useState(initialPackId);
  const selectedActivePack = useMemo(
    () => activePacks.find((pack) => pack.packId === selectedPackId) ?? null,
    [activePacks, selectedPackId],
  );
  const selectedHistoryPack = useMemo(
    () => packHistory.find((pack) => pack.packId === selectedPackId) ?? null,
    [packHistory, selectedPackId],
  );
  const options = [
    ...activePacks.map((pack) => ({ packId: pack.packId, label: `${pack.label} · active` })),
    ...packHistory
      .filter((pack) => !activePacks.some((activePack) => activePack.packId === pack.packId))
      .map((pack) => ({ packId: pack.packId, label: `${pack.label} · completed` })),
  ];

  if (options.length === 0) {
    return null;
  }

  const remainingQuestProgression = selectedActivePack
    ? selectedActivePack.questStatuses
        .filter((quest) => quest.status !== "completed")
        .map((quest, index, remaining) => ({
          questId: quest.questId,
          title: quest.title,
          stage: index === 0 ? "Now" : index === 1 ? "Next" : "Later",
          dependencyProgressLabel: quest.dependencyProgressLabel,
          nextClearLabel:
            remaining[index + 1]?.title
              ? `Likely clears into ${remaining[index + 1]?.title}.`
              : `Likely clears into ${selectedActivePack.milestone.label.toLowerCase()}.`,
        }))
    : [];
  const dependencyGroups = remainingQuestProgression.reduce(
    (groups, quest) => {
      const label =
        quest.dependencyProgressLabel.toLowerCase().includes("wallet")
          ? "Wallet"
          : quest.dependencyProgressLabel.toLowerCase().includes("starter")
            ? "Starter path"
            : quest.dependencyProgressLabel.toLowerCase().includes("premium")
              ? "Premium"
              : quest.dependencyProgressLabel.toLowerCase().includes("recovery") ||
                  quest.dependencyProgressLabel.toLowerCase().includes("pace")
                ? "Recovery"
                : quest.dependencyProgressLabel.toLowerCase().includes("trust") ||
                    quest.dependencyProgressLabel.toLowerCase().includes("eligibility")
                  ? "Trust and eligibility"
                  : "Mission progression";
      const current = groups.get(label) ?? [];
      current.push(quest);
      groups.set(label, current);
      return groups;
    },
    new Map<string, typeof remainingQuestProgression>(),
  );

  return (
    <div className="panel panel--glass">
      <div className="panel__header">
        <div>
          <p className="eyebrow">{eyebrow}</p>
          <h3>{title}</h3>
        </div>
        <span className="badge">{options.length} packs</span>
      </div>
      <div className="review-actions">
        {options.map((option) => (
          <button
            key={option.packId}
            className={`button ${selectedPackId === option.packId ? "button--primary" : "button--secondary"}`}
            type="button"
            onClick={() => setSelectedPackId(option.packId)}
          >
            {option.label}
          </button>
        ))}
      </div>
      {selectedActivePack ? (
        <article className="achievement-card achievement-card--progress">
          <div>
            <strong>{selectedActivePack.label}</strong>
            <p>{selectedActivePack.nextAction}</p>
            <p className="form-note">{selectedActivePack.sequenceReason}</p>
            <p className="form-note">{selectedActivePack.unlockPreview}</p>
            <p className="form-note">{selectedActivePack.unlockRewardPreview}</p>
            <p className="form-note">{selectedActivePack.unlockOutcomePreview.xp}</p>
            <p className="form-note">{selectedActivePack.unlockOutcomePreview.eligibility}</p>
            {selectedActivePack.unlockOutcomePreview.premium ? (
              <p className="form-note">{selectedActivePack.unlockOutcomePreview.premium}</p>
            ) : null}
            {selectedActivePack.unlockOutcomePreview.directReward ? (
              <p className="form-note">{selectedActivePack.unlockOutcomePreview.directReward}</p>
            ) : null}
            <div className="achievement-list">
              {selectedActivePack.dependencySummary.map((dependency) => (
                <article key={`${selectedActivePack.packId}-${dependency.label}`} className="achievement-card">
                  <div>
                    <strong>{dependency.label}</strong>
                    <p>{dependency.detail}</p>
                  </div>
                </article>
              ))}
            </div>
            <p className="form-note">{selectedActivePack.rewardFocus}</p>
            {selectedActivePack.returnAction ? <p className="form-note">{selectedActivePack.returnAction}</p> : null}
            {selectedActivePack.returnAction ? (
              <p className="form-note">
                Return window: {selectedActivePack.returnWindow === "today" ? "today" : selectedActivePack.returnWindow === "this_week" ? "this week" : "wait for next unlock"}.
              </p>
            ) : null}
            {selectedActivePack.questStatuses.length > 0 ? (
              <div className="achievement-list">
                <article className="achievement-card achievement-card--progress">
                  <div>
                    <strong>Milestone summary</strong>
                    <p>
                      Clear the current <strong>now</strong> quest to move the pack toward {selectedActivePack.milestone.label.toLowerCase()}.
                    </p>
                    <p className="form-note">
                      {selectedActivePack.completedQuestCount}/{selectedActivePack.totalQuestCount} complete, with {selectedActivePack.openQuestCount} still open.
                    </p>
                  </div>
                </article>
                {remainingQuestProgression.map((quest) => (
                  <article key={`${selectedActivePack.packId}-progress-${quest.questId}`} className="achievement-card">
                    <div>
                      <strong>{quest.stage}: {quest.title}</strong>
                      <p>{quest.dependencyProgressLabel}</p>
                      <p className="form-note">{quest.nextClearLabel}</p>
                    </div>
                    <div className="achievement-card__side">
                      <span>{quest.stage}</span>
                    </div>
                  </article>
                ))}
                <article className="achievement-card achievement-card--progress">
                  <div>
                    <strong>Mission ladder</strong>
                    <p>The ladder starts with the current quest, then moves through the next unlocks until the pack milestone clears.</p>
                  </div>
                  <div className="achievement-card__side">
                    <span>{remainingQuestProgression.length} steps left</span>
                  </div>
                </article>
                {Array.from(dependencyGroups.entries()).map(([label, items]) => (
                  <article key={`${selectedActivePack.packId}-group-${label}`} className="achievement-card">
                    <div>
                      <strong>{label}</strong>
                      <p>{items.length} remaining step{items.length === 1 ? "" : "s"} in this dependency cluster.</p>
                      <p className="form-note">{items.map((item) => item.title).join(" -> ")}</p>
                    </div>
                  </article>
                ))}
                {selectedActivePack.questStatuses.map((quest) => (
                  <article key={quest.questId} className="achievement-card">
                    <div>
                      <strong>{quest.title}</strong>
                      <p className="form-note">
                        {quest.status === "completed"
                          ? "Now"
                          : quest.actionable
                            ? "Next"
                            : "Later"}
                      </p>
                      <p>
                        {quest.status === "completed"
                          ? "Already completed for this mission."
                          : quest.status === "in-progress"
                            ? "Currently in progress inside this mission."
                            : quest.status === "rejected"
                              ? "Needs a cleaner re-submit before this mission can move."
                              : quest.actionable
                                ? "This is ready to take right now."
                                : "This unlocks after the current mission step moves forward."}
                      </p>
                      <p className="form-note">
                        {quest.track} track. {quest.rewardLabel}
                      </p>
                      <p className="form-note">{quest.gateLabel}</p>
                      <p className="form-note">{quest.dependencyDetail}</p>
                      <p className="form-note">{quest.dependencyProgressLabel}</p>
                      <p className="form-note">
                        {quest.cadence} cadence. {quest.verificationType} verification.
                      </p>
                      <p className="form-note">{quest.nextHint}</p>
                      <p className="form-note">{quest.rewardTimingLabel}</p>
                      {quest.actionable ? <p className="form-note">{selectedActivePack.unlockRewardPreview}</p> : null}
                      {quest.actionable ? <p className="form-note">{selectedActivePack.unlockOutcomePreview.xp}</p> : null}
                    </div>
                    <div className="achievement-card__side">
                      <span>{quest.status.replace("-", " ")}</span>
                      <span>{quest.actionable ? "Ready now" : "Queued"}</span>
                    </div>
                  </article>
                ))}
              </div>
            ) : null}
          </div>
          <div className="achievement-card__side">
            <span>{selectedActivePack.completedQuestCount}/{selectedActivePack.totalQuestCount} complete</span>
            <span>{selectedActivePack.milestone.label}</span>
            <MissionLink
              className="button button--secondary"
              href={selectedActivePack.ctaHref ?? "#quest-board"}
              packId={selectedActivePack.packId}
              eventType="mission_detail_cta"
              ctaLabel={selectedActivePack.ctaLabel}
              ctaVariant={selectedActivePack.ctaVariant}
            >
              {selectedActivePack.ctaLabel}
            </MissionLink>
          </div>
        </article>
      ) : selectedHistoryPack ? (
        <article className="achievement-card achievement-card--progress">
          <div>
            <strong>{selectedHistoryPack.label}</strong>
            <p>{selectedHistoryPack.summary}</p>
          </div>
          <div className="achievement-card__side">
            <span>{selectedHistoryPack.totalXpAwarded} XP</span>
            <span>{selectedHistoryPack.approvedQuestCount} approved</span>
            <span>{selectedHistoryPack.completedAt ? new Date(selectedHistoryPack.completedAt).toLocaleDateString() : "Completed"}</span>
          </div>
        </article>
      ) : null}
    </div>
  );
}
