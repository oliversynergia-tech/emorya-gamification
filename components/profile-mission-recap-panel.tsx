"use client";

import { useMemo, useState } from "react";

import { MissionLink } from "@/components/mission-link";
import type { DashboardCampaignPack, DashboardCampaignPackHistory } from "@/lib/types";

type MissionRecapView = "active" | "completed" | "reward";

function isRewardBearingPack(pack: DashboardCampaignPack) {
  return Boolean(pack.directRewardSummary || pack.directRewardState || pack.premiumNudge);
}

function isRewardBearingHistory(pack: DashboardCampaignPackHistory) {
  return pack.premiumQuestCount > 0 || pack.referralQuestCount > 0;
}

export function ProfileMissionRecapPanel({
  activePacks,
  packHistory,
}: {
  activePacks: DashboardCampaignPack[];
  packHistory: DashboardCampaignPackHistory[];
}) {
  const [view, setView] = useState<MissionRecapView>("active");

  const filtered = useMemo(() => {
    if (view === "completed") {
      return {
        active: [],
        history: packHistory,
      };
    }

    if (view === "reward") {
      return {
        active: activePacks.filter(isRewardBearingPack),
        history: packHistory.filter(isRewardBearingHistory),
      };
    }

    return {
      active: activePacks,
      history: packHistory,
    };
  }, [activePacks, packHistory, view]);

  return (
    <div className="panel" id="mission-recap">
      <div className="panel__header">
        <div>
          <p className="eyebrow">Mission recap</p>
          <h3>Campaign progress outside the dashboard</h3>
        </div>
        <span className="badge badge--pink">
          {view === "completed"
            ? `${filtered.history.length} archived`
            : view === "reward"
              ? `${filtered.active.length + filtered.history.length} reward-bearing`
              : `${filtered.active.length} active`}
        </span>
      </div>
      <div className="review-actions">
        <button className={`button ${view === "active" ? "button--primary" : "button--secondary"}`} type="button" onClick={() => setView("active")}>
          Active packs
        </button>
        <button className={`button ${view === "completed" ? "button--primary" : "button--secondary"}`} type="button" onClick={() => setView("completed")}>
          Completed packs
        </button>
        <button className={`button ${view === "reward" ? "button--primary" : "button--secondary"}`} type="button" onClick={() => setView("reward")}>
          Reward-bearing
        </button>
      </div>
      {filtered.active.length > 0 ? (
        <div className="achievement-list">
          {filtered.active.map((pack) => (
            <article key={`profile-pack-${pack.packId}`} className={`achievement-card ${pack.urgency ? "achievement-card--urgent" : ""}`}>
              <div>
                <strong>{pack.label}</strong>
                <p>{pack.nextAction}</p>
                <p className="form-note">{pack.tierPhaseCopy}</p>
                <p className="form-note">
                  {pack.completedQuestCount}/{pack.totalQuestCount} missions complete. {pack.sequenceReason}
                </p>
                {pack.returnAction ? <p className="form-note">{pack.returnAction}</p> : null}
              </div>
                <div className="achievement-card__side">
                  <span>{pack.badgeLabel}</span>
                  <span>{pack.weeklyGoal.targetXp} XP target</span>
                  <MissionLink
                    className="text-link"
                    href={pack.ctaHref ?? "#quest-board"}
                    packId={pack.packId}
                    eventType="profile_recap_cta"
                    ctaLabel={pack.ctaLabel}
                    ctaVariant={pack.ctaVariant}
                  >
                    {pack.ctaLabel}
                  </MissionLink>
                  {pack.milestone.label === "Halfway complete" || pack.milestone.label === "Pack complete" ? (
                    <MissionLink
                      className="text-link"
                      href="/leaderboard#referral-board"
                      packId={pack.packId}
                      eventType="profile_referral_cta"
                      ctaLabel="Invite from this milestone"
                      ctaVariant="referral_milestone"
                    >
                      Invite from this milestone
                    </MissionLink>
                  ) : null}
                </div>
              </article>
          ))}
        </div>
      ) : null}
      {filtered.history.length > 0 ? (
        <div className="achievement-list">
          {filtered.history.slice(0, 4).map((pack) => (
            <article key={`profile-history-${pack.packId}`} className="achievement-card achievement-card--progress">
              <div>
                <strong>{pack.label}</strong>
                <p>{pack.summary}</p>
              </div>
              <div className="achievement-card__side">
                <span>{pack.totalXpAwarded} XP</span>
                <span>{pack.referralQuestCount} referral</span>
                <span>{pack.premiumQuestCount} premium</span>
              </div>
            </article>
          ))}
        </div>
      ) : null}
      {filtered.active.length === 0 && filtered.history.length === 0 ? (
        <p className="form-note">No campaign mission recap yet for this view. Your next live mission will show up here as soon as it becomes relevant.</p>
      ) : null}
    </div>
  );
}
