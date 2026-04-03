import {
  APP_EVENT_QUEST_MAP,
  isSupportedAppEvent,
  shouldDeriveActivationCompletion,
  type SupportedAppEvent,
} from "@/lib/app-event-map";
import {
  activationPathCompletionQuestSlug,
  activationPathPrerequisiteQuestSlugs,
} from "@/lib/progression-rules";
import { createActivityLogEntry } from "@/server/repositories/progression-repository";
import {
  getQuestCompletionForUser,
  getQuestDefinitionBySlug,
  upsertQuestCompletionForUser,
} from "@/server/repositories/quest-repository";
import { getUserProgressState } from "@/server/services/user-progress-state";
import { applyQuestRewardTransition } from "@/server/services/progression-service";

function isSameUtcMonth(timestamp: string, referenceTimestamp: string) {
  const timestampDate = new Date(timestamp);
  const referenceDate = new Date(referenceTimestamp);
  return (
    timestampDate.getUTCFullYear() === referenceDate.getUTCFullYear() &&
    timestampDate.getUTCMonth() === referenceDate.getUTCMonth()
  );
}

function normalizeOccurredAt(value: string | null | undefined) {
  if (!value) {
    return new Date().toISOString();
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? new Date().toISOString() : parsed.toISOString();
}

async function autoCompleteQuestBySlug({
  userId,
  actor,
  eventType,
  occurredAt,
  slug,
  metadata,
}: {
  userId: string;
  actor: string;
  eventType: SupportedAppEvent | "derived_activation_complete";
  occurredAt: string;
  slug: string;
  metadata?: Record<string, unknown>;
}) {
  const quest = await getQuestDefinitionBySlug(slug);

  if (!quest) {
    return null;
  }

  const existingCompletion = await getQuestCompletionForUser(userId, quest.id);

  if (existingCompletion?.status === "approved") {
    if (quest.recurrence === "one-time") {
      return null;
    }

    if (
      quest.recurrence === "monthly" &&
      existingCompletion.completedAt &&
      isSameUtcMonth(existingCompletion.completedAt, occurredAt)
    ) {
      return null;
    }
  }

  const completion = await upsertQuestCompletionForUser({
    userId,
    questId: quest.id,
    status: "approved",
    awardedXp: existingCompletion?.awardedXp ?? 0,
    reviewedBy: userId,
    completedAt: occurredAt,
    submissionData: {
      eventType,
      occurredAt,
      metadata: metadata ?? {},
      autoCompleted: true,
    },
  });

  const progressUpdate = await applyQuestRewardTransition({
    userId,
    completionId: completion.id,
    questId: quest.id,
    questTitle: quest.title,
    questXpReward: quest.xp_reward,
    previousAwardedXp: existingCompletion?.awardedXp ?? 0,
    shouldBeApproved: true,
  });

  await createActivityLogEntry({
    userId,
    actionType: "quest-approved",
    xpEarned: progressUpdate.xpAwarded,
    metadata: {
      actor,
      action: "auto-completed a quest",
      detail: `${quest.title} was completed from a real app event`,
      questId: quest.id,
      questTitle: quest.title,
      eventType,
    },
  });

  return {
    questId: quest.id,
    slug,
    title: quest.title,
    progressUpdate,
  };
}

async function maybeCompleteActivationPath({
  userId,
  actor,
  occurredAt,
}: {
  userId: string;
  actor: string;
  occurredAt: string;
}) {
  const progressState = await getUserProgressState(userId);

  if (!shouldDeriveActivationCompletion(progressState.completedQuestSlugs)) {
    return null;
  }

  return autoCompleteQuestBySlug({
    userId,
    actor,
    eventType: "derived_activation_complete",
    occurredAt,
    slug: activationPathCompletionQuestSlug,
    metadata: {
      derived: true,
      prerequisites: activationPathPrerequisiteQuestSlugs,
    },
  });
}

export async function processAppEvent({
  userId,
  actor,
  eventType,
  occurredAt,
  metadata,
}: {
  userId: string;
  actor: string;
  eventType: string;
  occurredAt?: string | null;
  metadata?: Record<string, unknown>;
}) {
  if (!isSupportedAppEvent(eventType)) {
    throw new Error("Unsupported app event.");
  }

  const normalizedOccurredAt = normalizeOccurredAt(occurredAt);
  const targetSlugs = APP_EVENT_QUEST_MAP[eventType];
  const completedQuests = [];

  for (const slug of targetSlugs) {
    const completion = await autoCompleteQuestBySlug({
      userId,
      actor,
      eventType,
      occurredAt: normalizedOccurredAt,
      slug,
      metadata,
    });

    if (completion) {
      completedQuests.push(completion);
    }
  }

  const derivedActivationCompletion = await maybeCompleteActivationPath({
    userId,
    actor,
    occurredAt: normalizedOccurredAt,
  });

  if (derivedActivationCompletion) {
    completedQuests.push(derivedActivationCompletion);
  }

  return {
    ok: true as const,
    eventType,
    completedQuests,
    derivedActivationComplete: Boolean(derivedActivationCompletion),
  };
}
