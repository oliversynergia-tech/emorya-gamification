"use client";

import { useEffect, useMemo, useState } from "react";

import type { DashboardData } from "@/lib/types";
import { MissionLink } from "@/components/mission-link";

function getHistoryPackHref(pack: NonNullable<DashboardData["campaignPacks"][number]>) {
  if (pack.nextQuestActionable && pack.nextQuestId) {
    return `/dashboard#quest-${pack.nextQuestId}`;
  }
  return pack.ctaHref ?? "#quest-board";
}

export function MissionEventHistoryPanel({
  entries,
  activePacks = [],
  packHistory = [],
  missionView = "all",
}: {
  entries: DashboardData["missionEventHistory"];
  activePacks?: DashboardData["campaignPacks"];
  packHistory?: DashboardData["campaignPackHistory"];
  missionView?: "active" | "completed" | "all" | "reward";
}) {
  const [preferredPackId, setPreferredPackId] = useState<"all" | string>(() => {
    if (typeof window === "undefined") {
      return "all";
    }
    return window.localStorage.getItem(`emorya-mission-history-selected-pack-${missionView}`) ?? "all";
  });
  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    window.localStorage.setItem(`emorya-mission-history-selected-pack-${missionView}`, preferredPackId);
  }, [missionView, preferredPackId]);

  const allowedPackIds = useMemo(() => {
    if (missionView === "reward") {
      return new Set([
        ...activePacks
          .filter((pack) => Boolean(pack.directRewardSummary || pack.directRewardState || pack.premiumNudge))
          .map((pack) => pack.packId),
        ...packHistory
          .filter((pack) => pack.premiumQuestCount > 0 || pack.referralQuestCount > 0)
          .map((pack) => pack.packId),
      ]);
    }
    if (missionView === "active") {
      return new Set(activePacks.map((pack) => pack.packId));
    }
    if (missionView === "completed") {
      return new Set(packHistory.map((pack) => pack.packId));
    }
    return null;
  }, [activePacks, missionView, packHistory]);

  const packOptions = useMemo(() => {
    const map = new Map<string, string>();
    for (const entry of entries) {
      if (entry.packId === "unknown") {
        continue;
      }
      if (allowedPackIds && !allowedPackIds.has(entry.packId)) {
        continue;
      }
      if (!map.has(entry.packId)) {
        map.set(entry.packId, entry.packLabel);
      }
    }
    return Array.from(map.entries()).map(([packId, packLabel]) => ({ packId, packLabel }));
  }, [allowedPackIds, entries]);
  const selectedPackId =
    preferredPackId === "all" || packOptions.some((pack) => pack.packId === preferredPackId) ? preferredPackId : "all";

  const filteredEntries = useMemo(
    () => {
      return entries.filter((entry) => {
        if (selectedPackId !== "all" && entry.packId !== selectedPackId) {
          return false;
        }
        if (allowedPackIds) {
          return allowedPackIds.has(entry.packId);
        }
        return true;
      });
    },
    [allowedPackIds, entries, selectedPackId],
  );
  const selectedActivePack = useMemo(
    () => activePacks.find((pack) => pack.packId === selectedPackId) ?? null,
    [activePacks, selectedPackId],
  );
  const selectedHistoryPack = useMemo(
    () => packHistory.find((pack) => pack.packId === selectedPackId) ?? null,
    [packHistory, selectedPackId],
  );

  if (entries.length === 0) {
    return null;
  }

  return (
    <div className="panel panel--glass">
      <div className="panel__header">
        <div>
          <p className="eyebrow">Mission history</p>
          <h3>Your campaign timeline by pack</h3>
        </div>
        <span className="badge">{filteredEntries.length} events</span>
      </div>
      {packOptions.length > 0 ? (
        <div className="review-actions">
          <button
            className={`button ${selectedPackId === "all" ? "button--primary" : "button--secondary"}`}
            type="button"
            onClick={() => setPreferredPackId("all")}
          >
            All packs
          </button>
          {packOptions.map((pack) => (
            <button
              key={pack.packId}
              className={`button ${selectedPackId === pack.packId ? "button--primary" : "button--secondary"}`}
              type="button"
              onClick={() => setPreferredPackId(pack.packId)}
            >
              {pack.packLabel}
            </button>
          ))}
        </div>
      ) : null}
      {selectedPackId !== "all" && (selectedActivePack || selectedHistoryPack) ? (
        <article className="achievement-card achievement-card--progress">
          <div>
            <strong>{selectedActivePack?.label ?? selectedHistoryPack?.label ?? "Mission detail"}</strong>
            <p>
              {selectedActivePack
                ? `${selectedActivePack.completedQuestCount}/${selectedActivePack.totalQuestCount} missions complete. ${selectedActivePack.sequenceReason}`
                : selectedHistoryPack?.summary ?? "Completed mission path."}
            </p>
            {selectedActivePack ? (
              <>
                <p className="form-note">{selectedActivePack.unlockPreview}</p>
                <p className="form-note">{selectedActivePack.rewardFocus}</p>
              </>
            ) : null}
          </div>
          <div className="achievement-card__side">
            {selectedActivePack ? (
              <MissionLink
                className="button button--secondary"
                href={getHistoryPackHref(selectedActivePack)}
                packId={selectedActivePack.packId}
                eventType="mission_history_detail_cta"
                ctaLabel={selectedActivePack.ctaLabel}
                ctaVariant={selectedActivePack.ctaVariant}
              >
                {selectedActivePack.ctaLabel}
              </MissionLink>
            ) : (
              <span>{selectedHistoryPack?.completedAt ? new Date(selectedHistoryPack.completedAt).toLocaleDateString() : "Completed"}</span>
            )}
          </div>
        </article>
      ) : null}
      <div className="achievement-list">
        {filteredEntries.map((entry) => (
          <article key={entry.id} className="achievement-card achievement-card--progress">
            <div>
              <strong>{entry.title}</strong>
              <p>{entry.detail}</p>
              <small className="form-note">{entry.packLabel}</small>
            </div>
            <div className="achievement-card__side">
              <span>{new Date(entry.createdAt).toLocaleDateString()}</span>
              <span>{entry.timeAgo}</span>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
