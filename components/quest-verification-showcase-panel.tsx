import type { QuestDefinitionAdminItem, QuestTaskBlock, VerificationType } from "@/lib/types";

type AvailableVerificationType = Exclude<VerificationType, "social-oauth">;

const verificationOrder: AvailableVerificationType[] = [
  "link-visit",
  "manual-review",
  "text-submission",
  "quiz",
  "wallet-check",
  "api-check",
];

const verificationProfiles: Record<
  AvailableVerificationType,
  {
    label: string;
    summary: string;
    bestFor: string;
  }
> = {
  "link-visit": {
    label: "Link visit",
    summary: "Fast outbound quests that send users straight to a destination and optionally ask for follow-up proof.",
    bestFor: "Landing pages, app downloads, docs, wallet setup guides, and partner handoff flows.",
  },
  "manual-review": {
    label: "Manual review",
    summary: "Flexible proof-heavy quests with links, notes, screenshots, uploads, and multi-step evidence.",
    bestFor: "UGC, screenshots, social tasks, review proof, and anything that needs human judgment.",
  },
  "text-submission": {
    label: "Text submission",
    summary: "Structured written-response quests that collect lightweight narrative proof without requiring files.",
    bestFor: "Testimonials, reflections, referral stories, campaign feedback, and product understanding prompts.",
  },
  quiz: {
    label: "Quiz check",
    summary: "Education-style quests where the user proves they understood a lesson, explainer, or ruleset.",
    bestFor: "Premium explainers, onboarding education, campaign onboarding, and product-readiness checks.",
  },
  "wallet-check": {
    label: "Wallet check",
    summary: "Wallet quests that confirm a connected wallet before unlocking deeper reward steps.",
    bestFor: "Wallet connection, onchain readiness, token eligibility, and gated reward flows.",
  },
  "api-check": {
    label: "API check",
    summary: "Server-side verification adapters that can automatically approve or escalate based on an external result.",
    bestFor: "Zealy, Galxe, partner backends, credential APIs, and custom campaign verifiers.",
  },
};

function getTaskBlocks(metadata: Record<string, unknown>): QuestTaskBlock[] {
  if (!Array.isArray(metadata.taskBlocks)) {
    return [];
  }

  return metadata.taskBlocks.filter((block): block is QuestTaskBlock => {
    if (!block || typeof block !== "object") {
      return false;
    }

    return typeof (block as QuestTaskBlock).id === "string" && typeof (block as QuestTaskBlock).label === "string";
  });
}

function hasUploadSupport(quest: QuestDefinitionAdminItem) {
  const metadata = quest.metadata ?? {};
  const proofType = typeof metadata.proofType === "string" ? metadata.proofType : null;
  if (proofType && /file|upload|screenshot/i.test(proofType)) {
    return true;
  }

  return getTaskBlocks(metadata).some((block) => {
    if (!block.proofType) {
      return false;
    }

    return /file|upload|screenshot/i.test(block.proofType);
  });
}

function hasActionLinks(quest: QuestDefinitionAdminItem) {
  const metadata = quest.metadata ?? {};
  if (typeof metadata.targetUrl === "string" || typeof metadata.helpUrl === "string" || typeof metadata.verificationReferenceUrl === "string") {
    return true;
  }

  return getTaskBlocks(metadata).some(
    (block) => Boolean(block.targetUrl) || Boolean(block.helpUrl) || Boolean(block.verificationReferenceUrl),
  );
}

function hasApiConfig(quest: QuestDefinitionAdminItem) {
  const metadata = quest.metadata ?? {};
  return Boolean(metadata.apiVerification && typeof metadata.apiVerification === "object");
}

function getPrimaryExample(
  quests: QuestDefinitionAdminItem[],
  verificationType: VerificationType,
) {
  return quests
    .filter((quest) => quest.verificationType === verificationType)
    .sort((left, right) => {
      if (left.isActive !== right.isActive) {
        return left.isActive ? -1 : 1;
      }

      const leftTasks = getTaskBlocks(left.metadata ?? {}).length;
      const rightTasks = getTaskBlocks(right.metadata ?? {}).length;
      if (leftTasks !== rightTasks) {
        return rightTasks - leftTasks;
      }

      const leftUpdatedAt = new Date(left.updatedAt).getTime();
      const rightUpdatedAt = new Date(right.updatedAt).getTime();
      return rightUpdatedAt - leftUpdatedAt;
    })[0];
}

