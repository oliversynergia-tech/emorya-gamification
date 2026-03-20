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
      return "rejected";
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

function updateCampaignPacks(
  campaignPacks: DashboardData["campaignPacks"],
  questId: string,
  outcome: "approved" | "pending" | "rejected",
) {
  function getPackQuestStatus(result: "approved" | "pending" | "rejected"): "available" | "in-progress" | "completed" | "rejected" {
    switch (result) {
      case "approved":
        return "completed";
      case "pending":
        return "in-progress";
      default:
        return "rejected";
    }
  }

  return campaignPacks.map((pack) => {
    if (!pack.questStatuses.some((quest) => quest.questId === questId)) {
      return pack;
    }

    const nextQuestStatuses = pack.questStatuses.map((quest) =>
      quest.questId === questId
        ? {
            ...quest,
            status: getPackQuestStatus(outcome),
          }
        : quest,
    );
    const completedQuestCount = nextQuestStatuses.filter((quest) => quest.status === "completed").length;
    const inProgressQuestCount = nextQuestStatuses.filter((quest) => quest.status === "in-progress").length;
    const rejectedQuestCount = nextQuestStatuses.filter((quest) => quest.status === "rejected").length;
    const openQuestCount = nextQuestStatuses.filter((quest) => quest.status === "available").length;
    const nextQuest = nextQuestStatuses.find((quest) => quest.status !== "completed") ?? null;
    const milestone =
      completedQuestCount >= nextQuestStatuses.length && nextQuestStatuses.length > 0
        ? { label: "Pack complete", tone: "success" as const }
        : completedQuestCount >= Math.ceil(nextQuestStatuses.length / 2) && nextQuestStatuses.length > 1
          ? { label: "Halfway complete", tone: "success" as const }
          : completedQuestCount > 0
            ? { label: "First mission cleared", tone: "success" as const }
            : rejectedQuestCount > 0
              ? { label: "Review needed on one mission", tone: "warning" as const }
              : { label: "Pack is ready to start", tone: "info" as const };

    return {
      ...pack,
      questStatuses: nextQuestStatuses,
      completedQuestCount,
      inProgressQuestCount,
      rejectedQuestCount,
      openQuestCount,
      nextQuestId: nextQuest?.questId ?? null,
      nextQuestTitle: nextQuest?.title ?? null,
      nextQuestActionable: nextQuest?.actionable ?? false,
      ctaLabel: nextQuest ? (nextQuest.actionable ? "Open next mission" : "View next mission") : "Review pack",
      milestone,
    };
  });
}

function buildCampaignNotifications(
  campaignPacks: DashboardData["campaignPacks"],
): DashboardData["campaignNotifications"] {
  return campaignPacks
    .filter((pack) => pack.lifecycleState === "live" || pack.milestone.tone === "success")
    .slice(0, 4)
    .map((pack) => ({
      id: `pack-${pack.packId}-${pack.lifecycleState}-${pack.milestone.label}`,
      tone: pack.lifecycleState === "live" ? ("info" as const) : pack.milestone.tone,
      title:
        pack.lifecycleState === "live"
          ? `${pack.label} is now live in your lane`
          : `${pack.label}: ${pack.milestone.label}`,
      detail:
        pack.lifecycleState === "live"
          ? `${pack.kind === "feeder" ? `${pack.attributionSource} is feeding into ${pack.activeLane}` : `${pack.activeLane} is active`} and this pack is ready for user progression now.`
          : `${pack.completedQuestCount}/${pack.totalQuestCount} missions are complete. ${pack.nextAction}`,
      packId: pack.packId,
      ctaLabel: pack.ctaLabel,
      ctaQuestId: pack.nextQuestId,
    }));
}

export function DashboardExperience({
  initialData,
  isAuthenticated,
  walletAddresses = [],
}: {
  initialData: DashboardData;
  isAuthenticated: boolean;
  walletAddresses?: string[];
}) {
  const [data, setData] = useState(initialData);
  const highlightedQuestId = data.campaignPacks.find((pack) => pack.nextQuestActionable && pack.nextQuestId)?.nextQuestId ?? null;

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
        campaignNotifications: buildCampaignNotifications(current.campaignPacks),
        quests: nextQuests,
      };
    }

      const nextCampaignPacks = updateCampaignPacks(current.campaignPacks, questId, outcome);

      return {
        ...current,
        user: {
          ...current.user,
          level: progressUpdate.level,
          totalXp: current.user.totalXp + progressUpdate.deltaXp,
          currentStreak: progressUpdate.currentStreak,
        },
        achievements: current.achievements.map((achievement) =>
          progressUpdate.unlockedAchievements?.includes(achievement.name)
            ? {
                ...achievement,
                unlocked: true,
                progress: 1,
              }
            : achievement,
        ),
        campaignPacks: nextCampaignPacks,
        campaignNotifications: buildCampaignNotifications(nextCampaignPacks),
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
        walletAddresses={walletAddresses}
        highlightedQuestId={highlightedQuestId}
        onQuestResult={handleQuestResult}
      />
      <PremiumFunnelSection data={data} />
    </>
  );
}
