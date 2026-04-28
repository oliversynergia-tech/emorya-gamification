import type { Quest, QuestCadence, QuestUnlockRequirement, VerificationType } from "@/lib/types";

export const questHowToComplete: Record<string, string> = {
  "link-visit":
    "Tap the button to open the link. Once the page loads, the quest completes automatically. No submission needed.",
  "manual-review":
    "Complete the action described above, then submit your proof. This could be a screenshot, a link, or whatever the quest asks for. The team will review your submission, usually within 24 hours. You'll get a notification when it's approved or if anything needs fixing.",
  quiz:
    "Answer all the questions and hit submit. You need to get {passScore} out of {totalQuestions} correct to pass. If you don't pass, you can try again straight away. Take your time. There's no timer.",
  "wallet-check":
    "Make sure your xPortal wallet is connected to your Emorya account before attempting this quest. Once connected, the platform verifies your wallet automatically. If you haven't connected yet, go to your profile and link your wallet first.",
  "text-submission":
    "Write your response in the text box and submit. Keep it clear and honest. The team will read what you've written. There's no word limit, but a few sentences is usually enough.",
  "api-check":
    "Complete the required action on the external platform (Zealy, Galxe, etc.), then submit the reference link or ID. The platform will verify your action automatically. If automatic verification fails, your submission goes to manual review instead.",
};

export const questStatusMessages = {
  available: "Ready to start",
  lockedLevel: "Reach Level {level} to unlock this quest.",
  lockedQuestPrerequisite: "Complete '{prerequisiteTitle}' first to unlock this one.",
  lockedStreak: "Build a {streak}-day streak to unlock this quest.",
  lockedWallet: "Connect your xPortal wallet to unlock this quest.",
  lockedSubscription: "Upgrade to {tier} to access this quest.",
  lockedCampaignSource: "This quest is for users who joined through {source}. It's not available for your account.",
  lockedRuntimeFlag: "This quest isn't available yet. It will unlock when the feature goes live.",
  lockedMultiple: "This quest has a few requirements you haven't met yet. Check the details below.",
  inProgress: "You've started this quest. Complete the steps and submit when ready.",
  pendingReview: "Submitted and waiting for review. The team usually responds within 24 hours.",
  approved: "Complete. Your XP and rewards have been added.",
  rejected: "Your submission wasn't accepted this time. Check the feedback below and try again.",
  completedOneTime: "You've already completed this quest. One-time quests can only be done once.",
  availableDaily: "This quest resets daily. You can complete it again today.",
  availableWeekly: "This quest resets weekly. You can complete it again this week.",
  availableMonthly: "This quest resets monthly. You can complete it again this month.",
  cooldownActive: "You completed this recently. It'll be available again in {timeRemaining}.",
} as const;

export const submissionGuidance: Record<string, string> = {
  screenshot:
    "Upload a clear screenshot showing the completed action. Make sure the date and relevant details are visible.",
  url: "Paste the public URL. Make sure the link is accessible to anyone, not just you.",
  screenshotOrUrl: "Submit either a screenshot or a public link as proof. Whichever shows the action most clearly.",
  calorieBurn:
    "Submit a screenshot from the Emorya app showing your calorie burn for today. The date and calorie total should be visible.",
  staking: "Submit a screenshot from your staking dashboard showing your current stake amount and duration.",
  review: "Submit a screenshot showing your published review, or paste the direct link to it.",
  generalManualReview: "Submit your proof below. The team will review it and get back to you, usually within 24 hours.",
};

export const postSubmissionMessages = {
  manualReviewSubmitted: "Got it. Your submission is in the queue. You'll hear back within 24 hours.",
  textSubmissionSubmitted: "Thanks for writing that. The team will review your response shortly.",
  quizPassed: "You passed with {score} out of {total} correct. XP has been added to your account.",
  quizFailed: "You scored {score} out of {total}. You needed {passScore} to pass. Give it another go whenever you're ready.",
  linkVisitCompleted: "Done. XP has been added to your account.",
  walletCheckPassed: "Wallet verified. XP and rewards have been added.",
  walletCheckFailed: "We couldn't verify your wallet. Make sure it's connected in your profile and try again.",
  apiCheckVerified: "Verified automatically. XP has been added to your account.",
  apiCheckPending:
    "We're checking your action on the external platform. If automatic verification doesn't work, it'll go to manual review.",
} as const;

export function interpolate(template: string, values: Record<string, string | number>) {
  return template.replace(/{(\w+)}/g, (match, key) => {
    return values[key] !== undefined ? String(values[key]) : match;
  });
}

function formatTierLabel(tier: string) {
  return tier === "annual" ? "Annual" : tier === "monthly" ? "Monthly" : "Free";
}

function formatSourceLabel(source: string) {
  return source === "galxe"
    ? "Galxe"
    : source === "taskon"
      ? "TaskOn"
      : source === "zealy"
        ? "Zealy"
        : "Direct";
}

