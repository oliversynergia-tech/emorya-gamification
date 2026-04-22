"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import type { RewardAsset, RewardProgram } from "@/lib/types";

type RewardProgramResponse = {
  ok: boolean;
  error?: string;
  programs?: RewardProgram[];
};

const emptyForm = {
  slug: "",
  name: "",
  rewardAssetId: "",
  isActive: true,
  redemptionEnabled: true,
  directRewardsEnabled: true,
  referralRewardsEnabled: true,
  premiumRewardsEnabled: true,
  ambassadorRewardsEnabled: true,
  minimumEligibilityPoints: 100,
  pointsPerToken: 20,
  notes: "",
  startsAt: "",
  endsAt: "",
};

export function RewardProgramsPanel({
  initialPrograms,
  availableAssets,
  canManage,
}: {
  initialPrograms: RewardProgram[];
  availableAssets: RewardAsset[];
  canManage: boolean;
}) {
  const router = useRouter();
  const [programs, setPrograms] = useState(initialPrograms);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({
    ...emptyForm,
    rewardAssetId: availableAssets[0]?.id ?? "",
  });
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const activePrograms = programs.filter((program) => program.isActive).length;
  const liveDirectRewardPrograms = programs.filter(
    (program) => program.isActive && program.directRewardsEnabled,
  ).length;

  function startEdit(program: RewardProgram) {
    setEditingId(program.id);
    setForm({
      slug: program.slug,
      name: program.name,
      rewardAssetId: program.rewardAssetId,
      isActive: program.isActive,
      redemptionEnabled: program.redemptionEnabled,
      directRewardsEnabled: program.directRewardsEnabled,
      referralRewardsEnabled: program.referralRewardsEnabled,
      premiumRewardsEnabled: program.premiumRewardsEnabled,
      ambassadorRewardsEnabled: program.ambassadorRewardsEnabled,
      minimumEligibilityPoints: program.minimumEligibilityPoints,
      pointsPerToken: program.pointsPerToken,
      notes: program.notes ?? "",
      startsAt: program.startsAt ? program.startsAt.slice(0, 16) : "",
      endsAt: program.endsAt ? program.endsAt.slice(0, 16) : "",
    });
  }

  function reset() {
    setEditingId(null);
    setForm({
      ...emptyForm,
      rewardAssetId: availableAssets[0]?.id ?? "",
    });
  }

  async function submit() {
    setPending(true);
    setMessage(null);
    setError(null);

    try {
      const endpoint = editingId ? `/api/admin/reward-programs/${editingId}` : "/api/admin/reward-programs";
      const response = await fetch(endpoint, {
        method: editingId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          slug: form.slug.trim(),
          name: form.name.trim(),
          notes: form.notes.trim() || null,
          startsAt: form.startsAt || null,
          endsAt: form.endsAt || null,
        }),
      });
      const result = (await response.json()) as RewardProgramResponse;

      if (!response.ok || !result.ok || !result.programs) {
        setError(result.error ?? "Unable to save reward program.");
        return;
      }

      setPrograms(result.programs);
      setMessage(editingId ? "Reward program updated." : "Reward program created.");
      reset();
      router.refresh();
    } catch {
      setError("Unable to reach the reward program service.");
    } finally {
      setPending(false);
    }
  }

  return (
    <section className="panel panel--glass">
      <div className="panel__header">
        <div>
          <p className="eyebrow">Reward programs</p>
          <h3>Map supported tokens to usable campaign payout rules</h3>
        </div>
        <span className="badge">{programs.length} programs</span>
      </div>
      <div className="profile-grid">
        <article className="metric-card">
          <span>Active programs</span>
          <strong>{activePrograms}</strong>
          <small>Reward rails ready to attach to live quests and campaigns.</small>
        </article>
        <article className="metric-card">
          <span>Direct reward lanes</span>
          <strong>{liveDirectRewardPrograms}</strong>
          <small>Programs currently configured for immediate token payouts.</small>
        </article>
      </div>
      <div className="profile-grid">
        <label className="field">
          <span>Slug</span>
          <input value={form.slug} onChange={(event) => setForm((current) => ({ ...current, slug: event.target.value }))} />
        </label>
        <label className="field">
          <span>Name</span>
          <input value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} />
        </label>
        <label className="field">
          <span>Reward asset</span>
          <select
            value={form.rewardAssetId}
            onChange={(event) => setForm((current) => ({ ...current, rewardAssetId: event.target.value }))}
          >
            {availableAssets.map((asset) => (
              <option key={asset.id} value={asset.id}>
                {asset.symbol} · {asset.name}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          <span>Minimum eligibility points</span>
          <input
            type="number"
            value={form.minimumEligibilityPoints}
            onChange={(event) =>
              setForm((current) => ({ ...current, minimumEligibilityPoints: Number(event.target.value) }))
            }
          />
        </label>
        <label className="field">
          <span>Points per token</span>
          <input
            type="number"
            step="0.01"
            value={form.pointsPerToken}
            onChange={(event) => setForm((current) => ({ ...current, pointsPerToken: Number(event.target.value) }))}
          />
        </label>
        <label className="field">
          <span>Starts at</span>
          <input
            type="datetime-local"
            value={form.startsAt}
            onChange={(event) => setForm((current) => ({ ...current, startsAt: event.target.value }))}
          />
        </label>
        <label className="field">
          <span>Ends at</span>
          <input
            type="datetime-local"
            value={form.endsAt}
            onChange={(event) => setForm((current) => ({ ...current, endsAt: event.target.value }))}
          />
        </label>
        {(
          [
            ["isActive", "Active"],
            ["redemptionEnabled", "Redemption"],
            ["directRewardsEnabled", "Direct rewards"],
            ["referralRewardsEnabled", "Referral rewards"],
            ["premiumRewardsEnabled", "Premium rewards"],
            ["ambassadorRewardsEnabled", "Ambassador rewards"],
          ] as const
        ).map(([key, label]) => (
          <label key={key} className="field">
            <span>{label}</span>
            <select
              value={String(form[key])}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  [key]: event.target.value === "true",
                }))
              }
            >
              <option value="true">true</option>
              <option value="false">false</option>
            </select>
          </label>
        ))}
      </div>
      <label className="field">
        <span>Notes</span>
        <textarea rows={3} value={form.notes} onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))} />
      </label>
      <div className="review-bulk-actions">
        <button
          className="button button--primary button--small"
          type="button"
          disabled={!canManage || pending || !form.rewardAssetId}
          onClick={submit}
        >
          {pending ? "Saving..." : editingId ? "Update program" : "Create program"}
        </button>
        <button className="button button--secondary button--small" type="button" disabled={pending} onClick={reset}>
          Reset
        </button>
      </div>
      {message ? <p className="status status--success" role="status" aria-live="polite">{message}</p> : null}
      {error ? <p className="status status--error" role="alert">{error}</p> : null}
      <div className="review-history__list">
        {programs.map((program) => (
          <article key={program.id} className="review-history__item">
            <div className="quest-card__meta">
              <span>{program.slug}</span>
              <span>{program.isActive ? "active" : "inactive"}</span>
            </div>
            <h4>{program.name}</h4>
            <div className="review-history__meta">
              <span>{program.assetSymbol}</span>
              <span>{program.minimumEligibilityPoints} pts min</span>
              <span>{program.pointsPerToken} pts/token</span>
            </div>
            <p className="form-note">
              {program.assetName} · redemption {program.redemptionEnabled ? "on" : "off"} · direct{" "}
              {program.directRewardsEnabled ? "on" : "off"} · referral {program.referralRewardsEnabled ? "on" : "off"}
            </p>
            {program.notes ? <p className="form-note">{program.notes}</p> : null}
            <div className="review-bulk-actions">
              <button
                className="button button--secondary button--small"
                type="button"
                disabled={!canManage || pending}
                onClick={() => startEdit(program)}
              >
                Edit
              </button>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
