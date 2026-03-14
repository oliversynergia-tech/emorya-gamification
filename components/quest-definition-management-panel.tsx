"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import type { QuestDefinitionAdminItem } from "@/lib/types";

type QuestDefinitionResponse = {
  ok: boolean;
  error?: string;
  quests?: QuestDefinitionAdminItem[];
};

type QuestDefinitionFormState = {
  slug: string;
  title: string;
  description: string;
  category: string;
  difficulty: string;
  verificationType: string;
  recurrence: string;
  requiredTier: string;
  requiredLevel: number;
  xpReward: number;
  isPremiumPreview: boolean;
  isActive: boolean;
  metadataText: string;
};

const metadataPresets: Array<{
  label: string;
  description: string;
  metadata: Record<string, unknown>;
}> = [
  {
    label: "Starter preset",
    description: "Basic onboarding quest with a low-friction track assignment.",
    metadata: {
      track: "starter",
      rewardConfig: {
        xp: { base: 25, premiumMultiplierEligible: true },
        tokenEffect: "none",
      },
      previewConfig: {
        label: "Starter unlock",
      },
    },
  },
  {
    label: "Referral payout preset",
    description: "High-value referral milestone with direct-token configuration.",
    metadata: {
      track: "referral",
      rewardConfig: {
        xp: { base: 300, premiumMultiplierEligible: true },
        tokenEffect: "direct_token_reward",
        directTokenReward: {
          asset: "EMR",
          amount: 25,
          requiresWallet: true,
        },
      },
      unlockRules: {
        all: [{ type: "successful_referrals", value: 1 }],
      },
      previewConfig: {
        label: "Annual referral reward",
      },
    },
  },
  {
    label: "Wallet growth preset",
    description: "xPortal-linked quest with eligibility-progress rewards.",
    metadata: {
      track: "wallet",
      rewardConfig: {
        xp: { base: 70, premiumMultiplierEligible: true },
        tokenEffect: "eligibility_progress",
        tokenEligibility: {
          progressPoints: 15,
        },
      },
      unlockRules: {
        all: [{ type: "wallet_linked", value: true }],
      },
      previewConfig: {
        label: "Wallet lane",
      },
    },
  },
];

const emptyForm: QuestDefinitionFormState = {
  slug: "",
  title: "",
  description: "",
  category: "app",
  difficulty: "easy",
  verificationType: "link-visit",
  recurrence: "one-time",
  requiredTier: "free",
  requiredLevel: 1,
  xpReward: 25,
  isPremiumPreview: false,
  isActive: true,
  metadataText: '{\n  "track": "starter"\n}',
};

function parseMetadata(metadataText: string) {
  try {
    const parsed = JSON.parse(metadataText) as Record<string, unknown>;
    return {
      parsed,
      error: null,
    };
  } catch (error) {
    return {
      parsed: null,
      error: error instanceof Error ? error.message : "Metadata must be valid JSON.",
    };
  }
}

