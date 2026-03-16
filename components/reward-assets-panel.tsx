"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import type { RewardAsset } from "@/lib/types";

type RewardAssetResponse = {
  ok: boolean;
  error?: string;
  assets?: RewardAsset[];
};

const emptyForm = {
  assetId: "",
  symbol: "",
  name: "",
  decimals: 18,
  iconUrl: "",
  issuerName: "",
  isActive: true,
  isPartnerAsset: true,
};

export function RewardAssetsPanel({
  initialAssets,
  canManage,
}: {
  initialAssets: RewardAsset[];
  canManage: boolean;
}) {
  const router = useRouter();
  const [assets, setAssets] = useState(initialAssets);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ ...emptyForm });
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const activeAssets = assets.filter((asset) => asset.isActive).length;
  const partnerAssets = assets.filter((asset) => asset.isPartnerAsset).length;

  function startEdit(asset: RewardAsset) {
    setEditingId(asset.id);
    setForm({
      assetId: asset.assetId,
      symbol: asset.symbol,
      name: asset.name,
      decimals: asset.decimals,
      iconUrl: asset.iconUrl ?? "",
      issuerName: asset.issuerName ?? "",
      isActive: asset.isActive,
      isPartnerAsset: asset.isPartnerAsset,
    });
  }

  function reset() {
    setEditingId(null);
    setForm({ ...emptyForm });
  }

  async function submit() {
    setPending(true);
    setMessage(null);
    setError(null);

    try {
      const endpoint = editingId ? `/api/admin/reward-assets/${editingId}` : "/api/admin/reward-assets";
      const response = await fetch(endpoint, {
        method: editingId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const result = (await response.json()) as RewardAssetResponse;

      if (!response.ok || !result.ok || !result.assets) {
        setError(result.error ?? "Unable to save reward asset.");
        return;
      }

      setAssets(result.assets);
      setMessage(editingId ? "Reward asset updated." : "Reward asset created.");
      reset();
      router.refresh();
    } catch {
      setError("Unable to reach the reward asset service.");
    } finally {
      setPending(false);
    }
  }

  return (
    <section className="panel panel--glass">
      <div className="panel__header">
        <div>
          <p className="eyebrow">Reward asset registry</p>
          <h3>Accepted MultiversX payout assets</h3>
        </div>
        <span className="badge">{assets.length} assets</span>
      </div>
      <div className="profile-grid">
        <article className="metric-card">
          <span>Active assets</span>
          <strong>{activeAssets}</strong>
          <small>Tokens currently available for reward programs.</small>
        </article>
        <article className="metric-card">
          <span>Partner assets</span>
          <strong>{partnerAssets}</strong>
          <small>External ecosystem tokens ready for collaboration lanes.</small>
        </article>
      </div>
      <div className="profile-grid">
        <label className="field"><span>Asset ID</span><input value={form.assetId} onChange={(event) => setForm((current) => ({ ...current, assetId: event.target.value }))} /></label>
        <label className="field"><span>Symbol</span><input value={form.symbol} onChange={(event) => setForm((current) => ({ ...current, symbol: event.target.value }))} /></label>
        <label className="field"><span>Name</span><input value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} /></label>
        <label className="field"><span>Decimals</span><input type="number" value={form.decimals} onChange={(event) => setForm((current) => ({ ...current, decimals: Number(event.target.value) }))} /></label>
        <label className="field"><span>Issuer</span><input value={form.issuerName} onChange={(event) => setForm((current) => ({ ...current, issuerName: event.target.value }))} /></label>
        <label className="field"><span>Icon URL</span><input value={form.iconUrl} onChange={(event) => setForm((current) => ({ ...current, iconUrl: event.target.value }))} /></label>
        <label className="field"><span>Active</span><select value={String(form.isActive)} onChange={(event) => setForm((current) => ({ ...current, isActive: event.target.value === "true" }))}><option value="true">true</option><option value="false">false</option></select></label>
        <label className="field"><span>Partner asset</span><select value={String(form.isPartnerAsset)} onChange={(event) => setForm((current) => ({ ...current, isPartnerAsset: event.target.value === "true" }))}><option value="true">true</option><option value="false">false</option></select></label>
      </div>
      <div className="review-bulk-actions">
        <button className="button button--primary button--small" type="button" disabled={!canManage || pending} onClick={submit}>{pending ? "Saving..." : editingId ? "Update asset" : "Create asset"}</button>
        <button className="button button--secondary button--small" type="button" disabled={pending} onClick={reset}>Reset</button>
      </div>
      {message ? <p className="status status--success">{message}</p> : null}
      {error ? <p className="status status--error">{error}</p> : null}
      <div className="achievement-list">
        {assets.map((asset) => (
          <article key={asset.id} className="achievement-card">
            <div>
              <strong>{asset.symbol}</strong>
              <p>{asset.name} · {asset.assetId}</p>
            </div>
            <div className="achievement-card__side">
              <span>{asset.isActive ? "active" : "inactive"}</span>
              <button className="button button--secondary button--small" type="button" disabled={!canManage || pending} onClick={() => startEdit(asset)}>Edit</button>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
