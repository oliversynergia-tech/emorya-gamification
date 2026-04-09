"use client";

import { useMemo, useState } from "react";

import type { DashboardData, Quest, QuestProgressUpdate, QuestStatus } from "@/lib/types";
import { DashboardSnapshot, QuestBoardSection } from "@/components/sections";
import { QuestActionsPanel } from "@/components/quest-actions-panel";

type MissionView = "active" | "completed" | "all" | "reward";

function isRewardBearingPack(pack: DashboardData["campaignPacks"][number]) {
  return Boolean(pack.directRewardSummary || pack.directRewardState || pack.premiumNudge);
}

function isRewardBearingHistory(pack: DashboardData["campaignPackHistory"][number]) {
  return pack.premiumQuestCount > 0 || pack.referralQuestCount > 0;
}

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
  previousNotifications: DashboardData["campaignNotifications"] = [],
): DashboardData["campaignNotifications"] {
  const persistedStateMap = new Map(
    previousNotifications
      .filter((notification) => notification.persistedState)
      .map((notification) => [notification.id, notification.persistedState] as const),
  );
  const notifications = campaignPacks.slice(0, 4).map((pack) => {
    const detailParts: string[] = [];
    const tone =
      pack.milestone.tone === "success"
        ? "success"
        : pack.lifecycleState === "live"
          ? "info"
          : pack.directRewardState?.tone ?? "info";

    if (pack.lifecycleState === "live") {
      detailParts.push(
        pack.kind === "feeder"
          ? `${pack.attributionSource} is feeding into ${pack.activeLane} and this mission is live now.`
          : `${pack.activeLane} is active and this mission is live now.`,
      );
    }

    if (pack.milestone.tone === "success") {
      detailParts.push(`${pack.completedQuestCount}/${pack.totalQuestCount} missions are complete.`);
    }

    if (pack.directRewardState) {
      detailParts.push(pack.directRewardState.label);
    }

    if (pack.returnAction) {
      detailParts.push(pack.returnAction);
    }

    if (pack.milestone.label === "Halfway complete" || pack.milestone.label === "Pack complete") {
      detailParts.push("This is a strong moment to invite referrals into the same loop.");
    }

    return {
      id: `pack-summary-${pack.packId}-${pack.lifecycleState}-${pack.milestone.label}`,
      tone,
      title:
        pack.milestone.tone === "success"
          ? `${pack.label}: ${pack.milestone.label}`
          : `${pack.label} is active in your mission flow`,
      detail: `${detailParts.join(" ")} ${pack.nextAction}`.trim(),
      packId: pack.packId,
      ctaLabel:
        pack.milestone.label === "Halfway complete" || pack.milestone.label === "Pack complete"
          ? "Open referral leaderboard"
          : pack.ctaLabel,
      ctaQuestId:
        pack.milestone.label === "Halfway complete" || pack.milestone.label === "Pack complete"
          ? null
          : pack.nextQuestId,
      ctaHref:
        pack.milestone.label === "Halfway complete" || pack.milestone.label === "Pack complete"
          ? "/leaderboard#referral-board"
          : pack.ctaHref,
      persistedState: persistedStateMap.get(`pack-summary-${pack.packId}-${pack.lifecycleState}-${pack.milestone.label}`) ?? null,
    };
  });

  const returnReminder = campaignPacks.find((pack) => Boolean(pack.returnAction));
  if (returnReminder) {
    notifications.unshift({
      id: `pack-return-${returnReminder.packId}`,
      tone: "warning",
      title: `${returnReminder.label} needs a return move`,
      detail: `${returnReminder.returnAction ?? returnReminder.nextAction} ${returnReminder.unlockPreview}`,
      packId: returnReminder.packId,
      ctaLabel: returnReminder.ctaLabel,
      ctaQuestId: returnReminder.nextQuestId,
      ctaHref: returnReminder.ctaHref,
      persistedState: persistedStateMap.get(`pack-return-${returnReminder.packId}`) ?? null,
    });
  }

  return notifications.slice(0, 5);
}