export function QuestDefinitionManagementPanel() {
  const router = useRouter();
  const [quests, setQuests] = useState<QuestDefinitionAdminItem[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ ...emptyForm });
  const [loading, setLoading] = useState(true);
  const [pending, setPending] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const metadataState = useMemo(() => parseMetadata(form.metadataText), [form.metadataText]);
  const duplicateSlug = useMemo(
    () =>
      quests.find(
        (quest) => quest.slug.trim().toLowerCase() === form.slug.trim().toLowerCase() && quest.id !== editingId,
      ) ?? null,
    [editingId, form.slug, quests],
  );
  const preview = useMemo(() => {
    const metadata = metadataState.parsed ?? {};
    const rewardConfig = (metadata.rewardConfig as Record<string, unknown> | undefined) ?? {};
    const unlockRules = (metadata.unlockRules as { all?: unknown[]; any?: unknown[] } | undefined) ?? {};
    const previewConfig = (metadata.previewConfig as Record<string, unknown> | undefined) ?? {};
    const directTokenReward =
      (rewardConfig.directTokenReward as { asset?: string; amount?: number } | undefined) ?? undefined;

    return {
      track: typeof metadata.track === "string" ? metadata.track : "unassigned",
      tokenEffect: typeof rewardConfig.tokenEffect === "string" ? rewardConfig.tokenEffect : "none",
      previewLabel: typeof previewConfig.label === "string" ? previewConfig.label : null,
      unlockRuleCount: (unlockRules.all?.length ?? 0) + (unlockRules.any?.length ?? 0),
      directTokenReward:
        directTokenReward?.asset && typeof directTokenReward.amount === "number"
          ? `${directTokenReward.amount} ${directTokenReward.asset}`
          : null,
    };
  }, [metadataState.parsed]);

  async function refreshQuestDirectory() {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/admin/quest-definitions", { cache: "no-store" });
      const result = (await response.json()) as QuestDefinitionResponse;

      if (!response.ok || !result.ok || !result.quests) {
        setError(result.error ?? "Unable to load quest definitions.");
        return;
      }

      setQuests(result.quests);
    } catch {
      setError("Unable to reach the quest definition service.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void refreshQuestDirectory();
  }, []);

  function startEdit(quest: QuestDefinitionAdminItem) {
    setEditingId(quest.id);
    setForm({
      slug: quest.slug,
      title: quest.title,
      description: quest.description,
      category: quest.category,
      difficulty: quest.difficulty,
      verificationType: quest.verificationType,
      recurrence: quest.recurrence,
      requiredTier: quest.requiredTier,
      requiredLevel: quest.requiredLevel,
      xpReward: quest.xpReward,
      isPremiumPreview: quest.isPremiumPreview,
      isActive: quest.isActive,
      metadataText: JSON.stringify(quest.metadata, null, 2),
    });
    setMessage(null);
    setError(null);
  }

  function resetForm() {
    setEditingId(null);
    setForm({ ...emptyForm });
  }

  function applyPreset(metadata: Record<string, unknown>) {
    setForm((current) => ({
      ...current,
      metadataText: JSON.stringify(metadata, null, 2),
    }));
  }

  async function submit() {
    setPending(editingId ?? "create");
    setMessage(null);
    setError(null);

    if (metadataState.error || !metadataState.parsed) {
      setError(`Metadata JSON is invalid: ${metadataState.error ?? "Invalid JSON."}`);
      setPending(null);
      return;
    }

    if (duplicateSlug) {
      setError(`Slug ${form.slug.trim()} is already used by ${duplicateSlug.title}.`);
      setPending(null);
      return;
    }

    const payload = {
      slug: form.slug.trim(),
      title: form.title.trim(),
      description: form.description.trim(),
      category: form.category,
      difficulty: form.difficulty,
      verificationType: form.verificationType,
      recurrence: form.recurrence,
      requiredTier: form.requiredTier,
      requiredLevel: Number(form.requiredLevel),
      xpReward: Number(form.xpReward),
      isPremiumPreview: form.isPremiumPreview,
      isActive: form.isActive,
      metadata: metadataState.parsed,
    };

    try {
      const endpoint = editingId ? `/api/admin/quest-definitions/${editingId}` : "/api/admin/quest-definitions";
      const response = await fetch(endpoint, {
        method: editingId ? "PATCH" : "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });
      const result = (await response.json()) as QuestDefinitionResponse;

      if (!response.ok || !result.ok || !result.quests) {
        setError(result.error ?? "Unable to save quest definition.");
        return;
      }

      setQuests(result.quests);
      setMessage(editingId ? "Quest definition updated." : "Quest definition created.");
      resetForm();
      router.refresh();
    } catch {
      setError("Unable to reach the quest definition service.");
    } finally {
      setPending(null);
    }
  }

  async function removeQuest(questId: string) {
    setPending(questId);
    setMessage(null);
    setError(null);

    try {
      const response = await fetch(`/api/admin/quest-definitions/${questId}`, {
        method: "DELETE",
      });
      const result = (await response.json()) as QuestDefinitionResponse;

      if (!response.ok || !result.ok || !result.quests) {
        setError(result.error ?? "Unable to delete quest definition.");
        return;
      }

      setQuests(result.quests);
      setMessage("Quest definition deleted.");
      if (editingId === questId) {
        resetForm();
      }
      router.refresh();
    } catch {
      setError("Unable to reach the quest definition service.");
    } finally {
      setPending(null);
    }
  }

  return (
    <section className="panel panel--glass">
      <div className="panel__header">
        <div>
          <p className="eyebrow">Quest definition CRUD</p>
          <h3>Create and edit live quest definitions</h3>
        </div>
        <span className="badge">{editingId ? "Editing" : "New quest"}</span>
      </div>
      <div className="profile-grid">
        <label className="field">
          <span>Slug</span>
          <input value={form.slug} onChange={(event) => setForm((current) => ({ ...current, slug: event.target.value }))} />
        </label>
        <label className="field">
          <span>Title</span>
          <input value={form.title} onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))} />
        </label>
        <label className="field">
          <span>Category</span>
          <select value={form.category} onChange={(event) => setForm((current) => ({ ...current, category: event.target.value }))}>
            {["social", "learn", "app", "staking", "creative", "referral", "limited"].map((value) => (
              <option key={value} value={value}>{value}</option>
            ))}
          </select>
        </label>
        <label className="field">
          <span>Difficulty</span>
          <select value={form.difficulty} onChange={(event) => setForm((current) => ({ ...current, difficulty: event.target.value }))}>
            {["easy", "medium", "hard"].map((value) => (
              <option key={value} value={value}>{value}</option>
            ))}
          </select>
        </label>
        <label className="field">
          <span>Verification</span>
          <select value={form.verificationType} onChange={(event) => setForm((current) => ({ ...current, verificationType: event.target.value }))}>
            {["social-oauth", "wallet-check", "quiz", "manual-review", "link-visit", "text-submission"].map((value) => (
              <option key={value} value={value}>{value}</option>
            ))}
          </select>
        </label>
        <label className="field">
          <span>Recurrence</span>
          <select value={form.recurrence} onChange={(event) => setForm((current) => ({ ...current, recurrence: event.target.value }))}>
            {["one-time", "daily", "weekly"].map((value) => (
              <option key={value} value={value}>{value}</option>
            ))}
          </select>
        </label>
        <label className="field">
          <span>Required tier</span>
          <select value={form.requiredTier} onChange={(event) => setForm((current) => ({ ...current, requiredTier: event.target.value }))}>
            {["free", "monthly", "annual"].map((value) => (
              <option key={value} value={value}>{value}</option>
            ))}
          </select>
        </label>
        <label className="field">
          <span>Required level</span>
          <input type="number" value={form.requiredLevel} onChange={(event) => setForm((current) => ({ ...current, requiredLevel: Number(event.target.value) }))} />
        </label>
        <label className="field">
          <span>XP reward</span>
          <input type="number" value={form.xpReward} onChange={(event) => setForm((current) => ({ ...current, xpReward: Number(event.target.value) }))} />
        </label>
        <label className="field">
          <span>Premium preview</span>
          <select value={String(form.isPremiumPreview)} onChange={(event) => setForm((current) => ({ ...current, isPremiumPreview: event.target.value === "true" }))}>
            <option value="false">false</option>
            <option value="true">true</option>
          </select>
        </label>
        <label className="field">
          <span>Active</span>
          <select value={String(form.isActive)} onChange={(event) => setForm((current) => ({ ...current, isActive: event.target.value === "true" }))}>
            <option value="true">true</option>
            <option value="false">false</option>
          </select>
        </label>
      </div>
      {duplicateSlug ? (
        <p className="status status--error">
          Slug collision: this would conflict with {duplicateSlug.title}.
        </p>
      ) : null}
      <label className="field">
        <span>Description</span>
        <textarea rows={3} value={form.description} onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))} />
      </label>
      <div className="achievement-list">
        {metadataPresets.map((preset) => (
          <article key={preset.label} className="achievement-card">
            <div>
              <strong>{preset.label}</strong>
              <p>{preset.description}</p>
            </div>
            <button className="button button--secondary button--small" type="button" onClick={() => applyPreset(preset.metadata)}>
              Apply preset
            </button>
          </article>
        ))}
      </div>
      <label className="field">
        <span>Metadata JSON</span>
        <textarea rows={12} value={form.metadataText} onChange={(event) => setForm((current) => ({ ...current, metadataText: event.target.value }))} />
      </label>
      <div className="achievement-list">
        <article className="achievement-card">
          <div>
            <strong>Metadata validation</strong>
            <p>
              {metadataState.error
                ? `Invalid JSON: ${metadataState.error}`
                : "JSON parses correctly. Reward and unlock preview is ready below."}
            </p>
          </div>
          <span className={metadataState.error ? "badge" : "badge badge--pink"}>
            {metadataState.error ? "Needs fix" : "Valid"}
          </span>
        </article>
        <article className="achievement-card">
          <div>
            <strong>Reward preview</strong>
            <p>
              Track: {preview.track}. Token effect: {preview.tokenEffect}. Unlock rules: {preview.unlockRuleCount}.
              {preview.previewLabel ? ` Preview label: ${preview.previewLabel}.` : ""}
            </p>
          </div>
          <div className="achievement-card__side">
            <span>{form.xpReward} XP</span>
            <span>{preview.directTokenReward ?? "No direct token reward"}</span>
          </div>
        </article>
      </div>
      <div className="review-bulk-actions">
        <button className="button button--primary button--small" type="button" disabled={pending !== null || Boolean(metadataState.error) || Boolean(duplicateSlug)} onClick={submit}>
          {pending === "create" || (editingId && pending === editingId) ? "Saving..." : editingId ? "Update quest" : "Create quest"}
        </button>
        <button className="button button--secondary button--small" type="button" disabled={pending !== null} onClick={resetForm}>
          Reset form
        </button>
      </div>
      {message ? <p className="status status--success">{message}</p> : null}
      {error ? <p className="status status--error">{error}</p> : null}
      <div className="review-history__list">
        {loading ? (
          <p className="form-note">Loading quest definitions...</p>
        ) : (
          quests.map((quest) => (
            <article key={quest.id} className="review-history__item">
              <div className="quest-card__meta">
                <span>{quest.slug}</span>
                <span>{quest.isActive ? "active" : "inactive"}</span>
              </div>
              <h4>{quest.title}</h4>
              <div className="review-history__meta">
                <span>{quest.category}</span>
                <span>{quest.requiredTier}</span>
                <span>Lv {quest.requiredLevel}</span>
                <span>{quest.xpReward} XP</span>
              </div>
              <p className="form-note">{quest.description}</p>
              <div className="review-bulk-actions">
                <button className="button button--secondary button--small" type="button" disabled={pending !== null} onClick={() => startEdit(quest)}>
                  Edit
                </button>
                <button className="button button--secondary button--small" type="button" disabled={pending !== null} onClick={() => removeQuest(quest.id)}>
                  {pending === quest.id ? "Deleting..." : "Delete"}
                </button>
              </div>
            </article>
          ))
        )}
      </div>
    </section>
  );
}
