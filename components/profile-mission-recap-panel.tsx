"use client";

import { useEffect, useMemo, useState } from "react";

import { MissionLink } from "@/components/mission-link";
import type { DashboardCampaignPack, DashboardCampaignPackHistory } from "@/lib/types";

type MissionRecapView = "active" | "completed" | "reward";

function isRewardBearingPack(pack: DashboardCampaignPack) {
  return Boolean(pack.directRewardSummary || pack.directRewardState || pack.premiumNudge);
}

function isRewardBearingHistory(pack: DashboardCampaignPackHistory) {
  return pack.premiumQuestCount > 0 || pack.referralQuestCount > 0;
}

function getProfilePackHref(pack: DashboardCampaignPack) {
  if (pack.nextQuestActionable && pack.nextQuestId) {
    return `/dashboard#quest-${pack.nextQuestId}`;
  }
  return pack.ctaHref ?? "#quest-board";
}

function getProfilePackCue(pack: DashboardCampaignPack) {
  if (pack.nextQuestActionable && pack.nextQuestTitle) {
    return {
      badge: "Exact quest ready",
      note: `Resume exact quest: ${pack.nextQuestTitle} is ready now.`,
      tone: "ready",
    };
  }
  return {
    badge: "Review mission path",
    note: "Review the mission path to see what opens next before you jump back in.",
    tone: "planning",
  };
}

export function ProfileMissionRecapPanel({
  activePacks,
  packHistory,
}: {
  activePacks: DashboardCampaignPack[];
  packHistory: DashboardCampaignPackHistory[];
}) {
  const [view, setView] = useState<MissionRecapView>(() => {
    if (typeof window === "undefined") {
      return "active";
    }
    const stored = window.localStorage.getItem("emorya-dashboard-mission-view");
    if (stored === "completed") {
      return "completed";
    }
    if (stored === "all") {
      return "active";
    }
    if (stored === "reward") {
      return "reward";
    }
    const recapStored = window.localStorage.getItem("emorya-profile-mission-view");
    return recapStored === "completed" || recapStored === "reward" ? recapStored : "active";
  });

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    window.localStorage.setItem("emorya-dashboard-mission-view", view === "reward" ? "reward" : view);
    window.localStorage.setItem("emorya-profile-mission-view", view);
  }, [view]);

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
          {filtered.active.map((pack) => {
            const cue = getProfilePackCue(pack);
            return (
              <article key={`profile-pack-${pack.packId}`} className={`achievement-card ${pack.urgency ? "achievement-card--urgent" : ""}`}>
                <div>
                  <strong>{pack.label}</strong>
                  <p>{pack.nextAction}</p>
                  <p className="form-note">{pack.tierPhaseCopy}</p>
                  <p className="form-note">
                    {pack.completedQuestCount}/{pack.totalQuestCount} missions complete. {pack.sequenceReason}
                  </p>
                  <p className={`mission-cue mission-cue--${cue.tone}`}>
                    <strong>{cue.badge}</strong> {cue.note}
                  </p>
                  {pack.returnAction ? <p className="form-note">{pack.returnAction}</p> : null}
                </div>
                <div className="achievement-card__side">
                  <span>{pack.badgeLabel}</span>
                  <span>{pack.weeklyGoal.targetXp} XP target</span>
                  <span className={`mission-cue-badge mission-cue-badge--${cue.tone}`}>{cue.badge}</span>
                  <MissionLink
                    className="text-link"
                    href={getProfilePackHref(pack)}
                    packId={pack.packId}
                    eventType="profile_recap_cta"
                    ctaLabel={pack.ctaLabel}
                    ctaVariant={pack.ctaVariant}
                    missionView={view}
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
                      missionView={view}
                    >
                      Invite from this milestone
                    </MissionLink>
                  ) : null}
                </div>
              </article>
            );
          })}
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
