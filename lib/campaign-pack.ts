import type { QuestDefinitionTemplateItem } from "@/lib/types";

export function validateCampaignPackTemplates(
  templates: QuestDefinitionTemplateItem[],
  differentiateUpstreamCampaignSources: boolean,
) {
  const requiredTemplates = [
    { label: "Zealy bridge quest", kind: "bridge", source: "zealy", lane: "zealy" },
    { label: "Galxe feeder quest", kind: "feeder", source: "galxe", lane: "zealy" },
    { label: "TaskOn feeder quest", kind: "feeder", source: "taskon", lane: "zealy" },
  ] as const;

  if (differentiateUpstreamCampaignSources) {
    return "Campaign pack creation is blocked while separate Galxe and TaskOn live lanes are enabled. Switch back to Zealy bridge mode or build lane-specific packs.";
  }

  for (const requiredTemplate of requiredTemplates) {
    const template = templates.find((entry) => entry.label === requiredTemplate.label);

    if (!template || !template.isActive) {
      return `${requiredTemplate.label} must exist and be active before creating a campaign pack.`;
    }

    const metadata = template.metadata ?? {};
    if (metadata.campaignTemplateKind !== requiredTemplate.kind) {
      return `${requiredTemplate.label} is not marked as a ${requiredTemplate.kind} template.`;
    }
    if (metadata.campaignAttributionSource !== requiredTemplate.source) {
      return `${requiredTemplate.label} has the wrong attribution source.`;
    }
    if (metadata.campaignExperienceLane !== requiredTemplate.lane) {
      return `${requiredTemplate.label} has the wrong active experience lane.`;
    }
  }

  return null;
}
