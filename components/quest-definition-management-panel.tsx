"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import type {
  QuestDefinitionAdminItem,
  QuestDefinitionTemplateItem,
  RewardAsset,
  RewardProgram,
} from "@/lib/types";

type QuestDefinitionResponse = {
  ok: boolean;
  error?: string;
  quests?: QuestDefinitionAdminItem[];
};

type QuestDefinitionTemplateResponse = {
  ok: boolean;
  error?: string;
  templates?: QuestDefinitionTemplateItem[];
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

type MetadataBuilderState = {
  track: string;
  tokenEffect: string;
  previewLabel: string;
  minLevel: number;
  successfulReferrals: number;
  walletLinked: boolean;
  eligibilityProgressPoints: number;
  directTokenAsset: string;
  directTokenAmount: number;
  rewardProgramId: string;
};

type QuestTemplate = {
  label: string;
  description: string;
  form: Partial<QuestDefinitionFormState>;
  metadata: Record<string, unknown>;
};

type TemplateFormState = {
  label: string;
  description: string;
  isActive: boolean;
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

function getTemplateLaneSummary(metadata: Record<string, unknown>) {
  const templateKind =
    typeof metadata.campaignTemplateKind === "string" ? metadata.campaignTemplateKind : null;
  const attributionSource =
    typeof metadata.campaignAttributionSource === "string" ? metadata.campaignAttributionSource : null;
  const activeLane = typeof metadata.campaignExperienceLane === "string" ? metadata.campaignExperienceLane : null;

  if (!templateKind || !attributionSource || !activeLane) {
    return null;
  }

  if (templateKind === "bridge") {
    return `${attributionSource} bridge template running on the ${activeLane} live lane.`;
  }

  if (templateKind === "feeder") {
    return `${attributionSource} feeder template that defaults into the ${activeLane} bridge lane.`;
  }

  return `${attributionSource} template aligned to the ${activeLane} lane.`;
}

function getTemplateKindLabel(metadata: Record<string, unknown>) {
  const templateKind =
    typeof metadata.campaignTemplateKind === "string" ? metadata.campaignTemplateKind : null;

  if (templateKind === "bridge") {
    return "Bridge";
  }

  if (templateKind === "feeder") {
    return "Feeder";
  }

  return null;
}

function getBridgeTemplateWarning(
  metadata: Record<string, unknown>,
  differentiateUpstreamCampaignSources: boolean,
) {
  if (!differentiateUpstreamCampaignSources) {
    return null;
  }

  const templateKind =
    typeof metadata.campaignTemplateKind === "string" ? metadata.campaignTemplateKind : null;
  const attributionSource =
    typeof metadata.campaignAttributionSource === "string" ? metadata.campaignAttributionSource : null;
  const activeLane = typeof metadata.campaignExperienceLane === "string" ? metadata.campaignExperienceLane : null;

  if (templateKind !== "feeder" || !attributionSource || !activeLane) {
    return null;
  }

  if (attributionSource !== "galxe" && attributionSource !== "taskon") {
    return null;
  }

  return `${attributionSource} is currently running as its own live lane, but this template is still configured as a feeder into the ${activeLane} bridge. Review copy, quest ordering, and reward framing before saving it live.`;
}

export function QuestDefinitionManagementPanel({
  availableAssets,
  availablePrograms,
  initialTemplates,
  differentiateUpstreamCampaignSources,
}: {
  availableAssets: RewardAsset[];
  availablePrograms: RewardProgram[];
  initialTemplates: QuestDefinitionTemplateItem[];
  differentiateUpstreamCampaignSources: boolean;
}) {
  const router = useRouter();
  const [quests, setQuests] = useState<QuestDefinitionAdminItem[]>([]);
  const [templates, setTemplates] = useState<QuestDefinitionTemplateItem[]>(initialTemplates);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingTemplateId, setEditingTemplateId] = useState<string | null>(null);
  const [form, setForm] = useState({ ...emptyForm });
  const [templateForm, setTemplateForm] = useState<TemplateFormState>({
    label: "",
    description: "",
    isActive: true,
  });
  const [loading, setLoading] = useState(true);
  const [pending, setPending] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [templateWarningAcknowledged, setTemplateWarningAcknowledged] = useState(false);

  const metadataState = useMemo(() => parseMetadata(form.metadataText), [form.metadataText]);
  const bridgeTemplateWarning = useMemo(
    () =>
      getBridgeTemplateWarning(metadataState.parsed ?? {}, differentiateUpstreamCampaignSources),
    [differentiateUpstreamCampaignSources, metadataState.parsed],
  );
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
  const metadataBuilder = useMemo<MetadataBuilderState>(() => {
    const metadata = metadataState.parsed ?? {};
    const rewardConfig = (metadata.rewardConfig as Record<string, unknown> | undefined) ?? {};
    const unlockRules = (metadata.unlockRules as { all?: Array<{ type?: string; value?: unknown }> } | undefined) ?? {};
    const allRules = unlockRules.all ?? [];
    const directTokenReward = (rewardConfig.directTokenReward as Record<string, unknown> | undefined) ?? {};
    const tokenEligibility = (rewardConfig.tokenEligibility as Record<string, unknown> | undefined) ?? {};

    return {
      track: typeof metadata.track === "string" ? metadata.track : "starter",
      tokenEffect: typeof rewardConfig.tokenEffect === "string" ? rewardConfig.tokenEffect : "none",
      previewLabel:
        typeof (metadata.previewConfig as Record<string, unknown> | undefined)?.label === "string"
          ? String((metadata.previewConfig as Record<string, unknown>).label)
          : "",
      minLevel: Number(allRules.find((rule) => rule.type === "min_level")?.value ?? 0),
      successfulReferrals: Number(allRules.find((rule) => rule.type === "successful_referrals")?.value ?? 0),
      walletLinked: Boolean(allRules.find((rule) => rule.type === "wallet_linked")?.value),
      eligibilityProgressPoints: Number(tokenEligibility.progressPoints ?? 0),
      directTokenAsset:
        typeof directTokenReward.asset === "string"
          ? directTokenReward.asset
          : availableAssets[0]?.symbol ?? "EMR",
      directTokenAmount: Number(directTokenReward.amount ?? 0),
      rewardProgramId: typeof metadata.rewardProgramId === "string" ? metadata.rewardProgramId : "",
    };
  }, [availableAssets, metadataState.parsed]);
  const questTemplates = useMemo<QuestTemplate[]>(() => {
    const defaultAsset = availableAssets[0]?.symbol ?? "EMR";
    const coreProgram = availablePrograms[0]?.id ?? "";
    const partnerProgram =
      availablePrograms.find((program) => program.assetSymbol !== defaultAsset)?.id ?? coreProgram;

    return [
      {
        label: "Starter ladder quest",
        description: "Low-friction onboarding step with XP-only progression.",
        form: {
          category: "app",
          difficulty: "easy",
          verificationType: "link-visit",
          recurrence: "one-time",
          requiredTier: "free",
          xpReward: 25,
        },
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
        label: "Partner token flash quest",
        description: "Annual or premium spike quest with direct token payout and program mapping.",
        form: {
          category: "limited",
          difficulty: "hard",
          verificationType: "manual-review",
          recurrence: "weekly",
          requiredTier: "annual",
          xpReward: 180,
        },
        metadata: {
          track: "premium",
          rewardProgramId: partnerProgram,
          rewardConfig: {
            xp: { base: 180, premiumMultiplierEligible: true },
            tokenEffect: "direct_token_reward",
            directTokenReward: {
              asset: availablePrograms.find((program) => program.id === partnerProgram)?.assetSymbol ?? defaultAsset,
              amount: 20,
              requiresWallet: true,
            },
          },
          unlockRules: {
            all: [{ type: "subscription_tier", value: "annual" }],
          },
          previewConfig: {
            label: "Partner flash payout",
          },
        },
      },
      {
        label: "Referral annual win",
        description: "High-value referral milestone with direct payout and referral gating.",
        form: {
          category: "referral",
          difficulty: "hard",
          verificationType: "text-submission",
          recurrence: "one-time",
          requiredTier: "free",
          xpReward: 300,
        },
        metadata: {
          track: "referral",
          rewardProgramId: coreProgram,
          rewardConfig: {
            xp: { base: 300, premiumMultiplierEligible: true },
            tokenEffect: "direct_token_reward",
            directTokenReward: {
              asset: defaultAsset,
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
        label: "Wallet growth milestone",
        description: "Eligibility-point quest mapped to wallet-linked progression.",
        form: {
          category: "staking",
          difficulty: "medium",
          verificationType: "wallet-check",
          recurrence: "weekly",
          requiredTier: "free",
          xpReward: 70,
        },
        metadata: {
          track: "wallet",
          rewardProgramId: coreProgram,
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
      {
        label: "Zealy bridge quest",
        description: "Live Zealy bridge step that turns campaign momentum into wallet-linked Emorya progress.",
        form: {
          category: "app",
          difficulty: "medium",
          verificationType: "link-visit",
          recurrence: "one-time",
          requiredTier: "free",
          requiredLevel: 1,
          xpReward: 85,
        },
        metadata: {
          track: "campaign",
          rewardProgramId: coreProgram,
          targetUrl: "https://example.com/zealy-bridge",
          campaignTemplateKind: "bridge",
          campaignAttributionSource: "zealy",
          campaignExperienceLane: "zealy",
          rewardConfig: {
            xp: { base: 85, premiumMultiplierEligible: true },
            tokenEffect: "eligibility_progress",
            tokenEligibility: {
              progressPoints: 18,
            },
          },
          unlockRules: {
            all: [{ type: "campaign_source", value: "zealy" }],
          },
          previewConfig: {
            label: "Zealy bridge",
          },
        },
      },
      {
        label: "Galxe feeder quest",
        description: "External discovery quest that captures Galxe users and hands them into the Zealy bridge.",
        form: {
          category: "social",
          difficulty: "easy",
          verificationType: "link-visit",
          recurrence: "one-time",
          requiredTier: "free",
          requiredLevel: 1,
          xpReward: 55,
        },
        metadata: {
          track: "campaign",
          rewardProgramId: coreProgram,
          targetUrl: "https://example.com/galxe-bridge",
          campaignTemplateKind: "feeder",
          campaignAttributionSource: "galxe",
          campaignExperienceLane: "zealy",
          requiresUpstreamDifferentiation: false,
          rewardConfig: {
            xp: { base: 55, premiumMultiplierEligible: true },
            tokenEffect: "eligibility_progress",
            tokenEligibility: {
              progressPoints: 10,
            },
          },
          unlockRules: {
            all: [{ type: "campaign_source", value: "galxe" }],
          },
          previewConfig: {
            label: "Galxe to Zealy feeder",
          },
        },
      },
      {
        label: "TaskOn feeder quest",
        description: "Task-completion handoff quest that moves TaskOn users into the Zealy bridge path.",
        form: {
          category: "app",
          difficulty: "medium",
          verificationType: "link-visit",
          recurrence: "one-time",
          requiredTier: "free",
          requiredLevel: 1,
          xpReward: 60,
        },
        metadata: {
          track: "campaign",
          rewardProgramId: coreProgram,
          targetUrl: "https://example.com/taskon-bridge",
          campaignTemplateKind: "feeder",
          campaignAttributionSource: "taskon",
          campaignExperienceLane: "zealy",
          requiresUpstreamDifferentiation: false,
          rewardConfig: {
            xp: { base: 60, premiumMultiplierEligible: true },
            tokenEffect: "eligibility_progress",
            tokenEligibility: {
              progressPoints: 12,
            },
          },
          unlockRules: {
            all: [{ type: "campaign_source", value: "taskon" }],
          },
          previewConfig: {
            label: "TaskOn to Zealy feeder",
          },
        },
      },
    ];
  }, [availableAssets, availablePrograms]);

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

  async function refreshTemplateDirectory() {
    try {
      const response = await fetch("/api/admin/quest-definition-templates", { cache: "no-store" });
      const result = (await response.json()) as QuestDefinitionTemplateResponse;

      if (!response.ok || !result.ok || !result.templates) {
        setError(result.error ?? "Unable to load quest templates.");
        return;
      }

      setTemplates(result.templates);
    } catch {
      setError("Unable to reach the quest template service.");
    }
  }

  useEffect(() => {
    void refreshQuestDirectory();
    void refreshTemplateDirectory();
  }, []);

  useEffect(() => {
    if (!bridgeTemplateWarning) {
      setTemplateWarningAcknowledged(false);
    }
  }, [bridgeTemplateWarning]);

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

  function applyTemplate(template: QuestTemplate) {
    setForm((current) => ({
      ...current,
      ...template.form,
      metadataText: JSON.stringify(template.metadata, null, 2),
    }));
  }

  function applySavedTemplate(template: QuestDefinitionTemplateItem) {
    setForm((current) => ({
      ...current,
      category: template.form.category,
      difficulty: template.form.difficulty,
      verificationType: template.form.verificationType,
      recurrence: template.form.recurrence,
      requiredTier: template.form.requiredTier,
      requiredLevel: template.form.requiredLevel,
      xpReward: template.form.xpReward,
      isPremiumPreview: template.form.isPremiumPreview,
      isActive: template.form.isActive,
      metadataText: JSON.stringify(template.metadata, null, 2),
    }));
  }

  function resetTemplateForm() {
    setEditingTemplateId(null);
    setTemplateForm({
      label: "",
      description: "",
      isActive: true,
    });
    setTemplateWarningAcknowledged(false);
  }

  function startEditTemplate(template: QuestDefinitionTemplateItem) {
    setEditingTemplateId(template.id);
    setTemplateForm({
      label: template.label,
      description: template.description,
      isActive: template.isActive,
    });
    applySavedTemplate(template);
    setMessage(null);
    setError(null);
  }

  function updateMetadataBuilder(updater: (current: MetadataBuilderState) => MetadataBuilderState) {
    const next = updater(metadataBuilder);
    const nextMetadata = { ...(metadataState.parsed ?? {}) } as Record<string, unknown>;
    const rewardConfig = { ...((nextMetadata.rewardConfig as Record<string, unknown> | undefined) ?? {}) };
    const previewConfig = { ...((nextMetadata.previewConfig as Record<string, unknown> | undefined) ?? {}) };
    const allRules: Array<{ type: string; value: unknown }> = [];

    if (next.minLevel > 0) {
      allRules.push({ type: "min_level", value: next.minLevel });
    }
    if (next.successfulReferrals > 0) {
      allRules.push({ type: "successful_referrals", value: next.successfulReferrals });
    }
    if (next.walletLinked) {
      allRules.push({ type: "wallet_linked", value: true });
    }

    rewardConfig.tokenEffect = next.tokenEffect;
    if (next.eligibilityProgressPoints > 0) {
      rewardConfig.tokenEligibility = { progressPoints: next.eligibilityProgressPoints };
    } else {
      delete rewardConfig.tokenEligibility;
    }
    if (next.directTokenAmount > 0) {
      rewardConfig.directTokenReward = {
        asset: next.directTokenAsset,
        amount: next.directTokenAmount,
        requiresWallet: true,
      };
    } else {
      delete rewardConfig.directTokenReward;
    }

    nextMetadata.track = next.track;
    if (next.rewardProgramId) {
      nextMetadata.rewardProgramId = next.rewardProgramId;
    } else {
      delete nextMetadata.rewardProgramId;
    }
    nextMetadata.rewardConfig = rewardConfig;
    if (next.previewLabel.trim()) {
      previewConfig.label = next.previewLabel.trim();
      nextMetadata.previewConfig = previewConfig;
    } else {
      delete nextMetadata.previewConfig;
    }
    if (allRules.length > 0) {
      nextMetadata.unlockRules = { all: allRules };
    } else {
      delete nextMetadata.unlockRules;
    }

    setForm((current) => ({
      ...current,
      metadataText: JSON.stringify(nextMetadata, null, 2),
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

  async function submitTemplate() {
    setPending(editingTemplateId ?? "template-create");
    setMessage(null);
    setError(null);

    if (metadataState.error || !metadataState.parsed) {
      setError(`Template metadata JSON is invalid: ${metadataState.error ?? "Invalid JSON."}`);
      setPending(null);
      return;
    }

    if (bridgeTemplateWarning && !templateWarningAcknowledged) {
      setError("Acknowledge the live-lane warning before saving this feeder template.");
      setPending(null);
      return;
    }

    const payload = {
      label: templateForm.label.trim(),
      description: templateForm.description.trim(),
      isActive: templateForm.isActive,
      form: {
        category: form.category,
        difficulty: form.difficulty,
        verificationType: form.verificationType,
        recurrence: form.recurrence,
        requiredTier: form.requiredTier,
        requiredLevel: Number(form.requiredLevel),
        xpReward: Number(form.xpReward),
        isPremiumPreview: form.isPremiumPreview,
        isActive: form.isActive,
      },
      metadata: metadataState.parsed,
    };

    try {
      const endpoint = editingTemplateId
        ? `/api/admin/quest-definition-templates/${editingTemplateId}`
        : "/api/admin/quest-definition-templates";
      const response = await fetch(endpoint, {
        method: editingTemplateId ? "PATCH" : "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });
      const result = (await response.json()) as QuestDefinitionTemplateResponse;

      if (!response.ok || !result.ok || !result.templates) {
        setError(result.error ?? "Unable to save quest template.");
        return;
      }

      setTemplates(result.templates);
      setMessage(editingTemplateId ? "Quest template updated." : "Quest template saved.");
      resetTemplateForm();
      router.refresh();
    } catch {
      setError("Unable to reach the quest template service.");
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

  async function removeTemplate(templateId: string) {
    setPending(templateId);
    setMessage(null);
    setError(null);

    try {
      const response = await fetch(`/api/admin/quest-definition-templates/${templateId}`, {
        method: "DELETE",
      });
      const result = (await response.json()) as QuestDefinitionTemplateResponse;

      if (!response.ok || !result.ok || !result.templates) {
        setError(result.error ?? "Unable to delete quest template.");
        return;
      }

      setTemplates(result.templates);
      setMessage("Quest template deleted.");
      if (editingTemplateId === templateId) {
        resetTemplateForm();
      }
      router.refresh();
    } catch {
      setError("Unable to reach the quest template service.");
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
      <div className="achievement-list">
        {questTemplates.map((template) => (
          <article key={template.label} className="achievement-card">
            <div>
              <strong>{template.label}</strong>
              {getTemplateKindLabel(template.metadata) ? (
                <p className="review-history__meta">
                  <span>{getTemplateKindLabel(template.metadata)}</span>
                </p>
              ) : null}
              <p>{template.description}</p>
              {getTemplateLaneSummary(template.metadata) ? (
                <p className="form-note">{getTemplateLaneSummary(template.metadata)}</p>
              ) : null}
            </div>
            <button className="button button--secondary button--small" type="button" onClick={() => applyTemplate(template)}>
              Apply template
            </button>
          </article>
        ))}
      </div>
      <section className="panel panel--glass">
        <div className="panel__header">
          <div>
            <p className="eyebrow">Saved templates</p>
            <h3>Reusable admin presets</h3>
          </div>
          <span className="badge">{templates.length} saved</span>
        </div>
        <div className="profile-grid">
          <label className="field">
            <span>Template label</span>
            <input
              value={templateForm.label}
              onChange={(event) => setTemplateForm((current) => ({ ...current, label: event.target.value }))}
            />
          </label>
          <label className="field field--checkbox">
            <span>Template active</span>
            <input
              type="checkbox"
              checked={templateForm.isActive}
              onChange={(event) => setTemplateForm((current) => ({ ...current, isActive: event.target.checked }))}
            />
          </label>
        </div>
        <label className="field">
          <span>Template description</span>
          <textarea
            rows={2}
            value={templateForm.description}
            onChange={(event) => setTemplateForm((current) => ({ ...current, description: event.target.value }))}
          />
        </label>
        {bridgeTemplateWarning ? (
          <label className="field field--checkbox">
            <span>Acknowledge feeder template warning</span>
            <input
              type="checkbox"
              checked={templateWarningAcknowledged}
              onChange={(event) => setTemplateWarningAcknowledged(event.target.checked)}
            />
          </label>
        ) : null}
        {bridgeTemplateWarning ? <p className="status status--error">{bridgeTemplateWarning}</p> : null}
        <div className="review-bulk-actions">
          <button
            className="button button--secondary button--small"
            type="button"
            disabled={
              pending !== null ||
              Boolean(metadataState.error) ||
              (Boolean(bridgeTemplateWarning) && !templateWarningAcknowledged) ||
              !templateForm.label.trim() ||
              !templateForm.description.trim()
            }
            onClick={submitTemplate}
          >
            {pending === "template-create" || (editingTemplateId && pending === editingTemplateId)
              ? "Saving..."
              : editingTemplateId
                ? "Update template"
                : "Save as template"}
          </button>
          <button className="button button--secondary button--small" type="button" disabled={pending !== null} onClick={resetTemplateForm}>
            Reset template
          </button>
        </div>
        <div className="review-history__list">
          {templates.map((template) => (
            <article key={template.id} className="review-history__item">
              <div className="quest-card__meta">
                <span>{template.label}</span>
                <span>{template.isActive ? "active" : "inactive"}</span>
              </div>
              {getTemplateKindLabel(template.metadata) ? (
                <div className="review-history__meta">
                  <span>{getTemplateKindLabel(template.metadata)}</span>
                </div>
              ) : null}
              <h4>{template.description}</h4>
              <div className="review-history__meta">
                <span>{template.form.category}</span>
                <span>{template.form.requiredTier}</span>
                <span>Lv {template.form.requiredLevel}</span>
                <span>{template.form.xpReward} XP</span>
              </div>
              {getTemplateLaneSummary(template.metadata) ? (
                <p className="form-note">{getTemplateLaneSummary(template.metadata)}</p>
              ) : null}
              <div className="review-bulk-actions">
                <button className="button button--secondary button--small" type="button" disabled={pending !== null} onClick={() => applySavedTemplate(template)}>
                  Apply
                </button>
                <button className="button button--secondary button--small" type="button" disabled={pending !== null} onClick={() => startEditTemplate(template)}>
                  Edit template
                </button>
                <button className="button button--secondary button--small" type="button" disabled={pending !== null} onClick={() => removeTemplate(template.id)}>
                  {pending === template.id ? "Deleting..." : "Delete"}
                </button>
              </div>
            </article>
          ))}
        </div>
      </section>
      <label className="field">
        <span>Metadata JSON</span>
        <textarea rows={12} value={form.metadataText} onChange={(event) => setForm((current) => ({ ...current, metadataText: event.target.value }))} />
      </label>
      <section className="panel panel--glass">
        <div className="panel__header">
          <div>
            <p className="eyebrow">Metadata builder</p>
            <h3>Structured unlock and reward fields</h3>
          </div>
        </div>
        <div className="profile-grid">
          <label className="field">
            <span>Track</span>
            <select value={metadataBuilder.track} onChange={(event) => updateMetadataBuilder((current) => ({ ...current, track: event.target.value }))}>
              {["starter", "daily", "social", "wallet", "referral", "premium", "ambassador", "creative", "campaign", "quiz"].map((value) => (
                <option key={value} value={value}>{value}</option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>Token effect</span>
            <select value={metadataBuilder.tokenEffect} onChange={(event) => updateMetadataBuilder((current) => ({ ...current, tokenEffect: event.target.value }))}>
              {["none", "eligibility_progress", "token_bonus", "direct_token_reward"].map((value) => (
                <option key={value} value={value}>{value}</option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>Preview label</span>
            <input value={metadataBuilder.previewLabel} onChange={(event) => updateMetadataBuilder((current) => ({ ...current, previewLabel: event.target.value }))} />
          </label>
          <label className="field">
            <span>Minimum level unlock</span>
            <input type="number" value={metadataBuilder.minLevel} onChange={(event) => updateMetadataBuilder((current) => ({ ...current, minLevel: Number(event.target.value) }))} />
          </label>
          <label className="field">
            <span>Referral requirement</span>
            <input type="number" value={metadataBuilder.successfulReferrals} onChange={(event) => updateMetadataBuilder((current) => ({ ...current, successfulReferrals: Number(event.target.value) }))} />
          </label>
          <label className="field">
            <span>Eligibility progress points</span>
            <input type="number" value={metadataBuilder.eligibilityProgressPoints} onChange={(event) => updateMetadataBuilder((current) => ({ ...current, eligibilityProgressPoints: Number(event.target.value) }))} />
          </label>
          <label className="field">
            <span>Direct reward asset</span>
            <select value={metadataBuilder.directTokenAsset} onChange={(event) => updateMetadataBuilder((current) => ({ ...current, directTokenAsset: event.target.value }))}>
              {availableAssets.map((asset) => (
                <option key={asset.id} value={asset.symbol}>{asset.symbol}</option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>Direct reward amount</span>
            <input type="number" step="0.01" value={metadataBuilder.directTokenAmount} onChange={(event) => updateMetadataBuilder((current) => ({ ...current, directTokenAmount: Number(event.target.value) }))} />
          </label>
          <label className="field">
            <span>Reward program</span>
            <select value={metadataBuilder.rewardProgramId} onChange={(event) => updateMetadataBuilder((current) => ({ ...current, rewardProgramId: event.target.value }))}>
              <option value="">Default economy</option>
              {availablePrograms.map((program) => (
                <option key={program.id} value={program.id}>
                  {program.name} · {program.assetSymbol}
                </option>
              ))}
            </select>
          </label>
          <label className="field field--checkbox">
            <span>Wallet required</span>
            <input type="checkbox" checked={metadataBuilder.walletLinked} onChange={(event) => updateMetadataBuilder((current) => ({ ...current, walletLinked: event.target.checked }))} />
          </label>
        </div>
      </section>
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
        {bridgeTemplateWarning ? (
          <article className="achievement-card">
            <div>
              <strong>Bridge-oriented feeder warning</strong>
              <p>{bridgeTemplateWarning}</p>
            </div>
            <span className="badge">Review lane fit</span>
          </article>
        ) : null}
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
