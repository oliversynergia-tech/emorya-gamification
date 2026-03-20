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
