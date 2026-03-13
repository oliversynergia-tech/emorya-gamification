import type { QuestStatus } from "@/lib/types";

export function getQuestStatusLabel(status: QuestStatus) {
  switch (status) {
    case "completed":
      return "Approved";
    case "in-progress":
      return "Under review";
    case "rejected":
      return "Needs revision";
    case "locked":
      return "Locked";
    default:
      return "Ready";
  }
}

export function getQuestStatusNote(status: QuestStatus) {
  switch (status) {
    case "completed":
      return "This quest has already been approved and credited.";
    case "in-progress":
      return "Your latest submission is pending verification.";
    case "rejected":
      return "The previous submission was rejected. Update it and submit again.";
    case "locked":
      return "Reach the required level or tier to unlock this quest.";
    default:
      return "This quest is open for a new submission.";
  }
}