function formatRecurrence(recurrence: QuestDefinitionAdminItem["recurrence"]) {
  switch (recurrence) {
    case "one-time":
      return "one-time";
    case "daily":
      return "daily";
    case "weekly":
      return "weekly";
    case "monthly":
      return "monthly";
    default:
      return recurrence;
  }
}

export function QuestVerificationShowcasePanel({
  questDefinitions,
}: {
  questDefinitions: QuestDefinitionAdminItem[];
}) {
  const cards = verificationOrder.map((verificationType) => {
    const example = getPrimaryExample(questDefinitions, verificationType);
    return {
      verificationType,
      profile: verificationProfiles[verificationType],
      example,
      count: questDefinitions.filter((quest) => quest.verificationType === verificationType).length,
    };
  });

  const coveredCount = cards.filter((card) => card.count > 0).length;
  const uploadEnabledCount = questDefinitions.filter((quest) => hasUploadSupport(quest)).length;
  const apiEnabledCount = questDefinitions.filter((quest) => hasApiConfig(quest)).length;

  return (
    <section className="panel panel--glass">
      <div className="panel__header">
        <div>
          <p className="eyebrow">Verification showcase</p>
          <h3>Every quest-verification lane in one admin view</h3>
        </div>
        <span className="badge badge--pink">Campaign-ready</span>
      </div>
      <div className="info-grid">
        <div className="info-card">
          <span>Verification lanes</span>
          <strong>
            {coveredCount} / {verificationOrder.length}
          </strong>
          <small>Coverage from live quest definitions rather than mocked examples.</small>
        </div>
        <div className="info-card">
          <span>Proof uploads</span>
          <strong>{uploadEnabledCount}</strong>
          <small>Live quests currently carrying file or screenshot proof expectations.</small>
        </div>
        <div className="info-card">
          <span>API-backed quests</span>
          <strong>{apiEnabledCount}</strong>
          <small>Quests with configured external verification adapters in metadata.</small>
        </div>
      </div>
      <div className="achievement-group">
        {cards.map(({ verificationType, profile, example, count }) => {
          const taskBlocks = example ? getTaskBlocks(example.metadata ?? {}) : [];
          const exampleMetadata = example?.metadata ?? {};

          return (
            <article
              key={verificationType}
              className={`achievement-card ${example ? "achievement-card--progress" : "achievement-card--notification-warning"}`}
            >
              <div>
                <div className="quest-card__meta quest-card__meta--wrap">
                  <span>{profile.label}</span>
                  <span>{count} quest definitions</span>
                  {example?.isActive ? <span>active example</span> : null}
                  {example && !example.isActive ? <span>dormant example</span> : null}
                </div>
                <strong>{example ? example.title : `${profile.label} still needs a seeded example`}</strong>
                <p>{profile.summary}</p>
                <p className="form-note">Best for: {profile.bestFor}</p>
                {example ? (
                  <>
                    <div className="quest-card__meta quest-card__meta--wrap">
                      <span>{example.category}</span>
                      <span>{formatRecurrence(example.recurrence)}</span>
                      <span>{example.xpReward} XP</span>
                      <span>level {example.requiredLevel}+</span>
                      <span>{example.requiredTier}</span>
                    </div>
                    <div className="quest-card__meta quest-card__meta--wrap">
                      {hasActionLinks(example) ? <span>direct links</span> : null}
                      {hasUploadSupport(example) ? <span>proof upload</span> : null}
                      {taskBlocks.length > 0 ? <span>{taskBlocks.length} task steps</span> : null}
                      {hasApiConfig(example) ? <span>API adapter</span> : null}
                      {typeof exampleMetadata.proofType === "string" ? <span>{exampleMetadata.proofType}</span> : null}
                    </div>
                  </>
                ) : null}
              </div>
              <div className="achievement-card__side">
                <strong>{count}</strong>
                <small>{example ? example.slug : "Not seeded yet"}</small>
              </div>
            </article>
          );
        })}
      </div>
      <p className="form-note">
        Use this panel as the quick reality check before building or publishing a new quest set: if a verification lane
        has no live example here, it will be harder to trust in production.
      </p>
    </section>
  );
}
