import assert from "node:assert/strict";
import test from "node:test";

import { validateCampaignPackTemplates } from "../lib/campaign-pack.ts";
import type { QuestDefinitionTemplateItem } from "../lib/types.ts";

function makeTemplate(
  label: string,
  metadata: Record<string, unknown>,
  isActive = true,
): QuestDefinitionTemplateItem {
  return {
    id: label,
    label,
    description: label,
    form: {
      category: "app",
      difficulty: "easy",
      verificationType: "link-visit",
      recurrence: "one-time",
      requiredTier: "free",
      requiredLevel: 1,
      xpReward: 25,
      isPremiumPreview: false,
      isActive: true,
    },
    metadata,
    isActive,
    createdAt: "2026-03-17T00:00:00.000Z",
    updatedAt: "2026-03-17T00:00:00.000Z",
  };
}

test("validateCampaignPackTemplates passes for the default Zealy bridge pack", () => {
  const templates = [
    makeTemplate("Zealy bridge quest", {
      campaignTemplateKind: "bridge",
      campaignAttributionSource: "zealy",
      campaignExperienceLane: "zealy",
    }),
    makeTemplate("Galxe feeder quest", {
      campaignTemplateKind: "feeder",
      campaignAttributionSource: "galxe",
      campaignExperienceLane: "zealy",
    }),
    makeTemplate("TaskOn feeder quest", {
      campaignTemplateKind: "feeder",
      campaignAttributionSource: "taskon",
      campaignExperienceLane: "zealy",
    }),
  ];

  assert.equal(validateCampaignPackTemplates(templates, false), null);
});

test("validateCampaignPackTemplates blocks pack creation when upstream differentiation is enabled", () => {
  const templates = [
    makeTemplate("Zealy bridge quest", {
      campaignTemplateKind: "bridge",
      campaignAttributionSource: "zealy",
      campaignExperienceLane: "zealy",
    }),
    makeTemplate("Galxe feeder quest", {
      campaignTemplateKind: "feeder",
      campaignAttributionSource: "galxe",
      campaignExperienceLane: "zealy",
    }),
    makeTemplate("TaskOn feeder quest", {
      campaignTemplateKind: "feeder",
      campaignAttributionSource: "taskon",
      campaignExperienceLane: "zealy",
    }),
  ];

  assert.match(
    validateCampaignPackTemplates(templates, true) ?? "",
    /blocked while separate Galxe and TaskOn live lanes are enabled/i,
  );
});

test("validateCampaignPackTemplates rejects feeder templates with the wrong live lane", () => {
  const templates = [
    makeTemplate("Zealy bridge quest", {
      campaignTemplateKind: "bridge",
      campaignAttributionSource: "zealy",
      campaignExperienceLane: "zealy",
    }),
    makeTemplate("Galxe feeder quest", {
      campaignTemplateKind: "feeder",
      campaignAttributionSource: "galxe",
      campaignExperienceLane: "galxe",
    }),
    makeTemplate("TaskOn feeder quest", {
      campaignTemplateKind: "feeder",
      campaignAttributionSource: "taskon",
      campaignExperienceLane: "zealy",
    }),
  ];

  assert.match(
    validateCampaignPackTemplates(templates, false) ?? "",
    /Galxe feeder quest has the wrong active experience lane/i,
  );
});
