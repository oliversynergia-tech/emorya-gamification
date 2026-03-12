"use client";

import { useState } from "react";

import type { DashboardData, Quest, QuestProgressUpdate, QuestStatus } from "@/lib/types";
import { DashboardSnapshot, PremiumFunnelSection, QuestBoardSection } from "@/components/sections";
import { QuestActionsPanel } from "@/components/quest-actions-panel";

function getQuestStatusFromOutcome(outcome: "approved" | "pending" | "rejected"): QuestStatus {
  switch (outcome) {
    case "approved":
      return "completed";
    case "pending":
      return "in-progress";
    default:
      return "available";
  }
}

function applyQuestUpdate(
  quests: Quest[],
  questId: string,
  outcome: "approved" | "pending" | "rejected",
) {
  return quests.map((quest) =>
    quest.id === questId
      ? {
          ...quest,
          status: getQuestStatusFromOutcome(outcome),
        }
      : quest,
  );
}

export function DashboardExperience({
  initialData,
  isAuthenticated,
}: {
  initialData: DashboardData;
  isAuthenticated: boolean;
}) {
  const [data, setData] = useState(initialData);

  function handleQuestResult({
    questId,
    outcome,
    progressUpdate,
  }: {
    questId: string;
    outcome: "approved" | "pending" | "rejected";
    progressUpdate: QuestProgressUpdate | null;
  }) {
    setData((current) => {
      const nextQuests = applyQuestUpdate(current.quests, questId, outcome);

      if (!progressUpdate) {
        return {
          ...current,
          quests: nextQuests,
        };
      }

      return {
        ...current,
        user: {
          ...current.user,
          level: progressUpdate.level,
          totalXp: current.user.totalXp + progressUpdate.deltaXp,
          currentStreak: progressUpdate.currentStreak,
        },
        quests: nextQuests,
      };
    });
  }

  return (
    <>
      <DashboardSnapshot data={data} />
      <QuestBoardSection data={data} />
      <QuestActionsPanel
        quests={data.quests}
        isAuthenticated={isAuthenticated}
        onQuestResult={handleQuestResult}
      />
      <PremiumFunnelSection data={data} />
    </>
  );
}
