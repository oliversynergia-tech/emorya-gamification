"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import type { AdminOverviewData } from "@/lib/types";

type CampaignPackAlert = AdminOverviewData["campaignOperations"]["alerts"][number];

export function CampaignPackAlertPanel({
  alerts,
  suppressions,
  suppressionAnalytics,
  canManage = false,
}: {
  alerts: AdminOverviewData["campaignOperations"]["alerts"];
  suppressions: AdminOverviewData["campaignOperations"]["suppressions"];
  suppressionAnalytics: AdminOverviewData["campaignOperations"]["suppressionAnalytics"];
  canManage?: boolean;
}) {
  const router = useRouter();
  const [pendingKey, setPendingKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function suppress(alert: CampaignPackAlert, hours: number) {
    setPendingKey(`${alert.packId}|${alert.title}|${hours}`);
    setError(null);

    try {
      const response = await fetch("/api/admin/campaign-pack-alert-suppressions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          packId: alert.packId,
          label: alert.label,
          title: alert.title,
          hours,
          reason: `Suppressed from admin for ${hours}h while the pack is reviewed.`,
        }),
      });
      const payload = (await response.json()) as { ok?: boolean; error?: string };
      if (!response.ok || !payload.ok) {
        throw new Error(payload.error ?? "Unable to suppress campaign alert.");
      }
      router.refresh();
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Unable to suppress campaign alert.");
    } finally {
      setPendingKey(null);
    }
  }

  async function clearSuppression(suppressionId: string) {
    setPendingKey(suppressionId);
    setError(null);

    try {
      const response = await fetch(`/api/admin/campaign-pack-alert-suppressions/${suppressionId}`, {
        method: "DELETE",
      });
      const payload = (await response.json()) as { ok?: boolean; error?: string };
      if (!response.ok || !payload.ok) {
        throw new Error(payload.error ?? "Unable to clear campaign alert suppression.");
      }
      router.refresh();
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Unable to clear campaign alert suppression.");
    } finally {
      setPendingKey(null);
    }
  }

  return (
    <>
      {error ? <p className="form-note form-note--error">{error}</p> : null}
      {alerts.length > 0 ? (
        <div className="admin-alert-stack">
          {alerts.map((alert) => (
            <article key={`${alert.packId}-${alert.title}`} className={`admin-alert-card admin-alert-card--${alert.severity}`}>
              <div>
                <p className="eyebrow">{alert.label}</p>
                <strong>{alert.title}</strong>
              </div>
              <p>{alert.detail}</p>
              {canManage ? (
                <div className="review-bulk-actions">
                  <button
                    className="button button--secondary button--small"
                    type="button"
                    disabled={pendingKey === `${alert.packId}|${alert.title}|24`}
                    onClick={() => suppress(alert, 24)}
                  >
                    {pendingKey === `${alert.packId}|${alert.title}|24` ? "Saving..." : "Suppress 24h"}
                  </button>
                  <button
                    className="button button--secondary button--small"
                    type="button"
                    disabled={pendingKey === `${alert.packId}|${alert.title}|72`}
                    onClick={() => suppress(alert, 72)}
                  >
                    {pendingKey === `${alert.packId}|${alert.title}|72` ? "Saving..." : "Suppress 72h"}
                  </button>
                </div>
              ) : null}
            </article>
          ))}
        </div>
      ) : (
        <p className="form-note">Live campaign packs are currently staying inside the baseline pack-performance thresholds.</p>
      )}
      <div className="achievement-list">
        <article className="achievement-card">
          <div>
            <strong>Suppression overview</strong>
            <p>Active muting across live campaign-pack alerts so ops can spot noisy patterns quickly.</p>
          </div>
          <div className="achievement-card__side">
            <span>{suppressionAnalytics.activeCount} active</span>
            <span>{suppressionAnalytics.activeByDurationHours.map((entry) => `${entry.hours}h: ${entry.count}`).join(" · ") || "No duration mix yet"}</span>
          </div>
        </article>
        {suppressionAnalytics.activeByReason.slice(0, 4).map((entry) => (
          <article key={entry.reason} className="achievement-card">
            <div>
              <strong>{entry.reason}</strong>
              <p>Current active suppressions using this reason.</p>
            </div>
            <div className="achievement-card__side">
              <span>{entry.count} active</span>
            </div>
          </article>
        ))}
        {suppressionAnalytics.recentActivity.map((entry) => (
          <article key={entry.bucketStart} className="achievement-card">
            <div>
              <strong>Week of {entry.bucketStart}</strong>
              <p>Suppression and acknowledgement movement over time.</p>
            </div>
            <div className="achievement-card__side">
              <span>{entry.suppressionCount} suppressed</span>
              <span>{entry.clearedCount} cleared</span>
              <span>{entry.acknowledgedCount} acknowledged</span>
            </div>
          </article>
        ))}
      </div>
      <div className="achievement-list">
        {suppressions.map((suppression) => (
          <article key={suppression.id} className="achievement-card">
            <div>
              <strong>{suppression.label}</strong>
              <p>{suppression.title}</p>
              <small>
                Suppressed until {new Date(suppression.suppressedUntil).toLocaleString()}
                {suppression.reason ? ` · ${suppression.reason}` : ""}
              </small>
            </div>
            <div className="achievement-card__side">
              <span>{suppression.packId}</span>
              {canManage ? (
                <button
                  className="button button--secondary button--small"
                  type="button"
                  disabled={pendingKey === suppression.id}
                  onClick={() => clearSuppression(suppression.id)}
                >
                  {pendingKey === suppression.id ? "Saving..." : "Clear"}
                </button>
              ) : null}
            </div>
          </article>
        ))}
        {suppressions.length === 0 ? <p className="form-note">No campaign alert suppressions are active.</p> : null}
      </div>
    </>
  );
}
