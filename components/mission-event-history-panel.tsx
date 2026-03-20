"use client";

import type { DashboardData } from "@/lib/types";

export function MissionEventHistoryPanel({
  entries,
}: {
  entries: DashboardData["missionEventHistory"];
}) {
  if (entries.length === 0) {
    return null;
  }

  return (
    <div className="panel panel--glass">
      <div className="panel__header">
        <div>
          <p className="eyebrow">Mission history</p>
          <h3>Your recent campaign timeline</h3>
        </div>
        <span className="badge">{entries.length} events</span>
      </div>
      <div className="achievement-list">
        {entries.map((entry) => (
          <article key={entry.id} className="achievement-card">
            <div>
              <strong>{entry.title}</strong>
              <p>{entry.detail}</p>
            </div>
            <div className="achievement-card__side">
              <span>{entry.packId}</span>
              <span>{entry.timeAgo}</span>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
