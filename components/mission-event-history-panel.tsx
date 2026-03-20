"use client";

import { useMemo, useState } from "react";

import type { DashboardData } from "@/lib/types";

export function MissionEventHistoryPanel({
  entries,
}: {
  entries: DashboardData["missionEventHistory"];
}) {
  const [selectedPackId, setSelectedPackId] = useState<"all" | string>("all");
  const packOptions = useMemo(() => {
    const map = new Map<string, string>();
    for (const entry of entries) {
      if (entry.packId === "unknown") {
        continue;
      }
      if (!map.has(entry.packId)) {
        map.set(entry.packId, entry.packLabel);
      }
    }

    return Array.from(map.entries()).map(([packId, packLabel]) => ({ packId, packLabel }));
  }, [entries]);

  const filteredEntries = useMemo(
    () => entries.filter((entry) => selectedPackId === "all" || entry.packId === selectedPackId),
    [entries, selectedPackId],
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
            onClick={() => setSelectedPackId("all")}
          >
            All packs
          </button>
          {packOptions.map((pack) => (
            <button
              key={pack.packId}
              className={`button ${selectedPackId === pack.packId ? "button--primary" : "button--secondary"}`}
              type="button"
              onClick={() => setSelectedPackId(pack.packId)}
            >
              {pack.packLabel}
            </button>
          ))}
        </div>
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