function getRepeatableCompletionMessage(cadence?: QuestCadence) {
  switch (cadence) {
    case "daily":
      return questStatusMessages.availableDaily;
    case "weekly":
      return questStatusMessages.availableWeekly;
    case "monthly":
      return questStatusMessages.availableMonthly;
    default:
      return questStatusMessages.completedOneTime;
  }
}

function getLockedQuestStatusMessage(quest: Quest) {
  const requirements = quest.unlockRequirements ?? [];

  if (requirements.length > 1) {
    return questStatusMessages.lockedMultiple;
  }

  const requirement = requirements[0];

  if (!requirement) {
    return quest.unlockHint ?? questStatusMessages.lockedMultiple;
  }

  switch (requirement.type) {
    case "min_level":
      return interpolate(questStatusMessages.lockedLevel, { level: requirement.value });
    case "quest_completed":
    case "quest_completed_today":
      return interpolate(questStatusMessages.lockedQuestPrerequisite, {
        prerequisiteTitle: requirement.prerequisiteTitle ?? "the prerequisite quest",
      });
    case "min_streak":
      return interpolate(questStatusMessages.lockedStreak, { streak: requirement.value });
    case "wallet_linked":
      return questStatusMessages.lockedWallet;
    case "subscription_tier":
      return interpolate(questStatusMessages.lockedSubscription, {
        tier: formatTierLabel(requirement.value),
      });
    case "campaign_source":
      return interpolate(questStatusMessages.lockedCampaignSource, {
        source: formatSourceLabel(requirement.value),
      });
    case "runtime_flag":
      return questStatusMessages.lockedRuntimeFlag;
    default:
      return quest.unlockHint ?? questStatusMessages.lockedMultiple;
  }
}

export function getQuestHowToComplete(quest: Quest) {
  const template = questHowToComplete[quest.verificationType] ?? questHowToComplete["manual-review"];

  if (quest.verificationType !== "quiz") {
    return template;
  }

  return interpolate(template, {
    passScore: quest.quizPassScore ?? quest.questions?.length ?? 0,
    totalQuestions: quest.questions?.length ?? 0,
  });
}

export function getQuestDisplayStatusMessage(quest: Quest) {
  if (quest.status === "locked") {
    return getLockedQuestStatusMessage(quest);
  }

  if (quest.status === "in-progress") {
    return questStatusMessages.pendingReview;
  }

  if (quest.status === "rejected") {
    return questStatusMessages.rejected;
  }

  if (quest.status === "completed") {
    return getRepeatableCompletionMessage(quest.cadence);
  }

  return questStatusMessages.available;
}

export function getSubmissionGuidance(quest: Quest) {
  const slug = quest.slug ?? "";
  const proofType = quest.proofType;

  if (
    slug.includes("calorie") ||
    slug.includes("500-in-24") ||
    slug.includes("weekly-warrior") ||
    slug.includes("marathon")
  ) {
    return submissionGuidance.calorieBurn;
  }

  if (quest.category === "staking") {
    return submissionGuidance.staking;
  }

  if (slug.includes("review") || slug.includes("rating")) {
    return submissionGuidance.review;
  }

  if (proofType === "screenshot") {
    return submissionGuidance.screenshot;
  }

  if (proofType === "url") {
    return submissionGuidance.url;
  }

  if (proofType === "file-upload") {
    return submissionGuidance.screenshot;
  }

  if (proofType === "text") {
    return submissionGuidance.generalManualReview;
  }

  if (quest.verificationType === "manual-review") {
    return submissionGuidance.generalManualReview;
  }

  return null;
}

export function getPostSubmissionMessage(
  quest: Quest,
  result: {
    score?: number;
    total?: number;
    passed?: boolean;
    verified?: boolean;
    success?: boolean;
  },
) {
  if (quest.verificationType === "link-visit") {
    return postSubmissionMessages.linkVisitCompleted;
  }

  if (quest.verificationType === "quiz") {
    if (result.passed) {
      return interpolate(postSubmissionMessages.quizPassed, {
        score: result.score ?? 0,
        total: result.total ?? quest.questions?.length ?? 0,
      });
    }

    return interpolate(postSubmissionMessages.quizFailed, {
      score: result.score ?? 0,
      total: result.total ?? quest.questions?.length ?? 0,
      passScore: quest.quizPassScore ?? quest.questions?.length ?? 0,
    });
  }

  if (quest.verificationType === "wallet-check") {
    return result.success ? postSubmissionMessages.walletCheckPassed : postSubmissionMessages.walletCheckFailed;
  }

  if (quest.verificationType === "api-check") {
    return result.verified ? postSubmissionMessages.apiCheckVerified : postSubmissionMessages.apiCheckPending;
  }

  if (quest.verificationType === "text-submission") {
    return postSubmissionMessages.textSubmissionSubmitted;
  }

  return postSubmissionMessages.manualReviewSubmitted;
}

export function getVerificationHowToKey(verificationType: VerificationType) {
  return verificationType in questHowToComplete ? verificationType : "manual-review";
}