function updateCampaignPackHistory(
  history: DashboardData["campaignPackHistory"],
  campaignPacks: DashboardData["campaignPacks"],
): DashboardData["campaignPackHistory"] {
  const nextHistory = [...history];

  for (const pack of campaignPacks) {
    if (pack.completedQuestCount < pack.totalQuestCount || pack.totalQuestCount === 0) {
      continue;
    }

    if (nextHistory.some((entry) => entry.packId === pack.packId)) {
      continue;
    }

    nextHistory.unshift({
      packId: pack.packId,
      label: pack.label,
      completedAt: new Date().toISOString(),
      totalQuestCount: pack.totalQuestCount,
      attributionSource: pack.attributionSource,
      activeLane: pack.activeLane,
      kind: pack.kind,
      summary:
        pack.kind === "feeder"
          ? `Completed as a feeder pack into ${pack.activeLane}.`
          : `Completed across ${pack.totalQuestCount} mission${pack.totalQuestCount === 1 ? "" : "s"}.`,
      totalXpAwarded: 0,
      approvedQuestCount: pack.completedQuestCount,
      premiumQuestCount: 0,
      referralQuestCount: 0,
    });
  }

  return nextHistory.slice(0, 4);
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
  const [missionView] = useState<MissionView>(() => {
    if (typeof window === "undefined") {
      return "active";
    }
    const stored = window.localStorage.getItem("emorya-dashboard-mission-view");
    return stored === "completed" || stored === "all" || stored === "reward" ? stored : "active";
  });
  const highlightedQuestId = data.campaignPacks.find((pack) => pack.nextQuestActionable && pack.nextQuestId)?.nextQuestId ?? null;
  const filteredData = useMemo<DashboardData>(() => {
    const activePackIds = new Set(data.campaignPacks.map((pack) => pack.packId));
    const completedPackIds = new Set(data.campaignPackHistory.map((pack) => pack.packId));

    if (missionView === "active") {
      return {
        ...data,
        quests:
          activePackIds.size > 0
            ? data.quests.filter((quest) => !quest.campaignPackId || activePackIds.has(quest.campaignPackId))
            : data.quests,
        campaignPackHistory: [],
      };
    }

    if (missionView === "completed") {
      return {
        ...data,
        quests:
          completedPackIds.size > 0
            ? data.quests.filter((quest) => quest.campaignPackId && completedPackIds.has(quest.campaignPackId))
            : data.quests,
        campaignPacks: [],
        campaignNotifications: [],
      };
    }

    if (missionView === "reward") {
      const rewardPackIds = new Set(data.campaignPacks.filter(isRewardBearingPack).map((pack) => pack.packId));
      const rewardHistory = data.campaignPackHistory.filter(isRewardBearingHistory);
      const rewardHistoryIds = new Set(rewardHistory.map((pack) => pack.packId));

      return {
        ...data,
        quests:
          rewardPackIds.size > 0 || rewardHistoryIds.size > 0
            ? data.quests.filter(
                (quest) =>
                  !quest.campaignPackId ||
                  rewardPackIds.has(quest.campaignPackId) ||
                  rewardHistoryIds.has(quest.campaignPackId),
              )
            : data.quests,
        campaignPacks: data.campaignPacks.filter(isRewardBearingPack),
        campaignPackHistory: rewardHistory,
        campaignNotifications: data.campaignNotifications.filter((notification) =>
          rewardPackIds.has(notification.packId),
        ),
      };
    }

    return data;
  }, [data, missionView]);

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
        campaignNotifications: buildCampaignNotifications(current.campaignPacks, current.campaignNotifications),
        quests: nextQuests,
      };
    }

      const nextCampaignPacks = updateCampaignPacks(current.campaignPacks, questId, outcome);
      const nextCampaignPackHistory = updateCampaignPackHistory(current.campaignPackHistory, nextCampaignPacks);

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
        campaignNotifications: buildCampaignNotifications(nextCampaignPacks, current.campaignNotifications),
        campaignPackHistory: nextCampaignPackHistory,
        quests: nextQuests,
      };
    });
  }

  return (
    <>
      <DashboardSnapshot data={filteredData} missionView={missionView} />
      <QuestBoardSection data={filteredData} />
      <QuestActionsPanel
        quests={filteredData.quests}
        isAuthenticated={isAuthenticated}
        walletAddresses={walletAddresses}
        highlightedQuestId={highlightedQuestId}
        onQuestResult={handleQuestResult}
        activeCampaignPack={data.campaignPacks[0] ?? null}
      />
    </>
  );
}
