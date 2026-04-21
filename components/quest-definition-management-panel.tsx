"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { validateCampaignPackTemplates } from "@/lib/campaign-pack";
import type {
  QuestTaskBlock,
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

type CampaignPackResponse = {
  ok: boolean;
  error?: string;
  quests?: QuestDefinitionAdminItem[];
  packSummary?: {
    packId: string;
    label: string;
    createdCount: number;
  };
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
  platformLabel: string;
  tokenEffect: string;
  previewLabel: string;
  ctaLabel: string;
  targetUrl: string;
  helpUrl: string;
  verificationReferenceUrl: string;
  proofType: string;
  proofInstructions: string;
  questPortability: string;
  visibleBrandThemes: string;
  minLevel: number;
  successfulReferrals: number;
  walletLinked: boolean;
  eligibilityProgressPoints: number;
  directTokenAsset: string;
  directTokenAmount: number;
  rewardProgramId: string;
  apiEndpointUrl: string;
  apiMethod: string;
  apiAuthHeaderName: string;
  apiAuthHeaderValue: string;
  apiFailureMode: string;
  apiCallbackToken: string;
};

function slugifyTaskLabel(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
}

function normalizeTaskBlocks(metadata: Record<string, unknown>): QuestTaskBlock[] {
  if (!Array.isArray(metadata.taskBlocks)) {
    return [];
  }

  return metadata.taskBlocks.reduce<QuestTaskBlock[]>((taskBlocks, rawTask, index) => {
    if (!rawTask || typeof rawTask !== "object") {
      return taskBlocks;
    }

    const task = rawTask as Record<string, unknown>;
    const label = typeof task.label === "string" ? task.label : "";
    if (!label.trim()) {
      return taskBlocks;
    }

    taskBlocks.push({
      id:
        typeof task.id === "string" && task.id.trim()
          ? task.id.trim()
          : `task-${index + 1}`,
      label,
      description: typeof task.description === "string" ? task.description : undefined,
      platformLabel: typeof task.platformLabel === "string" ? task.platformLabel : undefined,
      ctaLabel: typeof task.ctaLabel === "string" ? task.ctaLabel : undefined,
      targetUrl: typeof task.targetUrl === "string" ? task.targetUrl : undefined,
      helpUrl: typeof task.helpUrl === "string" ? task.helpUrl : undefined,
      verificationReferenceUrl:
        typeof task.verificationReferenceUrl === "string" ? task.verificationReferenceUrl : undefined,
      proofType: typeof task.proofType === "string" ? task.proofType : undefined,
      proofInstructions: typeof task.proofInstructions === "string" ? task.proofInstructions : undefined,
      required: typeof task.required === "boolean" ? task.required : true,
    });

    return taskBlocks;
  }, []);
}

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

type TemplateFilterState = {
  search: string;
  kind: "all" | "bridge" | "feeder";
  source: "all" | "zealy" | "galxe" | "taskon";
  status: "all" | "active" | "inactive";
};

type GuidedPlatform =
  | "website"
  | "x"
  | "discord"
  | "telegram"
  | "app-store"
  | "google-play"
  | "zealy"
  | "galxe"
  | "taskon"
  | "wallet"
  | "custom";

type GuidedQuestType =
  | "visit-link"
  | "community-join"
  | "social-share"
  | "review-proof"
  | "written-response"
  | "proof-upload"
  | "api-verification"
  | "wallet-verification"
  | "quiz-check";

const guidedPlatformOptions: Array<{ value: GuidedPlatform; label: string }> = [
  { value: "website", label: "Website" },
  { value: "x", label: "X" },
  { value: "discord", label: "Discord" },
  { value: "telegram", label: "Telegram" },
  { value: "app-store", label: "App Store" },
  { value: "google-play", label: "Google Play" },
  { value: "zealy", label: "Zealy" },
  { value: "galxe", label: "Galxe" },
  { value: "taskon", label: "TaskOn" },
  { value: "wallet", label: "Wallet" },
  { value: "custom", label: "Custom" },
];

const guidedQuestTypeOptions: Array<{ value: GuidedQuestType; label: string }> = [
  { value: "visit-link", label: "Visit link" },
  { value: "community-join", label: "Join / follow" },
  { value: "social-share", label: "Share / repost" },
  { value: "review-proof", label: "Rating / review proof" },
  { value: "written-response", label: "Written response" },
  { value: "proof-upload", label: "File / screenshot proof" },
  { value: "api-verification", label: "API verification" },
  { value: "wallet-verification", label: "Wallet verification" },
  { value: "quiz-check", label: "Quiz / check" },
];

function getGuidedPlatformLabel(platform: GuidedPlatform) {
  switch (platform) {
    case "x":
      return "X";
    case "discord":
      return "Discord";
    case "telegram":
      return "Telegram";
    case "app-store":
      return "App Store";
    case "google-play":
      return "Google Play";
    case "zealy":
      return "Zealy";
    case "galxe":
      return "Galxe";
    case "taskon":
      return "TaskOn";
    case "wallet":
      return "Wallet";
    case "custom":
      return "Custom";
    default:
      return "Website";
  }
}

function getGuidedQuestBlueprint(platform: GuidedPlatform, questType: GuidedQuestType) {
  const platformLabel = getGuidedPlatformLabel(platform);
  const defaultTargetUrl =
    platform === "x"
      ? "https://x.com/"
      : platform === "discord"
        ? "https://discord.gg/"
        : platform === "telegram"
          ? "https://t.me/"
          : platform === "app-store"
            ? "https://apps.apple.com/app/"
            : platform === "google-play"
              ? "https://play.google.com/store/apps/details?id="
              : platform === "zealy"
                ? "https://zealy.io/c/example/quest-board"
                : platform === "galxe"
                  ? "https://app.galxe.com/quest/example"
                  : platform === "taskon"
                    ? "https://taskon.xyz/campaign/detail/"
                    : "https://example.com/";

  switch (questType) {
    case "community-join":
      return {
        form: {
          category: "social",
          difficulty: "easy",
          verificationType: "manual-review",
          recurrence: "one-time",
        },
        metadata: {
          track: "social",
          platformLabel,
          ctaLabel: platform === "x" ? "Open profile" : platform === "discord" ? "Open invite" : "Open link",
          targetUrl: defaultTargetUrl,
          proofType: "screenshot",
          proofInstructions: `Join or follow on ${platformLabel}, then upload proof or paste a public reference.`,
        },
      };
    case "social-share":
      return {
        form: {
          category: "social",
          difficulty: "easy",
          verificationType: "manual-review",
          recurrence: "weekly",
        },
        metadata: {
          track: "social",
          platformLabel,
          ctaLabel: `Open ${platformLabel} task`,
          targetUrl: defaultTargetUrl,
          proofType: "url",
          proofInstructions: `Complete the share task on ${platformLabel} and submit the public post URL.`,
        },
      };
    case "review-proof":
      return {
        form: {
          category: "social",
          difficulty: "medium",
          verificationType: "manual-review",
          recurrence: "one-time",
        },
        metadata: {
          track: "social",
          platformLabel,
          ctaLabel: "Open listing",
          targetUrl: defaultTargetUrl,
          proofType: "screenshot",
          proofInstructions: `Leave a genuine rating or review on ${platformLabel}, then upload proof.`,
        },
      };
    case "written-response":
      return {
        form: {
          category: "learn",
          difficulty: "medium",
          verificationType: "text-submission",
          recurrence: "monthly",
        },
        metadata: {
          track: "learn",
          platformLabel,
          proofType: "text",
          proofInstructions: "Submit a written response with optional reference link.",
        },
      };
    case "proof-upload":
      return {
        form: {
          category: "app",
          difficulty: "medium",
          verificationType: "manual-review",
          recurrence: "weekly",
        },
        metadata: {
          track: "daily",
          platformLabel,
          ctaLabel: "Open task",
          targetUrl: defaultTargetUrl,
          proofType: "file-upload",
          proofInstructions: "Complete the action, then upload proof or attach a screenshot.",
        },
      };
    case "api-verification":
      return {
        form: {
          category: "app",
          difficulty: "medium",
          verificationType: "api-check",
          recurrence: "one-time",
        },
        metadata: {
          track: platform === "zealy" || platform === "galxe" || platform === "taskon" ? "campaign" : "app",
          platformLabel,
          ctaLabel: `Open ${platformLabel} task`,
          targetUrl: defaultTargetUrl,
          proofType: "url",
          proofInstructions: "Complete the external task, then submit a reference URL or completion id for verification.",
          apiVerification: {
            endpointUrl: "https://example.com/api/verify",
            method: "POST",
            failureMode: "pending-review",
          },
        },
      };
    case "wallet-verification":
      return {
        form: {
          category: "staking",
          difficulty: "medium",
          verificationType: "wallet-check",
          recurrence: "weekly",
        },
        metadata: {
          track: "wallet",
          platformLabel,
          proofType: "wallet",
          proofInstructions: "Select a linked wallet and verify it against this quest rule.",
        },
      };
    case "quiz-check":
      return {
        form: {
          category: "learn",
          difficulty: "medium",
          verificationType: "quiz",
          recurrence: "one-time",
        },
        metadata: {
          track: "quiz",
          proofType: "quiz",
          proofInstructions: "Submit the score or pass result for this quiz.",
        },
      };
    default:
      return {
        form: {
          category: "app",
          difficulty: "easy",
          verificationType: "link-visit",
          recurrence: "one-time",
        },
        metadata: {
          track: "starter",
          platformLabel,
          ctaLabel: "Open quest",
          targetUrl: defaultTargetUrl,
          proofType: "link",
          proofInstructions: "Open the linked destination and record the visit.",
        },
      };
  }
}

function getGuidedTemplateDefaults(platform: GuidedPlatform, questType: GuidedQuestType) {
  const platformLabel = getGuidedPlatformLabel(platform);
  const questTypeLabel =
    guidedQuestTypeOptions.find((option) => option.value === questType)?.label ?? questType;

  return {
    label: `${platformLabel} ${questTypeLabel}`,
    description: `Reusable ${questTypeLabel.toLowerCase()} template for ${platformLabel}.`,
  };
}

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
  const [guidedPlatform, setGuidedPlatform] = useState<GuidedPlatform>("website");
  const [guidedQuestType, setGuidedQuestType] = useState<GuidedQuestType>("visit-link");
  const [templateFilters, setTemplateFilters] = useState<TemplateFilterState>({
    search: "",
    kind: "all",
    source: "all",
    status: "all",
  });
  const [campaignPackLabel, setCampaignPackLabel] = useState("March Campaign");

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
      platformLabel: typeof metadata.platformLabel === "string" ? metadata.platformLabel : null,
      tokenEffect: typeof rewardConfig.tokenEffect === "string" ? rewardConfig.tokenEffect : "none",
      previewLabel: typeof previewConfig.label === "string" ? previewConfig.label : null,
      ctaLabel: typeof metadata.ctaLabel === "string" ? metadata.ctaLabel : null,
      proofType: typeof metadata.proofType === "string" ? metadata.proofType : null,
      taskBlockCount: normalizeTaskBlocks(metadata).length,
      unlockRuleCount: (unlockRules.all?.length ?? 0) + (unlockRules.any?.length ?? 0),
      directTokenReward:
        directTokenReward?.asset && typeof directTokenReward.amount === "number"
          ? `${directTokenReward.amount} ${directTokenReward.asset}`
          : null,
    };
  }, [metadataState.parsed]);
  const metadataTaskBlocks = useMemo(() => normalizeTaskBlocks(metadataState.parsed ?? {}), [metadataState.parsed]);
  const metadataBuilder = useMemo<MetadataBuilderState>(() => {
    const metadata = metadataState.parsed ?? {};
    const rewardConfig = (metadata.rewardConfig as Record<string, unknown> | undefined) ?? {};
    const unlockRules = (metadata.unlockRules as { all?: Array<{ type?: string; value?: unknown }> } | undefined) ?? {};
    const allRules = unlockRules.all ?? [];
    const directTokenReward = (rewardConfig.directTokenReward as Record<string, unknown> | undefined) ?? {};
    const tokenEligibility = (rewardConfig.tokenEligibility as Record<string, unknown> | undefined) ?? {};

    return {
      track: typeof metadata.track === "string" ? metadata.track : "starter",
      platformLabel: typeof metadata.platformLabel === "string" ? metadata.platformLabel : "",
      tokenEffect: typeof rewardConfig.tokenEffect === "string" ? rewardConfig.tokenEffect : "none",
      previewLabel:
        typeof (metadata.previewConfig as Record<string, unknown> | undefined)?.label === "string"
          ? String((metadata.previewConfig as Record<string, unknown>).label)
          : "",
      ctaLabel: typeof metadata.ctaLabel === "string" ? metadata.ctaLabel : "",
      targetUrl: typeof metadata.targetUrl === "string" ? metadata.targetUrl : "",
      helpUrl: typeof metadata.helpUrl === "string" ? metadata.helpUrl : "",
      verificationReferenceUrl:
        typeof metadata.verificationReferenceUrl === "string" ? metadata.verificationReferenceUrl : "",
      proofType: typeof metadata.proofType === "string" ? metadata.proofType : "",
      proofInstructions: typeof metadata.proofInstructions === "string" ? metadata.proofInstructions : "",
      questPortability:
        typeof metadata.questPortability === "string" ? metadata.questPortability : "core_portable",
      visibleBrandThemes: Array.isArray(metadata.brandThemes)
        ? metadata.brandThemes.filter((theme) => typeof theme === "string").join(", ")
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
      apiEndpointUrl:
        typeof (metadata.apiVerification as Record<string, unknown> | undefined)?.endpointUrl === "string"
          ? String((metadata.apiVerification as Record<string, unknown>).endpointUrl)
          : "",
      apiMethod:
        typeof (metadata.apiVerification as Record<string, unknown> | undefined)?.method === "string"
          ? String((metadata.apiVerification as Record<string, unknown>).method).toUpperCase()
          : "POST",
      apiAuthHeaderName:
        typeof (metadata.apiVerification as Record<string, unknown> | undefined)?.authHeaderName === "string"
          ? String((metadata.apiVerification as Record<string, unknown>).authHeaderName)
          : "",
      apiAuthHeaderValue:
        typeof (metadata.apiVerification as Record<string, unknown> | undefined)?.authHeaderValue === "string"
          ? String((metadata.apiVerification as Record<string, unknown>).authHeaderValue)
          : "",
      apiFailureMode:
        typeof (metadata.apiVerification as Record<string, unknown> | undefined)?.failureMode === "string"
          ? String((metadata.apiVerification as Record<string, unknown>).failureMode)
          : "reject",
      apiCallbackToken:
        typeof (metadata.apiVerification as Record<string, unknown> | undefined)?.callbackToken === "string"
          ? String((metadata.apiVerification as Record<string, unknown>).callbackToken)
          : "",
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
        label: "X amplification quest",
        description: "Ready-made social proof quest for following, opening a post, and submitting a share or post link.",
        form: {
          category: "social",
          difficulty: "easy",
          verificationType: "manual-review",
          recurrence: "weekly",
          requiredTier: "free",
          requiredLevel: 1,
          xpReward: 45,
        },
        metadata: {
          track: "social",
          platformLabel: "X",
          ctaLabel: "Open X task",
          targetUrl: "https://x.com/emoryaapp",
          proofType: "url",
          proofInstructions: "Open the task, complete it on X, then submit the post or repost URL for review.",
          rewardConfig: {
            xp: { base: 45, premiumMultiplierEligible: true },
            tokenEffect: "none",
          },
          previewConfig: {
            label: "X visibility quest",
          },
          taskBlocks: [
            {
              id: "open-x-thread",
              label: "Open the campaign thread",
              platformLabel: "X",
              ctaLabel: "Open thread",
              targetUrl: "https://x.com/emoryaapp/status/example",
              proofType: "link",
              proofInstructions: "Open the active thread before completing the proof step.",
              required: true,
            },
            {
              id: "submit-x-proof",
              label: "Submit your X proof",
              description: "Paste the repost, quote post, or reply link.",
              platformLabel: "X",
              proofType: "url",
              proofInstructions: "Paste the public X URL for review.",
              required: true,
            },
          ],
        },
      },
      {
        label: "Discord join verification",
        description: "Community quest template for server join and lightweight onboarding proof.",
        form: {
          category: "social",
          difficulty: "easy",
          verificationType: "manual-review",
          recurrence: "one-time",
          requiredTier: "free",
          requiredLevel: 1,
          xpReward: 30,
        },
        metadata: {
          track: "social",
          platformLabel: "Discord",
          ctaLabel: "Join Discord",
          targetUrl: "https://discord.gg/example",
          proofType: "screenshot",
          proofInstructions: "Join the server, then upload a screenshot or profile proof.",
          rewardConfig: {
            xp: { base: 30, premiumMultiplierEligible: true },
            tokenEffect: "none",
          },
          previewConfig: {
            label: "Discord community unlock",
          },
          taskBlocks: [
            {
              id: "join-server",
              label: "Join the Discord server",
              platformLabel: "Discord",
              ctaLabel: "Open invite",
              targetUrl: "https://discord.gg/example",
              proofType: "screenshot",
              proofInstructions: "Join the server and capture visible proof of membership.",
              required: true,
            },
            {
              id: "introduce-yourself",
              label: "Optional intro message",
              description: "Say hello in the onboarding channel if required for the campaign.",
              platformLabel: "Discord",
              proofType: "url",
              proofInstructions: "Paste the message link if the campaign wants a public intro step.",
              required: false,
            },
          ],
        },
      },
      {
        label: "App Store review proof",
        description: "Trust-building review quest with direct link and reviewer evidence guidance.",
        form: {
          category: "learn",
          difficulty: "medium",
          verificationType: "manual-review",
          recurrence: "one-time",
          requiredTier: "free",
          requiredLevel: 3,
          xpReward: 120,
        },
        metadata: {
          track: "social",
          platformLabel: "App Store",
          ctaLabel: "Open store listing",
          targetUrl: "https://apps.apple.com/app/example",
          helpUrl: "https://example.com/review-guide",
          proofType: "screenshot",
          proofInstructions: "Leave a genuine rating or written review, then upload proof for moderation.",
          rewardConfig: {
            xp: { base: 120, premiumMultiplierEligible: true },
            tokenEffect: "none",
          },
          previewConfig: {
            label: "Review credibility quest",
          },
        },
      },
      {
        label: "Zealy API verification quest",
        description: "Auto-check a Zealy-style external submission through a verification endpoint.",
        form: {
          category: "app",
          difficulty: "medium",
          verificationType: "api-check",
          recurrence: "one-time",
          requiredTier: "free",
          requiredLevel: 1,
          xpReward: 80,
        },
        metadata: {
          track: "campaign",
          platformLabel: "Zealy",
          ctaLabel: "Open Zealy task",
          targetUrl: "https://zealy.io/c/example/quest-board",
          proofType: "url",
          proofInstructions: "Complete the Zealy action, then submit the external reference URL or completion id for API verification.",
          apiVerification: {
            endpointUrl: "https://example.com/api/verify/zealy",
            method: "POST",
            failureMode: "pending-review",
          },
          rewardConfig: {
            xp: { base: 80, premiumMultiplierEligible: true },
            tokenEffect: "eligibility_progress",
            tokenEligibility: {
              progressPoints: 15,
            },
          },
          previewConfig: {
            label: "Zealy API check",
          },
        },
      },
      {
        label: "Galxe credential verification",
        description: "API-backed credential quest for Galxe-style campaign claims and eligibility proof.",
        form: {
          category: "social",
          difficulty: "medium",
          verificationType: "api-check",
          recurrence: "one-time",
          requiredTier: "free",
          requiredLevel: 1,
          xpReward: 70,
        },
        metadata: {
          track: "campaign",
          platformLabel: "Galxe",
          ctaLabel: "Open Galxe campaign",
          targetUrl: "https://app.galxe.com/quest/example",
          proofType: "url",
          proofInstructions: "Complete the credential step, then submit the Galxe profile or participation reference for verification.",
          apiVerification: {
            endpointUrl: "https://example.com/api/verify/galxe",
            method: "POST",
            failureMode: "pending-review",
          },
          rewardConfig: {
            xp: { base: 70, premiumMultiplierEligible: true },
            tokenEffect: "eligibility_progress",
            tokenEligibility: {
              progressPoints: 12,
            },
          },
          previewConfig: {
            label: "Galxe credential check",
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
  const filteredTemplates = useMemo(() => {
    return templates.filter((template) => {
      const metadata = template.metadata ?? {};
      const kind =
        typeof metadata.campaignTemplateKind === "string" ? metadata.campaignTemplateKind : "other";
      const source =
        typeof metadata.campaignAttributionSource === "string" ? metadata.campaignAttributionSource : "other";
      const matchesSearch =
        template.label.toLowerCase().includes(templateFilters.search.toLowerCase()) ||
        template.description.toLowerCase().includes(templateFilters.search.toLowerCase());
      const matchesKind = templateFilters.kind === "all" || kind === templateFilters.kind;
      const matchesSource = templateFilters.source === "all" || source === templateFilters.source;
      const matchesStatus =
        templateFilters.status === "all" ||
        (templateFilters.status === "active" ? template.isActive : !template.isActive);

      return matchesSearch && matchesKind && matchesSource && matchesStatus;
    });
  }, [templateFilters, templates]);
  const campaignPackValidationError = useMemo(
    () => validateCampaignPackTemplates(templates, differentiateUpstreamCampaignSources),
    [differentiateUpstreamCampaignSources, templates],
  );

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

  function applyGuidedSetup(platform: GuidedPlatform, questType: GuidedQuestType) {
    const blueprint = getGuidedQuestBlueprint(platform, questType);
    const nextMetadata = {
      ...(metadataState.parsed ?? {}),
      ...blueprint.metadata,
    } as Record<string, unknown>;

    setForm((current) => ({
      ...current,
      category: blueprint.form.category ?? current.category,
      difficulty: blueprint.form.difficulty ?? current.difficulty,
      verificationType: blueprint.form.verificationType ?? current.verificationType,
      recurrence: blueprint.form.recurrence ?? current.recurrence,
      metadataText: JSON.stringify(nextMetadata, null, 2),
    }));
  }

  function prefillGuidedTemplate(platform: GuidedPlatform, questType: GuidedQuestType) {
    const defaults = getGuidedTemplateDefaults(platform, questType);
    setTemplateForm((current) => ({
      ...current,
      label: defaults.label,
      description: defaults.description,
      isActive: true,
    }));
  }

  async function saveGuidedSetupAsTemplate() {
    applyGuidedSetup(guidedPlatform, guidedQuestType);
    const defaults = getGuidedTemplateDefaults(guidedPlatform, guidedQuestType);
    const blueprint = getGuidedQuestBlueprint(guidedPlatform, guidedQuestType);
    const nextMetadata = {
      ...(metadataState.parsed ?? {}),
      ...blueprint.metadata,
    } as Record<string, unknown>;

    setPending("guided-template");
    setMessage(null);
    setError(null);

    try {
      const response = await fetch("/api/admin/quest-definition-templates", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          label: defaults.label,
          description: defaults.description,
          isActive: true,
          form: {
            category: blueprint.form.category ?? form.category,
            difficulty: blueprint.form.difficulty ?? form.difficulty,
            verificationType: blueprint.form.verificationType ?? form.verificationType,
            recurrence: blueprint.form.recurrence ?? form.recurrence,
            requiredTier: form.requiredTier,
            requiredLevel: form.requiredLevel,
            xpReward: form.xpReward,
            isPremiumPreview: form.isPremiumPreview,
            isActive: form.isActive,
          },
          metadata: nextMetadata,
        }),
      });
      const result = (await response.json()) as QuestDefinitionTemplateResponse;

      if (!response.ok || !result.ok || !result.templates) {
        setError(result.error ?? "Unable to save guided template.");
        return;
      }

      setTemplates(result.templates);
      setTemplateForm({
        label: defaults.label,
        description: defaults.description,
        isActive: true,
      });
      setForm((current) => ({
        ...current,
        category: blueprint.form.category ?? current.category,
        difficulty: blueprint.form.difficulty ?? current.difficulty,
        verificationType: blueprint.form.verificationType ?? current.verificationType,
        recurrence: blueprint.form.recurrence ?? current.recurrence,
        metadataText: JSON.stringify(nextMetadata, null, 2),
      }));
      setMessage("Guided setup saved as a reusable template.");
      router.refresh();
    } catch {
      setError("Unable to reach the quest template service.");
    } finally {
      setPending(null);
    }
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
    if (next.platformLabel.trim()) {
      nextMetadata.platformLabel = next.platformLabel.trim();
    } else {
      delete nextMetadata.platformLabel;
    }
    if (next.ctaLabel.trim()) {
      nextMetadata.ctaLabel = next.ctaLabel.trim();
    } else {
      delete nextMetadata.ctaLabel;
    }
    if (next.targetUrl.trim()) {
      nextMetadata.targetUrl = next.targetUrl.trim();
    } else {
      delete nextMetadata.targetUrl;
    }
    if (next.helpUrl.trim()) {
      nextMetadata.helpUrl = next.helpUrl.trim();
    } else {
      delete nextMetadata.helpUrl;
    }
    if (next.verificationReferenceUrl.trim()) {
      nextMetadata.verificationReferenceUrl = next.verificationReferenceUrl.trim();
    } else {
      delete nextMetadata.verificationReferenceUrl;
    }
    if (next.proofType.trim()) {
      nextMetadata.proofType = next.proofType.trim();
    } else {
      delete nextMetadata.proofType;
    }
    if (next.proofInstructions.trim()) {
      nextMetadata.proofInstructions = next.proofInstructions.trim();
    } else {
      delete nextMetadata.proofInstructions;
    }
    if (
      next.questPortability === "portable_adapt" ||
      next.questPortability === "emorya_only" ||
      next.questPortability === "campaign_conditional"
    ) {
      nextMetadata.questPortability = next.questPortability;
    } else {
      delete nextMetadata.questPortability;
    }
    const visibleBrandThemes = next.visibleBrandThemes
      .split(",")
      .map((value) => value.trim())
      .filter(Boolean);
    if (visibleBrandThemes.length > 0) {
      nextMetadata.brandThemes = visibleBrandThemes;
    } else {
      delete nextMetadata.brandThemes;
    }
    if (next.rewardProgramId) {
      nextMetadata.rewardProgramId = next.rewardProgramId;
    } else {
      delete nextMetadata.rewardProgramId;
    }
    if (next.apiEndpointUrl.trim()) {
      nextMetadata.apiVerification = {
        endpointUrl: next.apiEndpointUrl.trim(),
        method: next.apiMethod === "GET" ? "GET" : "POST",
        failureMode: next.apiFailureMode === "pending-review" ? "pending-review" : "reject",
        ...(next.apiAuthHeaderName.trim() ? { authHeaderName: next.apiAuthHeaderName.trim() } : {}),
        ...(next.apiAuthHeaderValue.trim() ? { authHeaderValue: next.apiAuthHeaderValue.trim() } : {}),
        ...(next.apiCallbackToken.trim() ? { callbackToken: next.apiCallbackToken.trim() } : {}),
      };
    } else {
      delete nextMetadata.apiVerification;
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

  function updateTaskBlocks(updater: (current: QuestTaskBlock[]) => QuestTaskBlock[]) {
    const nextMetadata = { ...(metadataState.parsed ?? {}) } as Record<string, unknown>;
    const nextTaskBlocks = updater(metadataTaskBlocks);

    if (nextTaskBlocks.length > 0) {
      nextMetadata.taskBlocks = nextTaskBlocks.map((task) => ({
        id: task.id,
        label: task.label.trim(),
        ...(task.description?.trim() ? { description: task.description.trim() } : {}),
        ...(task.platformLabel?.trim() ? { platformLabel: task.platformLabel.trim() } : {}),
        ...(task.ctaLabel?.trim() ? { ctaLabel: task.ctaLabel.trim() } : {}),
        ...(task.targetUrl?.trim() ? { targetUrl: task.targetUrl.trim() } : {}),
        ...(task.helpUrl?.trim() ? { helpUrl: task.helpUrl.trim() } : {}),
        ...(task.verificationReferenceUrl?.trim()
          ? { verificationReferenceUrl: task.verificationReferenceUrl.trim() }
          : {}),
        ...(task.proofType?.trim() ? { proofType: task.proofType.trim() } : {}),
        ...(task.proofInstructions?.trim() ? { proofInstructions: task.proofInstructions.trim() } : {}),
        ...(task.required === false ? { required: false } : { required: true }),
      }));
    } else {
      delete nextMetadata.taskBlocks;
    }

    setForm((current) => ({
      ...current,
      metadataText: JSON.stringify(nextMetadata, null, 2),
    }));
  }

  function addTaskBlock() {
    updateTaskBlocks((current) => [
      ...current,
      {
        id: `task-${current.length + 1}`,
        label: "",
        required: true,
      },
    ]);
  }

  function updateTaskBlock(taskId: string, updater: (task: QuestTaskBlock) => QuestTaskBlock) {
    updateTaskBlocks((current) =>
      current.map((task) => (task.id === taskId ? updater(task) : task)),
    );
  }

  function removeTaskBlock(taskId: string) {
    updateTaskBlocks((current) => current.filter((task) => task.id !== taskId));
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

  async function duplicateTemplate(template: QuestDefinitionTemplateItem) {
    setPending(`duplicate-${template.id}`);
    setMessage(null);
    setError(null);

    const payload = {
      label: `${template.label} copy`,
      description: template.description,
      isActive: false,
      form: template.form,
      metadata: template.metadata,
    };

    try {
      const response = await fetch("/api/admin/quest-definition-templates", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });
      const result = (await response.json()) as QuestDefinitionTemplateResponse;

      if (!response.ok || !result.ok || !result.templates) {
        setError(result.error ?? "Unable to duplicate quest template.");
        return;
      }

      setTemplates(result.templates);
      setMessage("Quest template duplicated as an inactive copy.");
      router.refresh();
    } catch {
      setError("Unable to reach the quest template service.");
    } finally {
      setPending(null);
    }
  }

  async function toggleTemplateActive(template: QuestDefinitionTemplateItem) {
    setPending(`toggle-${template.id}`);
    setMessage(null);
    setError(null);

    try {
      const response = await fetch(`/api/admin/quest-definition-templates/${template.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          label: template.label,
          description: template.description,
          isActive: !template.isActive,
          form: template.form,
          metadata: template.metadata,
        }),
      });
      const result = (await response.json()) as QuestDefinitionTemplateResponse;

      if (!response.ok || !result.ok || !result.templates) {
        setError(result.error ?? "Unable to update quest template status.");
        return;
      }

      setTemplates(result.templates);
      setMessage(template.isActive ? "Quest template archived." : "Quest template reactivated.");
      if (editingTemplateId === template.id && templateForm.isActive !== !template.isActive) {
        setTemplateForm((current) => ({ ...current, isActive: !template.isActive }));
      }
      router.refresh();
    } catch {
      setError("Unable to reach the quest template service.");
    } finally {
      setPending(null);
    }
  }

  async function createCampaignPack() {
    if (campaignPackValidationError) {
      setError(campaignPackValidationError);
      return;
    }

    setPending("campaign-pack");
    setMessage(null);
    setError(null);

    try {
      const response = await fetch("/api/admin/campaign-packs", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          label: campaignPackLabel.trim(),
        }),
      });
      const result = (await response.json()) as CampaignPackResponse;

      if (!response.ok || !result.ok || !result.quests) {
        throw new Error(result.error ?? "Unable to create campaign pack.");
      }

      setQuests(result.quests);
      setMessage(
        result.packSummary
          ? `Created campaign pack: ${result.packSummary.label} (${result.packSummary.createdCount} quests).`
          : `Created campaign pack: ${campaignPackLabel.trim()}.`,
      );
      router.refresh();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Unable to create campaign pack.");
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
            {["wallet-check", "quiz", "manual-review", "link-visit", "api-check", "text-submission"].map((value) => (
              <option key={value} value={value}>{value}</option>
            ))}
          </select>
        </label>
        <label className="field">
          <span>Recurrence</span>
          <select value={form.recurrence} onChange={(event) => setForm((current) => ({ ...current, recurrence: event.target.value }))}>
            {["one-time", "daily", "weekly", "monthly"].map((value) => (
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
            <p className="eyebrow">Guided builder</p>
            <h3>Choose a platform and quest type first</h3>
          </div>
        </div>
        <p className="form-note">
          This is the quickest way to start a custom quest. It sets the recommended verification type, CTA pattern, and proof guidance, then you can refine everything below.
        </p>
        <div className="profile-grid">
          <label className="field">
            <span>Platform</span>
            <select value={guidedPlatform} onChange={(event) => setGuidedPlatform(event.target.value as GuidedPlatform)}>
              {guidedPlatformOptions.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>Quest type</span>
            <select value={guidedQuestType} onChange={(event) => setGuidedQuestType(event.target.value as GuidedQuestType)}>
              {guidedQuestTypeOptions.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </label>
        </div>
        <div className="review-bulk-actions">
          <button
            className="button button--secondary button--small"
            type="button"
            onClick={() => applyGuidedSetup(guidedPlatform, guidedQuestType)}
          >
            Apply guided setup
          </button>
          <button
            className="button button--secondary button--small"
            type="button"
            onClick={() => prefillGuidedTemplate(guidedPlatform, guidedQuestType)}
          >
            Prefill template details
          </button>
          <button
            className="button button--secondary button--small"
            type="button"
            disabled={pending !== null}
            onClick={saveGuidedSetupAsTemplate}
          >
            {pending === "guided-template" ? "Saving..." : "Save guided setup as template"}
          </button>
        </div>
      </section>
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
            <span>Search templates</span>
            <input
              value={templateFilters.search}
              onChange={(event) => setTemplateFilters((current) => ({ ...current, search: event.target.value }))}
            />
          </label>
          <label className="field">
            <span>Kind</span>
            <select
              value={templateFilters.kind}
              onChange={(event) =>
                setTemplateFilters((current) => ({
                  ...current,
                  kind: event.target.value as TemplateFilterState["kind"],
                }))
              }
            >
              <option value="all">all</option>
              <option value="bridge">bridge</option>
              <option value="feeder">feeder</option>
            </select>
          </label>
          <label className="field">
            <span>Source</span>
            <select
              value={templateFilters.source}
              onChange={(event) =>
                setTemplateFilters((current) => ({
                  ...current,
                  source: event.target.value as TemplateFilterState["source"],
                }))
              }
            >
              <option value="all">all</option>
              <option value="zealy">zealy</option>
              <option value="galxe">galxe</option>
              <option value="taskon">taskon</option>
            </select>
          </label>
          <label className="field">
            <span>Status</span>
            <select
              value={templateFilters.status}
              onChange={(event) =>
                setTemplateFilters((current) => ({
                  ...current,
                  status: event.target.value as TemplateFilterState["status"],
                }))
              }
            >
              <option value="all">all</option>
              <option value="active">active</option>
              <option value="inactive">inactive</option>
            </select>
          </label>
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
        <div className="panel panel--glass">
          <div className="panel__header">
            <div>
              <p className="eyebrow">Campaign pack</p>
              <h3>Create the Zealy bridge + feeder set together</h3>
            </div>
          </div>
          <div className="profile-grid">
            <label className="field">
              <span>Pack label</span>
              <input
                value={campaignPackLabel}
                onChange={(event) => setCampaignPackLabel(event.target.value)}
              />
            </label>
          </div>
          <div className="review-bulk-actions">
            <button
              className="button button--secondary button--small"
              type="button"
              disabled={pending !== null || !campaignPackLabel.trim() || Boolean(campaignPackValidationError)}
              onClick={createCampaignPack}
            >
              {pending === "campaign-pack" ? "Creating..." : "Create campaign pack"}
            </button>
          </div>
          <p className="form-note">
            This creates one live Zealy bridge quest plus Galxe and TaskOn feeder quests using the saved templates.
          </p>
          {campaignPackValidationError ? (
            <p className="status status--error">{campaignPackValidationError}</p>
          ) : (
            <p className="status status--success">Campaign pack validation passed.</p>
          )}
        </div>
        <div className="review-history__list">
          {filteredTemplates.map((template) => (
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
                <span>{template.form.verificationType}</span>
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
                <button className="button button--secondary button--small" type="button" disabled={pending !== null} onClick={() => duplicateTemplate(template)}>
                  {pending === `duplicate-${template.id}` ? "Duplicating..." : "Duplicate"}
                </button>
                <button className="button button--secondary button--small" type="button" disabled={pending !== null} onClick={() => toggleTemplateActive(template)}>
                  {pending === `toggle-${template.id}`
                    ? template.isActive
                      ? "Archiving..."
                      : "Activating..."
                    : template.isActive
                      ? "Archive"
                      : "Activate"}
                </button>
                <button className="button button--secondary button--small" type="button" disabled={pending !== null} onClick={() => removeTemplate(template.id)}>
                  {pending === template.id ? "Deleting..." : "Delete"}
                </button>
              </div>
            </article>
          ))}
          {filteredTemplates.length === 0 ? <p className="form-note">No templates match the current filters.</p> : null}
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
            <span>Platform label</span>
            <input
              value={metadataBuilder.platformLabel}
              onChange={(event) => updateMetadataBuilder((current) => ({ ...current, platformLabel: event.target.value }))}
              placeholder="X, Discord, App Store, Website..."
            />
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
            <span>Primary CTA label</span>
            <input
              value={metadataBuilder.ctaLabel}
              onChange={(event) => updateMetadataBuilder((current) => ({ ...current, ctaLabel: event.target.value }))}
              placeholder="Open quest, Join server, View task..."
            />
          </label>
          <label className="field">
            <span>Target URL</span>
            <input
              value={metadataBuilder.targetUrl}
              onChange={(event) => updateMetadataBuilder((current) => ({ ...current, targetUrl: event.target.value }))}
              placeholder="https://..."
            />
          </label>
          <label className="field">
            <span>Help URL</span>
            <input
              value={metadataBuilder.helpUrl}
              onChange={(event) => updateMetadataBuilder((current) => ({ ...current, helpUrl: event.target.value }))}
              placeholder="Optional guide or explainer"
            />
          </label>
          <label className="field">
            <span>Verification reference URL</span>
            <input
              value={metadataBuilder.verificationReferenceUrl}
              onChange={(event) => updateMetadataBuilder((current) => ({ ...current, verificationReferenceUrl: event.target.value }))}
              placeholder="Optional submission example or rules page"
            />
          </label>
          <label className="field">
            <span>Proof type</span>
            <select value={metadataBuilder.proofType} onChange={(event) => updateMetadataBuilder((current) => ({ ...current, proofType: event.target.value }))}>
              <option value="">No proof guidance</option>
              {["link", "text", "url", "screenshot", "file-upload", "wallet", "quiz", "manual-review"].map((value) => (
                <option key={value} value={value}>{value}</option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>Proof instructions</span>
            <input
              value={metadataBuilder.proofInstructions}
              onChange={(event) => updateMetadataBuilder((current) => ({ ...current, proofInstructions: event.target.value }))}
              placeholder="Paste a post URL, upload proof, connect wallet..."
            />
          </label>
          <label className="field">
            <span>Quest portability</span>
            <select value={metadataBuilder.questPortability} onChange={(event) => updateMetadataBuilder((current) => ({ ...current, questPortability: event.target.value }))}>
              <option value="core_portable">Core portable</option>
              <option value="portable_adapt">Portable adapt</option>
              <option value="emorya_only">Emorya only</option>
              <option value="campaign_conditional">Campaign conditional</option>
            </select>
          </label>
          <label className="field">
            <span>Visible brand themes</span>
            <input
              value={metadataBuilder.visibleBrandThemes}
              onChange={(event) => updateMetadataBuilder((current) => ({ ...current, visibleBrandThemes: event.target.value }))}
              placeholder="emorya, multiversx, xportal"
            />
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
          <label className="field">
            <span>API endpoint URL</span>
            <input
              value={metadataBuilder.apiEndpointUrl}
              onChange={(event) => updateMetadataBuilder((current) => ({ ...current, apiEndpointUrl: event.target.value }))}
              placeholder="https://verifier.example.com/quest-check"
            />
          </label>
          <label className="field">
            <span>API method</span>
            <select value={metadataBuilder.apiMethod} onChange={(event) => updateMetadataBuilder((current) => ({ ...current, apiMethod: event.target.value }))}>
              {["POST", "GET"].map((value) => (
                <option key={value} value={value}>{value}</option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>Auth header name</span>
            <input
              value={metadataBuilder.apiAuthHeaderName}
              onChange={(event) => updateMetadataBuilder((current) => ({ ...current, apiAuthHeaderName: event.target.value }))}
              placeholder="x-api-key"
            />
          </label>
          <label className="field">
            <span>Auth header value</span>
            <input
              value={metadataBuilder.apiAuthHeaderValue}
              onChange={(event) => updateMetadataBuilder((current) => ({ ...current, apiAuthHeaderValue: event.target.value }))}
              placeholder="secret value"
            />
          </label>
          <label className="field">
            <span>API failure mode</span>
            <select value={metadataBuilder.apiFailureMode} onChange={(event) => updateMetadataBuilder((current) => ({ ...current, apiFailureMode: event.target.value }))}>
              <option value="reject">Reject</option>
              <option value="pending-review">Send to review</option>
            </select>
          </label>
          <label className="field">
            <span>Callback token</span>
            <input
              value={metadataBuilder.apiCallbackToken}
              onChange={(event) => updateMetadataBuilder((current) => ({ ...current, apiCallbackToken: event.target.value }))}
              placeholder="optional async verification token"
            />
          </label>
        </div>
      </section>
      <section className="panel panel--glass">
        <div className="panel__header">
          <div>
            <p className="eyebrow">Quest tasks</p>
            <h3>Build multi-step custom quests</h3>
          </div>
          <span className="badge">{metadataTaskBlocks.length} steps</span>
        </div>
        <p className="form-note">
          Use task blocks for Zealy-style multi-step quests. They work best with manual-review quests right now, where each step can carry its own link and proof requirement.
        </p>
        <div className="review-bulk-actions">
          <button className="button button--secondary button--small" type="button" onClick={addTaskBlock}>
            Add task step
          </button>
        </div>
        <div className="achievement-list">
          {metadataTaskBlocks.map((task, index) => (
            <article key={task.id} className="achievement-card">
              <div className="form-stack">
                <div className="quest-card__meta">
                  <span>Step {index + 1}</span>
                  <span>{task.required === false ? "optional" : "required"}</span>
                </div>
                <label className="field">
                  <span>Step label</span>
                  <input
                    value={task.label}
                    onChange={(event) =>
                      updateTaskBlock(task.id, (current) => {
                        const nextLabel = event.target.value;
                        const nextId = slugifyTaskLabel(nextLabel);
                        return {
                          ...current,
                          id: nextId || current.id,
                          label: nextLabel,
                        };
                      })
                    }
                    placeholder="Join Discord, follow on X, upload proof..."
                  />
                </label>
                <label className="field">
                  <span>Step description</span>
                  <input
                    value={task.description ?? ""}
                    onChange={(event) =>
                      updateTaskBlock(task.id, (current) => ({ ...current, description: event.target.value }))
                    }
                    placeholder="Optional extra context"
                  />
                </label>
                <div className="profile-grid">
                  <label className="field">
                    <span>Platform</span>
                    <input
                      value={task.platformLabel ?? ""}
                      onChange={(event) =>
                        updateTaskBlock(task.id, (current) => ({ ...current, platformLabel: event.target.value }))
                      }
                      placeholder="X, Discord, Galxe, Website..."
                    />
                  </label>
                  <label className="field">
                    <span>CTA label</span>
                    <input
                      value={task.ctaLabel ?? ""}
                      onChange={(event) =>
                        updateTaskBlock(task.id, (current) => ({ ...current, ctaLabel: event.target.value }))
                      }
                      placeholder="Open step"
                    />
                  </label>
                  <label className="field">
                    <span>Target URL</span>
                    <input
                      value={task.targetUrl ?? ""}
                      onChange={(event) =>
                        updateTaskBlock(task.id, (current) => ({ ...current, targetUrl: event.target.value }))
                      }
                      placeholder="https://..."
                    />
                  </label>
                  <label className="field">
                    <span>Help URL</span>
                    <input
                      value={task.helpUrl ?? ""}
                      onChange={(event) =>
                        updateTaskBlock(task.id, (current) => ({ ...current, helpUrl: event.target.value }))
                      }
                      placeholder="Optional guide"
                    />
                  </label>
                  <label className="field">
                    <span>Verification guide URL</span>
                    <input
                      value={task.verificationReferenceUrl ?? ""}
                      onChange={(event) =>
                        updateTaskBlock(task.id, (current) => ({ ...current, verificationReferenceUrl: event.target.value }))
                      }
                      placeholder="Optional proof example"
                    />
                  </label>
                  <label className="field">
                    <span>Proof type</span>
                    <select
                      value={task.proofType ?? ""}
                      onChange={(event) =>
                        updateTaskBlock(task.id, (current) => ({ ...current, proofType: event.target.value }))
                      }
                    >
                      <option value="">No proof guidance</option>
                      {["link", "text", "url", "screenshot", "file-upload", "wallet", "quiz", "manual-review"].map((value) => (
                        <option key={value} value={value}>{value}</option>
                      ))}
                    </select>
                  </label>
                </div>
                <label className="field">
                  <span>Proof instructions</span>
                  <input
                    value={task.proofInstructions ?? ""}
                    onChange={(event) =>
                      updateTaskBlock(task.id, (current) => ({ ...current, proofInstructions: event.target.value }))
                    }
                    placeholder="Paste the post link, upload a screenshot, connect a wallet..."
                  />
                </label>
                <label className="field field--checkbox">
                  <span>Required step</span>
                  <input
                    type="checkbox"
                    checked={task.required !== false}
                    onChange={(event) =>
                      updateTaskBlock(task.id, (current) => ({ ...current, required: event.target.checked }))
                    }
                  />
                </label>
                <div className="review-bulk-actions">
                  <button className="button button--secondary button--small" type="button" onClick={() => removeTaskBlock(task.id)}>
                    Remove step
                  </button>
                </div>
              </div>
            </article>
          ))}
          {metadataTaskBlocks.length === 0 ? <p className="form-note">No task steps added yet.</p> : null}
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
              {preview.platformLabel ? ` Platform: ${preview.platformLabel}.` : ""}
              {preview.ctaLabel ? ` CTA: ${preview.ctaLabel}.` : ""}
              {preview.proofType ? ` Proof: ${preview.proofType}.` : ""}
              {preview.taskBlockCount ? ` Steps: ${preview.taskBlockCount}.` : ""}
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
